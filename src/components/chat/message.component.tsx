import { MessageType } from '@/src/types/message.type';
import React, { useCallback, useMemo, memo, createContext, useRef } from 'react';
import { sameAttachments, sameIds, sameMessageFields, sameReactions, sameStringArr } from '@/src/libs/equality';
import {
  View,
  Text,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { HStack } from '../ui/hstack';
import Helpers from '@/src/libs/helpers';
import ImageGrid from './image-grid.component';
import VideoGrid from './video-grid.component';
import { ImageAvatar } from './image-avatar.component';
import { Box } from '../ui/box';
import { ReplyPreview } from './reply-preview';
import { useSocket } from '@/src/providers/socket.provider';
import useAuthStore from '@/src/store/useAuth';
import useMessageStore from '@/src/store/useMessage';
import useRoomStore from '@/src/store/useRoom';
import useChatUIStore from '@/src/store/useChatUIStore';
import { deriveStatus, deriveGroupCounts } from '@/src/store/lib/messageStatus';
import CallBubble from './call-bubble';
import { MessageReactions } from './message-reactions';
import LinkPreview from './LinkPreview';
import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_BUBBLE_MAX_WIDTH,
} from './constants/messageConstants';
import SystemContent from './message/SystemContent';
import QuizContent from './message/QuizContent';
import FlashcardContent from './message/FlashcardContent';
import TodoContent from './message/TodoContent';

/** Context to pass the page-level onReply down without changing renderItem identity. */
export const OnReplyContext = createContext<((msg: MessageType) => void) | undefined>(undefined);

export type DateSeparatorItem = {
  kind: 'date';
  id: string;
  label: string;
  rawDate: string;
};

export type ChatMessageItem =
  | (MessageType & {
    kind: 'message';
    isFirstInSenderGroup: boolean;
    isLastInSenderGroup: boolean;
    isLastInDateGroup: boolean;
    showAvatar: boolean;
    messageSpacing: string;
  })
  | DateSeparatorItem;

export const groupMessagesWithSeparators = (
  messages: MessageType[] = [],
): ChatMessageItem[] => {
  if (messages.length === 0) return [];

  // Step 1: Group messages by date — key by date string so separator id is
  // stable even when older messages are prepended.
  const dateGroups: { key: string; msgs: MessageType[] }[] = [];
  let currentGroup: MessageType[] = [];
  let lastDateKey: string | null = null;

  messages.forEach((msg) => {
    const date = new Date(msg.createdAt);
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    if (lastDateKey !== null && lastDateKey !== dateKey) {
      dateGroups.push({ key: lastDateKey, msgs: currentGroup });
      currentGroup = [];
    }
    currentGroup.push(msg);
    lastDateKey = dateKey;
  });
  if (currentGroup.length > 0 && lastDateKey) {
    dateGroups.push({ key: lastDateKey, msgs: currentGroup });
  }

  // Step 2: Build flat list with date separators and sender grouping metadata
  const items: ChatMessageItem[] = [];

  dateGroups.forEach(({ key: dateKey, msgs: group }) => {
    if (group.length === 0) return;

    items.push({
      kind: 'date',
      // Stable key: based on date string, not first message id.
      id: `date-${dateKey}`,
      label: Helpers.formatDateMessage(new Date(group[0].createdAt)),
      rawDate: group[0].createdAt,
    });

    group.forEach((msg, idx) => {
      const prevMsg = idx > 0 ? group[idx - 1] : null;
      const nextMsg = idx < group.length - 1 ? group[idx + 1] : null;
      const isLastInDateGroup = idx === group.length - 1;
      const isSameSenderAsPrev = prevMsg?.sender._id === msg.sender._id;
      const isSameSenderAsNext = nextMsg?.sender._id === msg.sender._id;

      items.push({
        ...msg,
        kind: 'message',
        isFirstInSenderGroup: !isSameSenderAsPrev,
        isLastInSenderGroup: !isSameSenderAsNext,
        isLastInDateGroup,
        showAvatar: !isSameSenderAsNext || isLastInDateGroup,
        messageSpacing: isSameSenderAsPrev ? 'mt-1' : 'mt-3',
      });
    });
  });

  return items;
};

type Attachment = NonNullable<MessageType['attachments']>[number];

type MessageBubbleProps = {
  item: ChatMessageItem & { kind: 'message' };
  onReply?: (msg: MessageType) => void;
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(({ item, onReply }) => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  // Use individual selectors — functions are stable (created once in store), won't trigger re-renders
  const openImageViewer = useChatUIStore((s) => s.openImageViewer);
  const openVideoViewer = useChatUIStore((s) => s.openVideoViewer);
  const openContextMenu = useChatUIStore((s) => s.openContextMenu);
  const openReactionPicker = useChatUIStore((s) => s.openReactionPicker);
  const isExpanded = useChatUIStore((s) => s.expandedMessages.has(item.id));
  const toggleExpanded = useChatUIStore((s) => s.toggleExpanded);
  const hiddenByMe = item.hiddenBy?.includes(user?._id || '') ?? false;

  // ── 4-state delivery/read tick + per-recipient group counts ──
  const room = useRoomStore((s) => s.room);
  const myId = user?._id;
  // Select the STABLE messages array reference, then memo-map to ids — never
  // return a freshly-mapped array directly from a selector (infinite-loop trap).
  const msgs = useMessageStore((s) =>
    room ? s.messagesRoom[room.id]?.messages : undefined,
  );
  const order = useMemo(() => (msgs ? msgs.map((m) => m.id) : []), [msgs]);
  const derived =
    room && myId ? deriveStatus(item as any, room as any, myId, order) : null;

  const { imageAttachments, videoAttachments, hasMedia } = useMemo(() => {
    const list = (item.attachments ?? []) as Attachment[];
    const media = list.filter(
      (a) =>
        a.kind === 'image' ||
        a.kind === 'video' ||
        a.mimeType?.startsWith('image/') ||
        a.mimeType?.startsWith('video/'),
    );
    return {
      imageAttachments: media.filter(
        (a) => a.kind === 'image' || a.mimeType?.startsWith('image/'),
      ),
      videoAttachments: media.filter(
        (a) => a.kind === 'video' || a.mimeType?.startsWith('video/'),
      ),
      hasMedia: media.length > 0,
    };
  }, [item.attachments]);

  const isLongMessage = (content: string | null | undefined): boolean => {
    if (!content) return false;
    return content.length > MAX_MESSAGE_LENGTH;
  };

  const previewUrl = useMemo(() => {
    if (!item.content || hasMedia) return null;
    const match = item.content.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
  }, [item.content, hasMedia]);

  const resendMessage = useCallback(() => {
    const { resendMessage } = useMessageStore.getState();
    resendMessage(item.roomId, item.id, socket);
  }, [item.roomId, item.id, socket]);


  const getAttachmentSource = useCallback((attachment: Attachment) => {
    if (attachment?.mimeType?.startsWith('video/')) {
      return attachment.uploadedUrl || attachment.url || attachment.thumbUrl;
    }
    return attachment?.thumbUrl || attachment?.uploadedUrl || attachment?.url;
  }, []);

  const handleImagePress = useCallback(
    (index: number) => {
      openImageViewer({ messageId: item.id, index, images: imageAttachments as any[] });
    },
    [openImageViewer, item.id, imageAttachments],
  );

  const handleVideoPress = useCallback(
    (index: number) => {
      openVideoViewer({
        messageId: item.id,
        index,
        videos: videoAttachments as any[],
        getSource: getAttachmentSource as any,
      });
    },
    [openVideoViewer, item.id, videoAttachments, getAttachmentSource],
  );

  // Use a ref so the callback identity stays stable even as item data changes.
  const itemRef = useRef(item);
  itemRef.current = item;
  const handleLongPress = useCallback(() => {
    Vibration.vibrate(30);
    openContextMenu({ messageId: itemRef.current.id, message: itemRef.current });
  }, [openContextMenu]);

  // GestureHandler LongPress — does not steal scroll/pan unlike Pressable.
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(400)
        .onStart(() => runOnJS(handleLongPress)()),
    [handleLongPress],
  );

  const handleReact = useCallback(
    (emoji: string) => {
      const store = useMessageStore.getState();
      const userId = user?._id || user?.id || '';
      const hasReacted = (item.reactions || []).some(
        (r: any) => r.emoji === emoji && (r.users || []).some((u: any) => u._id === userId || u.usr_id === userId),
      );
      if (hasReacted) {
        store.removeReaction(item.roomId, item.id, emoji, userId);
      } else {
        store.addReaction(item.roomId, item.id, emoji, userId);
      }
      const snapshot = {
        id: item.id,
        roomId: item.roomId,
        reactions: item.reactions ? item.reactions.map((r: any) => ({ ...r, users: [...(r.users ?? [])] })) : [],
      };
      socket?.emit('message:emoji', { messageId: item.id, roomId: item.roomId, emoji }, (ack: any) => {
        if (!ack || ack?.ok === false) {
          useMessageStore.getState().upsetMsg({ ...item, ...snapshot });
        }
      });
    },
    [socket, item, user],
  );


  const showTimestamp = item.showAvatar;
  const { isFirstInSenderGroup, isLastInSenderGroup, messageSpacing } = item;

  if (hiddenByMe) {
    return (
      <View className={`${messageSpacing} ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
        <View className="rounded-2xl px-4 py-2 bg-gray-100 border border-gray-200">
          <Text className="text-sm italic text-gray-400">
            {item.isMine ? 'Bạn đã xoá tin nhắn này' : 'Tin nhắn đã bị ẩn'}
          </Text>
        </View>
      </View>
    );
  }

  if (item.isDeleted) {
    return (
      <View className={`${messageSpacing} ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
        <View className="rounded-2xl px-4 py-2 bg-gray-100 border border-gray-200">
          <Text className="text-sm italic text-gray-400">
            {item.isMine ? 'Bạn đã thu hồi tin nhắn' : 'Tin nhắn đã bị thu hồi'}
          </Text>
        </View>
      </View>
    );
  }

  if (item.type === 'system') {
    return <SystemContent item={item} />;
  }

  if (item.type === 'flashcard' && (item as any).desk && !item.isDeleted) {
    return <FlashcardContent item={item} />;
  }

  if (item.type === 'quiz' && (item as any).quiz && !item.isDeleted) {
    return <QuizContent item={item} />;
  }

  // Call message — bubble with avatar + reply preview
  if (item.type === 'call' && item.call_history && !item.isDeleted) {
    return (
      <GestureDetector gesture={longPressGesture}>
        <View className={`${messageSpacing} ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>

          {/* Reply preview */}
          {!!item.reply && !!(item.reply._id || (item.reply as any).id) && (
            <View className={`mb-1 ${item.isMine ? 'mr-8 self-end' : 'ml-8 self-start'}`}>
              <ReplyPreview reply={item.reply} isMine={item.isMine} />
            </View>
          )}

          <HStack className={`w-full items-end ${item.isMine ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar bên trái (tin người khác) */}
            {!item.isMine && (
              <Box className="mr-2 bg-transparent" style={{ paddingTop: 0 }}>
                {item.showAvatar ? (
                  <ImageAvatar
                    src={item.sender.avatar}
                    id={item.sender._id}
                    size={24}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                ) : (
                  <View style={{ width: 24, height: 24 }} />
                )}
              </Box>
            )}

            <View
              style={{
                flexShrink: 1,
                alignSelf: item.isMine ? 'flex-end' : 'flex-start',
              }}
            >
              <CallBubble callHistory={item.call_history} isMine={item.isMine} />
              <Text className="text-xs text-gray-400 mt-1">
                {item.sender.fullname} • {Helpers.formatTime(new Date(item.createdAt))}
              </Text>
            </View>

            {/* Avatar bên phải (tin của mình) */}
            {item.isMine && (
              <Box className="ml-2 bg-transparent" style={{ paddingTop: 0 }}>
                {item.showAvatar ? (
                  <ImageAvatar
                    src={item.sender.avatar}
                    id={item.sender._id}
                    size={24}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                ) : (
                  <View style={{ width: 24, height: 24 }} />
                )}
              </Box>
            )}
          </HStack>
        </View>
      </GestureDetector>
    );
  }

  // Document message — centered card layout
  if (item.type === 'document' && !item.isDeleted) {
    return (
      <View className={`${messageSpacing} items-center px-4`}>
        <View
          className={`rounded-2xl p-3 border flex-row items-center gap-3 max-w-[280px] ${item.isMine
            ? 'bg-primary-500/10 border-primary-500/20'
            : 'bg-gray-100 border-gray-200'
            }`}
        >
          <View
            className={`p-2.5 rounded-lg ${item.isMine
              ? 'bg-primary-500/20'
              : 'bg-gray-200'
              }`}
          >
            <Text className={`text-lg ${item.isMine ? 'text-primary-600' : 'text-gray-600'}`}>
              📄
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text
              className={`text-sm font-semibold ${item.isMine ? 'text-primary-900' : 'text-typography-950'
                }`}
              numberOfLines={1}
            >
              {item.content || 'Tài liệu'}
            </Text>
            <Text
              className={`text-xs ${item.isMine ? 'text-primary-700/70' : 'text-typography-500'
                }`}
            >
              Nhấn để mở
            </Text>
          </View>
        </View>
        <Text className="text-xs text-gray-400 mt-1">
          {item.sender.fullname} • {Helpers.formatTime(new Date(item.createdAt))}
        </Text>
      </View>
    );
  }

  if (item.type === 'todo_project' && !item.isDeleted) {
    return <TodoContent item={item} />;
  }

  return (
    <>
      <View className={`${messageSpacing} ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
          {/* Reply preview */}
          {!!item.reply && !!(item.reply._id || (item.reply as any).id) && (
            <View className={`mb-1 ${item.isMine ? 'mr-8 self-end' : 'ml-8 self-start'}`}>
              <ReplyPreview reply={item.reply} isMine={item.isMine} />
            </View>
          )}

          <HStack
            className={`w-full items-end ${item.isMine ? 'justify-end' : 'justify-start'}`}
          >
            {/* Avatar bên trái (tin người khác) */}
            {!item.isMine && (
              <Box className="mr-2" style={{ paddingTop: 0 }}>
                {item.showAvatar ? (
                  <ImageAvatar
                    src={item.sender.avatar}
                    id={item.sender._id}
                    size={24}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                ) : (
                  <View style={{ width: 24, height: 24 }} />
                )}
              </Box>
            )}

            <View
              className={item.isMine ? 'items-end' : 'items-start'}
              style={{
                maxWidth: MESSAGE_BUBBLE_MAX_WIDTH,
                flexShrink: 1,
                alignSelf: item.isMine ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Tên người gửi */}
              {!item.isMine && isFirstInSenderGroup && (
                <View>
                  <Text className="text-xs text-gray-500 mb-1 ml-1 font-medium">
                    {item.sender.fullname || 'User'}
                  </Text>
                </View>
              )}

              {hasMedia ? (
                <View>
                  {imageAttachments.length > 0 && (
                    <ImageGrid
                      images={imageAttachments}
                      onImagePress={handleImagePress}
                      onLongPress={handleLongPress}
                      getAttachmentSource={getAttachmentSource}
                    />
                  )}
                  {videoAttachments.length > 0 && (
                    <VideoGrid
                      videos={videoAttachments}
                      onVideoPress={handleVideoPress}
                      onLongPress={handleLongPress}
                      getAttachmentSource={getAttachmentSource}
                    />
                  )}
                  {showTimestamp && (
                    <View className="flex-row mt-1">
                      {item.isMine && derived === 'read' && (
                        <Text className="text-xs text-blue-500 mr-1">✓✓</Text>
                      )}
                      {item.isMine && derived === 'delivered' && (
                        <Text className="text-xs text-gray-400 mr-1">✓✓</Text>
                      )}
                      {item.isMine && (derived === 'sent' || derived === null) && (
                        <Text className="text-xs text-gray-400 mr-1">✓</Text>
                      )}
                      <Text className="text-xs text-typography-500">
                        {Helpers.formatTime(new Date(item.createdAt))}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <GestureDetector gesture={longPressGesture}>
                <View
                  className={`rounded-2xl px-4 py-2
                    ${item.isMine ? 'bg-primary-500' : 'bg-gray-200'}
                    ${isFirstInSenderGroup && item.isMine ? 'rounded-tr-sm' : ''}
                    ${isFirstInSenderGroup && !item.isMine ? 'rounded-tl-sm' : ''}
                    ${isLastInSenderGroup && item.isMine ? 'rounded-br-sm' : ''}
                    ${isLastInSenderGroup && !item.isMine ? 'rounded-bl-sm' : ''}
                    ${item.status === 'pending' || item.status === 'uploading' ? 'opacity-60' : ''}
                    ${item.status === 'failed' ? 'opacity-80 border-2 border-red-400' : ''}
                  `}
                  style={{
                    alignSelf: item.isMine ? 'flex-end' : 'flex-start',
                    maxWidth: MESSAGE_BUBBLE_MAX_WIDTH,
                  }}
                >
                  {!!item.content?.trim() && (
                    <>
                      <Text
                        className={`text-sm ${item.isMine ? 'text-white' : 'text-typography-950'}`}
                        numberOfLines={isExpanded ? undefined : 20}
                        ellipsizeMode="tail"
                      >
                        {item.content}
                      </Text>
                      {isLongMessage(item.content) && (
                        <TouchableOpacity
                          onPress={() => toggleExpanded(item.id)}
                          className="mt-1"
                        >
                          <Text
                            className={`text-xs ${item.isMine ? 'text-white/80' : 'text-primary-500'} font-medium`}
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {item.status === 'uploading' && (
                    <Text className="text-xs text-white/60 text-right mt-1">⏳</Text>
                  )}
                  {item.status === 'failed' && (
                    <View className="flex-row items-center justify-end mt-1 gap-1">
                      <Text className="text-xs text-red-300">⚠️ Gửi thất bại</Text>
                      <TouchableOpacity
                        onPress={resendMessage}
                        className="bg-red-500/20 rounded-full px-2 py-0.5"
                      >
                        <Text className="text-xs text-red-400 font-medium">Gửi lại</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Translation display */}
                  {!!item.translation?.text && (
                    <View
                      className={`mt-2 rounded-lg px-3 py-2 ${item.isMine
                        ? 'bg-white/15'
                        : 'bg-gray-100'
                        }`}
                    >
                      <Text
                        className={`text-xs font-semibold mb-1 ${item.isMine ? 'text-white/90' : 'text-typography-700'
                          }`}
                      >
                        Đã dịch ({item.translation.from || 'auto'} → {item.translation.to})
                      </Text>
                      <Text
                        className={`text-xs leading-relaxed ${item.isMine ? 'text-white/80' : 'text-typography-950'
                          }`}
                      >
                        {item.translation.text}
                      </Text>
                    </View>
                  )}
                  {/* Summary display */}
                  {!!item.summary?.text && (
                    <View
                      className={`mt-2 rounded-lg border px-3 py-2 ${item.isMine
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                      <Text
                        className={`text-xs font-semibold mb-1 ${item.isMine ? 'text-primary-900' : 'text-typography-700'
                          }`}
                      >
                        Tóm tắt tài liệu
                      </Text>
                      <Text
                        className={`text-xs leading-relaxed ${item.isMine ? 'text-primary-800' : 'text-typography-800'
                          }`}
                      >
                        {item.summary.text}
                      </Text>
                    </View>
                  )}

                  {showTimestamp && (
                    <View className={`flex-row mt-1 ${item.isMine ? 'justify-end' : 'justify-start'}`}>
                      {item.isMine && item.status !== 'failed' && item.status !== 'uploading' && item.status !== 'pending' && (
                        <>
                          {derived === 'read' && (
                            <Text className="text-xs mr-1 text-white">✓✓</Text>
                          )}
                          {derived === 'delivered' && (
                            <Text className="text-xs mr-1 text-white/60">✓✓</Text>
                          )}
                          {(derived === 'sent' || derived === null) && (
                            <Text className="text-xs mr-1 text-white/60">✓</Text>
                          )}
                        </>
                      )}
                      <Text
                        className={`text-xs ${item.isMine ? 'text-white/80' : 'text-typography-500'}`}
                      >
                        {Helpers.formatTime(new Date(item.createdAt))}
                      </Text>
                    </View>
                  )}
                </View>
                </GestureDetector>
              )}
              {/* Link Preview - below text bubble */}
              {!hasMedia && previewUrl && (
                <LinkPreview url={previewUrl} isMine={item.isMine} />
              )}
            </View>

            {/* Avatar bên phải (tin của mình) */}
            {item.isMine && (
              <Box className="ml-2" style={{ paddingTop: 0 }}>
                {item.showAvatar ? (
                  <ImageAvatar
                    src={item.sender.avatar}
                    id={item.sender._id}
                    size={24}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                ) : (
                  <View style={{ width: 24, height: 24 }} />
                )}
              </Box>
            )}
          </HStack>

          {/* Read avatars for own messages (last in group) */}
          {item.isLastInDateGroup && item.isMine && item.read_by && item.read_by.length > 0 && (
            <HStack className="justify-end mr-8 mt-1">
              {item.read_by.slice(0, 3).map((r) => (
                <Box key={r.user._id || r.user.id} className="-ml-1 first:ml-0">
                  <ImageAvatar
                    src={r.user.avatar}
                    id={r.user._id || r.user.id}
                    size={14}
                    style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#fff' }}
                  />
                </Box>
              ))}
              {(item.read_by_count ?? item.read_by.length) > 3 && (
                <Text className="text-xs text-gray-400 ml-1">
                  +{Math.max((item.read_by_count ?? item.read_by.length) - 3, 0)}
                </Text>
              )}
            </HStack>
          )}

          {/* Per-recipient delivered/read counts — group rooms only, on last of my messages */}
          {item.isMine && item.isLastInDateGroup && room?.type === 'group' && myId && (() => {
            const c = deriveGroupCounts(item as any, room as any, myId, order);
            return c.total > 0 ? (
              <Text className="text-xs text-gray-400 mr-8 mt-0.5 self-end">
                {`Đã nhận ${c.deliveredCount}/${c.total} · Đã đọc ${c.readCount}/${c.total}`}
              </Text>
            ) : null;
          })()}

          {/* Reactions */}
          <MessageReactions reactions={item.reactions as any} onReact={handleReact} />

          {/* Pinned indicator */}
          {!hiddenByMe && !item.isDeleted && item.pinned && (
            <Text className="text-xs text-amber-500 ml-8 mt-0.5">📌 Ghim</Text>
          )}

        </View>
    </>
  );
}, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.showAvatar === next.item.showAvatar &&
    prev.item.isFirstInSenderGroup === next.item.isFirstInSenderGroup &&
    prev.item.isLastInSenderGroup === next.item.isLastInSenderGroup &&
    prev.item.isLastInDateGroup === next.item.isLastInDateGroup &&
    prev.item.messageSpacing === next.item.messageSpacing &&
    prev.onReply === next.onReply &&
    sameMessageFields(prev.item, next.item)
  );
});

const DateSeparator: React.FC<{ label: string }> = memo(({ label }) => (
  <View className="items-center my-2">
    <Text className="text-xs text-typography-500 bg-gray-200 px-3 py-1 rounded-full">
      {label}
    </Text>
  </View>
));

type MessageItemProps = {
  item: ChatMessageItem;
  onReply?: (msg: MessageType) => void;
};

const MessageItem: React.FC<MessageItemProps> = memo(({ item, onReply }) => {
  if (item.kind === 'date') {
    return <DateSeparator label={item.label} />;
  }

  return <MessageBubble item={item} onReply={onReply} />;
}, (prev, next) => {
  if (prev.item.id !== next.item.id) return false;
  if (prev.onReply !== next.onReply) return false;
  if (prev.item.kind !== next.item.kind) return false;
  if (prev.item.kind === 'date' && next.item.kind === 'date') {
    return prev.item.label === next.item.label;
  }
  const p = prev.item as ChatMessageItem & { kind: 'message' };
  const n = next.item as ChatMessageItem & { kind: 'message' };
  return (
    p.showAvatar === n.showAvatar &&
    p.isFirstInSenderGroup === n.isFirstInSenderGroup &&
    p.isLastInSenderGroup === n.isLastInSenderGroup &&
    p.isLastInDateGroup === n.isLastInDateGroup &&
    p.messageSpacing === n.messageSpacing &&
    sameMessageFields(p, n)
  );
});

export default MessageItem;
