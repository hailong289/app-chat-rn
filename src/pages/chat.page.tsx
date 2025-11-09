import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Box } from '@/src/components/ui/box';
import { Input, InputField } from '@/src/components/ui/input';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import MessageItem, { Message } from '../components/chat/message.component';
import { useSocket } from '../providers/socket.provider';
import useMessageStore from '../store/useMessage';
import useAuthStore from '../store/useAuth';

const ChatPage: React.FC = () => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  const { roomId } = (route.params as { roomId: string }) || {};
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const { socket } = useSocket();
  const { sendMessage, isLoading: msgLoading, messagesRoom, getMessages } = useMessageStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // Load messages from API hoặc database
    // Tạm thời dùng mock data
    getMessages(roomId);
  }, [roomId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesRoom[roomId]?.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messagesRoom, roomId]);

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage({
      roomId: roomId,
      content: message,
      attachments: [], // Tạm thời để rỗng, sẽ xử lý upload sau
      type: 'text',
      socket,
      userId: user?.id,
      userFullname: user?.fullname,
      userAvatar: user?.avatar,
    });
    setMessage('');
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messagesRoom[roomId]?.messages || []}
          renderItem={({ item }) => <MessageItem item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
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
                onPress={() => {
                  // TODO: Handle image picker
                }}
              >
                <FontAwesome name="file-image-o" size={24} color="#4B5563" />
                <Text className="text-gray-700 text-sm">Hình ảnh</Text>
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
                />
              </Input>
            </Box>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim()}
              className={`rounded-full w-12 h-12 items-center justify-center ${
                message.trim() ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              { msgLoading && <ActivityIndicator size="small" color="#fff" />}
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

