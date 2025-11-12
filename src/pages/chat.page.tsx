import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Box } from '@/src/components/ui/box';
import { Input, InputField } from '@/src/components/ui/input';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import MessageItem, {
  ChatMessageItem,
  groupMessagesWithSeparators,
} from '../components/chat/message.component';
import { useSocket } from '../providers/socket.provider';
import useMessageStore from '../store/useMessage';
import useAuthStore from '../store/useAuth';
import { FilePreview } from '../types/message.type';
import { launchImageLibrary } from 'react-native-image-picker';
import { ObjectId } from 'bson';

const ChatPage: React.FC = () => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<any>(null);
  const hasMoreOlderRef = useRef<boolean>(true);
  const atTopRef = useRef<boolean>(false);
  const [message, setMessage] = useState('');
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { roomId } = (route.params as { roomId: string }) || {};
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<FilePreview[]>([]);
  const { socket } = useSocket();
  const { sendMessage, isLoading: msgLoading, messagesRoom, getMessages } = useMessageStore();
  const { user } = useAuthStore();

  useEffect(() => {
    hasMoreOlderRef.current = true;
    getMessages(roomId);
  }, [roomId]);

  useEffect(() => {
    // Thay đổi scroll khi có tin nhắn mới - chỉ chạy lần đầu tiên vào
    if (messagesRoom[roomId]?.messages.length > 0) {
      handleScrollToEnd();
    }
  }, [roomId]);

  const hasAttachments = selectedAttachments.length > 0;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && !hasAttachments) return;

    sendMessage({
      roomId: roomId,
      content: trimmed,
      attachments: selectedAttachments,
      type: hasAttachments ? 'image' : 'text',
      socket,
      userId: user?.id,
      userFullname: user?.fullname,
      userAvatar: user?.avatar,
    });
    setMessage('');
    setSelectedAttachments([]);
    setShowMoreOptions(false);
  };

  const chatData = useMemo<ChatMessageItem[]>(
    () => groupMessagesWithSeparators(messagesRoom[roomId]?.messages),
    [messagesRoom, roomId],
  );

  const renderItem = ({ item }: { item: ChatMessageItem }) => <MessageItem item={item} />;

  const handlePickImages = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 10,
        includeBase64: false,
      });

      if (result.didCancel || !result.assets?.length) {
        return;
      }

      const mappedAttachments: FilePreview[] = result.assets
        .filter((asset) => asset.uri)
        .map((asset) => {
          const uri = asset.uri as string;
          const name =
            asset.fileName ||
            `image_${Date.now()}_${Math.floor(Math.random() * 1_000)}.${
              (asset.type && asset.type.split('/')[1]) || 'jpg'
            }`;
          const mimeType = asset.type || 'image/jpeg';

          return {
            _id: new ObjectId().toHexString(),
            file: asset,
            url: asset.uri,
            name: name,
            size: asset.fileSize || 0,
            mimeType: mimeType,
            kind: "image",
            status: "pending",
            uploadProgress: 0,
          } as FilePreview;
        });

      if (mappedAttachments.length > 0) {
        setSelectedAttachments((prev) => [...prev, ...mappedAttachments]);
        setShowMoreOptions(false);
      }
    } catch (error) {
      console.warn('Error picking images:', error);
    }
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setSelectedAttachments((prev) => prev.filter((att) => att._id !== id));
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || msgLoading) {
      return;
    }

    const roomMessages = messagesRoom[roomId]?.messages || [];
    if (roomMessages.length === 0) {
      return;
    }

    const firstMessage = roomMessages[0];
    if (!firstMessage) {
      return;
    }

    if (!hasMoreOlderRef.current) {
      return;
    }

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
        if (atTopRef.current) {
          atTopRef.current = false; 
        }
      }
    },
    [handleLoadMore], 
  );

  const handleScrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 500);
  }, []);

  return (
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
          onScroll={handleScroll}
          scrollEventThrottle={18}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-400">Chưa có tin nhắn nào</Text>
            </View>
          }
        />

        {/* Media Options */}
        {showMoreOptions && (
          <View className="bg-gray-100 px-4">
            <View className="bg-white rounded-full flex-row items-center justify-around py-4">
              <TouchableOpacity
                className="items-center justify-center gap-1 flex-1"
                onPress={() => {
                  // TODO: Handle camera
                }}
              >
                <FontAwesome name="camera" size={24} color="#4B5563" />
                <Text className="text-gray-700 text-sm">Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center justify-center gap-1 flex-1"
                onPress={handlePickImages}
              >
                <FontAwesome name="file-image-o" size={24} color="#4B5563" />
                <Text className="text-gray-700 text-sm">Thư viện</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center justify-center gap-1 flex-1"
                onPress={() => {
                  // TODO: Handle video picker
                }}
              >
                <FontAwesome name="microphone" size={24} color="#4B5563" />
                <Text className="text-gray-700 text-sm">Audio</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Attachment Preview */}
        {hasAttachments && (
          <View className="bg-gray-100 px-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
            >
              {selectedAttachments.map((attachment) => (
                <View key={attachment._id} className="relative">
                  <Image
                    source={{ uri: attachment.thumbUrl || attachment.url }}
                    className="w-20 h-20 rounded-xl bg-gray-200"
                  />
                  <TouchableOpacity
                    className="absolute -top-2 -right-2 bg-black/70 w-6 h-6 rounded-full items-center justify-center"
                    onPress={() => handleRemoveAttachment(attachment._id)}
                  >
                    <FontAwesome name="times" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View
          className="bg-gray-100 px-4 py-3"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="bg-white rounded-full flex-row items-center px-3 py-2">
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center"
              onPress={() => {
                setShowMoreOptions(!showMoreOptions);
                handleScrollToEnd();
              }}
            >
              <FontAwesome name="plus" size={20} color="#4B5563" />
            </TouchableOpacity>
            <Box className="flex-1 mx-2">
              <Input variant="outline" size="md" className="h-[50px] border-0 bg-transparent">
                <InputField
                  placeholder="Nhập tin nhắn..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  style={{ maxHeight: 100 }}
                  onSubmitEditing={handleSend}
                  className="text-gray-700"
                  returnKeyType="send"
                />
              </Input>
            </Box>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() && !hasAttachments}
              className={`rounded-full w-12 h-12 items-center justify-center ${
                message.trim() || hasAttachments ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <FontAwesome
                name="paper-plane"
                size={16}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
  );
};

export default ChatPage;

