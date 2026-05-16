import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import useContactStore from "../../store/useContact";
import useAuthStore from "../../store/useAuth";
import useRoomStore from "../../store/useRoom";
import { ImageAvatar } from "../chat/image-avatar.component";
import { OnlineDot } from "../chat/online-dot";
import { User } from "../../types/user.type";

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
      className="flex-row items-center px-5 py-3 border-b border-gray-100 dark:border-gray-800"
      onPress={() => onPress(user)}
      activeOpacity={0.7}
    >
      <View className="relative mr-3">
        <ImageAvatar
          src={user.avatar}
          id={user.id}
          size={44}
          style={{ width: 48, height: 48, borderRadius: 24 }}
        />
        <OnlineDot isOnline={isOnline} size={12} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900 dark:text-white" numberOfLines={1}>
          {user.fullname}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {isOnline ? "Đang hoạt động" : "Không hoạt động"}
        </Text>
      </View>
      <TouchableOpacity
        className="bg-primary-500 rounded-full px-4 py-1.5"
        onPress={() => onPress(user)}
      >
        <Text className="text-white text-xs font-medium">Nhắn tin</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ),
);

export default function ContactTabOnline() {
  const navigation = useNavigation<any>();
  const { friends, onlineUsers } = useContactStore();
  const user = useAuthStore((s) => s.user);
  const { rooms } = useRoomStore();

  // Sort friends: online first, then sort by chatPartner priority
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = !!onlineUsers[a.id];
      const bOnline = !!onlineUsers[b.id];
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
        isOnline={!!onlineUsers[item.id]}
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

  return (
    <View className="flex-1">
      {onlineCount > 0 && (
        <View className="px-5 py-2 bg-green-50 dark:bg-green-900/20">
          <Text className="text-xs text-green-600 dark:text-green-400 font-medium">
            {onlineCount} người đang hoạt động
          </Text>
        </View>
      )}
      <FlatList
        data={sortedFriends}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={8}
      />
    </View>
  );
}
