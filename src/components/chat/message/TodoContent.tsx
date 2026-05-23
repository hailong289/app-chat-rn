import React, { memo, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import TodoProjectCard from '../todo-project-card';
import Helpers from '../../../libs/helpers';
import type { MessageType } from '../../../types/message.type';

type Props = {
  item: MessageType & { kind: 'message'; messageSpacing: string };
};

const TodoContent: React.FC<Props> = memo(
  ({ item }) => {
    const navigation = useNavigation<any>();

    const handlePress = useCallback(() => {
      const projectId = (item.todoProject as any)?.project_id || item.todoProjectId;
      if (projectId) navigation.navigate('TodoList', { projectId });
    }, [item.todoProject, item.todoProjectId, navigation]);

    return (
      <View className={`${item.messageSpacing} items-center px-4`}>
        {item.todoProject ? (
          <TodoProjectCard
            project={item.todoProject}
            isMine={item.isMine}
            onPress={handlePress}
          />
        ) : (
          <View
            className={`rounded-2xl p-4 border max-w-[280px] ${
              item.isMine
                ? 'bg-primary-500/10 border-primary-500/20'
                : 'bg-gray-100 border-gray-200'
            }`}
          >
            <Text
              className={`text-sm ${item.isMine ? 'text-primary-900' : 'text-typography-950'}`}
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
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.messageSpacing === next.item.messageSpacing &&
    prev.item.todoProject === next.item.todoProject,
);

export default TodoContent;
