import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Image, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import useContactStore from '@/src/store/useContact';
import Helpers from '@/src/libs/helpers';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';
import { ImageAvatar } from '../chat/image-avatar.component';
import { CreateGroupChatModal } from '../modals/create-group-chat';
import { CreateGroupFormValues } from '@/src/schema/group.schema';


export const ContactTabGroups: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const [offset, setOffset] = useState(0);
  const { 
    groups, 
    loading: { groups: isLoadingGroups }, 
    getGroups,
  } = useContactStore();

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const handleOpenCreateGroup = useCallback(() => {
    setIsCreateGroupModalOpen(true);
  }, []);

  const handleCloseCreateGroup = useCallback(() => {
    setIsCreateGroupModalOpen(false);
  }, []);

  const handleAcceptCreateGroup = useCallback((payload: CreateGroupFormValues) => {
    setIsCreateGroupModalOpen(false);
  }, []);

  // Search groups
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        setOffset(0);
        fetchGroups();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      fetchGroups();
    }
  }, [searchQuery]);

  const fetchGroups = () => {
    getGroups({
      limit: 10,
      offset: offset,
      q: searchQuery,
      type: 'group',
      success: (data) => {
        setRefreshing(false);
      },
      error: (error) => {
        setRefreshing(false);
      },
    });
  }

  const onRefresh = () => {
    console.log('onRefresh groups');
    setRefreshing(true);
    fetchGroups();
  };

  if (isLoadingGroups && !refreshing) {
    return (
      <VStack className="items-center justify-center py-20 px-5">
        <ActivityIndicator size="large" color="#42A59F" />
        <Text className="text-[16px] text-gray-500 mt-4">Đang tải...</Text>
      </VStack>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <VStack>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenCreateGroup}
          className="mx-5 mt-4 mb-3 rounded-2xl flex-row items-center justify-center"
          style={{
            backgroundColor: '#42A59F',
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <FontAwesome name="plus" size={18} color="#FFFFFF" />
          <Text className="text-white text-[15px] font-semibold ml-2">
            Tạo nhóm mới
          </Text>
        </TouchableOpacity>
        {groups.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="users" size={48} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4 text-center">
              {'Chưa có nhóm nào'}
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              {'Tạo nhóm đầu tiên của bạn'}
            </Text>
          </VStack>
        ) : (
          groups.map((group) => (
            <TouchableOpacity
              key={group.roomId}
              className="py-4 border-b border-gray-200"
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Chat', { roomId: group.roomId })}
            >
              <HStack className="items-center justify-between px-5">
                <HStack className="items-center flex-1">
                   <Box className="relative mr-2">
                    <ImageAvatar
                      src={group.avatar}
                      id={group.roomId}
                      size={50}
                      style={{ width: 50, height: 50, borderRadius: 25 }}
                    />
                  </Box>
                  <VStack className="ml-3 flex-1">
                    <Text className="font-semibold text-typography-950 text-[16px]">
                      {group.name}
                    </Text>
                    <Text className="text-gray-500 text-[13px] mt-1">
                      {group.members?.length || 0} thành viên
                    </Text>
                    {group.last_message?.content && (
                      <Text className="text-gray-400 text-[12px] mt-1" numberOfLines={1}>
                        {group.last_message?.content}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <VStack className="items-end">
                  {group.last_message?.createdAt && (
                    <Text className="text-gray-400 text-[12px]">
                      {group.last_message?.createdAt ? Helpers.formatTimeAgo(group.last_message?.createdAt) : ''}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </TouchableOpacity>
          ))
        )}
      </VStack>
      <CreateGroupChatModal
        isOpen={isCreateGroupModalOpen}
        onClose={handleCloseCreateGroup}
        onAccept={handleAcceptCreateGroup}
      />
    </ScrollView>
  );
};

