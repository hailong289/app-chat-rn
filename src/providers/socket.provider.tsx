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
import useRoomStore from "../store/useRoom";
import useMessageStore from "../store/useMessage";
import useContactStore from "../store/useContact";
import networkListener from "../libs/networkListener";

// Socket event constants
export const SocketEvents = {
  // Message events
  MESSAGE_NEW: "message:new",
  MESSAGE_SEND: "message:send",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  MESSAGE_RECALLED: "message:recalled",
  MESSAGE_PINNED: "message:pinned",
  MESSAGE_REACTION_ADDED: "message:reaction:added",
  MESSAGE_REACTION_REMOVED: "message:reaction:removed",

  // Room events
  ROOM_CREATED: "room:created",
  ROOM_UPDATED: "room:updated",
  ROOM_DELETED: "room:deleted",
  ROOM_MEMBER_JOINED: "room:member:joined",
  ROOM_MEMBER_LEFT: "room:member:left",
  ROOM_MEMBER_REMOVED: "room:member:removed",
  ROOM_NAME_CHANGED: "room:name:changed",

  // Typing events
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Presence events
  PRESENCE_ONLINE: "presence:online",
  PRESENCE_OFFLINE: "presence:offline",

  // Call events
  CALL_REQUEST: "call:request",
  CALL_ACCEPTED: "call:accepted",
  CALL_ANSWER: "call:answer",
  CALL_CANDIDATE: "call:candidate",
  CALL_END: "call:end",
  CALL_MEMBER_JOINED: "call:member-joined",
  CALL_SHARE_SCREEN: "call:share-screen",
  CALL_CAMERA_STATE: "call:camera-state",
  CALL_MIC_STATE: "call:mic-state",
  CALL_BUSY: "call:busy",
  SIGNAL: "signal",

  // Read events
  READ_MESSAGE: "message:read",

  // Error
  ERROR: "exception",
} as const;

export type SocketStatus = "idle" | "connecting" | "connected" | "error";

type SocketCtx = {
  socket: Socket | null;
  status: SocketStatus;
};

const Ctx = createContext<SocketCtx>({ socket: null, status: "idle" });

/**
 * Retry logic with exponential backoff
 */
class RetryManager {
  private maxRetries = 5;
  private baseDelay = 1000;
  private maxDelay = 10000;
  private cooldownPeriod = 10 * 60 * 1000;
  private retryCount = 0;
  private cycleCount = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isInCooldown = false;

  private getDelay(attempt: number): number {
    return Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
  }

  async retry<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delay: number) => void,
    onCooldown?: () => void
  ): Promise<T> {
    if (this.isInCooldown) {
      if (onCooldown) onCooldown();
      await this.wait(this.cooldownPeriod);
      this.isInCooldown = false;
      this.retryCount = 0;
      this.cycleCount++;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.retryCount = attempt;
        const result = await fn();
        this.retryCount = 0;
        this.cycleCount = 0;
        return result;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        if (isLastAttempt) {
          this.isInCooldown = true;
          await this.wait(this.cooldownPeriod);
          this.isInCooldown = false;
          this.retryCount = 0;
          this.cycleCount++;
          attempt = 0;
          continue;
        }
        const delay = this.getDelay(attempt);
        if (onRetry) onRetry(attempt, delay);
        await this.wait(delay);
      }
    }
    throw new Error("Retry failed");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timeoutId = setTimeout(resolve, ms);
    });
  }

  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.retryCount = 0;
    this.cycleCount = 0;
    this.isInCooldown = false;
  }

  reset() {
    this.cancel();
    this.retryCount = 0;
    this.cycleCount = 0;
    this.isInCooldown = false;
  }
}

function useAccessToken(): string | null {
  return useAuthStore((s) => s.tokens?.accessToken ?? null);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAccessToken();
  const [status, setStatus] = useState<SocketStatus>("idle");
  const socketRef = useRef<Socket | null>(null);
  const retryManagerRef = useRef<RetryManager>(new RetryManager());

  const url = WS_URL;
  const opts = useMemo(
    () => ({
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      reconnection: false,
      timeout: 10_000,
    }),
    [token]
  );

  /**
   * Connect socket with retry — defined BEFORE setupSocketHandlers uses it
   */
  const connectWithRetry = useMemo(
    () => async (): Promise<Socket> => {
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

        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            s.disconnect();
            reject(new Error("Connection timeout"));
          }
        }, 10_000);
      });
    },
    [url, opts]
  );

  /**
   * Setup ALL event handlers for the socket
   */
  const setupSocketHandlers = useMemo(
    () => (s: Socket) => {
      // Remove old handlers
      s.off("disconnect");
      s.off("connect_error");

      // ── Disconnect handler ──────────────────────────────────────────
      s.on("disconnect", (reason) => {
        setStatus("idle");
        networkListener.setConnected(false);
        if (reason !== "io client disconnect") {
          retryManagerRef.current.reset();
          retryManagerRef.current
            .retry(
              async () => {
                const newSocket = await connectWithRetry();
                socketRef.current = newSocket;
                setupSocketHandlers(newSocket);
                setStatus("connected");
                return newSocket;
              },
              (attempt, delay) => setStatus("connecting"),
              () => setStatus("error")
            )
            .catch((err) => {
              setStatus("error");
            });
        }
      });

      // ── Connect error handler ───────────────────────────────────────
      s.on("connect_error", (err: any) => {
        const msg = String(err?.message || "").toLowerCase();
        if (
          msg.includes("unauthorized") ||
          msg.includes("jwt") ||
          msg.includes("forbidden") ||
          err?.statusCode === 401
        ) {
          setStatus("error");
          retryManagerRef.current.cancel();
          s.disconnect();
          return;
        }
      });

      // ── Exception handler ───────────────────────────────────────────
      s.on("exception", (err: any) => {
        if (err?.statusCode === 401) {
          setStatus("error");
          retryManagerRef.current.cancel();
          s.disconnect();
        }
      });

      // ── Message events ──────────────────────────────────────────────
      s.on(SocketEvents.MESSAGE_NEW, (data: any) => {
        const { upsertMessage } = useMessageStore.getState();
        if (data && data.id) {
          upsertMessage(data);
        }
        if (data?.roomId) {
          const { updateRoomLastMessage } = useRoomStore.getState();
          updateRoomLastMessage(data.roomId, {
            id: data.id,
            content: data.content,
            createdAt: data.createdAt,
            sender_fullname: data.sender?.fullname,
            sender_id: data.sender?._id,
          });
        }
      });

      s.on(SocketEvents.MESSAGE_UPDATED, (data: any) => {
        const { upsertMessage } = useMessageStore.getState();
        if (data && data.id) upsertMessage(data);
      });

      s.on(SocketEvents.MESSAGE_DELETED, (data: { roomId: string; messageId: string }) => {
        // Can mark the message as deleted in store
      });

      s.on(SocketEvents.MESSAGE_RECALLED, (data: { roomId: string; messageId: string }) => {
        // Mark message as recalled
      });

      s.on(SocketEvents.MESSAGE_REACTION_ADDED, (data: any) => {
        if (data?.messageId && data?.emoji && data?.userId) {
          const { addReaction } = useMessageStore.getState();
          addReaction(data.roomId, data.messageId, data.emoji, data.userId);
        } else {
          const { upsertMessage } = useMessageStore.getState();
          if (data && data.id) upsertMessage(data);
        }
      });

      s.on(SocketEvents.MESSAGE_REACTION_REMOVED, (data: any) => {
        if (data?.messageId && data?.emoji && data?.userId) {
          const { removeReaction } = useMessageStore.getState();
          removeReaction(data.roomId, data.messageId, data.emoji, data.userId);
        } else {
          const { upsertMessage } = useMessageStore.getState();
          if (data && data.id) upsertMessage(data);
        }
      });

      // ── Room events ─────────────────────────────────────────────────
      s.on(SocketEvents.ROOM_CREATED, (data: any) => {
        const { addRoom } = useRoomStore.getState();
        if (data) addRoom(data);
      });

      s.on(SocketEvents.ROOM_UPDATED, (data: any) => {
        const { upsertRoom } = useRoomStore.getState();
        if (data) upsertRoom(data).catch(() => {});
      });

      s.on(SocketEvents.ROOM_MEMBER_JOINED, (data: { roomId: string; user: any }) => {
        // Can refresh room detail
      });

      s.on(SocketEvents.ROOM_MEMBER_LEFT, (data: { roomId: string; userId: string }) => {
        // Can refresh room
      });

      s.on(SocketEvents.ROOM_NAME_CHANGED, (data: { roomId: string; name: string }) => {
        const { changeRoomName } = useRoomStore.getState();
        if (data?.roomId && data?.name) {
          changeRoomName(data.roomId, data.name).catch(() => {});
        }
      });

      // ── Typing events ───────────────────────────────────────────────
      s.on(SocketEvents.TYPING_START, (data: { roomId: string; userId: string; fullname: string }) => {
        if (!data?.roomId || !data?.userId) return;
        const { setTypingUsers, typingUsers } = useRoomStore.getState();
        const current = typingUsers[data.roomId] || [];
        if (!current.find((u) => u.userId === data.userId)) {
          setTypingUsers(data.roomId, [...current, { userId: data.userId, fullname: data.fullname }]);
        }
      });

      s.on(SocketEvents.TYPING_STOP, (data: { roomId: string; userId: string }) => {
        if (!data?.roomId || !data?.userId) return;
        const { setTypingUsers, typingUsers } = useRoomStore.getState();
        const current = typingUsers[data.roomId] || [];
        setTypingUsers(data.roomId, current.filter((u) => u.userId !== data.userId));
      });

      // ── Presence events ─────────────────────────────────────────────
      s.on(SocketEvents.PRESENCE_ONLINE, (data: { userId: string }) => {
        if (data?.userId) {
          const { setUserOnline } = useContactStore.getState();
          setUserOnline(data.userId);
        }
      });

      s.on(SocketEvents.PRESENCE_OFFLINE, (data: { userId: string }) => {
        if (data?.userId) {
          const { setUserOffline } = useContactStore.getState();
          setUserOffline(data.userId);
        }
      });

      // ── Read events ─────────────────────────────────────────────────
      s.on(SocketEvents.READ_MESSAGE, (data: { roomId: string; messageId: string; userId: string }) => {
        // Update message read status
      });

      // ── Call events ─────────────────────────────────────────────────
      // Phase 4: delegate to useCallStore event hub
      s.on('call:request', (data: any) => {
        const { eventCall, socket: storeSocket } = require('../store/useCallStore').default.getState();
        if (!storeSocket) require('../store/useCallStore').default.setState({ socket: s });
        void eventCall('request', data);
      });

      s.on('call:accepted', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('accepted', data);
      });

      s.on('call:answer', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('answer', data);
      });

      s.on('call:candidate', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('candidate', data);
      });

      s.on('call:end', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('end', data);
      });

      s.on('call:member-joined', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('member-joined', data);
      });

      s.on('call:share-screen', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('share-screen', data);
      });

      s.on('call:camera-state', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('camera-state', data);
      });

      s.on('call:mic-state', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('mic-state', data);
      });

      s.on('call:busy', (data: any) => {
        void require('../store/useCallStore').default.getState().eventCall('busy', data);
      });

      // SFU signal routing
      s.on('signal', (data: any) => {
        void require('../store/useCallStore').default.getState().handleSFUSignal(data);
      });
    },
    [connectWithRetry]
  );

  useEffect(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    retryManagerRef.current.cancel();

    if (!token) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");

    retryManagerRef.current
      .retry(
        async () => {
          const s = await connectWithRetry();
          return s;
        },
        (attempt, delay) => setStatus("connecting"),
        () => setStatus("error")
      )
      .then((s) => {
        socketRef.current = s;
        setStatus("connected");
        networkListener.setConnected(true);
        setupSocketHandlers(s);
      })
      .catch((err) => {
        setStatus("error");
      });

    return () => {
      retryManagerRef.current.cancel();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [url, opts, token, connectWithRetry, setupSocketHandlers]);

  const value = useMemo<SocketCtx>(
    () => ({ socket: socketRef.current, status }),
    [status]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);
