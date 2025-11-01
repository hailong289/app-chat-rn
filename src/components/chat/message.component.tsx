import React from 'react';
import { View, Text } from 'react-native';

export interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
  isMe: boolean;
}

interface MessageItemProps {
  item: Message;
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
      className={`mb-4 px-4 ${item.isMe ? 'items-end' : 'items-start'}`}
    >
      <View
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          item.isMe
            ? 'bg-primary-500 rounded-tr-sm'
            : 'bg-gray-200 rounded-tl-sm'
        }`}
      >
        <Text
          className={`text-sm ${
            item.isMe ? 'text-white' : 'text-typography-950'
          }`}
        >
          {item.text}
        </Text>
        <Text
          className={`text-xs mt-1 ${
            item.isMe ? 'text-primary-100' : 'text-gray-500'
          }`}
        >
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
};

export default MessageItem;
