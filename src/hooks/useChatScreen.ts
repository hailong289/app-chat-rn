import { useEffect, useRef, useState } from 'react';
import useMessageStore from '../store/useMessage';
import useRoomStore from '../store/useRoom';
import { resolveCanonicalRoomId } from '../libs/normalize-socket-message';
import { syncOnOpen } from '../libs/syncOnOpen';

const LOAD_TIMEOUT_MS = 10_000;
const MAX_LOAD_ATTEMPTS = 3;

/**
 * Chat room bootstrap.
 * Strategy: always load from API first (10 latest messages),
 * fallback to SQLite cache if API fails.
 */
export function useChatScreen(
  paramRoomId: string,
  socket: { emit: (e: string, p: object) => void } | null,
) {
  const chatId = resolveCanonicalRoomId(paramRoomId);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const loadedChatIdRef = useRef<string | null>(null);
  const socketRef = useRef(socket);
  socketRef.current = socket;

  const isLoadingMessages = loadingChatId === chatId;

  useEffect(() => {
    if (!chatId) return;

    socketRef.current?.emit('join', { roomId: chatId });
    void useRoomStore.getState().getRoomDetail(chatId);

    if (loadedChatIdRef.current === chatId) return;
    loadedChatIdRef.current = chatId;

    const myChatId = chatId;
    const isStillActive = () => loadedChatIdRef.current === myChatId;

    // Always show loading on room switch — API is source of truth
    setLoadingChatId(myChatId);

    const finishLoading = () => {
      setLoadingChatId((cur) => (cur === myChatId ? null : cur));
    };

    const attempt = async (n: number): Promise<void> => {
      if (!isStillActive()) return;
      try {
        const { fetched } = await useMessageStore
          .getState()
          .loadRoomFromCache(myChatId, 20);
        await fetched;
        finishLoading();
        // Delta-fill any gap missed since last open (best-effort).
        void syncOnOpen(myChatId);
      } catch (err) {
        if (!isStillActive()) return;
        if (n >= MAX_LOAD_ATTEMPTS - 1) {
          console.warn(`[Chat] loadRoomFromCache failed for ${myChatId}`, err);
          finishLoading();
          return;
        }
        const delay = 500 * Math.pow(2, n);
        await new Promise<void>((r) => setTimeout(r, delay));
        if (!isStillActive()) return;
        await attempt(n + 1);
      }
    };

    void attempt(0);

    const safety = setTimeout(() => {
      if (isStillActive()) finishLoading();
    }, LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(safety);
    };
  }, [chatId]);

  return {
    chatId,
    isLoadingMessages,
  };
}
