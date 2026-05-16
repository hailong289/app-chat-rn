import React, { useCallback, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAIN_TAB_BAR_HEIGHT } from "../../libs/resolve-media-url";
import { useNavigation } from "@react-navigation/native";
import useContactStore from "../../store/useContact";
import useAuthStore from "../../store/useAuth";
import useRoomStore from "../../store/useRoom";
import { ImageAvatar } from "../chat/image-avatar.component";
import { OnlineDot } from "../chat/online-dot";
import { User } from "../../types/user.type";
import { HStack } from "@/src/components/ui/hstack";
import { VStack } from "@/src/components/ui/vstack";
import { Box } from "@/src/components/ui/box";

function getFriendId(user: User): string {
  return user.id || user._id || "";
}

function getFriendDisplayName(user: User): string {
  const raw = user as User & { usr_fullname?: string };
  return String(raw.fullname || raw.usr_fullname || "").trim() || "Không tên";
}

const OnlineUserItem = React.memo(
  ({
    user,
    isOnline,
    onPress,
  }: {
    user: User;
    isOnline: boolean;
    onPress: (user: User) => void;
  }) => (
    <TouchableOpacity
      className="py-4 border-b border-gray-200"
      onPress={() => onPress(user)}
      activeOpacity={0.7}
    >
      <HStack className="items-center justify-between px-5">
        <HStack className="items-center flex-1" style={styles.nameRow}>
          <Box className="relative mr-2">
            <ImageAvatar
              src={user.avatar}
              id={user.id || user._id}
              size={50}
              style={{ width: 50, height: 50, borderRadius: 25 }}
            />
            <OnlineDot isOnline={isOnline} size={12} />
          </Box>
          <VStack className="ml-3 flex-1" style={styles.nameCol}>
            <Text
              className="font-semibold text-typography-950 text-[16px]"
              numberOfLines={1}
            >
              {getFriendDisplayName(user)}
            </Text>
            <Text className="text-[12px] text-gray-500 mt-0.5">
              {isOnline ? "Đang hoạt động" : "Không hoạt động"}
            </Text>
          </VStack>
        </HStack>
        <TouchableOpacity
          style={styles.chatBtn}
          className="bg-primary-500 rounded-full px-4 py-1.5"
          onPress={() => onPress(user)}
        >
          <Text className="text-white text-xs font-medium">Nhắn tin</Text>
        </TouchableOpacity>
      </HStack>
    </TouchableOpacity>
  ),
);

export default function ContactTabOnline() {
  const insets = useSafeAreaInsets();
  const scrollBottomPad = MAIN_TAB_BAR_HEIGHT + insets.bottom + 24;
  const navigation = useNavigation<any>();
  const { friends, onlineUsers, getFriends } = useContactStore();
  const user = useAuthStore((s) => s.user);
  const { rooms } = useRoomStore();

  useEffect(() => {
    getFriends({
      limit: 50,
      page: 1,
      search: "",
      success: () => {},
      error: () => {},
    });
  }, []);

  // Sort friends: online first, then sort by chatPartner priority
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = !!onlineUsers[getFriendId(a)];
      const bOnline = !!onlineUsers[getFriendId(b)];
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      // Check if already chatting
      const aRoom = rooms.find((r) =>
        r.type === "private" && r.members?.some((m: any) => m.id === a.id),
      );
      const bRoom = rooms.find((r) =>
        r.type === "private" && r.members?.some((m: any) => m.id === b.id),
      );
      if (aRoom && !bRoom) return -1;
      if (!aRoom && bRoom) return 1;
      return 0;
    });
  }, [friends, onlineUsers, rooms]);

  const handlePressUser = useCallback(
    async (friend: User) => {
      // Find existing private room
      const existingRoom = rooms.find(
        (r) =>
          r.type === "private" &&
          r.members?.some((m: any) => m.id === friend.id) &&
          r.members?.some((m: any) => m.id === (user?._id || user?.id)),
      );
      if (existingRoom) {
        navigation.navigate("Chat", { roomId: existingRoom.id });
      } else {
        navigation.navigate("Chat", { roomId: friend.id });
      }
    },
    [rooms, user, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <OnlineUserItem
        user={item}
        isOnline={!!onlineUsers[getFriendId(item)]}
        onPress={handlePressUser}
      />
    ),
    [onlineUsers, handlePressUser],
  );

  const onlineCount = Object.keys(onlineUsers).length;

  if (friends.length === 0) {
    return (
      <View className="items-center justify-center py-16 px-5">
        <Text className="text-5xl mb-3">👥</Text>
        <Text className="text-base font-medium text-gray-500 dark:text-gray-400 text-center">
          Chưa có bạn bè
        </Text>
        <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">
          Kết bạn để xem ai đang online
        </Text>
      </View>
    );
  }

  const listHeader =
    onlineCount > 0 ? (
      <View className="px-5 py-2 bg-green-50 dark:bg-green-900/20">
        <Text className="text-xs text-green-600 dark:text-green-400 font-medium">
          {onlineCount} người đang hoạt động
        </Text>
      </View>
    ) : null;

  return (
    <FlatList
      style={{ flex: 1 }}
      data={sortedFriends}
      renderItem={renderItem}
      keyExtractor={(item) => item.id || item._id}
      ListHeaderComponent={listHeader}
      contentContainerStyle={{ paddingBottom: scrollBottomPad }}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={8}
    />
  );
}

const styles = StyleSheet.create({
  nameRow: { flex: 1, minWidth: 0 },
  nameCol: { flex: 1, minWidth: 0 },
  chatBtn: { flexShrink: 0, marginLeft: 8 },
});
