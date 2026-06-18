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
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import HeaderChatComponent from '../components/headers/headers-chat.component';
import type { MainStackParamList } from '../navigations/MainStackNavigator';
import MessageItem, {
  ChatMessageItem,
  groupMessagesWithSeparators,
  OnReplyContext,
} from '../components/chat/message.component';
import { ChatModals } from '../components/chat/ChatModals';
import { useSocket, SocketEvents } from '../providers/socket.provider';
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  // Ref-based "at bottom" for the auto-scroll effect — avoids state flapping.
  const isAtBottomRef = useRef(true);
  // When true, every content-size change will scroll to bottom (until user drags).
  const pendingInitialScrollRef = useRef(true);

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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const changeEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';

    const updateKeyboardHeight = (height: number) => {
      setKeyboardHeight(height);
      setKeyboardVisible(height > 0);
    };

    const onShow = (event: { endCoordinates: { height: number; screenY: number } }) => {
      const screenHeight = Dimensions.get('window').height;
      const height = Math.max(0, screenHeight - event.endCoordinates.screenY);
      updateKeyboardHeight(height > 0 ? height : event.endCoordinates.height);
      if (isAtBottomRef.current) {
        requestAnimationFrame(() => handleScrollToEnd(true));
      }
    };
    const onHide = () => updateKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const changeSub =
      Platform.OS === 'ios' ? Keyboard.addListener(changeEvent, onShow) : null;
    return () => {
      showSub.remove();
      hideSub.remove();
      changeSub?.remove();
    };
  }, [handleScrollToEnd]);

  useEffect(() => {
    hasMoreOlderRef.current = true;
    atTopRef.current = false;
    initialScrollDoneRef.current = false;
    pendingInitialScrollRef.current = true;
    isAtBottomRef.current = true;
  }, [chatId]);

  useEffect(() => {
    const timeout = setTimeout(() => markRead(), 800);
    return () => clearTimeout(timeout);
    // markRead intentionally omitted — only run once per room open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Auto-scroll when a new message arrives and user is already at the bottom.
  const chatDataLengthRef = useRef(chatData.length);
  useEffect(() => {
    const prevLen = chatDataLengthRef.current;
    chatDataLengthRef.current = chatData.length;
    if (chatData.length > prevLen && isAtBottomRef.current) {
      handleScrollToEnd(true);
    }
  }, [chatData.length, handleScrollToEnd]);

  // Listen for real-time messages (including reply data) from socket
  useEffect(() => {
    if (!socket) return;
    const { upsertMessage, upsetMsgError } = useMessageStore.getState();

    const handleUpsert = (msg: Record<string, unknown>) => {
      void upsertMessage(msg);
    };
    const handleError = (payload: any) => {
      upsetMsgError(payload);
    };
    const handleRecall = (payload: any) => {
      const store = useMessageStore.getState();
      const roomId = payload?.roomId;
      const msgId = payload?.messageId || payload?._id || payload?.id;
      if (roomId && msgId) store.recallMessage(roomId, msgId);
    };
    const handleDelete = (payload: any) => {
      const store = useMessageStore.getState();
      const roomId = payload?.roomId;
      const msgId = payload?.messageId || payload?._id || payload?.id;
      if (roomId && msgId) store.deleteMessage(roomId, msgId);
    };
    const handleEmoji = (msg: Record<string, unknown>) => {
      void upsertMessage(msg);
    };
    const handlePinned = (msg: Record<string, unknown>) => {
      void upsertMessage(msg);
    };

    socket.on(SocketEvents.MESSAGE_UPSERT, handleUpsert);
    socket.on(SocketEvents.ERROR_MSG, handleError);
    socket.on(SocketEvents.MESSAGE_RECALL, handleRecall);
    socket.on(SocketEvents.MESSAGE_DELETE, handleDelete);
    socket.on(SocketEvents.MESSAGE_EMOJI, handleEmoji);
    socket.on(SocketEvents.MESSAGE_PINNED, handlePinned);

    return () => {
      socket.off(SocketEvents.MESSAGE_UPSERT, handleUpsert);
      socket.off(SocketEvents.ERROR_MSG, handleError);
      socket.off(SocketEvents.MESSAGE_RECALL, handleRecall);
      socket.off(SocketEvents.MESSAGE_DELETE, handleDelete);
      socket.off(SocketEvents.MESSAGE_EMOJI, handleEmoji);
      socket.off(SocketEvents.MESSAGE_PINNED, handlePinned);
    };
  }, [socket]);

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

  const replyingToRef = useRef<MessageType | null>(null);
  const handleReply = useCallback((msg: MessageType) => {
    replyingToRef.current = msg;
    setReplyingTo(msg);
  }, []);

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
      const older = await loadOlderMessages(chatId, 20);
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

      // Load older messages when user scrolls near top
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
      const atBottom = distanceFromBottom < 60;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
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

  const inputBottomOffset =
    keyboardHeight > 0 ? Math.max(0, keyboardHeight - insets.bottom) : 0;

  return (
    <OnReplyContext.Provider value={handleReply}>
      <View style={styles.flex}>
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
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
              scrollEventThrottle={32}
              // Keep visible item stable when older messages are prepended.
              maintainVisibleContentPosition={{
                minIndexForVisible: 1,
              }}
              // Scroll to bottom on every content-size change until user drags.
              onContentSizeChange={() => {
                if (pendingInitialScrollRef.current && chatData.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              onScrollBeginDrag={() => {
                pendingInitialScrollRef.current = false;
              }}
              contentContainerStyle={[
                styles.listContent,
                chatData.length === 0 && styles.listContentEmpty,
              ]}
              removeClippedSubviews={false}
              maxToRenderPerBatch={10}
              windowSize={11}
              initialNumToRender={10}
            />
          )}

          <ScrollToBottomButton
            isVisible={!isAtBottom && chatData.length > 0 && !isLoadingMessages}
            unreadCount={roomMeta.unreadCount}
            isRead={roomMeta.isRead}
            onScrollToBottom={() => handleScrollToEnd(true)}
          />
        </View>

        <View style={{ marginBottom: inputBottomOffset }}>
          <InputBar
            roomId={chatId}
            replyingTo={replyingTo}
            typingUsers={currentTypingUsers}
            currentUserId={user?.id}
            keyboardVisible={keyboardVisible}
            onSend={handleSend}
            onClearReply={() => setReplyingTo(null)}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </View>
        <ChatModals />
      </View>

      <ChatDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        roomId={chatId}
        onScrollToMessage={() => setDrawerVisible(false)}
      />
    </OnReplyContext.Provider>
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
