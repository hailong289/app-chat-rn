import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { FlatList, TouchableOpacity, Image, Text, View, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import useContactStore from '../store/useContact';
import { User } from '../types/user.type';

interface SearchResult {
  id: string;
  type: 'user' | 'group' | 'message';
  name: string;
  avatar?: string;
  subtitle?: string;
  time?: string;
  data?: any;
}

const getResultIcon = (type: string) => {
  switch (type) {
    case 'user': return 'user';
    case 'group': return 'users';
    case 'message': return 'comment';
    default: return 'circle';
  }
};

const SearchResultItem = memo(({
  result,
  onPress,
}: {
  result: SearchResult;
  onPress: (r: SearchResult) => void;
}) => (
  <TouchableOpacity
    className="py-4 border-b border-gray-200 bg-white"
    activeOpacity={0.7}
    onPress={() => onPress(result)}
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
            <FontAwesome name={getResultIcon(result.type) as any} size={20} color="#42A59F" />
          </Box>
        )}
        <VStack className="flex-1">
          <Text className="font-semibold text-typography-950 text-[16px]">{result.name}</Text>
          {result.subtitle && (
            <Text className="text-gray-500 text-[14px] mt-1" numberOfLines={1}>{result.subtitle}</Text>
          )}
        </VStack>
      </HStack>
      {result.time && <Text className="text-gray-400 text-[12px] ml-2">{result.time}</Text>}
      <Box className="ml-2">
        <FontAwesome name="chevron-right" size={14} color="#9CA3AF" />
      </Box>
    </HStack>
  </TouchableOpacity>
));

const SearchPage = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { getUsers, getGroups } = useContactStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        let results: SearchResult[] = [];
        try {
          await getUsers({
            search: searchQuery,
            limit: 5,
            page: 1,
            success: (data: any) => {
              const users = data.users || [];
              results = [
                ...results,
                ...users.map((u: User) => ({
                  id: u.id,
                  type: 'user' as const,
                  name: u.fullname,
                  avatar: u.avatar,
                  subtitle: u.email,
                  data: u,
                })),
              ];
            },
            error: () => {},
          });
        } catch {}
        try {
          await getGroups({
            q: searchQuery,
            limit: 5,
            offset: 0,
            type: 'group',
            success: (data: any) => {
              const groups = data.rooms || [];
              results = [
                ...results,
                ...groups.map((g: any) => ({
                  id: g.roomId,
                  type: 'group' as const,
                  name: g.name,
                  avatar: g.avatar,
                  subtitle: `${g.members?.length || 0} thành viên`,
                  data: g,
                })),
              ];
            },
            error: () => {},
          });
        } catch {}
        setSearchResults(results);
        setIsSearching(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleResultPress = useCallback((result: SearchResult) => {
    Keyboard.dismiss();
    if (result.type === 'group') {
      (navigation as any).navigate('Chat', { roomId: result.id });
    } else if (result.type === 'user') {
      (navigation as any).navigate('Contact', { activeTab: 'friends' });
    }
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => <SearchResultItem result={item} onPress={handleResultPress} />,
    [handleResultPress],
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  const listEmpty = isSearching ? (
    <VStack className="items-center justify-center py-20 px-5">
      <Text className="text-[16px] text-gray-500">Đang tìm kiếm...</Text>
    </VStack>
  ) : searchQuery.trim().length === 0 ? (
    <VStack className="items-center justify-center py-20 px-5">
      <FontAwesome name="search" size={64} color="#E5E7EB" />
      <Text className="text-[18px] font-semibold text-gray-400 mt-4">Bắt đầu tìm kiếm</Text>
      <Text className="text-[14px] text-gray-400 mt-2 text-center">Tìm kiếm người dùng, nhóm hoặc tin nhắn</Text>
    </VStack>
  ) : (
    <VStack className="items-center justify-center py-20 px-5">
      <FontAwesome name="search-minus" size={64} color="#E5E7EB" />
      <Text className="text-[18px] font-semibold text-gray-400 mt-4">Không tìm thấy kết quả</Text>
      <Text className="text-[14px] text-gray-400 mt-2 text-center">Thử tìm kiếm với từ khóa khác</Text>
    </VStack>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FlatList
        data={searchResults}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={8}
      />
    </SafeAreaView>
  );
};

export default SearchPage;
