import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Image, Text, StatusBar, View, TextInput } from 'react-native';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Badge, BadgeText } from '../../components/ui/badge';

type TabType = 'friends' | 'groups' | 'requests';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

interface Group {
  id: string;
  name: string;
  avatar?: string;
  members: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface FriendRequest {
  id: string;
  name: string;
  avatar: string;
  message?: string;
  time: string;
}

const mockFriends: Friend[] = [
  { id: '1', name: 'Jesus', avatar: 'https://avatar.iran.liara.run/public', status: 'online' },
  { id: '2', name: 'Mari', avatar: 'https://avatar.iran.liara.run/public', status: 'away' },
  { id: '3', name: 'Kristin', avatar: 'https://avatar.iran.liara.run/public', status: 'offline', lastSeen: '2 giờ trước' },
  { id: '4', name: 'Lea', avatar: 'https://avatar.iran.liara.run/public', status: 'online' },
  { id: '5', name: 'John', avatar: 'https://avatar.iran.liara.run/public', status: 'online' },
  { id: '6', name: 'Sarah', avatar: 'https://avatar.iran.liara.run/public', status: 'offline', lastSeen: '1 ngày trước' },
];

const mockGroups: Group[] = [
  { id: '1', name: 'Nhóm dự án', members: 12, lastMessage: 'Họp lúc 3 giờ chiều', lastMessageTime: '10:30 AM' },
  { id: '2', name: 'Bạn thân', members: 5, lastMessage: 'Đi ăn tối không?', lastMessageTime: 'Yesterday' },
  { id: '3', name: 'Gia đình', members: 8, lastMessage: 'Nhớ về sớm nhé', lastMessageTime: '2 days ago' },
  { id: '4', name: 'Học tập', members: 15, lastMessage: 'Bài tập đã làm xong chưa?', lastMessageTime: '1 week ago' },
];

const mockFriendRequests: FriendRequest[] = [
  { id: '1', name: 'Alex', avatar: 'https://avatar.iran.liara.run/public', message: 'Xin chào!', time: '10:30 AM' },
  { id: '2', name: 'Emma', avatar: 'https://avatar.iran.liara.run/public', message: 'Muốn kết bạn với bạn', time: 'Yesterday' },
  { id: '3', name: 'Mike', avatar: 'https://avatar.iran.liara.run/public', time: '2 days ago' },
];

const ContactPage = () => {
  const insets = useSafeAreaInsets();
  const backgroundColor = '#42A59F';
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'away':
        return '#F59E0B';
      case 'offline':
        return '#9CA3AF';
      default:
        return '#9CA3AF';
    }
  };

  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = mockGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = mockFriendRequests.filter(request =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFriendsTab = () => (
    <VStack>
      {filteredFriends.length === 0 ? (
        <VStack className="items-center justify-center py-20 px-5">
          <FontAwesome name="users" size={48} color="#9CA3AF" />
          <Text className="text-[18px] font-semibold text-gray-500 mt-4">
            {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè'}
          </Text>
          <Text className="text-[14px] text-gray-400 mt-2 text-center">
            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Bắt đầu kết bạn ngay bây giờ'}
          </Text>
        </VStack>
      ) : (
        filteredFriends.map((friend) => (
          <TouchableOpacity
            key={friend.id}
            className="py-4 border-b border-gray-200"
            activeOpacity={0.7}
          >
            <HStack className="items-center justify-between px-5">
              <HStack className="items-center flex-1">
                <Box className="relative">
                  <Image
                    source={{ uri: friend.avatar }}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                  />
                  {friend.status === 'online' && (
                    <Box
                      className="absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-white"
                      style={{ width: 14, height: 14 }}
                    />
                  )}
                  {friend.status === 'away' && (
                    <Box
                      className="absolute bottom-0 right-0 bg-yellow-500 rounded-full border-2 border-white"
                      style={{ width: 14, height: 14 }}
                    />
                  )}
                </Box>
                <VStack className="ml-3 flex-1">
                  <Text className="font-semibold text-typography-950 text-[16px]">
                    {friend.name}
                  </Text>
                  {friend.status === 'online' && (
                    <Text className="text-green-600 text-[13px] mt-1">Đang hoạt động</Text>
                  )}
                  {friend.status === 'away' && (
                    <Text className="text-yellow-600 text-[13px] mt-1">Đang bận</Text>
                  )}
                  {friend.status === 'offline' && friend.lastSeen && (
                    <Text className="text-gray-400 text-[13px] mt-1">Hoạt động {friend.lastSeen}</Text>
                  )}
                </VStack>
              </HStack>
              <TouchableOpacity>
                <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </HStack>
          </TouchableOpacity>
        ))
      )}
    </VStack>
  );

  const renderGroupsTab = () => (
    <VStack>
      {filteredGroups.length === 0 ? (
        <VStack className="items-center justify-center py-20 px-5">
          <FontAwesome name="users" size={48} color="#9CA3AF" />
          <Text className="text-[18px] font-semibold text-gray-500 mt-4">
            {searchQuery ? 'Không tìm thấy nhóm' : 'Chưa có nhóm nào'}
          </Text>
          <Text className="text-[14px] text-gray-400 mt-2 text-center">
            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo nhóm đầu tiên của bạn'}
          </Text>
        </VStack>
      ) : (
        filteredGroups.map((group) => (
          <TouchableOpacity
            key={group.id}
            className="py-4 border-b border-gray-200"
            activeOpacity={0.7}
          >
            <HStack className="items-center justify-between px-5">
              <HStack className="items-center flex-1">
                <Box
                  className="items-center justify-center bg-secondary-200 rounded-full"
                  style={{ width: 50, height: 50 }}
                >
                  <FontAwesome name="users" size={24} color="#42A59F" />
                </Box>
                <VStack className="ml-3 flex-1">
                  <Text className="font-semibold text-typography-950 text-[16px]">
                    {group.name}
                  </Text>
                  <Text className="text-gray-500 text-[13px] mt-1">
                    {group.members} thành viên
                  </Text>
                  {group.lastMessage && (
                    <Text className="text-gray-400 text-[12px] mt-1" numberOfLines={1}>
                      {group.lastMessage}
                    </Text>
                  )}
                </VStack>
              </HStack>
              <VStack className="items-end">
                {group.lastMessageTime && (
                  <Text className="text-gray-400 text-[12px]">{group.lastMessageTime}</Text>
                )}
                <TouchableOpacity className="mt-2">
                  <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              </VStack>
            </HStack>
          </TouchableOpacity>
        ))
      )}
    </VStack>
  );

  const renderRequestsTab = () => {
    const unreadCount = mockFriendRequests.length;
    return (
      <VStack>
        {unreadCount > 0 && (
          <Box className="px-5 py-3 bg-blue-50">
            <Text className="text-blue-600 text-[14px] font-semibold">
              Bạn có {unreadCount} yêu cầu kết bạn mới
            </Text>
          </Box>
        )}
        {filteredRequests.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="user-plus" size={48} color="#9CA3AF" />
            <Text className="text-[18px] font-semibold text-gray-500 mt-4">
              {searchQuery ? 'Không tìm thấy yêu cầu' : 'Chưa có yêu cầu kết bạn'}
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Các yêu cầu kết bạn sẽ xuất hiện ở đây'}
            </Text>
          </VStack>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              className="py-4 border-b border-gray-200"
              activeOpacity={0.7}
            >
              <HStack className="items-center justify-between px-5">
                <HStack className="items-center flex-1">
                  <Image
                    source={{ uri: request.avatar }}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                  />
                  <VStack className="ml-3 flex-1">
                    <Text className="font-semibold text-typography-950 text-[16px]">
                      {request.name}
                    </Text>
                    {request.message && (
                      <Text className="text-gray-500 text-[13px] mt-1">{request.message}</Text>
                    )}
                    <Text className="text-gray-400 text-[12px] mt-1">{request.time}</Text>
                  </VStack>
                </HStack>
                <HStack className="items-center">
                  <TouchableOpacity
                    className="bg-green-600 px-4 py-2 rounded-lg mr-2"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-[14px] font-semibold">Chấp nhận</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-200 px-4 py-2 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-700 text-[14px] font-semibold">Từ chối</Text>
                  </TouchableOpacity>
                </HStack>
              </HStack>
            </TouchableOpacity>
          ))
        )}
      </VStack>
    );
  };

  const tabs = [
    { key: 'friends' as TabType, label: 'Bạn bè', count: mockFriends.length },
    { key: 'groups' as TabType, label: 'Nhóm', count: mockGroups.length },
    { key: 'requests' as TabType, label: 'Yêu cầu', count: mockFriendRequests.length },
  ];

  return (
    <ScrollView className='flex-1 bg-white'>
      {/* Tab Navigation */}
      <HStack className="bg-white border-b border-gray-200">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 py-3 items-center ${
              activeTab === tab.key ? 'border-b-2 border-[#42A59F]' : ''
            }`}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
            style={{
              height: 50,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HStack className="items-center">
              <Text
                className={`text-[14px] font-semibold ${
                  activeTab === tab.key
                    ? 'text-[#42A59F]'
                    : 'text-gray-500'
                }`}
              >
                {tab.label}
              </Text>
              {/* {tab.count > 0 && (
                <Badge
                  variant="solid"
                  className={`ml-2 rounded-full min-w-[20px] h-5 ${
                    activeTab === tab.key ? 'bg-[#42A59F]' : 'bg-gray-400'
                  }`}
                >
                  <BadgeText className="text-white text-xs px-1">
                    {tab.count}
                  </BadgeText>
                </Badge>
              )} */}
            </HStack>
          </TouchableOpacity>
        ))}
      </HStack>

      {/* Tab Content */}
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'groups' && renderGroupsTab()}
        {activeTab === 'requests' && renderRequestsTab()}
      </ScrollView>
    </ScrollView>
  );
};

export default ContactPage;

