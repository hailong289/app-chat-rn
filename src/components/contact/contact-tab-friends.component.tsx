import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { User } from '@/src/types/user.type';
import useContactStore from '@/src/store/useContact';
import { ImageAvatar } from '../chat/image-avatar.component';

interface ContactTabFriendsProps {
  searchQuery: string;
}

export const ContactTabFriends: React.FC<ContactTabFriendsProps> = ({ searchQuery }) => {
  const { getFriends, loading: { friends: isLoadingFriends }, friends } = useContactStore();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    getFriends({
      limit: 10,
      page: page,
      search: searchQuery,
      success: (data) => {
        setRefreshing(false);
      },
      error: (error: any) => {
        setRefreshing(false);
      }
    });
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        setPage(1);
        fetchData();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      fetchData();
    }
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };


  if (isLoadingFriends && !refreshing) {
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
        {friends.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="users" size={48} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4 text-center">
              {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè'}
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              {searchQuery
                ? 'Thử tìm kiếm với từ khóa khác'
                : 'Bắt đầu kết bạn ngay bây giờ'}
            </Text>
          </VStack>
        ) : (
          <>
           {friends.map((item: User) => (
            <TouchableOpacity
              key={item.id}
              className="py-4 border-b border-gray-200"
              activeOpacity={0.7}
            >
               <HStack className="items-center justify-between px-5">
                <HStack className="items-center flex-1">
                  <Box className="relative mr-2">
                    <ImageAvatar 
                      src={item.avatar}
                      id={item.id}
                      size={50}
                      style={{ width: 50, height: 50, borderRadius: 25 }}
                    />
                  </Box>
                  <VStack className="ml-3 flex-1">
                    <Text className="font-semibold text-typography-950 text-[16px]">
                      {item.fullname}
                    </Text>
                  </VStack>
                </HStack>
                <TouchableOpacity onPress={() => {}}>
                  <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              </HStack>
             </TouchableOpacity>
           ))}
          </>
        )}
      </VStack>
    </ScrollView>
  );
};

