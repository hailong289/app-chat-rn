import React, { useState, useEffect } from 'react';
import { Image, StyleProp, ImageStyle, Animated } from "react-native";
import { Box } from '../ui/box';
import FontAwesome from '@react-native-vector-icons/fontawesome';

interface ImageAvatarProps {
  src: string | null | undefined;
  id: string;
  size: number;
  style?: StyleProp<ImageStyle>;
}

export const ImageAvatar: React.FC<ImageAvatarProps> = ({ src, id, size, style }) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [opacity] = useState(new Animated.Value(0.5));

  useEffect(() => {
    if (isLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      opacity.setValue(0.5);
    }
  }, [isLoading]);

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setImageErrors(prev => new Set(prev).add(id));
    setIsLoading(false);
  };

  const hasError = imageErrors.has(id);

  return (
    <Box style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', position: 'relative' }, style]}>
      {src && !hasError ? (
        <>
          {isLoading && (
            <Animated.View
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: size, 
                height: size, 
                borderRadius: size / 2,
                backgroundColor: '#E5E7EB',
                opacity: opacity,
                zIndex: 1
              }}
            />
          )}
          <Image
            source={{ uri: src }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
          />
        </>
      ) : (
        <Box
        >
           {isLoading && (
            <Animated.View
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: size, 
                height: size, 
                borderRadius: size / 2,
                backgroundColor: '#E5E7EB',
                opacity: opacity,
                zIndex: 1
              }}
            />
          )}
          <Image 
            source={require('@/src/assets/images/user-avatar.png')}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
          />
        </Box>
      )}
    </Box>
  );
};

