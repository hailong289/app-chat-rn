import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { contactMockFriendRequests, type ContactFriendRequest } from '@/src/pages/contact/contact.mock';
import { User } from '@/src/types/user.type';
import Helpers from '@/src/libs/helpers';
import useContactStore from '@/src/store/useContact';
import { Toast } from 'toastify-react-native';
import { ImageAvatar } from '../chat/image-avatar.component';

interface ContactTabRequestProps {
  searchQuery: string;
}

export const ContactTabRequest: React.FC<ContactTabRequestProps> = ({ searchQuery }) => {
  const [page, setPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const { getFriendRequests, loading, friendRequests, acceptFriendRequest, rejectFriendRequest } = useContactStore();

  const fetchData = () => {
    getFriendRequests({
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


  if (loading.friendRequests && !refreshing) {
    return (
      <VStack className="items-center justify-center py-20 px-5">
        <ActivityIndicator size="large" color="#42A59F" />
        <Text className="text-[16px] text-gray-500 mt-4">Đang tải...</Text>
      </VStack>
    );
  }

  const accept = (request: User) => {
    acceptFriendRequest({ senderId: request.id, success: () => {
      Toast.show({
        type: 'success',
        text1: 'Chấp nhận yêu cầu kết bạn thành công',
      });
    }, error: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Chấp nhận yêu cầu kết bại',
      });
    } });
  }

  const reject = (request: User) => {
    rejectFriendRequest({ senderId: request.id, success: () => {
      Toast.show({
        type: 'success',
        text1: 'Từ chối yêu cầu kết bạn thành công',
      });
    }, error: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Từ chối yêu cầu kết bại',
      });
    } });
  }

  const unreadCount = friendRequests.length;

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <VStack>
        {unreadCount > 0 && (
          <Box className="px-5 py-3 bg-blue-50">
            <Text className="text-blue-600 text-[14px] font-semibold">
              Bạn có {unreadCount} yêu cầu kết bạn mới
            </Text>
          </Box>
        )}
        {friendRequests.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="user-plus" size={48} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4 text-center">
              {searchQuery ? 'Không tìm thấy yêu cầu' : 'Chưa có yêu cầu kết bạn'}
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              {searchQuery
                ? 'Thử tìm kiếm với từ khóa khác'
                : 'Các yêu cầu kết bạn sẽ xuất hiện ở đây'}
            </Text>
          </VStack>
        ) : (
          friendRequests.map((request) => {

            return (
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
                    </VStack>
                  </HStack>
                  <HStack className="items-center">
                      <TouchableOpacity
                        className="bg-green-600 px-4 py-2 rounded-lg mr-2"
                        activeOpacity={0.7}
                        onPress={() => accept(request)}
                      >
                        <Text className="text-white text-[14px] font-semibold">
                          Chấp nhận
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-gray-200 px-4 py-2 rounded-lg"
                        activeOpacity={0.7}
                        onPress={() => reject(request)}
                      >
                        <Text className="text-gray-700 text-[14px] font-semibold">
                          Từ chối
                        </Text>
                      </TouchableOpacity>
                  </HStack>
                </HStack>
              </TouchableOpacity>
            );
          })
        )}
      </VStack>
    </ScrollView>
  );
};

