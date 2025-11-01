import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { Icon, ChevronRightIcon } from '@/src/components/ui/icon';
import { Text } from 'react-native-gesture-handler';
import { Button, ButtonSpinner, ButtonText } from '../components/ui/button';
import useAuthStore from '../store/useAuth';
import { Toast } from 'toastify-react-native';

const items = [
  { title: 'Cài đặt tài khoản', subtitle: 'Cập nhật thông tin' },
  { title: 'Cài đặt tin nhắn', subtitle: 'Thiết lập cài đặt tin nhắn' },
  { title: 'Tích hợp', subtitle: 'Thiết lập tích hợp' },
  { title: 'Hỗ trợ', subtitle: 'Gửi phản hồi' },
];

const SettingsPage = () => {

  const { isLoading, logout } = useAuthStore();

  const handleLogout = () => {
    // Xử lý đăng xuất ở đây
    logout({
      success: () => {
        Toast.show({
          type: 'success',
          text1: 'Đăng xuất thành công',
          position: 'top',
          visibilityTime: 2000,
          autoHide: true,
        })
      },
      error: (error) => {
        console.error('Đăng xuất thất bại', error);
        Toast.show({
          type: 'error',
          text1: 'Đăng xuất thất bại',
          position: 'top',
          visibilityTime: 2000,
          autoHide: true,
        })
      },
    });
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingVertical: 18 }}>
      <Box className="px-4">
        {items.map((it, idx) => (
          <TouchableOpacity key={idx} activeOpacity={0.7}>
            <HStack className="items-center py-5 border-b border-secondary-200 border-gray-300">
              <VStack className="flex-1">
                <Text className="text-[18px] font-bold text-typography-950">{it.title}</Text>
                <Text className="text-[14px] font-semibold text-gray-500 mt-1">{it.subtitle}</Text>
              </VStack>
              <Box className="w-9 items-center justify-center">
                <Icon as={ChevronRightIcon} className="text-gray-500" />
              </Box>
            </HStack>
          </TouchableOpacity>
        ))}
        <Button
          className="mt-4 rounded-[20px] h-[50px] bg-error-500"
          // variant="negative"
          onPress={handleLogout}
          // isDisabled={isLoading}
        >
          {isLoading && <ButtonSpinner color="gray" />}
          <ButtonText className="text-white text-lg">Đăng xuất</ButtonText>
        </Button>
      </Box>
    </ScrollView>
  );
};

export default SettingsPage;
