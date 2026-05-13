import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import MessageItem, {
  ChatMessageItem,
  groupMessagesWithSeparators,
} from '../components/chat/message.component';
import { useSocket } from '../providers/socket.provider';
import useMessageStore from '../store/useMessage';
import useAuthStore from '../store/useAuth';
import useRoomStore from '../store/useRoom';
import type { FilePreview, MessageType } from '../types/message.type';
import { InputBar } from '../components/chat/input-bar';
import { ChatDrawer } from '../components/chat/chat-drawer';
import { useReadProgress } from '../libs/useReadProgress';

const ESTIMATED_ITEM_HEIGHT = 70;

const ChatPage: React.FC = () => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<any>(null);
  const hasMoreOlderRef = useRef<boolean>(true);
  const atTopRef = useRef<boolean>(false);

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);

  const { roomId } = (route.params as { roomId: string }) || {};
  const { socket } = useSocket();
  const { sendMessage, isLoading: msgLoading, messagesRoom, getMessages } =
    useMessageStore();
  const { user } = useAuthStore();
  const { typingUsers, room, getRoomDetail } = useRoomStore();
  const { handleScroll: handleReadScroll, markRead } = useReadProgress(roomId);

  const itemHeightCache = useRef<Record<string, number>>({});

  // Load room detail & messages on mount
  useEffect(() => {
    hasMoreOlderRef.current = true;
    getMessages(roomId);
    getRoomDetail(roomId);
    handleScrollToEnd();
  }, [roomId]);

  // Mark read when screen is focused
  useEffect(() => {
    const timeout = setTimeout(() => markRead(), 800);
    return () => clearTimeout(timeout);
  }, [roomId]);

  // ── Typing emit ────────────────────────────────────────────────────────
  const handleTypingStart = useCallback(() => {
    socket?.emit('typing:start', { roomId });
  }, [socket, roomId]);

  const handleTypingStop = useCallback(() => {
    socket?.emit('typing:stop', { roomId });
  }, [socket, roomId]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = useCallback(
    ({
      content,
      attachments,
      type,
      replyTo,
    }: {
      content: string;
      attachments: FilePreview[];
      type: string;
      replyTo?: string;
    }) => {
      if (!content.trim() && attachments.length === 0) return;

      sendMessage({
        roomId,
        content,
        attachments,
        type: type as any,
        replyTo,
        socket,
        userId: user?.id,
        userFullname: user?.fullname,
        userAvatar: user?.avatar,
      });
      setReplyingTo(null);
      handleScrollToEnd();
    },
    [roomId, socket, user, sendMessage],
  );

  // ── Chat data ──────────────────────────────────────────────────────────
  const chatData = useMemo<ChatMessageItem[]>(
    () => groupMessagesWithSeparators(messagesRoom[roomId]?.messages),
    [messagesRoom, roomId],
  );

  const renderItem = ({ item }: { item: ChatMessageItem }) => {
    return (
      <View onLayout={handleItemLayout(item.id)}>
        <MessageItem
          item={item}
          onReply={(msg) => setReplyingTo(msg)}
        />
      </View>
    );
  };

  const handleItemLayout = (id: string) => {
    return (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      if (itemHeightCache.current[id] !== height) {
        itemHeightCache.current[id] = height;
      }
    };
  };

  // ── Load more (older messages) ─────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || msgLoading) return;

    const roomMessages = messagesRoom[roomId]?.messages || [];
    if (roomMessages.length === 0) return;

    const firstMessage = roomMessages[0];
    if (!firstMessage || !hasMoreOlderRef.current) return;

    setIsFetchingMore(true);
    try {
      const hasMore = await getMessages(roomId, firstMessage.id, 'old');
      if (!hasMore) {
        hasMoreOlderRef.current = false;
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [getMessages, isFetchingMore, messagesRoom, msgLoading, roomId]);

  // ── Scroll handlers ────────────────────────────────────────────────────
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const isAtTop = contentOffset.y <= 36;
      if (isAtTop) {
        if (!atTopRef.current) {
          atTopRef.current = true;
          handleLoadMore();
        }
      } else {
        if (atTopRef.current) atTopRef.current = false;
      }
      // Auto mark-read when near bottom
      handleReadScroll(event);
    },
    [handleLoadMore, handleReadScroll],
  );

  const handleScrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 500);
  };

  const getItemLayout = (data: any, index: number) => {
    const item = data[index];
    const itemId = item.id;

    if (itemHeightCache.current[itemId]) {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const prevItemId = data[i].id;
        offset += itemHeightCache.current[prevItemId] || ESTIMATED_ITEM_HEIGHT;
      }
      return {
        length: itemHeightCache.current[itemId],
        offset,
        index,
      };
    }
    return {
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    };
  };

  // ── Typing users for current room ──────────────────────────────────────
  const currentTypingUsers = useMemo(
    () => (typingUsers[roomId] || []).map(u => ({
      userId: u.userId,
      fullname: u.fullname,
    })),
    [typingUsers, roomId],
  );

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={chatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            isFetchingMore ? (
              <View className="py-2">
                <ActivityIndicator size="small" color="#4B5563" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-400">Chưa có tin nhắn nào</Text>
            </View>
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
        />

        {/* Input Bar */}
        <InputBar
          roomId={roomId}
          replyingTo={replyingTo}
          typingUsers={currentTypingUsers}
          currentUserId={user?.id}
          onSend={handleSend}
          onClearReply={() => setReplyingTo(null)}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </KeyboardAvoidingView>

      {/* Chat Drawer */}
      <ChatDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        roomId={roomId}
        onScrollToMessage={(msgId) => {
          // TODO: scroll to message by id
          setDrawerVisible(false);
        }}
      />
    </>
  );
};

export default ChatPage;
