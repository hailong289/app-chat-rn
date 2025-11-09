import { MessageType } from '@/src/types/message.type';
import React from 'react';
import { View, Text, Image } from 'react-native';
import { HStack } from '../ui/hstack';

export interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
  isMe: boolean;
}

interface MessageItemProps {
  item: MessageType;
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const MessageItem: React.FC<MessageItemProps> = ({ item }) => {
  return (
    <View
      className={`mb-4 ${item.isMine ? 'items-end' : 'items-start'}`}
    >
      <HStack className="items-center">
        {!item.isMine && item.sender.avatar && (
          <Image 
            source={{ uri: item.sender.avatar }} 
            className="w-6 h-6 rounded-full mt-[-30px] mx-2"
           />
        )}
        <View
          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
            item.isMine
              ? 'bg-primary-500 rounded-tr-sm'
              : 'bg-gray-200 rounded-tl-sm'
          }`}
        >
          <Text
            className={`text-sm ${
              item.isMine ? 'text-white' : 'text-typography-950'
            }`}
          >
            {item.content}
          </Text>
          <Text
            className={`text-xs mt-1 ${
              item.isMine ? 'text-white' : 'text-typography-500'
            }`}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {item.isMine && item.sender.avatar && (
          <Image 
            source={{ uri: item.sender.avatar }} 
            className="w-6 h-6 rounded-full mt-[-30px] mx-2"
           />
        )}
      </HStack>
    </View>
  );
};

export default MessageItem;
