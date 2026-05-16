import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { HStack } from '@/src/components/ui/hstack';
import { ContactTabFriends } from '@/src/components/contact/contact-tab-friends.component';
import { ContactTabGroups } from '@/src/components/contact/contact-tab-groups.component';
import { ContactTabRequest } from '@/src/components/contact/contact-tab-request.component';
import { ContactTabPending } from '@/src/components/contact/conact-tab-pending.component';
import ContactTabOnline from '@/src/components/contact/contact-tab-online';
import {
  contactMockFriends,
  contactMockFriendRequests,
  contactMockGroups,
} from './contact.mock';
import { MainTabParamList } from '@/src/navigations/MainNavigator';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import HeaderSearchComponent from '@/src/components/headers/headers-search.component';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';
import useContactStore from '@/src/store/useContact';
import useRoomStore from '@/src/store/useRoom';

type TabType = 'friends' | 'online' | 'groups' | 'requests' | 'pending';

const ContactPage = () => {
  const route = useRoute<RouteProp<MainTabParamList, 'Contact'>>();
  const [activeTab, setActiveTab] = useState<TabType>((route.params?.activeTab as TabType) || 'friends');
  const [searchQueries, setSearchQueries] = useState<Record<TabType, string>>({
    friends: '',
    online: '',
    groups: '',
    requests: '',
    pending: '',
  });
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const currentSearchQuery = searchQueries[activeTab];

  const handleSearchChange = (text: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [activeTab]: text,
    }));
  };

  const { friends, friendRequests, sentFriendRequests, groups } = useContactStore();

  const { onlineUsers } = useContactStore();
  const onlineCount = Object.keys(onlineUsers).length;

  const tabs = [
    { key: 'friends' as TabType, label: 'Bạn bè', count: friends.length },
    { key: 'online' as TabType, label: 'Online', count: onlineCount },
    { key: 'groups' as TabType, label: 'Nhóm', count: groups.length },
    { key: 'requests' as TabType, label: 'Yêu cầu', count: friendRequests.length },
    { key: 'pending' as TabType, label: 'Đã gửi', count: sentFriendRequests.length },
  ];

  return (
    <>
      <HeaderSearchComponent 
          rightIcon="user-plus"
          onRightPress={() => {
              navigation.navigate('AddContact');
          }}
          searchPlaceholder={`Tìm kiếm ${activeTab === 'friends' ? 'bạn bè' : activeTab === 'online' ? 'bạn đang online' : activeTab === 'groups' ? 'nhóm' : activeTab === 'requests' ? 'yêu cầu' : 'đã gửi kết bạn'}...`}
          autoFocus={true}
          backgroundColor="#42A59F"
          statusBarStyle="light-content"
          height={60}
          searchHeight={44}
          showStatusBar={true}
          className=""
          searchInputClassName="text-gray-700 text-[16px]"
          onSearchChange={handleSearchChange}
          searchValue={currentSearchQuery}
        />
      <View style={styles.container}>
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
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </HStack>

      {/* Tab Content — không bọc ScrollView: tránh FlatList trong ScrollView */}
      <View style={styles.tabContent}>
        {activeTab === 'friends' && (
          <ContactTabFriends key="friends" searchQuery={searchQueries.friends} />
        )}
        {activeTab === 'online' && (
          <ContactTabOnline key="online" />
        )}
        {activeTab === 'groups' && (
          <ContactTabGroups key="groups" searchQuery={searchQueries.groups} />
        )}
        {activeTab === 'requests' && (
          <ContactTabRequest key="requests" searchQuery={searchQueries.requests} />
        )}
        {activeTab === 'pending' && (
          <ContactTabPending key="pending" searchQuery={searchQueries.pending} />
        )}
      </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabContent: { flex: 1 },
});

export default ContactPage;

