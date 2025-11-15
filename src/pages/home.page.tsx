import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Image, Text, StatusBar, View } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { Icon, SearchIcon } from '@/src/components/ui/icon';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Badge, BadgeIcon, BadgeText } from '../components/ui/badge';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigations/MainStackNavigator';
import useRoomStore from '../store/useRoom';
import Helpers from '../libs/helpers';
import { RefreshControl } from 'react-native';
import { ImageAvatar } from '../components/chat/image-avatar.component';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const stories = [
  { id: 'me', label: 'Trạng thái của tôi', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'j', label: 'Jesus', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'm', label: 'Mari', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'k', label: 'Kristin', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
  { id: 'l', label: 'Lea', avatar: 'https://avatar.iran.liara.run/public' },
];

const Avatar = ({ src }: { src: any }) => (
  <Box className="items-center mr-4">
    <Image source={src} style={{ width: 64, height: 64, borderRadius: 32 }} />
  </Box>
);

const HomePage = () => {
  const insets = useSafeAreaInsets();
  const backgroundColor = '#42A59F';
  const navigation = useNavigation<NavigationProp>();
  const { rooms, getRooms, isLoading } = useRoomStore();
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRooms({
      limit: 10,
      offset: 0,
      type: 'private',
      success: () => {
        console.log('success');
      },
      error: (error) => {
        console.log('error', error);
      },
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await getRooms({
        limit: 10,
        offset: 0,
        type: 'private',
        success: () => {
          console.log('refresh success');
          setRefreshing(false);
        },
        error: (error) => {
          console.log('refresh error', error);
          setRefreshing(false);
        },
      });
    } catch (error) {
      setRefreshing(false);
    }
  };

  const handleNavigateToChat = (roomId: string) => {
    navigation.navigate('Chat', { roomId });
  }

  console.log('rooms', rooms);

  return (
    <SafeAreaView className='flex-1 bg-white' edges={['top']}>
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
            <Text className="text-[20px] font-bold text-typography-950">Hoạt động</Text>
          </Box>
        </HStack>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-5">
          {stories.map((s) => (
            <Box className="items-center mr-4" style={{ width: 64 }} key={Math.random().toString(36).substring(7)}>
              <Image source={{ uri: s.avatar }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              <Text
                className="text-[13px] text-gray-400 mt-2 text-center"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {s.label}
              </Text>
            </Box>
          ))}
        </ScrollView>

        <HStack className="items-center justify-between mb-4 px-5">
          <Text className="text-[20px] font-bold text-typography-950">Tin nhắn (10)</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <FontAwesome name="search" className="text-secondary-500" size={16}  />
          </TouchableOpacity>
        </HStack>

        {rooms.length === 0 && !isLoading ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="comments" size={64} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4 text-center">
              Chưa có tin nhắn nào
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center mb-6">
              Hãy kết bạn để bắt đầu trò chuyện
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Navigate to Contact tab
                const tabNavigator = navigation.getParent();
                if (tabNavigator) {
                  (tabNavigator as any).navigate('AddContact');
                }
              }}
              className="bg-[#42A59F] px-6 py-3 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-white text-[16px] font-semibold">
                Kết bạn ngay
              </Text>
            </TouchableOpacity>
          </VStack>
        ) : (
          <ScrollView>
            {rooms.map((item) => (
              <TouchableOpacity 
                className="py-4 border-b border-gray-200" 
                key={item.id}
                onPress={() => handleNavigateToChat(item.id)}
              >
                <HStack className="items-center justify-between px-5" >
                  <HStack className="items-center flex-1 mr-2">
                    <Box className="relative mr-2">
                      <ImageAvatar
                        src={item.avatar || 'https://avatar.iran.liara.run/public'}
                        id={item.id}
                        size={44}
                        style={{ width: 50, height: 50, borderRadius: 25 }}
                      />
                    </Box>
                    <VStack className="flex-1">
                      <Text className="font-bold text-typography-950 text-[16px]">{item.name}</Text>
                      <Text 
                        className="text-gray-400 text-[14px]" 
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.last_message?.content}
                      </Text>
                    </VStack>
                  </HStack>
                  <VStack className="items-end">
                    <Badge variant="solid" className='bg-red-600 rounded-full mb-1'>
                      <BadgeText className='text-white'>{item.unread_count}</BadgeText>
                    </Badge>
                    <Text className="text-gray-400 text-[12px]">{item.last_message?.createdAt ? Helpers.formatTimeAgo(item.last_message?.createdAt) : ''}</Text>
                  </VStack>
                </HStack>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomePage;
