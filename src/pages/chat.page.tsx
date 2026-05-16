import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import HeaderChatComponent from '../components/headers/headers-chat.component';
import type { MainStackParamList } from '../navigations/MainStackNavigator';
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
import { ScrollToBottomButton } from '../components/chat/scroll-to-bottom-button';
import { ChatLoadingSkeleton } from '../components/chat/chat-loading-skeleton';
import { useChatScreen } from '../hooks/useChatScreen';
import type { MessageType as MsgType } from '../types/message.type';

/** Stable empty reference — avoids Zustand re-render loop (`?? []` creates new array each time). */
const EMPTY_MESSAGES: MsgType[] = [];

const ChatPage: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const flatListRef = useRef<FlatList<ChatMessageItem>>(null);
  const hasMoreOlderRef = useRef(true);
  const atTopRef = useRef(false);
  const initialScrollDoneRef = useRef(false);

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const paramRoomId = (route.params as { roomId: string })?.roomId ?? '';
  const { socket } = useSocket();
  const { chatId, isLoadingMessages } = useChatScreen(paramRoomId, socket);

  const sendMessage = useMessageStore((s) => s.sendMessage);
  const loadOlderMessages = useMessageStore((s) => s.loadOlderMessages);
  const messages = useMessageStore(
    (s) => s.messagesRoom[chatId]?.messages ?? EMPTY_MESSAGES,
  );
  const { user } = useAuthStore();
  const { typingUsers, room, rooms } = useRoomStore();
  const { handleScroll: handleReadScroll, markRead } = useReadProgress(chatId);

  const chatData = useMemo<ChatMessageItem[]>(
    () => groupMessagesWithSeparators(messages),
    [messages],
  );

  const handleScrollToEnd = useCallback((animated = false) => {
    if (chatData.length === 0) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, [chatData.length]);

  useEffect(() => {
    hasMoreOlderRef.current = true;
    atTopRef.current = false;
    initialScrollDoneRef.current = false;
  }, [chatId]);

  useEffect(() => {
    const timeout = setTimeout(() => markRead(), 800);
    return () => clearTimeout(timeout);
    // markRead intentionally omitted — only run once per room open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (isLoadingMessages || chatData.length === 0) return;
    if (initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    handleScrollToEnd(false);
  }, [isLoadingMessages, chatData.length, handleScrollToEnd]);

  const chatDataLengthRef = useRef(chatData.length);
  useEffect(() => {
    const prevLen = chatDataLengthRef.current;
    chatDataLengthRef.current = chatData.length;
    if (chatData.length > prevLen && isAtBottom) {
      handleScrollToEnd(true);
    }
  }, [chatData.length, isAtBottom, handleScrollToEnd]);

  const handleTypingStart = useCallback(() => {
    socket?.emit('user:typing', { roomId: chatId, isTyping: true });
  }, [socket, chatId]);

  const handleTypingStop = useCallback(() => {
    socket?.emit('user:typing', { roomId: chatId, isTyping: false });
  }, [socket, chatId]);

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
        roomId: chatId,
        content,
        attachments,
        type: type as 'text' | 'image' | 'file' | 'video',
        replyTo,
        socket,
        userId: user?.id,
        userFullname: user?.fullname,
        userAvatar: user?.avatar,
      });
      setReplyingTo(null);
      handleScrollToEnd(true);
    },
    [chatId, socket, user, sendMessage, handleScrollToEnd],
  );

  const handleReply = useCallback((msg: MessageType) => setReplyingTo(msg), []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageItem }) => (
      <MessageItem item={item} onReply={handleReply} />
    ),
    [handleReply],
  );

  const keyExtractor = useCallback((item: ChatMessageItem) => item.id, []);

  const listHeaderComponent = useCallback(
    () =>
      isFetchingMore ? (
        <View style={styles.loadMoreHeader}>
          <ActivityIndicator size="small" color="#42A59F" />
        </View>
      ) : null,
    [isFetchingMore],
  );

  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || isLoadingMessages) return;
    if (!hasMoreOlderRef.current || messages.length === 0) return;

    setIsFetchingMore(true);
    try {
      const older = await loadOlderMessages(chatId, 50);
      if (!older || older.length === 0) {
        hasMoreOlderRef.current = false;
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [chatId, isFetchingMore, isLoadingMessages, loadOlderMessages, messages.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const isAtTop = contentOffset.y <= 48;

      if (isAtTop) {
        if (!atTopRef.current) {
          atTopRef.current = true;
          void handleLoadMore();
        }
      } else if (atTopRef.current) {
        atTopRef.current = false;
      }

      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setIsAtBottom(distanceFromBottom < 120);

      handleReadScroll(event);
    },
    [handleLoadMore, handleReadScroll],
  );

  const roomMeta = useMemo(() => {
    const currentRoom =
      rooms.find((r) => r.id === chatId || r.roomId === chatId) ?? room;
    return {
      unreadCount: currentRoom?.unread_count ?? 0,
      isRead: currentRoom?.is_read ?? true,
    };
  }, [rooms, room, chatId]);

  const currentTypingUsers = useMemo(
    () =>
      (typingUsers[chatId] || []).map((u) => ({
        userId: u.userId,
        fullname: u.fullname,
      })),
    [typingUsers, chatId],
  );

  const showSkeleton = isLoadingMessages && chatData.length === 0;
  const showEmpty = !isLoadingMessages && chatData.length === 0;

  const openDrawer = useCallback(() => setDrawerVisible(true), []);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: (props) => (
        <HeaderChatComponent {...props} onInfoPress={openDrawer} />
      ),
    });
  }, [navigation, openDrawer]);

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.flex}>
          {showSkeleton ? (
            <View style={styles.skeletonWrap}>
              <ChatLoadingSkeleton />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={chatData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              ListHeaderComponent={listHeaderComponent}
              ListEmptyComponent={
                showEmpty ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
                    <Text style={styles.emptyHint}>
                      Gửi tin nhắn đầu tiên để bắt đầu trò chuyện
                    </Text>
                  </View>
                ) : null
              }
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.listContent,
                chatData.length === 0 && styles.listContentEmpty,
              ]}
              removeClippedSubviews={Platform.OS === 'android'}
              maxToRenderPerBatch={12}
              windowSize={9}
              initialNumToRender={18}
            />
          )}

          <ScrollToBottomButton
            isVisible={!isAtBottom && chatData.length > 0 && !isLoadingMessages}
            unreadCount={roomMeta.unreadCount}
            isRead={roomMeta.isRead}
            onScrollToBottom={() => handleScrollToEnd(true)}
          />
        </View>

        <InputBar
          roomId={chatId}
          replyingTo={replyingTo}
          typingUsers={currentTypingUsers}
          currentUserId={user?.id}
          onSend={handleSend}
          onClearReply={() => setReplyingTo(null)}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </KeyboardAvoidingView>

      <ChatDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        roomId={chatId}
        onScrollToMessage={() => setDrawerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  skeletonWrap: { flex: 1, paddingTop: 8 },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  loadMoreHeader: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ChatPage;
