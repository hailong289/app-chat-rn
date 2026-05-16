import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, Animated } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

type ScrollToBottomButtonProps = {
  isVisible: boolean;
  unreadCount?: number;
  isRead?: boolean;
  onScrollToBottom: () => void;
};

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  isVisible,
  unreadCount = 0,
  isRead = true,
  onScrollToBottom,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible, opacity, translateY, scale]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 40,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <TouchableOpacity
        onPress={onScrollToBottom}
        className="bg-primary-500 w-12 h-12 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <FontAwesome6 name="chevron-down" iconStyle="solid" size={18} color="#ffffff" />
      </TouchableOpacity>

      {!isRead && unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
          <Text className="text-white text-xs font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export default ScrollToBottomButton;
