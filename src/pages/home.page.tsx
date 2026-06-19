import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FlatList, TouchableOpacity, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Badge, BadgeText } from '../components/ui/badge';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigations/MainStackNavigator';
import useRoomStore from '../store/useRoom';
import Helpers from '../libs/helpers';
import { ImageAvatar } from '../components/chat/image-avatar.component';
import HeaderComponent from '../components/headers/headers.component';
import { MAIN_TAB_BAR_HEIGHT } from '../libs/resolve-media-url';
import type { Room } from '../types/room.type';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const RoomItem = React.memo(({ item, onPress }: { item: Room; onPress: (id: string) => void }) => (
  <TouchableOpacity
    className="py-4 border-b border-gray-200"
    onPress={() => onPress(item.id)}
    activeOpacity={0.7}
  >
    <HStack className="items-center justify-between px-5">
      <HStack className="items-center flex-1 mr-2">
        <Box className="relative mr-2">
          <ImageAvatar
            src={item.avatar}
            id={item.id}
            size={44}
            style={{ width: 50, height: 50, borderRadius: 25 }}
          />
        </Box>
        <VStack className="flex-1">
          <Text className="font-bold text-typography-950 text-[16px]" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-gray-400 text-[14px]" numberOfLines={2} ellipsizeMode="tail">
            {item.last_message?.content || ''}
          </Text>
        </VStack>
      </HStack>
      <VStack className="items-end">
        {item.unread_count > 0 && (
          <Badge variant="solid" className="bg-red-600 rounded-full mb-1">
            <BadgeText className="text-white">{item.unread_count}</BadgeText>
          </Badge>
        )}
        <Text className="text-gray-400 text-[12px]">
          {item.last_message?.createdAt ? Helpers.formatTimeAgo(item.last_message.createdAt) : ''}
        </Text>
      </VStack>
    </HStack>
  </TouchableOpacity>
));

const HomePage = () => {
  const insets = useSafeAreaInsets();
  const scrollBottomPad = MAIN_TAB_BAR_HEIGHT + insets.bottom + 24;
  const navigation = useNavigation<NavigationProp>();
  const { rooms, getRooms, isLoading } = useRoomStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async () => {
    getRooms({
      limit: 20,
      offset: 0,
      type: 'all',
      success: () => setRefreshing(false),
      error: () => setRefreshing(false),
    });
  }, [getRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms();
  }, [fetchRooms]);

  const handleNavigateToChat = useCallback(
    (roomId: string) => navigation.navigate('Chat', { roomId }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Room }) => <RoomItem item={item} onPress={handleNavigateToChat} />,
    [handleNavigateToChat],
  );

  const keyExtractor = useCallback((item: Room) => item.id, []);

  const listEmpty = useMemo(() => {
    if (isLoading && rooms.length === 0) {
      return (
        <VStack className="items-center justify-center py-20 px-5">
          <ActivityIndicator size="large" color="#42A59F" />
          <Text className="text-[14px] text-gray-500 mt-4 text-center">Đang tải tin nhắn...</Text>
        </VStack>
      );
    }

    if (!isLoading && rooms.length === 0) {
      return (
        <VStack className="items-center justify-center py-20 px-5">
          <FontAwesome name="comments" size={64} color="#9CA3AF" />
          <Text className="text-[18px] font-semibold text-gray-500 mt-4 text-center">Chưa có tin nhắn nào</Text>
          <Text className="text-[14px] text-gray-400 mt-2 text-center mb-6">Hãy kết bạn để bắt đầu trò chuyện</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddContact')}
            className="bg-[#42A59F] px-6 py-3 rounded-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white text-[16px] font-semibold">Kết bạn ngay</Text>
          </TouchableOpacity>
        </VStack>
      );
    }

    return null;
  }, [isLoading, rooms.length, navigation]);

  return (
    <View className="flex-1 bg-white">
      <HeaderComponent
        title="Tin nhắn"
        rightIcon="search"
        onRightPress={() => navigation.navigate('Search')}
        backgroundColor="#42A59F"
        statusBarStyle="light-content"
        height={64}
        showStatusBar
      />
      <FlatList
        data={rooms}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={
          rooms.length === 0 ? { flexGrow: 1, paddingBottom: scrollBottomPad } : { paddingBottom: scrollBottomPad }
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={8}
      />
    </View>
  );
};

export default HomePage;
