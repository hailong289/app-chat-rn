import { MessageType } from '@/src/types/message.type';
import React, { useCallback, useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Vibration,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HStack } from '../ui/hstack';
import Helpers from '@/src/libs/helpers';
import ImageViewerModal from './image-viewer-modal.component';
import VideoViewerModal from './video-viewer-modal.component';
import ImageGrid from './image-grid.component';
import VideoGrid from './video-grid.component';
import { ImageAvatar } from './image-avatar.component';
import { Box } from '../ui/box';
import { ReplyPreview } from './reply-preview';
import { MessageContextMenu } from './message-context-menu';
import { ReactionsPicker } from './reactions-picker';
import { useSocket } from '@/src/providers/socket.provider';
import useAuthStore from '@/src/store/useAuth';
import useMessageStore from '@/src/store/useMessage';
import { SystemMessageBubble } from './system-message-bubble';
import { FlashcardDeckMessageCard } from './flashcard-deck-message-card';
import CallBubble from './call-bubble';
import { MessageReactions } from './message-reactions';
import LinkPreview from './LinkPreview';
import TodoProjectCard from './todo-project-card';
import QuizMessageCard from './quiz-message-card';
import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_BUBBLE_MAX_WIDTH,
} from './constants/messageConstants';

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

  // Step 1: Group messages by date
  const dateGroups: MessageType[][] = [];
  let currentGroup: MessageType[] = [];
  let lastDate: string | null = null;

  messages.forEach((msg) => {
    const date = new Date(msg.createdAt);
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    if (lastDate !== null && lastDate !== dateKey) {
      dateGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(msg);
    lastDate = dateKey;
  });
  if (currentGroup.length > 0) dateGroups.push(currentGroup);

  // Step 2: Build flat list with date separators and sender grouping metadata
  const items: ChatMessageItem[] = [];

  dateGroups.forEach((group) => {
    if (group.length === 0) return;

    const firstMsg = group[0];
    items.push({
      kind: 'date',
      id: `date-${firstMsg.id}`,
      label: Helpers.formatDateMessage(new Date(firstMsg.createdAt)),
      rawDate: firstMsg.createdAt,
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
  const navigation = useNavigation<any>();
  const hiddenByMe = item.hiddenBy?.includes(user?._id || '') ?? false;

  const attachments = (item.attachments ?? []) as Attachment[];
  const mediaAttachments = attachments.filter(
    (attachment) =>
      ['image', 'video'].includes(attachment.kind) ||
      attachment.mimeType?.startsWith('image/') ||
      attachment.mimeType?.startsWith('video/'),
  );

  const imageAttachments = mediaAttachments.filter(
    (attachment) =>
      attachment.kind === 'image' || attachment.mimeType?.startsWith('image/'),
  );
  const videoAttachments = mediaAttachments.filter(
    (attachment) =>
      attachment.kind === 'video' || attachment.mimeType?.startsWith('video/'),
  );

  const hasMedia = mediaAttachments.length > 0;

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [videoViewerIndex, setVideoViewerIndex] = useState(0);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);

  const isLongMessage = (content: string | null | undefined): boolean => {
    if (!content) return false;
    return content.length > MAX_MESSAGE_LENGTH;
  };

  // Simple URL extraction for link preview
  const extractUrl = (content: string | null | undefined): string | null => {
    if (!content) return null;
    const match = content.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
  };
  const previewUrl = extractUrl(item.content);

  const resendMessage = useCallback(() => {
    const { resendMessage } = useMessageStore.getState();
    resendMessage(item.roomId, item.id, socket);
  }, [item.roomId, item.id, socket]);

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getAttachmentSource = useCallback((attachment: Attachment) => {
    if (attachment?.mimeType?.startsWith('video/')) {
      return attachment.uploadedUrl || attachment.url || attachment.thumbUrl;
    }
    return attachment?.thumbUrl || attachment?.uploadedUrl || attachment?.url;
  }, []);

  const handleImagePress = useCallback((index: number) => {
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  }, []);

  const handleVideoPress = useCallback((index: number) => {
    setVideoViewerIndex(index);
    setVideoViewerVisible(true);
  }, []);

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(30);
    setContextMenuVisible(true);
  }, []);

  const handleReact = useCallback(
    (emoji: string) => {
      const store = useMessageStore.getState();
      const userId = user?._id || user?.id || '';
      // Optimistic toggle: add or remove based on current state
      const hasReacted = (item.reactions || []).some(
        (r: any) => r.emoji === emoji && (r.users || []).some((u: any) => u._id === userId || u.usr_id === userId),
      );
      if (hasReacted) {
        store.removeReaction(item.roomId, item.id, emoji, userId);
      } else {
        store.addReaction(item.roomId, item.id, emoji, userId);
      }
      const original = JSON.parse(JSON.stringify(item));
      socket?.emit('message:emoji', { messageId: item.id, roomId: item.roomId, emoji }, (ack: any) => {
        if (!ack || ack?.ok === false) {
          // Rollback: restore original message state
          useMessageStore.getState().upsetMsg(original);
        }
      });
    },
    [socket, item.id, item.roomId, user, item.reactions],
  );

  const handleDelete = useCallback(() => {
    const original = JSON.parse(JSON.stringify(item));
    const { deleteMessage } = useMessageStore.getState();
    deleteMessage(item.roomId, item.id);
    socket?.emit('message:delete', { messageId: item.id, roomId: item.roomId }, (ack: any) => {
      if (!ack || ack?.ok === false) {
        useMessageStore.getState().upsetMsg(original);
      }
    });
  }, [socket, item.id, item.roomId]);

  const handleRecall = useCallback(() => {
    const original = JSON.parse(JSON.stringify(item));
    const { recallMessage } = useMessageStore.getState();
    recallMessage(item.roomId, item.id);
    socket?.emit('message:recall', { messageId: item.id, roomId: item.roomId }, (ack: any) => {
      if (!ack || ack?.ok === false) {
        useMessageStore.getState().upsetMsg(original);
      }
    });
  }, [socket, item.id, item.roomId]);

  const handlePin = useCallback(() => {
    const newPinned = !item.pinned;
    const original = JSON.parse(JSON.stringify(item));
    const { togglePin } = useMessageStore.getState();
    togglePin(item.roomId, item.id, newPinned);
    socket?.emit('message:pinned', { messageId: item.id, roomId: item.roomId, pinned: newPinned }, (ack: any) => {
      if (!ack || ack?.ok === false) {
        useMessageStore.getState().upsetMsg(original);
      }
    });
  }, [socket, item.id, item.roomId, item.pinned]);

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
    return <SystemMessageBubble msg={item} />;
  }

  // Flashcard deck message — centered card layout
  if (item.type === 'flashcard' && (item as any).desk && !item.isDeleted) {
    return (
      <View className={`${messageSpacing} items-center px-4`}>
        <FlashcardDeckMessageCard deck={(item as any).desk} isSender={item.isMine} />
        <Text className="text-xs text-gray-400 mt-1">
          {item.sender.fullname} • {Helpers.formatTime(new Date(item.createdAt))}
        </Text>
      </View>
    );
  }

  // Quiz message — centered card layout
  if (item.type === 'quiz' && (item as any).quiz && !item.isDeleted) {
    return (
      <View className={`${messageSpacing} items-center px-4`}>
        <QuizMessageCard
          quiz={(item as any).quiz}
          isSender={item.isMine}
          roomId={item.roomId}
        />
        <Text className="text-xs text-gray-400 mt-1">
          {item.sender.fullname} • {Helpers.formatTime(new Date(item.createdAt))}
        </Text>
      </View>
    );
  }

  // Call message — bubble with avatar + reply preview
  if (item.type === 'call' && item.call_history && !item.isDeleted) {
    return (
      <TouchableWithoutFeedback onLongPress={handleLongPress}>
        <View className={`${messageSpacing} ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>

          {/* Reply preview */}
          {!!item.reply && !!(item.reply._id || (item.reply as any).id) && (
            <View className={`mb-1 max-w-[80%] ${item.isMine ? 'mr-8 self-end' : 'ml-8 self-start'}`}>
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
      </TouchableWithoutFeedback>
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

  // Todo Project message — centered card layout
  if (item.type === 'todo_project' && !item.isDeleted) {
    return (
      <View className={`${messageSpacing} items-center px-4`}>
        {item.todoProject ? (
          <TodoProjectCard
            project={item.todoProject}
            isMine={item.isMine}
            onPress={() => {
              const projectId = (item.todoProject as any)?.project_id || item.todoProjectId;
              if (projectId) {
                navigation.navigate('TodoList', { projectId });
              }
            }}
          />
        ) : (
          <View
            className={`rounded-2xl p-4 border max-w-[280px] ${item.isMine
              ? 'bg-primary-500/10 border-primary-500/20'
              : 'bg-gray-100 border-gray-200'
              }`}
          >
            <Text
              className={`text-sm ${item.isMine ? 'text-primary-900' : 'text-typography-950'
                }`}
            >
              {item.content}
            </Text>
          </View>
        )}
        <Text className="text-xs text-gray-400 mt-1">
          {item.sender.fullname} • {Helpers.formatTime(new Date(item.createdAt))}
        </Text>
      </View>
    );
  }

  return (
    <>
      <TouchableWithoutFeedback onLongPress={handleLongPress}>
        <View className={`${messageSpacing} ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
          {/* Reply preview */}
          {!!item.reply && !!(item.reply._id || (item.reply as any).id) && (
            <View className={`mb-1 max-w-[80%] ${item.isMine ? 'mr-8 self-end' : 'ml-8 self-start'}`}>
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
                      getAttachmentSource={getAttachmentSource}
                    />
                  )}
                  {videoAttachments.length > 0 && (
                    <VideoGrid
                      videos={videoAttachments}
                      onVideoPress={handleVideoPress}
                      getAttachmentSource={getAttachmentSource}
                    />
                  )}
                  {showTimestamp && (
                    <View className="flex-row mt-1">
                      {item.isMine && (
                        <Text className="text-xs text-gray-400 mr-1">
                          {(item.read_by?.length ?? item.read_by_count ?? 0) > 0 ? '✓✓' : '✓'}
                        </Text>
                      )}
                      <Text className="text-xs text-typography-500">
                        {Helpers.formatTime(new Date(item.createdAt))}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
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
                        numberOfLines={expandedMessages.has(item.id) ? undefined : 20}
                        ellipsizeMode="tail"
                      >
                        {item.content}
                      </Text>
                      {isLongMessage(item.content) && (
                        <TouchableOpacity
                          onPress={() => toggleMessageExpansion(item.id)}
                          className="mt-1"
                        >
                          <Text
                            className={`text-xs ${item.isMine ? 'text-white/80' : 'text-primary-500'} font-medium`}
                          >
                            {expandedMessages.has(item.id) ? 'Thu gọn' : 'Xem thêm'}
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
                        <Text className={`text-xs mr-1 ${item.isMine ? 'text-white/60' : 'text-gray-400'}`}>
                          {(item.read_by?.length ?? item.read_by_count ?? 0) > 0 ? '✓✓' : '✓'}
                        </Text>
                      )}
                      <Text
                        className={`text-xs ${item.isMine ? 'text-white/80' : 'text-typography-500'}`}
                      >
                        {Helpers.formatTime(new Date(item.createdAt))}
                      </Text>
                    </View>
                  )}
                </View>
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

          {/* Reactions */}
          <MessageReactions reactions={item.reactions as any} onReact={handleReact} />

          {/* Pinned indicator */}
          {!hiddenByMe && !item.isDeleted && item.pinned && (
            <Text className="text-xs text-amber-500 ml-8 mt-0.5">📌 Ghim</Text>
          )}

          <ImageViewerModal
            visible={imageViewerVisible}
            images={imageAttachments as any}
            initialIndex={imageViewerIndex}
            onClose={() => setImageViewerVisible(false)}
            getAttachmentSource={getAttachmentSource as any}
          />
          <VideoViewerModal
            visible={videoViewerVisible}
            videos={videoAttachments as any}
            initialIndex={videoViewerIndex}
            onClose={() => setVideoViewerVisible(false)}
            getAttachmentSource={getAttachmentSource as any}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Context Menu */}
      <MessageContextMenu
        visible={contextMenuVisible}
        message={item}
        isMine={item.isMine}
        onClose={() => setContextMenuVisible(false)}
        onReply={() => onReply?.(item)}
        onReact={handleReact}
        onOpenReactionPicker={() => {
          setContextMenuVisible(false);
          setReactionPickerVisible(true);
        }}
        onCopy={() => { }}
        onPin={handlePin}
        onDelete={handleDelete}
        onRecall={item.isMine ? handleRecall : undefined}
        onTranslate={item.type === 'text' && !!item.content ? () => {
          // Open AI actions modal for translate
          setContextMenuVisible(false);
        } : undefined}
        onSummarize={(item.type === 'file' || (item.attachments?.length ?? 0) > 0) ? () => {
          // Open AI actions modal for summarize
          setContextMenuVisible(false);
        } : undefined}
      />

      {/* Reaction Picker */}
      <ReactionsPicker
        visible={reactionPickerVisible}
        message={item}
        onReact={handleReact}
        onClose={() => setReactionPickerVisible(false)}
      />
    </>
  );
}, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.content === next.item.content &&
    prev.item.status === next.item.status &&
    prev.item.isDeleted === next.item.isDeleted &&
    prev.item.pinned === next.item.pinned &&
    prev.item.showAvatar === next.item.showAvatar &&
    prev.item.isFirstInSenderGroup === next.item.isFirstInSenderGroup &&
    prev.item.isLastInSenderGroup === next.item.isLastInSenderGroup &&
    prev.item.isLastInDateGroup === next.item.isLastInDateGroup &&
    prev.item.messageSpacing === next.item.messageSpacing &&
    JSON.stringify(prev.item.hiddenBy) === JSON.stringify(next.item.hiddenBy) &&
    JSON.stringify(prev.item.reactions) === JSON.stringify(next.item.reactions) &&
    JSON.stringify(prev.item.read_by) === JSON.stringify(next.item.read_by) &&
    JSON.stringify(prev.item.attachments) === JSON.stringify(next.item.attachments) &&
    prev.item.read_by_count === next.item.read_by_count &&
    prev.onReply === next.onReply
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
    p.content === n.content &&
    p.status === n.status &&
    p.isDeleted === n.isDeleted &&
    p.pinned === n.pinned &&
    p.read_by_count === n.read_by_count &&
    JSON.stringify(p.reactions) === JSON.stringify(n.reactions) &&
    JSON.stringify(p.read_by) === JSON.stringify(n.read_by) &&
    JSON.stringify(p.hiddenBy) === JSON.stringify(n.hiddenBy) &&
    JSON.stringify(p.attachments) === JSON.stringify(n.attachments)
  );
});

export default MessageItem;
