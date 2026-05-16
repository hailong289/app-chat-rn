import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { HStack } from '../ui/hstack';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted?: boolean;
  users: Array<{
    _id: string;
    usr_id: string;
    usr_fullname: string;
    usr_avatar: string;
  }>;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions, onReact }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <HStack className="ml-8 mt-1 flex-row gap-1 flex-wrap">
      {reactions.slice(0, 6).map((reaction) => (
        <TouchableOpacity
          key={reaction.emoji}
          onPress={() => onReact(reaction.emoji)}
          className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 border ${
            reaction.hasReacted
              ? 'bg-blue-100 border-blue-400'
              : 'bg-gray-100 border-gray-200'
          }`}
        >
          <Text className="text-xs">{reaction.emoji}</Text>
          <Text className="text-xs text-gray-600 font-medium">
            {reaction.count}
          </Text>
        </TouchableOpacity>
      ))}
      {reactions.length > 6 && (
        <View className="bg-gray-200 rounded-full px-2 py-1">
          <Text className="text-xs text-gray-500 font-medium">
            +{reactions.length - 6}
          </Text>
        </View>
      )}
    </HStack>
  );
};

export default MessageReactions;
