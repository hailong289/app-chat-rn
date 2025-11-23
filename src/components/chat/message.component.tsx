import { MessageType } from '@/src/types/message.type';
import React, { useCallback, useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { HStack } from '../ui/hstack';
import Helpers from '@/src/libs/helpers';
import ImageViewerModal from './image-viewer-modal.component';
import VideoViewerModal from './video-viewer-modal.component';
import ImageGrid from './image-grid.component';
import VideoGrid from './video-grid.component';
import { ImageAvatar } from './image-avatar.component';
import { Box } from '../ui/box';

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

const MessageBubble: React.FC<{ item: MessageType }> = ({ item }) => {
  const attachments = (item.attachments ?? []) as Attachment[];
  const mediaAttachments = attachments.filter((attachment) =>
    ['image', 'video'].includes(attachment.kind) ||
    (attachment.mimeType?.startsWith('image/') || attachment.mimeType?.startsWith('video/')),
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

  const isLongMessage = (content: string | null | undefined): boolean => {
    if (!content) return false;
    // Ước lượng: ~50-60 ký tự mỗi dòng cho text 14px
    // 10 dòng = ~500-600 ký tự
    return content.length > 400;
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
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

  return (
    <>
      <View className={`mb-6 ${item.isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
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
          {
            hasMedia ? (
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
                          <Text className={`text-xs ${item.isMine ? 'text-white/80' : 'text-primary-500'} font-medium`}>
                            {expandedMessages.has(item.id) ? 'Thu gọn' : 'Xem thêm'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>

                

                <Text
                  className={`text-xs mt-1 ${item.isMine ? 'text-white/80' : 'text-typography-500'} ${
                    item.isMine ? 'text-right' : 'text-left'
                  }`}
                >
                  {Helpers.formatTime(new Date(item.createdAt))}
                </Text>
              </View>
            )
          }
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
        {item.reactions && item.reactions.length > 0 && (
          <HStack className='emojis ml-8 mt-2 flex-row gap-2'>
            {item.reactions.slice(0, 5).map((reaction) => (
              <Text key={reaction.emoji} className="text-xs text-typography-500 bg-gray-200 rounded-full px-2 py-1">
                {reaction.emoji}
              </Text>
            ))}
            {item.reactions.length > 5 && (
              <View className="bg-gray-200 rounded-full px-2 py-1">
                <Text className="text-xs text-typography-500 font-medium">
                  +{item.reactions.length - 5}
                </Text>
              </View>
            )}
          </HStack>
        )}
        <ImageViewerModal
          visible={imageViewerVisible}
          images={imageAttachments}
          initialIndex={imageViewerIndex}
          onClose={() => setImageViewerVisible(false)}
          getAttachmentSource={getAttachmentSource}
        />
        <VideoViewerModal
          visible={videoViewerVisible}
          videos={videoAttachments}
          initialIndex={videoViewerIndex}
          onClose={() => setVideoViewerVisible(false)}
          getAttachmentSource={getAttachmentSource}
        />
      </View>
    </>
  );
};

const DateSeparator: React.FC<{ label: string }> = ({ label }) => (
  <View className="items-center my-2">
    <Text className="text-xs text-typography-500 bg-gray-200 px-3 py-1 rounded-full">
      {label}
    </Text>
  </View>
);

const MessageItem: React.FC<{ item: ChatMessageItem }> = ({ item }) => {
  if (item.kind === 'date') {
    return <DateSeparator label={item.label} />;
  }

  return <MessageBubble item={item} />;
};

export default MessageItem;
