import React from 'react';
import { View, StyleSheet } from 'react-native';

type OnlineDotProps = {
  isOnline?: boolean;
  size?: number;
};

/**
 * Green dot indicator for online presence.
 * Wrap around or overlay on top of an Avatar.
 */
export const OnlineDot: React.FC<OnlineDotProps> = ({
  isOnline = false,
  size = 10,
}) => {
  if (!isOnline) return null;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size > 8 ? 2 : 1.5,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    backgroundColor: '#22c55e',
    borderColor: '#ffffff',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default OnlineDot;
