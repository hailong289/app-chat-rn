import { MessageType } from '@/src/types/message.type';
import React, { useCallback, useState, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Vibration,
} from 'react-native';
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

export type DateSeparatorItem = {
  kind: 'date';
  id: string;
  label: string;
  rawDate: string;
};

export type ChatMessageItem = (MessageType & { kind: 'message' }) | DateSeparatorItem;

export const groupMessagesWithSeparators = (
  messages: MessageType[] = [],
): ChatMessageItem[] => {
  let lastDate: string | null = null;

  return messages.reduce<ChatMessageItem[]>((acc, msg) => {
    const date = new Date(msg.createdAt);
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    if (lastDate !== dateKey) {
      acc.push({
        kind: 'date',
        id: `date-${dateKey}`,
        label: Helpers.formatDateMessage(new Date(msg.createdAt)),
        rawDate: msg.createdAt,
      });
      lastDate = dateKey;
    }

    acc.push({ ...msg, kind: 'message' });
    return acc;
  }, []);
};

type Attachment = NonNullable<MessageType['attachments']>[number];

type MessageBubbleProps = {
  item: MessageType;
  onReply?: (msg: MessageType) => void;
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(({ item, onReply }) => {
  const { socket } = useSocket();
  const { user } = useAuthStore();

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

  // Context menu & reactions
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);

  const isLongMessage = (content: string | null | undefined): boolean => {
    if (!content) return false;
    return content.length > 400;
  };

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
      socket?.emit('message:react', { messageId: item.id, emoji });
    },
    [socket, item.id],
  );

  const handleDelete = useCallback(() => {
    socket?.emit('message:delete', { messageId: item.id, roomId: item.roomId });
  }, [socket, item.id, item.roomId]);

  const handleRecall = useCallback(() => {
    socket?.emit('message:recall', { messageId: item.id, roomId: item.roomId });
  }, [socket, item.id, item.roomId]);

  const handlePin = useCallback(() => {
    socket?.emit('message:pin', { messageId: item.id, roomId: item.roomId, pinned: !item.pinned });
  }, [socket, item.id, item.roomId, item.pinned]);

  if (item.isDeleted) {
    return (
      <View className={`mb-4 ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
        <View className="rounded-2xl px-4 py-2 bg-gray-100 border border-gray-200">
          <Text className="text-sm italic text-gray-400">
            {item.isMine ? 'Bạn đã thu hồi tin nhắn' : 'Tin nhắn đã bị thu hồi'}
          </Text>
        </View>
      </View>
    );
  }

  if (item.type === 'system') {
    return (
      <View className="items-center my-2">
        <View className="bg-gray-100 rounded-full px-3 py-1">
          <Text className="text-xs text-gray-500 text-center">{item.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableWithoutFeedback onLongPress={handleLongPress}>
        <View className={`mb-4 ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
          {/* Reply preview */}
          {item.reply && (
            <View className="mb-1 ml-8 max-w-[80%]">
              <ReplyPreview reply={item.reply} />
            </View>
          )}

          <HStack className="items-start">
            {!item.isMine && (
              <Box className="mr-2" style={{ paddingTop: 0 }}>
                <ImageAvatar
                  src={item.sender.avatar}
                  id={item.sender._id}
                  size={24}
                  style={{ width: 24, height: 24, borderRadius: 12 }}
                />
              </Box>
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
                <Text
                  className={`text-xs mt-1 ${item.isMine ? 'text-typography-500' : 'text-typography-500'} ${
                    item.isMine ? 'text-right' : 'text-left'
                  }`}
                >
                  {Helpers.formatTime(new Date(item.createdAt))}
                </Text>
              </View>
            ) : (
              <View
                className={`max-w-[75%] rounded-2xl px-4 py-2 
                ${item.isMine ? 'bg-primary-500 rounded-tr-sm' : 'bg-gray-200 rounded-tl-sm'}`}
              >
                <View>
                  {!!item.content?.trim() && (
                    <>
                      <Text
                        className={`text-sm ${item.isMine ? 'text-white' : 'text-typography-950'}`}
                        numberOfLines={expandedMessages.has(item.id) ? undefined : 10}
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
                </View>

                {/* Status indicator for pending/uploading */}
                {item.status === 'uploading' && (
                  <Text className="text-xs text-white/60 text-right mt-1">⏳</Text>
                )}
                {item.status === 'failed' && (
                  <Text className="text-xs text-red-300 text-right mt-1">⚠️ Gửi thất bại</Text>
                )}

                <Text
                  className={`text-xs mt-1 ${item.isMine ? 'text-white/80' : 'text-typography-500'} ${
                    item.isMine ? 'text-right' : 'text-left'
                  }`}
                >
                  {Helpers.formatTime(new Date(item.createdAt))}
                </Text>
              </View>
            )}

            {item.isMine && (
              <Box className="ml-2" style={{ paddingTop: 0 }}>
                <ImageAvatar
                  src={item.sender.avatar}
                  id={item.sender._id}
                  size={24}
                  style={{ width: 24, height: 24, borderRadius: 12 }}
                />
              </Box>
            )}
          </HStack>

          {/* Reactions */}
          {item.reactions && item.reactions.length > 0 && (
            <HStack className="ml-8 mt-1 flex-row gap-1 flex-wrap">
              {item.reactions.slice(0, 6).map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  onPress={() => handleReact(reaction.emoji)}
                  className="bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 flex-row items-center gap-1"
                >
                  <Text className="text-xs">{reaction.emoji}</Text>
                  <Text className="text-xs text-gray-600 font-medium">
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              ))}
              {item.reactions.length > 6 && (
                <View className="bg-gray-200 rounded-full px-2 py-1">
                  <Text className="text-xs text-gray-500 font-medium">
                    +{item.reactions.length - 6}
                  </Text>
                </View>
              )}
            </HStack>
          )}

          {/* Pinned indicator */}
          {item.pinned && (
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
        onCopy={() => {}}
        onPin={handlePin}
        onDelete={handleDelete}
        onRecall={item.isMine ? handleRecall : undefined}
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
    JSON.stringify(prev.item.reactions) === JSON.stringify(next.item.reactions) &&
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

  return <MessageBubble item={item as MessageType} onReply={onReply} />;
}, (prev, next) => {
  return prev.item.id === next.item.id && prev.onReply === next.onReply;
});

export default MessageItem;
