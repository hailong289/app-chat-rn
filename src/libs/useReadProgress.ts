import { useCallback, useEffect, useRef } from 'react';
import { ObjectId } from 'bson';
import { useSocket } from '../providers/socket.provider';
import useMessageStore from '../store/useMessage';

function isValidMongoId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.length === 24 && ObjectId.isValid(id);
}

/** Tin nhắn cuối cùng của người khác (giống app-chat-fe useReadProgress). */
function getLastReadableMessageId(roomId: string): string | null {
  const msgs = useMessageStore.getState().messagesRoom[roomId]?.messages ?? [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (!msg.isMine && !msg.isDeleted && isValidMongoId(msg.id)) {
      return msg.id;
    }
  }
  return null;
}

/**
 * Hook tự động mark-read tin nhắn khi người dùng scroll đến cuối.
 * Payload socket phải dùng `lastMessageId` (không phải `messageId`).
 */
export function useReadProgress(roomId: string) {
  const { socket } = useSocket();
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    markedRef.current.clear();
  }, [roomId]);

  const markRead = useCallback(
    (messageId?: string) => {
      if (!roomId) return;

      const readedRooms = useMessageStore.getState().readedRooms;
      const candidate =
        (messageId && isValidMongoId(messageId) ? messageId : null) ||
        getLastReadableMessageId(roomId) ||
        (isValidMongoId(readedRooms[roomId]) ? readedRooms[roomId] : null);

      if (!candidate || markedRef.current.has(candidate)) return;

      markedRef.current.add(candidate);
      socket?.emit('mark:read', {
        roomId,
        lastMessageId: candidate,
      });
    },
    [socket, roomId],
  );

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (distanceFromBottom < 100) {
        markRead();
      }
    },
    [markRead],
  );

  return { markRead, handleScroll };
}

export default useReadProgress;
