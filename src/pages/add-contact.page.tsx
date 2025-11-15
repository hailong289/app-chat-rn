import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Image, Text, Keyboard, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import HeaderSearchComponent from '@/src/components/headers/headers-search.component';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { Toast } from 'toastify-react-native';
import useContactStore from '../store/useContact';
import { User } from '../types/user.type';
import { MainStackParamList } from '../navigations/MainStackNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const AddContactPage = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const { users, loading, getUsers, sendFriendRequest } = useContactStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        searchUsers(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    getUsers({ 
      search: query, 
      limit: 20, 
      page: 1,
      success: (data) => {
      },
      error: (error: any) => {
        
      }
    });
  };


  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const handleSendFriendRequest = async (user: User) => {
    setSelectedUser(user);
    if (user.friendship?.status === 'PENDING' || user.friendship?.status === 'ACCEPTED') {
      Toast.show({
        type: 'error',
        text1: 'Người dùng đã được kết bạn hoặc đã gửi yêu cầu kết bạn',
        position: 'top',
      });
      return;
    }
    sendFriendRequest({ receiverId: user.id, success: () => {
      Toast.show({
        type: 'success',
        text1: 'Gửi yêu cầu kết bạn thành công',
      });
      // Navigate to Main tab navigator and then to Contact tab
      navigation.navigate('Main', { screen: 'Contact', params: { activeTab: 'pending' } } as never);
    }, error: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Gửi yêu cầu kết bạn thất bại',
      });
    } });
  };

  return (
    <>
      <HeaderSearchComponent
        leftIcon="arrow-left"
        onLeftPress={handleBack}
        searchPlaceholder="Tìm kiếm người dùng..."
        autoFocus={true}
        backgroundColor="#42A59F"
        statusBarStyle="light-content"
        height={60}
        searchHeight={44}
        showStatusBar={true}
        searchInputClassName="text-gray-700 text-[16px]"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={handleClearSearch}
      />
      
      {/* Search Results */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim().length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="user-plus" size={64} color="#E5E7EB" />
            <Text className="text-[18px] font-semibold text-gray-400 mt-4">
              Tìm kiếm bạn để kết nối ngay
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              Nhập tên, email hoặc số điện thoại để tìm kiếm
            </Text>
          </VStack>
        ) : loading.users ? (
          <VStack className="items-center justify-center py-20 px-5">
            <ActivityIndicator size="large" color="#42A59F" />
            <Text className="text-[16px] text-gray-500 mt-4">Đang tìm kiếm...</Text>
          </VStack>
        ) : users.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="search-minus" size={64} color="#E5E7EB" />
            <Text className="text-[18px] font-semibold text-gray-400 mt-4">
              Không tìm thấy người dùng
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              Hãy thử tìm kiếm với từ khóa khác
            </Text>
          </VStack>
        ) : (
          <VStack>
            {users.map((user) => {
              return (
                <TouchableOpacity
                  key={user._id}
                  className="py-4 border-b border-gray-200 bg-white"
                  activeOpacity={0.7}
                >
                  <HStack className="items-center justify-between px-5">
                    <HStack className="items-center flex-1 mr-3">
                      {user.avatar ? (
                        <Image
                          source={{ uri: user.avatar }}
                          style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                        />
                      ) : (
                        <Box
                          className="items-center justify-center bg-secondary-200 rounded-full"
                          style={{ width: 48, height: 48, marginRight: 12 }}
                        >
                          <FontAwesome
                            name="user"
                            size={20}
                            color="#42A59F"
                          />
                        </Box>
                      )}
                      <VStack className="flex-1">
                        <Text className="font-semibold text-typography-950 text-[16px]">
                          {user.fullname}
                        </Text>
                        {user.slug && (
                          <Text className="text-gray-500 text-[14px] mt-1" numberOfLines={1}>
                            @{user.slug}
                          </Text>
                        )}
                        {user.email && (
                          <Text className="text-gray-400 text-[13px] mt-0.5" numberOfLines={1}>
                            {user.email}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                    <TouchableOpacity
                      onPress={() => handleSendFriendRequest(user)}
                      disabled={user.friendship?.status === 'PENDING' || user.friendship?.status === 'ACCEPTED'}
                      className={`px-4 py-2 rounded-lg ${
                        user.friendship?.status === 'PENDING' 
                          ? 'bg-gray-200' 
                          : 'bg-[#42A59F]'
                      }`}
                      activeOpacity={0.7}
                    >
                      {loading.sendFriendRequest && selectedUser && user.id === selectedUser.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : user.friendship?.status === 'PENDING' ? (
                        <HStack className="items-center">
                          <FontAwesome name="check" size={14} color="#6B7280" />
                          <Text className="text-gray-600 text-[14px] font-semibold ml-1">
                            Đã gửi
                          </Text>
                        </HStack>
                      ) : (
                        <HStack className="items-center">
                          <FontAwesome name="user-plus" size={14} color="#FFFFFF" />
                          <Text className="text-white text-[14px] font-semibold ml-1">
                            Kết bạn
                          </Text>
                        </HStack>
                      )}
                    </TouchableOpacity>
                  </HStack>
                </TouchableOpacity>
              );
            })}
          </VStack>
        )}
      </ScrollView>
    </>
  );
};

export default AddContactPage;

