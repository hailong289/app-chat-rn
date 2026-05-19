import { useEffect, useRef } from 'react';
import { useSocket, SocketEvents } from '../../providers/socket.provider';
import useMessageStore from '../../store/useMessage';
import useRoomStore from '../../store/useRoom';
import useContactStore from '../../store/useContact';
import { resolveCanonicalRoomId } from '../../libs/normalize-socket-message';

/**
 * Global socket handlers — mirrors app-chat-fe socketChatEventGlobal.tsx
 */
export const SocketEventGlobal = () => {
  const { socket: chatSocket } = useSocket('/chat');
  const { socket: callSocket } = useSocket('/call');

  const onMsgUpsert = useRef((data: unknown) => {
    if (!data || typeof data !== 'object') return;
    void useMessageStore.getState().upsetMsg(data as Record<string, unknown>);
  });

  const onMsgMarkRead = useRef((data: { roomId: string; lastMessageId: string }) => {
    if (!data?.roomId || !data?.lastMessageId) return;
    const canonicalId = resolveCanonicalRoomId(data.roomId);
    if (!canonicalId) return;

    useRoomStore.setState((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === canonicalId || r.roomId === canonicalId
          ? {
              ...r,
              is_read: true,
              unread_count: 0,
              last_read_id: data.lastMessageId,
            }
          : r,
      ),
      room:
        state.room?.id === canonicalId
          ? {
              ...state.room,
              is_read: true,
              unread_count: 0,
              last_read_id: data.lastMessageId,
            }
          : state.room,
    }));
  });

  const onMsgEmoji = useRef((data: any) => {
    const { addReaction, removeReaction } = useMessageStore.getState();
    if (data?.messageId && data?.emoji && data?.userId) {
      if (data.action === 'remove') {
        removeReaction(data.roomId, data.messageId, data.emoji, data.userId);
      } else {
        addReaction(data.roomId, data.messageId, data.emoji, data.userId);
      }
    }
  });

  const onMsgPinned = useRef((data: any) => {
    if (data?.messageId && data?.roomId) {
      useMessageStore.getState().togglePin(data.roomId, data.messageId, !!data.pinned);
    }
  });

  const onMsgError = useRef((data: any) => {
    useMessageStore.getState().upsetMsgError(data);
  });

  const onRoomUpsert = useRef((data: any) => {
    if (data) useRoomStore.getState().upsertRoom(data).catch(() => {});
  });

  const onRoomDelete = useRef((data: { roomId: string }) => {
    if (data?.roomId) useRoomStore.getState().removeRoom(data.roomId);
  });

  const onRoomRefresh = useRef((data: { roomId: string }) => {
    if (data?.roomId) useRoomStore.getState().getRoomDetail(data.roomId);
  });

  const onTyping = useRef(
    (data: {
      roomId: string;
      userId: string;
      fullname: string;
      isTyping: boolean;
    }) => {
      if (!data?.roomId || !data?.userId) return;
      const { setTypingUsers, typingUsers } = useRoomStore.getState();
      if (data.isTyping) {
        const current = typingUsers[data.roomId] || [];
        if (!current.find((u) => u.userId === data.userId)) {
          setTypingUsers(data.roomId, [
            ...current,
            { userId: data.userId, fullname: data.fullname || '' },
          ]);
        }
      } else {
        const current = typingUsers[data.roomId] || [];
        setTypingUsers(
          data.roomId,
          current.filter((u) => u.userId !== data.userId),
        );
      }
    },
  );

  const onStatusOnline = useRef(
    (data: { id: string; isOnline: boolean; onlineAt?: string | null }) => {
      if (data?.id) {
        const { setUserOnline, setUserOffline } = useContactStore.getState();
        if (data.isOnline) setUserOnline(data.id);
        else setUserOffline(data.id);
      }
    },
  );

  const onStatusOnlineBulk = useRef(
    (data: {
      users: Array<{ id: string; isOnline: boolean; onlineAt?: string | null }>;
    }) => {
      const { setUserOnline, setUserOffline } = useContactStore.getState();
      for (const u of data?.users || []) {
        if (u.isOnline) setUserOnline(u.id);
        else setUserOffline(u.id);
      }
    },
  );

  const onCallRequest = useRef((data: any) => {
    const callStore = require('../../store/useCallStore').default;
    if (!callStore.getState().socket && callSocket) {
      callStore.setState({ socket: callSocket });
    }
    void callStore.getState().eventCall('request', data);
  });

  const onCallAccepted = useRef((data: any) => {
    void require('../../store/useCallStore').default.getState().eventCall('accepted', data);
  });

  const onCallEnd = useRef((data: any) => {
    void require('../../store/useCallStore').default.getState().eventCall('end', data);

    const callId = data?.callId;
    const roomId = data?.roomId;
    const members = data?.history?.members ?? data?.members;
    if (callId && roomId && Array.isArray(members)) {
      useMessageStore.getState().patchCallMessage(roomId, callId, {
        members,
        ended_at: data?.history?.ended_at ?? null,
      });
    }
  });

  const onCallBusy = useRef((data: any) => {
    void require('../../store/useCallStore').default.getState().eventCall('busy', data);
  });

  const onCallCancelled = useRef((data: any) => {
    void require('../../store/useCallStore').default.getState().eventCall('cancelled', data);
  });

  const onCallRejected = useRef((data: any) => {
    void require('../../store/useCallStore').default.getState().eventCall('rejected', data);
  });

  useEffect(() => {
    if (!callSocket) return;
    const callStore = require('../../store/useCallStore').default;
    callStore.setState({ socket: callSocket });
    return () => {
      if (callStore.getState().socket === callSocket) {
        callStore.setState({ socket: null });
      }
    };
  }, [callSocket]);

  useEffect(() => {
    if (!chatSocket) return;

    chatSocket.on(SocketEvents.MESSAGE_UPSERT, onMsgUpsert.current);
    chatSocket.on(SocketEvents.MARK_READ, onMsgMarkRead.current);
    chatSocket.on(SocketEvents.MESSAGE_EMOJI, onMsgEmoji.current);
    chatSocket.on(SocketEvents.MESSAGE_PINNED, onMsgPinned.current);
    chatSocket.on(SocketEvents.ERROR_MSG, onMsgError.current);
    chatSocket.on(SocketEvents.ROOM_UPSERT, onRoomUpsert.current);
    chatSocket.on(SocketEvents.ROOM_DELETE, onRoomDelete.current);
    chatSocket.on(SocketEvents.ROOM_REFRESH, onRoomRefresh.current);
    chatSocket.on(SocketEvents.ON_TYPING, onTyping.current);
    chatSocket.on(SocketEvents.STATUS_ONLINE, onStatusOnline.current);
    chatSocket.on('status:online:bulk', onStatusOnlineBulk.current);

    chatSocket.emit('heartbeat');
    const heartbeatInterval = setInterval(() => {
      if (chatSocket.connected) chatSocket.emit('heartbeat');
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      chatSocket.off(SocketEvents.MESSAGE_UPSERT, onMsgUpsert.current);
      chatSocket.off(SocketEvents.MARK_READ, onMsgMarkRead.current);
      chatSocket.off(SocketEvents.MESSAGE_EMOJI, onMsgEmoji.current);
      chatSocket.off(SocketEvents.MESSAGE_PINNED, onMsgPinned.current);
      chatSocket.off(SocketEvents.ERROR_MSG, onMsgError.current);
      chatSocket.off(SocketEvents.ROOM_UPSERT, onRoomUpsert.current);
      chatSocket.off(SocketEvents.ROOM_DELETE, onRoomDelete.current);
      chatSocket.off(SocketEvents.ROOM_REFRESH, onRoomRefresh.current);
      chatSocket.off(SocketEvents.ON_TYPING, onTyping.current);
      chatSocket.off(SocketEvents.STATUS_ONLINE, onStatusOnline.current);
      chatSocket.off('status:online:bulk', onStatusOnlineBulk.current);
    };
  }, [chatSocket]);

  useEffect(() => {
    if (!callSocket) return;

    callSocket.on(SocketEvents.MESSAGE_UPSERT, onMsgUpsert.current);
    callSocket.on(SocketEvents.CALL_REQUEST, onCallRequest.current);
    callSocket.on(SocketEvents.CALL_ACCEPTED, onCallAccepted.current);
    callSocket.on(SocketEvents.CALL_END, onCallEnd.current);
    callSocket.on(SocketEvents.CALL_BUSY, onCallBusy.current);
    callSocket.on('call:cancelled', onCallCancelled.current);
    callSocket.on('call:rejected', onCallRejected.current);

    callSocket.emit('heartbeat');
    const callHeartbeat = setInterval(() => {
      if (callSocket.connected) callSocket.emit('heartbeat');
    }, 15000);

    return () => {
      clearInterval(callHeartbeat);
      callSocket.off(SocketEvents.MESSAGE_UPSERT, onMsgUpsert.current);
      callSocket.off(SocketEvents.CALL_REQUEST, onCallRequest.current);
      callSocket.off(SocketEvents.CALL_ACCEPTED, onCallAccepted.current);
      callSocket.off(SocketEvents.CALL_END, onCallEnd.current);
      callSocket.off(SocketEvents.CALL_BUSY, onCallBusy.current);
      callSocket.off('call:cancelled', onCallCancelled.current);
      callSocket.off('call:rejected', onCallRejected.current);
    };
  }, [callSocket]);

  return null;
};
