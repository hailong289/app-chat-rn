import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { User } from '@/src/types/user.type';
import Helpers from '@/src/libs/helpers';
import useContactStore from '@/src/store/useContact';
import { contactMockFriendRequests } from '@/src/pages/contact/contact.mock';
import { ImageAvatar } from '../chat/image-avatar.component';

interface ContactTabPendingProps {
  searchQuery: string;
}

export const ContactTabPending: React.FC<ContactTabPendingProps> = ({ searchQuery }) => {
  const { getSentFriendRequests, loading, sentFriendRequests } = useContactStore();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    getSentFriendRequests({
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
 

  if (loading.sentFriendRequests && !refreshing) {
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
        {sentFriendRequests.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="paper-plane" size={48} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4 text-center">
              {searchQuery ? 'Không tìm thấy yêu cầu đã gửi' : 'Chưa có yêu cầu kết bạn đã gửi'}
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              {searchQuery
                ? 'Thử tìm kiếm với từ khóa khác'
                : 'Các yêu cầu kết bạn bạn đã gửi sẽ xuất hiện ở đây'}
            </Text>
          </VStack>
        ) : (
          sentFriendRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              className="py-4 border-b border-gray-200"
              activeOpacity={0.7}
            >
              <HStack className="items-center justify-between px-5">
                <HStack className="items-center flex-1">
                  <Box className="relative mr-2">
                    <ImageAvatar 
                      src={request.avatar}
                      id={request.id}
                      size={50}
                      style={{ width: 50, height: 50, borderRadius: 25 }}
                    />
                  </Box>
                  <VStack className="ml-3 flex-1">
                    <Text className="font-semibold text-typography-950 text-[16px]">
                      {request.fullname}
                    </Text>
                    {request.friendship?.status === 'PENDING' && (
                      <Text className="text-gray-500 text-[13px] mt-1">
                        Đang chờ phản hồi từ {request.fullname}
                      </Text>
                    )}
                    {request.friendship?.createdAt && (
                      <Text className="text-gray-400 text-[12px] mt-1">
                        Gửi lúc {Helpers.formatTimeAgo(request.friendship.createdAt)}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              </HStack>
            </TouchableOpacity>
          ))
        )}
      </VStack>
    </ScrollView>
  );
};

