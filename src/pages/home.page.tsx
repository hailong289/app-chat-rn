import React, { useEffect } from 'react';
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

const messages = [
  { id: '1', name: 'Jesus', text: 'Hello, how are you?', time: '10:30 AM' },
  { id: '2', name: 'Mari', text: "Let's catch up later.", time: '9:15 AM' },
  { id: '3', name: 'Kristin', text: 'Meeting at 3 PM.', time: 'Yesterday' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },
  { id: '4', name: 'Lea', text: 'Happy Birthday!', time: '2 days ago' },

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

  const handleNavigateToChat = (roomId: string) => {
    navigation.navigate('Chat', { roomId });
  }

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
      <ScrollView contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}>
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

        <ScrollView>
          {rooms.map((item) => (
            <TouchableOpacity 
              className="py-4 border-b border-gray-200" 
              key={item.id}
              onPress={() => handleNavigateToChat(item.id)}
            >
              <HStack className="items-center justify-between px-5" >
                <HStack className="items-center">
                  <Image source={{ uri: item.avatar || 'https://avatar.iran.liara.run/public' }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                  <VStack>
                    <Text className="font-bold text-typography-950 text-[16px]">{item.name}</Text>
                    <Text className="text-gray-400 text-[14px]">{item.last_message?.text}</Text>
                  </VStack>
                </HStack>
                <HStack className="items-center">
                  <Text className="text-gray-400 text-[12px] mr-4">{item.last_message?.createdAt}</Text>
                  <Badge variant="solid" className='bg-red-600 rounded-full'>
                    <BadgeText className='text-white'>{item.unread_count}</BadgeText>
                  </Badge>
                </HStack>
              </HStack>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomePage;
