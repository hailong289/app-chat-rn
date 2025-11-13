import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { HStack } from '@/src/components/ui/hstack';
import { ContactTabContent, ContactTabKey } from '@/src/components/contact/contact-tab-content.component';
import {
  contactMockFriends,
  contactMockFriendRequests,
  contactMockGroups,
} from './contact.mock';
import { CreateGroupChatModal } from '@/src/components/modals/create-group-chat';
import type { CreateGroupFormValues } from '@/src/schema/group.schema';
import { Toast } from 'toastify-react-native';

type TabType = ContactTabKey;

const ContactPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery] = useState('');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

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
  ];

  return (
    <>
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
      <ContactTabContent
        activeTab={activeTab}
        searchQuery={searchQuery}
        friends={contactMockFriends}
        groups={contactMockGroups}
        requests={contactMockFriendRequests}
        onCreateGroup={handleOpenCreateGroup}
      />
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

