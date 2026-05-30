"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import useAuthStore from "../store/useAuth";
import { WS_URL } from '@/env.json';
import networkListener from "../libs/networkListener";

// Socket event constants — MUST match backend libs/dto/src/enum.type.ts
export const SocketEvents = {
  // Message events
  MESSAGE_SEND: "message:send",
  MESSAGE_UPSERT: "message:upsert",
  MESSAGE_EMOJI: "message:emoji",
  MESSAGE_PINNED: "message:pinned",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_RECALL: "message:recall",

  // Room events
  ROOM_UPSERT: "room:upsert",
  ROOM_DELETE: "room:delete",
  ROOM_REFRESH: "room:refresh",

  // Typing events
  USER_TYPING: "user:typing",
  ON_TYPING: "on:typing",

  // Presence events
  STATUS_ONLINE: "status:online",
  CHECK_STATUS_ONLINE: "check:status_online",

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
  CALL_JOIN: "call:join",
  SIGNAL: "signal",

  // Read events
  MARK_READ: "mark:read",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_STATUS: "message:status",

  // Error
  ERROR_MSG: "error:message",
  EXCEPTION: "exception",

  // Quiz
  UPDATE_QUIZ: "update:quiz",
} as const;

/* ================= TYPES ================= */

export type SocketStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

interface SocketDetailState {
  status: SocketStatus;
  lastError: string | null;
}

interface SocketContextValue {
  sockets: Record<string, Socket>;
  socketStates: Record<string, SocketDetailState>;
  disconnectAll: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

/* ================= HELPERS ================= */

function normalizeNs(ns: string) {
  return ns.startsWith("/") ? ns : `/${ns}`;
}

function getAccessToken(): string | null {
  return useAuthStore.getState().tokens?.accessToken ?? null;
}

/* ================= PROVIDER ================= */

export function SocketProvider({
  children,
  namespaces = ["/chat"],
}: Readonly<{
  children: React.ReactNode;
  namespaces?: string[];
}>) {
  const baseUrl = WS_URL.replace(/\/+$/, "");
  const accessToken = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isAuthConfirmed = !!accessToken && !!userId;
  const isLoggedOut = !accessToken;

  const socketsRef = useRef<Record<string, Socket>>({});
  const [socketsMap, setSocketsMap] = useState<Record<string, Socket>>({});
  const [socketStates, setSocketStates] = useState<Record<string, SocketDetailState>>({});

  const updateState = useCallback(
    (ns: string, patch: Partial<SocketDetailState>) => {
      setSocketStates((prev) => ({
        ...prev,
        [ns]: { ...prev[ns], ...patch },
      }));
    },
    [],
  );

  /* ========= 1. INIT SOCKETS (mount + post-login) ========= */
  useEffect(() => {
    if (!isAuthConfirmed) return;
    const token = accessToken || getAccessToken();

    namespaces.forEach((rawNs) => {
      const ns = normalizeNs(rawNs);
      if (socketsRef.current[ns]) return;

      const socket = io(`${baseUrl}${ns}`, {
        transports: ["websocket"],
        autoConnect: false,
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      socket.on("connect", () => {
        updateState(ns, { status: "connected", lastError: null });
        networkListener.setConnected(true);
      });

      socket.on("disconnect", (reason) => {
        networkListener.setConnected(false);
        updateState(ns, {
          status: reason === "io server disconnect" ? "idle" : "reconnecting",
        });
      });

      socket.on("connect_error", (err: any) => {
        const msg = String(err?.message || "").toLowerCase();
        if (
          msg.includes("unauthorized") ||
          msg.includes("jwt") ||
          msg.includes("forbidden") ||
          err?.statusCode === 401
        ) {
          socket.disconnect();
        }
        updateState(ns, { status: "error", lastError: err?.message || "Connection error" });
      });

      socket.on("exception", (err: any) => {
        if (err?.statusCode === 401) {
          socket.disconnect();
          updateState(ns, { status: "error" });
        }
      });

      socket.io.on("reconnect_attempt", (attempt: number) => {
        updateState(ns, { status: "reconnecting" });
      });

      socketsRef.current[ns] = socket;
      setSocketsMap((prev) => ({ ...prev, [ns]: socket }));
      updateState(ns, { status: "idle" });
    });
  }, [namespaces, baseUrl, updateState, isAuthConfirmed]);

  /* ========= 2. TOKEN READY → CONNECT ALL ========= */
  useEffect(() => {
    if (!isAuthConfirmed) return;
    const token = accessToken || getAccessToken();
    if (!token) return;

    Object.entries(socketsRef.current).forEach(([ns, socket]) => {
      socket.auth = { token };
      if (!socket.connected) {
        updateState(ns, { status: "connecting" });
        socket.connect();
      }
    });
  }, [accessToken, isAuthConfirmed, updateState]);

  /* ========= 3. LOGOUT → DISCONNECT ALL ========= */
  const disconnectAll = useCallback(() => {
    Object.values(socketsRef.current).forEach((s) => {
      s.removeAllListeners();
      s.disconnect();
    });
    socketsRef.current = {};
    setSocketsMap({});
    setSocketStates({});
    networkListener.setConnected(false);
  }, []);

  useEffect(() => {
    if (isLoggedOut) disconnectAll();
  }, [isLoggedOut, disconnectAll]);

  const value = useMemo<SocketContextValue>(
    () => ({ sockets: socketsMap, socketStates, disconnectAll }),
    [socketsMap, socketStates, disconnectAll],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useSocket(namespace: string = "/chat") {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside SocketProvider");

  const ns = normalizeNs(namespace);
  const socket = ctx.sockets[ns] ?? null;

  const currentState = ctx.socketStates[ns] || {
    status: "idle" as SocketStatus,
    lastError: null,
  };

  const connect = useCallback(() => {
    if (!socket) return;
    if (!socket.connected && getAccessToken()) {
      socket.connect();
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket?.connected) socket.disconnect();
  }, [socket]);

  return {
    socket,
    status: currentState.status,
    isConnected: currentState.status === "connected",
    lastError: currentState.lastError,
    connect,
    disconnect,
  };
}
