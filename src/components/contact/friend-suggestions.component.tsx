import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import useContactStore from '@/src/store/useContact';
import { User } from '@/src/types/user.type';
import { Toast } from 'toastify-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';

export const FriendSuggestions = () => {
  const { friends_suggestions, loading, getFriendSuggestions, sendFriendRequest } = useContactStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  useEffect(() => {
    getFriendSuggestions(10);
  }, []);

  const handleSendFriendRequest = async (user: User) => {
    if (user.friendship?.status === 'PENDING' || user.friendship?.status === 'ACCEPTED') {
      Toast.show({
        type: 'error',
        text1: 'Người dùng đã được kết bạn hoặc đã gửi yêu cầu kết bạn',
        position: 'top',
      });
      return;
    }
    sendFriendRequest({
      receiverId: user.id,
      success: () => {
        Toast.show({
          type: 'success',
          text1: 'Gửi yêu cầu kết bạn thành công',
        });
        navigation.navigate('Main', { screen: 'Contact', params: { activeTab: 'pending' } } as never);
      },
      error: () => {
        Toast.show({
          type: 'error',
          text1: 'Gửi yêu cầu kết bạn thất bại',
        });
      },
    });
  };

  if (loading.friendSuggestions) {
    return (
      <VStack className="items-center justify-center py-10 px-5">
        <ActivityIndicator size="small" color="#42A59F" />
        <Text className="text-[14px] text-gray-500 mt-2">Đang tải gợi ý kết bạn...</Text>
      </VStack>
    );
  }

  if (!friends_suggestions || friends_suggestions.length === 0) {
    return (
      <VStack className="items-center justify-center py-20 px-5">
        <FontAwesome name="user-plus" size={64} color="#E5E7EB" />
        <Text className="text-[18px] font-semibold text-gray-400 mt-4">
          Tìm kiếm bạn bè để kết nối ngay
        </Text>
        <Text className="text-[14px] text-gray-400 mt-2 text-center">
          Nhập tên, email hoặc số điện thoại để tìm kiếm
        </Text>
      </VStack>
    );
  }

  return (
    <VStack className="px-5 mt-4">
      <Text className="text-[16px] font-bold text-gray-800 mb-4">Gợi ý kết bạn</Text>
      {friends_suggestions.map((user) => (
        <TouchableOpacity
          key={user.id || user._id}
          className="py-3 border-b border-gray-100 bg-white"
          activeOpacity={0.7}
        >
          <HStack className="items-center justify-between">
            <HStack className="items-center flex-1 mr-3">
              {user.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                />
              ) : (
                <Box
                  className="items-center justify-center bg-secondary-200 rounded-full"
                  style={{ width: 48, height: 48, marginRight: 12 }}
                >
                  <FontAwesome name="user" size={20} color="#42A59F" />
                </Box>
              )}
              <VStack className="flex-1">
                <Text className="font-semibold text-typography-950 text-[16px]">
                  {user.fullname}
                </Text>
                {user.mutualFriendsCount !== undefined && (
                  <Text className="text-gray-500 text-[13px] mt-0.5">
                    {user.mutualFriendsCount} bạn chung
                  </Text>
                )}
              </VStack>
            </HStack>
            <TouchableOpacity
              onPress={() => handleSendFriendRequest(user)}
              className="px-4 py-2 rounded-lg bg-[#42A59F]"
              activeOpacity={0.7}
            >
              <HStack className="items-center">
                <FontAwesome name="user-plus" size={14} color="#FFFFFF" />
                <Text className="text-white text-[14px] font-semibold ml-1">Kết bạn</Text>
              </HStack>
            </TouchableOpacity>
          </HStack>
        </TouchableOpacity>
      ))}
    </VStack>
  );
};
