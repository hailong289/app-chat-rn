import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Image, Text, View, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import HeaderComponent from '@/src/components/headers/headers.component';
import FontAwesome from '@react-native-vector-icons/fontawesome';

interface SearchResult {
  id: string;
  type: 'user' | 'group' | 'message';
  name: string;
  avatar?: string;
  subtitle?: string;
  time?: string;
}

const mockSearchResults: SearchResult[] = [
  { id: '1', type: 'user', name: 'Jesus', avatar: 'https://avatar.iran.liara.run/public', subtitle: 'Đang hoạt động' },
  { id: '2', type: 'user', name: 'Mari', avatar: 'https://avatar.iran.liara.run/public', subtitle: 'Hoạt động 2 giờ trước' },
  { id: '3', type: 'group', name: 'Nhóm dự án', subtitle: '12 thành viên' },
  { id: '4', type: 'message', name: 'Kristin', avatar: 'https://avatar.iran.liara.run/public', subtitle: 'Hello, how are you?', time: '10:30 AM' },
  { id: '5', type: 'user', name: 'Lea', avatar: 'https://avatar.iran.liara.run/public', subtitle: 'Đang hoạt động' },
];

const SearchPage = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto focus input when component mounts
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      // Simulate search API call
      const timer = setTimeout(() => {
        const filtered = mockSearchResults.filter(
          (result) =>
            result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'user':
        return 'user';
      case 'group':
        return 'users';
      case 'message':
        return 'comment';
      default:
        return 'circle';
    }
  };

  const handleResultPress = (result: SearchResult) => {
    Keyboard.dismiss();
    console.log('Result pressed:', result);
  };

  return (
    <SafeAreaView className='flex-1 bg-white' edges={['top']}>
      {/* Search Results */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim().length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="search" size={64} color="#E5E7EB" />
            <Text className="text-[18px] font-semibold text-gray-400 mt-4">
              Bắt đầu tìm kiếm
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              Tìm kiếm người dùng, nhóm hoặc tin nhắn
            </Text>
          </VStack>
        ) : isSearching ? (
          <VStack className="items-center justify-center py-20 px-5">
            <Text className="text-[16px] text-gray-500">Đang tìm kiếm...</Text>
          </VStack>
        ) : searchResults.length === 0 ? (
          <VStack className="items-center justify-center py-20 px-5">
            <FontAwesome name="search-minus" size={64} color="#E5E7EB" />
            <Text className="text-[18px] font-semibold text-gray-400 mt-4">
              Không tìm thấy kết quả
            </Text>
            <Text className="text-[14px] text-gray-400 mt-2 text-center">
              Thử tìm kiếm với từ khóa khác
            </Text>
          </VStack>
        ) : (
          <VStack>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                className="py-4 border-b border-gray-200 bg-white"
                activeOpacity={0.7}
                onPress={() => handleResultPress(result)}
              >
                <HStack className="items-center justify-between px-5">
                  <HStack className="items-center flex-1">
                    {result.avatar ? (
                      <Image
                        source={{ uri: result.avatar }}
                        style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                      />
                    ) : (
                      <Box
                        className="items-center justify-center bg-secondary-200 rounded-full"
                        style={{ width: 48, height: 48, marginRight: 12 }}
                      >
                        <FontAwesome
                          name={getResultIcon(result.type) as any}
                          size={20}
                          color="#42A59F"
                        />
                      </Box>
                    )}
                    <VStack className="flex-1">
                      <Text className="font-semibold text-typography-950 text-[16px]">
                        {result.name}
                      </Text>
                      {result.subtitle && (
                        <Text className="text-gray-500 text-[14px] mt-1" numberOfLines={1}>
                          {result.subtitle}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                  {result.time && (
                    <Text className="text-gray-400 text-[12px] ml-2">{result.time}</Text>
                  )}
                  <Box className="ml-2">
                    <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
                  </Box>
                </HStack>
              </TouchableOpacity>
            ))}
          </VStack>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchPage;

