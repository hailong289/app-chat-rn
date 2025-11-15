import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { HStack } from '@/src/components/ui/hstack';
import { ContactTabFriends } from '@/src/components/contact/contact-tab-friends.component';
import { ContactTabGroups } from '@/src/components/contact/contact-tab-groups.component';
import { ContactTabRequest } from '@/src/components/contact/contact-tab-request.component';
import { ContactTabPending } from '@/src/components/contact/conact-tab-pending.component';
import {
  contactMockFriends,
  contactMockFriendRequests,
  contactMockGroups,
} from './contact.mock';
import { CreateGroupChatModal } from '@/src/components/modals/create-group-chat';
import type { CreateGroupFormValues } from '@/src/schema/group.schema';
import { Toast } from 'toastify-react-native';
import { MainTabParamList } from '@/src/navigations/MainNavigator';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import useContactStore from '@/src/store/useContact';
import HeaderSearchComponent from '@/src/components/headers/headers-search.component';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';

type TabType = 'friends' | 'groups' | 'requests' | 'pending';

const ContactPage = () => {
  const route = useRoute<RouteProp<MainTabParamList, 'Contact'>>();
  const [activeTab, setActiveTab] = useState<TabType>((route.params?.activeTab as TabType) || 'friends');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const friendsForModal = useMemo(
    () =>
      contactMockFriends.map((friend) => ({
        id: friend.id,
        fullname: friend.fullname,
        avatar: friend.avatar,
      })),
    []
  );

  const handleOpenCreateGroup = useCallback(() => {
    setIsCreateGroupModalOpen(true);
  }, []);

  const handleCloseCreateGroup = useCallback(() => {
    setIsCreateGroupModalOpen(false);
  }, []);

  const handleSubmitCreateGroup = useCallback((payload: CreateGroupFormValues) => {
    Toast.show({
      type: 'success',
      text1: 'Tạo nhóm thành công',
      position: 'top',
      visibilityTime: 2000,
      autoHide: true,
    });
    setIsCreateGroupModalOpen(false);
    // TODO: Kết nối API tạo nhóm tại đây
    console.log('Create group payload:', payload);
  }, []);

  const tabs = [
    { key: 'friends' as TabType, label: 'Bạn bè', count: contactMockFriends.length },
    { key: 'groups' as TabType, label: 'Nhóm', count: contactMockGroups.length },
    { key: 'requests' as TabType, label: 'Yêu cầu', count: contactMockFriendRequests.length },
    { key: 'pending' as TabType, label: 'Đã gửi kết bạn', count: 0 },
  ];

  return (
    <>
      <HeaderSearchComponent 
          rightIcon="user-plus"
          onRightPress={() => {
              navigation.navigate('AddContact');
          }}
          searchPlaceholder={`Tìm kiếm ${activeTab === 'friends' ? 'bạn bè' : activeTab === 'groups' ? 'nhóm' : activeTab === 'requests' ? 'yêu cầu' : 'đã gửi kết bạn'}...`}
          autoFocus={true}
          backgroundColor="#42A59F"
          statusBarStyle="light-content"
          height={60}
          searchHeight={44}
          showStatusBar={true}
          className=""
          searchInputClassName="text-gray-700 text-[16px]"
          onSearchChange={(text) => setSearchQuery(text)}
          searchValue={searchQuery}
        />
      <ScrollView className='flex-1 bg-white'>
      {/* Tab Navigation */}
      <HStack className="bg-white border-b border-gray-200">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 py-3 px-2 items-center justify-center ${
              activeTab === tab.key ? 'border-b-2 border-[#42A59F]' : ''
            }`}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
            style={{
              minHeight: 50,
            }}
          >
            <Text
              className={`text-[14px] font-semibold text-center ${
                activeTab === tab.key
                  ? 'text-[#42A59F]'
                  : 'text-gray-500'
              }`}
              numberOfLines={2}
              style={{ lineHeight: 18 }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </HStack>

      {/* Tab Content */}
      <View style={{ paddingBottom: 20 }}>
        {activeTab === 'friends' && (
          <ContactTabFriends searchQuery={searchQuery} />
        )}
        {activeTab === 'groups' && (
          <ContactTabGroups />
        )}
        {activeTab === 'requests' && (
          <ContactTabRequest
          />
        )}
        {activeTab === 'pending' && (
          <ContactTabPending />
        )}
      </View>
      </ScrollView>
      <CreateGroupChatModal
        isOpen={isCreateGroupModalOpen}
        onClose={handleCloseCreateGroup}
        onSubmit={handleSubmitCreateGroup}
        friends={friendsForModal}
        defaultSelectedIds={[]}
      />
    </>
  );
};

export default ContactPage;

