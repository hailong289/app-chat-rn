"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import useAuthStore from "../store/useAuth";
import { WS_URL } from '@/env.json';
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SocketStatus = "idle" | "connecting" | "connected" | "error";

type SocketCtx = {
  socket: Socket | null;
  status: SocketStatus;
};

const Ctx = createContext<SocketCtx>({ socket: null, status: "idle" });

/**
 * Retry logic với exponential backoff
 * - Retry 5 lần với delay tăng dần
 * - Nếu lần cuối không được, nghỉ 10 phút rồi lại bắt đầu retry 5 lần
 */
class RetryManager {
  private maxRetries = 5;
  private baseDelay = 1000; // 1 giây
  private maxDelay = 10000; // 10 giây
  private cooldownPeriod = 10 * 60 * 1000; // 10 phút
  private retryCount = 0;
  private cycleCount = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isInCooldown = false;

  /**
   * Tính delay cho lần retry hiện tại (exponential backoff)
   */
  private getDelay(attempt: number): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, attempt - 1),
      this.maxDelay
    );
    return delay;
  }

  /**
   * Thực hiện retry với exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delay: number) => void,
    onCooldown?: () => void
  ): Promise<T> {
    // Nếu đang trong cooldown, đợi hết cooldown rồi mới retry
    if (this.isInCooldown) {
      if (onCooldown) onCooldown();
      await this.wait(this.cooldownPeriod);
      this.isInCooldown = false;
      this.retryCount = 0;
      this.cycleCount++;
      console.log(`🔄 [Retry] Bắt đầu chu kỳ retry mới #${this.cycleCount}`);
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.retryCount = attempt;
        const result = await fn();
        // Thành công, reset retry count
        this.retryCount = 0;
        this.cycleCount = 0;
        return result;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        
        if (isLastAttempt) {
          console.log(`❌ [Retry] Đã thử ${this.maxRetries} lần nhưng không thành công. Nghỉ ${this.cooldownPeriod / 1000 / 60} phút...`);
          this.isInCooldown = true;
          // Đợi cooldown rồi retry lại từ đầu
          await this.wait(this.cooldownPeriod);
          this.isInCooldown = false;
          this.retryCount = 0;
          this.cycleCount++;
          console.log(`🔄 [Retry] Bắt đầu chu kỳ retry mới #${this.cycleCount}`);
          // Retry lại từ đầu
          attempt = 0; // Sẽ tăng lên 1 ở vòng lặp tiếp theo
          continue;
        }

        const delay = this.getDelay(attempt);
        if (onRetry) {
          onRetry(attempt, delay);
        }
        console.log(`🔄 [Retry] Lần thử ${attempt}/${this.maxRetries} thất bại. Đợi ${delay}ms trước khi thử lại...`);
        await this.wait(delay);
      }
    }

    // Không bao giờ đến đây vì sẽ retry vô hạn
    throw new Error("Retry failed");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timeoutId = setTimeout(resolve, ms);
    });
  }

  /**
   * Hủy retry đang chờ
   */
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.retryCount = 0;
    this.cycleCount = 0;
    this.isInCooldown = false;
  }

  /**
   * Reset retry manager
   */
  reset() {
    this.cancel();
    this.retryCount = 0;
    this.cycleCount = 0;
    this.isInCooldown = false;
  }
}

/**
 * Lấy accessToken:
 */
function useAccessToken(): string | null {
  return useAuthStore((s) => s.tokens?.accessToken ?? null);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAccessToken();
  const [status, setStatus] = useState<SocketStatus>("idle");
  const socketRef = useRef<Socket | null>(null);
  const retryManagerRef = useRef<RetryManager>(new RetryManager());

  const url = WS_URL;
  // Bạn có thể thay đổi transports tuỳ hạ tầng (mặc định ưu tiên websocket)
  const opts = useMemo(
    () => ({
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      reconnection: false, // Tắt auto reconnect của socket.io, dùng retry manager thay thế
      timeout: 10_000,
    }),
    [token]
  );

  /**
   * Setup event handlers cho socket
   */
  const setupSocketHandlers = (s: Socket) => {
    // Xóa các handlers cũ nếu có
    s.off("disconnect");
    s.off("connect_error");

    s.on("disconnect", (reason) => {
      console.log("❌ [Socket] Disconnected. Reason:", reason);
      setStatus("idle");
      // Nếu disconnect không phải do client, thử reconnect lại
      if (reason !== "io client disconnect") {
        retryManagerRef.current.reset();
        // Tự động retry kết nối
        retryManagerRef.current
          .retry(
            async () => {
              const newSocket = await connectWithRetry();
              socketRef.current = newSocket;
              setupSocketHandlers(newSocket);
              setStatus("connected");
              return newSocket;
            },
            (attempt, delay) => {
              console.log(`🔄 [Socket] Reconnect attempt ${attempt}/5, delay: ${delay}ms`);
              setStatus("connecting");
            },
            () => {
              console.log(`⏸️ [Socket] Đang trong cooldown 10 phút...`);
              setStatus("error");
            }
          )
          .catch((err) => {
            console.error("❌ [Socket] Reconnect failed:", err);
            setStatus("error");
          });
      }
    });

    s.on("connect_error", (err: any) => {
      // Nếu server trả unauthorized, đừng spam reconnect vô nghĩa
      const msg = String(err?.message || "").toLowerCase();
      if (
        msg.includes("unauthorized") ||
        msg.includes("jwt") ||
        msg.includes("forbidden") ||
        err?.statusCode === 401
      ) {
        setStatus("error");
        retryManagerRef.current.cancel();
        // Ngắt hẳn; user cần login lại để có token mới
        s.disconnect();
        return;
      }
    });
    s.on("exception", (err: any) => {
       if (err?.statusCode === 401) {
        setStatus("error");
        retryManagerRef.current.cancel();
        // Ngắt hẳn; user cần login lại để có token mới
        s.disconnect();
        return;
       }
    });
  };

  /**
   * Kết nối socket với retry logic
   */
  const connectWithRetry = async (): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      const s = io(url, opts);
      let isResolved = false;

      const cleanup = () => {
        s.off("connect", onConnect);
        s.off("connect_error", onError);
      };

      const onConnect = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          console.log("✅ [Socket] Connected! ID:", s.id);
          resolve(s);
        }
      };

      const onError = (err: any) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          s.disconnect();
          reject(err);
        }
      };

      s.once("connect", onConnect);
      s.once("connect_error", onError);

      // Timeout sau 10 giây
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          s.disconnect();
          reject(new Error("Connection timeout"));
        }
      }, 10_000);
    });
  };

  useEffect(() => {
    // Mỗi lần token đổi (login/logout), ngắt kết nối cũ & kết nối lại nếu có token
    socketRef.current?.disconnect();
    socketRef.current = null;
    retryManagerRef.current.cancel();

    if (!token) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");

    // Sử dụng retry manager để kết nối
    retryManagerRef.current
      .retry(
        async () => {
          const s = await connectWithRetry();
          return s;
        },
        (attempt, delay) => {
          console.log(`🔄 [Socket] Retry attempt ${attempt}/5, delay: ${delay}ms`);
          setStatus("connecting");
        },
        () => {
          console.log(`⏸️ [Socket] Đang trong cooldown 10 phút...`);
          setStatus("error");
        }
      )
      .then((s) => {
        socketRef.current = s;
        setStatus("connected");
        // Setup event handlers cho socket đã kết nối
        setupSocketHandlers(s);
      })
      .catch((err) => {
        console.error("❌ [Socket] Connection failed after all retries:", err);
        setStatus("error");
      });

    return () => {
      retryManagerRef.current.cancel();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [url, opts, token]);

  const value = useMemo<SocketCtx>(
    () => ({ socket: socketRef.current, status }),
    [status]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);
