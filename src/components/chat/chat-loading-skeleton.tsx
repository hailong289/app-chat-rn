import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const SkeletonBubble = ({ isMine, width }: { isMine: boolean; width: number }) => (
  <View className={`mb-4 ${isMine ? 'items-end mr-2' : 'items-start ml-2'}`}>
    <View className="flex-row items-end">
      {!isMine && (
        <View className="w-6 h-6 rounded-full bg-gray-200 mr-2" />
      )}
      <View
        className={`rounded-2xl px-4 py-3 bg-gray-200 ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={{ width }}
      >
        <View className="h-3 bg-gray-300 rounded mb-1" style={{ width: width - 20 }} />
        <View className="h-3 bg-gray-300 rounded" style={{ width: (width - 20) * 0.6 }} />
      </View>
      {isMine && (
        <View className="w-6 h-6 rounded-full bg-gray-200 ml-2" />
      )}
    </View>
  </View>
);

export const ChatLoadingSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={{ opacity: pulseAnim }} className="px-2 py-4">
      <SkeletonBubble isMine={false} width={200} />
      <SkeletonBubble isMine={false} width={260} />
      <SkeletonBubble isMine={true} width={180} />
      <SkeletonBubble isMine={false} width={220} />
      <SkeletonBubble isMine={true} width={240} />
      <SkeletonBubble isMine={true} width={160} />
      <SkeletonBubble isMine={false} width={200} />
    </Animated.View>
  );
};

export default ChatLoadingSkeleton;
