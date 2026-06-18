import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, StatusBarStyle, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackHeaderProps } from '@react-navigation/stack';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import useRoomStore from '@/src/store/useRoom';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';
import useContactStore from '@/src/store/useContact';
import useCallStore from '@/src/store/useCallStore';
import useAuthStore from '@/src/store/useAuth';
import { useSocket } from '@/src/providers/socket.provider';
import { resolveCanonicalRoomId } from '@/src/libs/normalize-socket-message';

type HeaderChatProps = StackHeaderProps & {
  onInfoPress?: () => void;
};

const HeaderChatComponent: React.FC<HeaderChatProps> = (props) => {
  const { onInfoPress } = props;
  const insets = useSafeAreaInsets();
  const { rooms, room: activeRoom } = useRoomStore();
  const { groups } = useContactStore();
  const { openCall } = useCallStore();
  const { user } = useAuthStore();
  const { socket } = useSocket('/chat');
  const params = props.route.params as MainStackParamList['Chat'];
  const chatId = params?.roomId ? resolveCanonicalRoomId(params.roomId) : '';
  const room =
    (activeRoom && (activeRoom.id === chatId || activeRoom.roomId === chatId)
      ? activeRoom
      : null) ||
    rooms.find((r) => r.id === chatId || r.roomId === chatId) ||
    groups.find((g) => g.roomId === chatId || g.id === chatId) ||
    null;
  const backgroundColor = '#42A59F';

  const handleStartCall = (mode: 'audio' | 'video') => {
    const roomKey = room?.roomId || room?.id;
    if (!roomKey) return;
    if (!user) {
      console.warn('[handleStartCall] no user yet, skipping');
      return;
    }
    const callMode = room.type !== 'private' ? 'sfu' : 'p2p';
    openCall({
      roomId: roomKey,
      mode,
      members: (room.members || []).map((m: any) => ({
        id: m.id,
        fullname: m.fullname || m.name || 'User',
        avatar: m.avatar,
        is_caller: m.id === user.id,
      })),
      currentUser: user,
      socket,
      callMode,
    });
  };

  const statusBarStyle: StatusBarStyle = 'light-content';
  const height = 56;
  const showStatusBar = true;
  return (
    <>
      {showStatusBar && (
        <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      )}
      {/* Status Bar Background */}
      <View
        style={{
          height: insets.top,
          backgroundColor,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 0,
        }}
      />
      
      {/* Header Container */}
      <Box
        style={{
          paddingTop: insets.top,
          height: insets.top + height,
          backgroundColor,
        }}
        className="justify-end"
      >
        <HStack
          className="items-center justify-between px-5"
          style={{ height, minHeight: height }}
        >
          {/* Left Section */}
          <Box className="flex-row items-center" style={{ minWidth: 40 }}>
            <TouchableOpacity
              onPress={() => props.navigation.goBack()}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Box>

          {/* Center Section - Room Info */}
          <Box className="flex-1 flex-row items-center px-2">
            {room?.avatar && (
              <Image
                source={{ uri: room.avatar }}
                style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }}
              />
            )}
            <VStack className="flex-1">
              <Text
                className="text-white text-[16px] font-bold"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {room?.name || 'Chat'}
              </Text>
              <Text
                className="text-white/80 text-[12px]"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {room?.type === 'private'
                  ? 'Đang hoạt động'
                  : `${room?.members?.length || 0} thành viên`}
              </Text>
            </VStack>
          </Box>

          {/* Right Section */}
          <Box className="flex-row items-center gap-2" style={{ minWidth: 40 }}>
            <TouchableOpacity
              onPress={() => handleStartCall('audio')}
              activeOpacity={0.7}
              style={{ padding: 4 }}
              accessibilityLabel="Gọi thoại"
            >
              <FontAwesome name="phone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleStartCall('video')}
              activeOpacity={0.7}
              style={{ padding: 4 }}
              accessibilityLabel="Gọi video"
            >
              <FontAwesome name="video-camera" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onInfoPress}
              activeOpacity={0.7}
              style={{ padding: 4 }}
              accessibilityLabel="Thông tin phòng"
            >
              <FontAwesome name="info-circle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Box>
        </HStack>
      </Box>
    </>
  );
};

export default HeaderChatComponent;
