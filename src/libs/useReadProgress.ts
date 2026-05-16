import { useCallback, useRef } from 'react';
import { useSocket } from '../providers/socket.provider';
import useMessageStore from '../store/useMessage';

/**
 * Hook tự động mark-read tin nhắn khi người dùng scroll đến cuối.
 * Gọi onRead() khi scroll đến cuối FlatList.
 */
export function useReadProgress(roomId: string) {
  const { socket } = useSocket();
  const { readedRooms } = useMessageStore();
  const lastReadId = readedRooms[roomId];
  const markedRef = useRef<Set<string>>(new Set());

  /**
   * Gọi khi FlatList scroll đến bottom (hoặc gần cuối).
   * Emit socket event để server biết người dùng đã đọc.
   */
  const markRead = useCallback(
    (messageId?: string) => {
      const idToMark = messageId || lastReadId;
      if (!idToMark || markedRef.current.has(idToMark)) return;
      markedRef.current.add(idToMark);
      socket?.emit('message:read', { roomId, messageId: idToMark });
    },
    [socket, roomId, lastReadId],
  );

  /**
   * Handler dùng cho onScroll của FlatList.
   * Khi scroll đến gần cuối (< 100px) thì tự động markRead.
   */
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
