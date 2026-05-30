import { useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";
import { SocketEvents } from "../providers/socket.provider";

/** Plain forward-only, debounced `message:delivered` emitter (per room). Use in non-hook modules. */
export function makeDeliveredAcker(socket: Socket | null | undefined) {
  const lastAcked: Record<string, string> = {};
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};
  return (roomId: string, msgId: string) => {
    if (!socket || !roomId || !msgId) return;
    if (lastAcked[roomId] === msgId) return;
    clearTimeout(timers[roomId]);
    timers[roomId] = setTimeout(() => {
      lastAcked[roomId] = msgId;
      socket.emit(SocketEvents.MESSAGE_DELIVERED, { roomId, msgId });
    }, 300);
  };
}

/** Hook variant (stable across renders) for components. */
export function useDeliveredAcker(socket: Socket | null | undefined) {
  const lastAcked = useRef<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  return useCallback(
    (roomId: string, msgId: string) => {
      if (!socket || !roomId || !msgId) return;
      if (lastAcked.current[roomId] === msgId) return;
      clearTimeout(timers.current[roomId]);
      timers.current[roomId] = setTimeout(() => {
        lastAcked.current[roomId] = msgId;
        socket.emit(SocketEvents.MESSAGE_DELIVERED, { roomId, msgId });
      }, 300);
    },
    [socket],
  );
}
