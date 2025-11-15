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

const HeaderChatComponent: React.FC<StackHeaderProps> = (props) => {
  const insets = useSafeAreaInsets();
  const { rooms } = useRoomStore();
  const { groups } = useContactStore();
  const params = props.route.params as MainStackParamList['Chat'];
  const room = rooms.find((r) => r.id === params?.roomId || r.roomId === params?.roomId) || groups.find((g) => g.roomId === params?.roomId) || null;
  const backgroundColor = '#42A59F';
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
              onPress={() => {
                // TODO: Handle phone call
              }}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <FontAwesome name="phone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // TODO: Handle video call
              }}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <FontAwesome name="video-camera" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Box>
        </HStack>
      </Box>
    </>
  );
};

export default HeaderChatComponent;

