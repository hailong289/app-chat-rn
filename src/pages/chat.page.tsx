import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { Input, InputField } from '@/src/components/ui/input';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import useRoomStore from '../store/useRoom';
import MessageItem, { Message } from '../components/chat/message.component';

const ChatPage: React.FC = () => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { roomId } = (route.params as { roomId?: string }) || {};
  const [showMoreOptions, setShowMoreOptions] = useState(false);


  useEffect(() => {
    // Load messages from API hoặc database
    // Tạm thời dùng mock data
    const mockMessages: Message[] = [
      {
        id: '1',
        text: 'Hello! How are you?',
        userId: 'user1',
        createdAt: new Date().toISOString(),
        isMe: false,
      },
      {
        id: '2',
        text: "I'm doing great, thanks for asking!",
        userId: 'user2',
        createdAt: new Date().toISOString(),
        isMe: true,
      },
    ];
    setMessages(mockMessages);
  }, [roomId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      userId: 'currentUser',
      createdAt: new Date().toISOString(),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
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
          data={messages}
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

        {/* Input Area */}
        <View
          className="border-t border-gray-200 bg-white px-4 py-3"
          style={{ paddingBottom: insets.bottom, height: showMoreOptions ? 180 : 100 }}
        >
          <HStack className="items-center gap-4">
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-primary-500" onPress={() => setShowMoreOptions(!showMoreOptions)}>
                <FontAwesome name="ellipsis-h" size={20} color="white" />
            </TouchableOpacity>
            <Box className="flex-1">
              <Input variant="outline" size="md" className="my-1 h-[50px] border-gray-300  rounded-full">
                <InputField
                  placeholder="Nhập tin nhắn..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  style={{ maxHeight: 100 }}
                  onSubmitEditing={handleSend}
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
              <FontAwesome
                name="paper-plane"
                size={16}
                color={message.trim() ? '#fff' : '#999'}
              />
            </TouchableOpacity>
          </HStack>
          {showMoreOptions && (
            <Box className="items-center flex-row mt-2">
            <TouchableOpacity
              className="w-4/12 h-[80px] items-center justify-center border border-gray-300 gap-2"
              onPress={() => {
                // TODO: Handle capture photo
              }}
            >
              <FontAwesome name="camera" size={20} color="#42A59F" />
              <Text className="text-typography-950 text-[14px]">Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-4/12 h-[80px] items-center justify-center border border-gray-300 gap-2"
              onPress={() => {
                // TODO: Handle capture photo
              }}
            >
              <FontAwesome name="file-image-o" size={20} color="#42A59F" />
              <Text className="text-typography-950 text-[14px]">Hình ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-4/12 h-[80px] items-center justify-center border border-gray-300 gap-2"
              onPress={() => {
                // TODO: Handle capture photo
              }}
            >
              <FontAwesome name="microphone" size={20} color="#42A59F" />
              <Text className="text-typography-950 text-[14px]">Ghi âm</Text>
            </TouchableOpacity>
          </Box>
          )}
        </View>
      </KeyboardAvoidingView>
  );
};

export default ChatPage;

