import React, { useCallback } from 'react';
import { FlatList, TouchableOpacity, Image, Text, View, RefreshControl } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Badge, BadgeText } from '../components/ui/badge';
import useNotificationStore from '../store/useNotification';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message': return 'envelope';
    case 'friend_request': return 'user-plus';
    case 'like': return 'heart';
    case 'comment': return 'comment';
    case 'system': return 'bell';
    default: return 'bell';
  }
};

const NotificationItem = React.memo(({
  notification,
  onPress,
}: {
  notification: any;
  onPress: (n: any) => void;
}) => (
  <TouchableOpacity
    className={`py-4 border-b border-gray-200 ${!notification.isRead ? 'bg-blue-50' : ''}`}
    activeOpacity={0.7}
    onPress={() => onPress(notification)}
  >
    <HStack className="items-center justify-between px-5">
      <HStack className="items-center flex-1">
        {notification.sender?.avatar ? (
          <Image
            source={{ uri: notification.sender.avatar }}
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
          />
        ) : (
          <Box
            className="items-center justify-center bg-secondary-200 rounded-full"
            style={{ width: 48, height: 48, marginRight: 12 }}
          >
            <FontAwesome name={getNotificationIcon(notification.type) as any} size={20} color="#42A59F" />
          </Box>
        )}
        <VStack className="flex-1">
          <HStack className="items-center mb-1">
            <Text
              className={`font-bold text-typography-950 text-[16px] ${!notification.isRead ? 'font-bold' : 'font-semibold'}`}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {!notification.isRead && <Box className="w-2 h-2 bg-blue-600 rounded-full ml-2" />}
          </HStack>
          <Text className="text-gray-600 text-[14px] mt-1" numberOfLines={2}>
            {notification.message}
          </Text>
          {notification.createdAt && (
            <Text className="text-gray-400 text-[12px] mt-1">
              {new Date(notification.createdAt).toLocaleDateString('vi-VN')}{' '}
              {new Date(notification.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </VStack>
      </HStack>
      <Box className="ml-2">
        <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
      </Box>
    </HStack>
  </TouchableOpacity>
));

const NotificationPage = () => {
  const insets = useSafeAreaInsets();
  const backgroundColor = '#42A59F';
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead } = useNotificationStore();

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = React.useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback((notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
  }, [markAsRead]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <NotificationItem notification={item} onPress={handleNotificationPress} />
    ),
    [handleNotificationPress],
  );

  const keyExtractor = useCallback((item: any) => item._id || String(Math.random()), []);

  const listHeader = (
    <HStack className="items-center justify-between mb-4 px-5">
      <Box>
        <Text className="text-[20px] font-bold text-typography-950">Thông báo</Text>
        {unreadCount > 0 && (
          <Text className="text-[14px] text-gray-500 mt-1">{unreadCount} thông báo chưa đọc</Text>
        )}
      </Box>
      {unreadCount > 0 && (
        <Badge variant="solid" className="bg-red-600 rounded-full min-w-[24px] h-6">
          <BadgeText className="text-white text-xs px-2">{unreadCount}</BadgeText>
        </Badge>
      )}
    </HStack>
  );

  const listEmpty = (
    <VStack className="items-center justify-center py-20 px-5">
      <FontAwesome name="bell-slash" size={48} color="#9CA3AF" />
      <Text className="text-[18px] font-semibold text-gray-500 mt-4">Chưa có thông báo</Text>
      <Text className="text-[14px] text-gray-400 mt-2 text-center">Các thông báo mới sẽ xuất hiện ở đây</Text>
    </VStack>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View style={{ height: insets.top, backgroundColor, position: 'absolute', top: 0, left: 0, right: 0 }} />
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={8}
      />
    </SafeAreaView>
  );
};

export default NotificationPage;
