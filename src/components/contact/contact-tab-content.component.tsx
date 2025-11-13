import React, { useMemo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import type {
  ContactFriend,
  ContactGroup,
  ContactFriendRequest,
} from '@/src/pages/contact/contact.mock';

export type ContactTabKey = 'friends' | 'groups' | 'requests';

type ContactTabContentProps = {
  activeTab: ContactTabKey;
  searchQuery: string;
  friends: ContactFriend[];
  groups: ContactGroup[];
  requests: ContactFriendRequest[];
  onCreateGroup: () => void;
};

export const ContactTabContent: React.FC<ContactTabContentProps> = ({
  activeTab,
  searchQuery,
  friends,
  groups,
  requests,
  onCreateGroup,
}) => {
  const filteredFriends = useMemo(
    () =>
      friends.filter((friend) =>
        friend.fullname.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [friends, searchQuery]
  );

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [groups, searchQuery]
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) =>
        request.fullname.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [requests, searchQuery]
  );

  const renderFriends = () => (
    <VStack>
      {filteredFriends.length === 0 ? (
        <VStack className="items-center justify-center py-20 px-5">
          <FontAwesome name="users" size={48} color="#9CA3AF" />
          <Text className="text-[18px] font-semibold text-gray-500 mt-4">
            {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè'}
          </Text>
          <Text className="text-[14px] text-gray-400 mt-2 text-center">
            {searchQuery
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Bắt đầu kết bạn ngay bây giờ'}
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
                    {friend.fullname}
                  </Text>
                  {friend.status === 'online' && (
                    <Text className="text-green-600 text-[13px] mt-1">
                      Đang hoạt động
                    </Text>
                  )}
                  {friend.status === 'away' && (
                    <Text className="text-yellow-600 text-[13px] mt-1">
                      Đang bận
                    </Text>
                  )}
                  {friend.status === 'offline' && friend.lastSeen && (
                    <Text className="text-gray-400 text-[13px] mt-1">
                      Hoạt động {friend.lastSeen}
                    </Text>
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

  const renderGroups = () => (
    <VStack>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onCreateGroup}
        className="mx-5 mt-4 mb-3 rounded-2xl flex-row items-center justify-center"
        style={{
          backgroundColor: '#42A59F',
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        <FontAwesome name="plus" size={18} color="#FFFFFF" />
        <Text className="text-white text-[15px] font-semibold ml-2">
          Tạo nhóm mới
        </Text>
      </TouchableOpacity>
      {filteredGroups.length === 0 ? (
        <VStack className="items-center justify-center py-20 px-5">
          <FontAwesome name="users" size={48} color="#9CA3AF" />
          <Text className="text-[18px] font-semibold text-gray-500 mt-4">
            {searchQuery ? 'Không tìm thấy nhóm' : 'Chưa có nhóm nào'}
          </Text>
          <Text className="text-[14px] text-gray-400 mt-2 text-center">
            {searchQuery
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Tạo nhóm đầu tiên của bạn'}
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
                  <Text className="text-gray-400 text-[12px]">
                    {group.lastMessageTime}
                  </Text>
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

  const renderRequests = () => {
    const unreadCount = requests.length;

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
              {searchQuery
                ? 'Thử tìm kiếm với từ khóa khác'
                : 'Các yêu cầu kết bạn sẽ xuất hiện ở đây'}
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
                      {request.fullname}
                    </Text>
                    {request.message && (
                      <Text className="text-gray-500 text-[13px] mt-1">
                        {request.message}
                      </Text>
                    )}
                    <Text className="text-gray-400 text-[12px] mt-1">
                      {request.time}
                    </Text>
                  </VStack>
                </HStack>
                <HStack className="items-center">
                  <TouchableOpacity
                    className="bg-green-600 px-4 py-2 rounded-lg mr-2"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-[14px] font-semibold">
                      Chấp nhận
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-200 px-4 py-2 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-700 text-[14px] font-semibold">
                      Từ chối
                    </Text>
                  </TouchableOpacity>
                </HStack>
              </HStack>
            </TouchableOpacity>
          ))
        )}
      </VStack>
    );
  };

  return (
    <View style={{ paddingBottom: 20 }}>
      {activeTab === 'friends' && renderFriends()}
      {activeTab === 'groups' && renderGroups()}
      {activeTab === 'requests' && renderRequests()}
    </View>
  );
};


