import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { FlashcardDeckMessageCard } from '../flashcard-deck-message-card';
import Helpers from '../../../libs/helpers';
import type { MessageType } from '../../../types/message.type';

type Props = {
  item: MessageType & { kind: 'message'; messageSpacing: string };
};

const FlashcardContent: React.FC<Props> = memo(
  ({ item }) => (
    <View className={`${item.messageSpacing} items-center px-4`}>
      <FlashcardDeckMessageCard deck={(item as any).desk} isSender={item.isMine} />
      <Text className="text-xs text-gray-400 mt-1">
        {item.sender.fullname} • {Helpers.formatTime(new Date(item.createdAt))}
      </Text>
    </View>
  ),
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.messageSpacing === next.item.messageSpacing,
);

export default FlashcardContent;
