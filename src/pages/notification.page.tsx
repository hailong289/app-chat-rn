import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Image, Text, StatusBar, View, RefreshControl } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Badge, BadgeIcon, BadgeText } from '../components/ui/badge';

interface NotificationItem {
  id: string;
  type: 'message' | 'friend_request' | 'system' | 'like' | 'comment';
  title: string;
  message: string;
  time: string;
  avatar?: string;
  isRead: boolean;
  metadata?: any;
}

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'message',
    title: 'Jesus đã gửi tin nhắn',
    message: 'Hello, how are you doing today?',
    time: '10:30 AM',
    avatar: 'https://avatar.iran.liara.run/public',
    isRead: false,
  },
  {
    id: '2',
    type: 'friend_request',
    title: 'Mari đã gửi lời mời kết bạn',
    message: 'Muốn kết bạn với bạn',
    time: '9:15 AM',
    avatar: 'https://avatar.iran.liara.run/public',
    isRead: false,
  },
  {
    id: '3',
    type: 'like',
    title: 'Kristin đã thích bài viết của bạn',
    message: 'Đã thích trạng thái của bạn',
    time: 'Yesterday',
    avatar: 'https://avatar.iran.liara.run/public',
    isRead: true,
  },
  {
    id: '4',
    type: 'comment',
    title: 'Lea đã bình luận',
    message: 'Bài viết hay quá!',
    time: '2 days ago',
    avatar: 'https://avatar.iran.liara.run/public',
    isRead: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Cập nhật hệ thống',
    message: 'Phiên bản mới đã được phát hành',
    time: '3 days ago',
    isRead: true,
  },
  {
    id: '6',
    type: 'message',
    title: 'John đã gửi tin nhắn',
    message: 'Are you free this weekend?',
    time: '1 week ago',
    avatar: 'https://avatar.iran.liara.run/public',
    isRead: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return 'envelope';
    case 'friend_request':
      return 'user-plus';
    case 'like':
      return 'heart';
    case 'comment':
      return 'comment';
    case 'system':
      return 'bell';
    default:
      return 'bell';
  }
};

const NotificationPage = () => {
  const insets = useSafeAreaInsets();
  const backgroundColor = '#42A59F';
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setNotifications(mockNotifications);
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleNotificationPress = (notification: NotificationItem) => {
    // Handle notification press
    console.log('Notification pressed:', notification.id);
    // Mark as read
    if (!notification.isRead) {
      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id ? { ...item, isRead: true } : item
        )
      );
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView className='flex-1 bg-white' edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />
      <View
        style={{
          height: insets.top,
          backgroundColor,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <HStack className="items-center justify-between mb-4 px-5">
          <Box>
            <Text className="text-[20px] font-bold text-typography-950">
              Thông báo
            </Text>
            {unreadCount > 0 && (
              <Text className="text-[14px] text-gray-500 mt-1">
                {unreadCount} thông báo chưa đọc
              </Text>
            )}
          </Box>
          {unreadCount > 0 && (
            <Badge variant="solid" className='bg-red-600 rounded-full min-w-[24px] h-6'>
              <BadgeText className='text-white text-xs px-2'>{unreadCount}</BadgeText>
            </Badge>
          )}
        </HStack>

        {notifications.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="bell-slash" size={48} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4">
              Chưa có thông báo
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              Các thông báo mới sẽ xuất hiện ở đây
            </Text>
          </VStack>
        ) : (
          <VStack>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                className={`py-4 border-b border-gray-200 ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(notification)}
              >
                <HStack className="items-center justify-between px-5">
                  <HStack className="items-center flex-1">
                    {notification.avatar ? (
                      <Image
                        source={{ uri: notification.avatar }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 12,
                        }}
                      />
                    ) : (
                      <Box
                        className="items-center justify-center bg-secondary-200 rounded-full"
                        style={{ width: 48, height: 48, marginRight: 12 }}
                      >
                        <FontAwesome
                          name={getNotificationIcon(notification.type)}
                          size={20}
                          color="#42A59F"
                        />
                      </Box>
                    )}
                    <VStack className="flex-1">
                      <HStack className="items-center mb-1">
                        <Text
                          className={`font-bold text-typography-950 text-[16px] ${
                            !notification.isRead ? 'font-bold' : 'font-semibold'
                          }`}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        {!notification.isRead && (
                          <Box className="w-2 h-2 bg-blue-600 rounded-full ml-2" />
                        )}
                      </HStack>
                      <Text
                        className="text-gray-600 text-[14px] mt-1"
                        numberOfLines={2}
                      >
                        {notification.message}
                      </Text>
                      <Text className="text-gray-400 text-[12px] mt-1">
                        {notification.time}
                      </Text>
                    </VStack>
                  </HStack>
                  <Box className="ml-2">
                    <FontAwesome
                      name="chevron-right"
                      size={14}
                      color="#9CA3AF"
                    />
                  </Box>
                </HStack>
              </TouchableOpacity>
            ))}
          </VStack>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationPage;

