import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, StatusBarStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { ReactNode } from 'react';

interface HeaderProps {
  title?: string;
  titleComponent?: ReactNode;
  leftIcon?: string;
  rightIcon?: string;
  rightComponent?: ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  height?: number;
  showStatusBar?: boolean;
  className?: string;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  title,
  titleComponent,
  leftIcon,
  rightIcon,
  rightComponent,
  onLeftPress,
  onRightPress,
  backgroundColor = '#42A59F',
  statusBarStyle = 'light-content',
  height = 56,
  showStatusBar = true,
  className = '',
}) => {
  const insets = useSafeAreaInsets();

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
        className={`justify-end ${className}`}
      >
        <HStack
          className="items-center justify-between px-5"
          style={{ height, minHeight: height }}
        >
          {/* Left Section */}
          <Box className="flex-row items-center" style={{ minWidth: 40 }}>
            {leftIcon && (
              <TouchableOpacity
                onPress={onLeftPress}
                activeOpacity={0.7}
                style={{ padding: 4 }}
              >
                <FontAwesome name={leftIcon as any} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </Box>

          {/* Center Section - Title */}
          <Box className="flex-1 items-center justify-center px-2">
            {titleComponent ? (
              titleComponent
            ) : (
              title && (
                <Text
                  className="text-white text-[18px] font-bold text-center"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              )
            )}
          </Box>

          {/* Right Section */}
          <Box className="flex-row items-center" style={{ minWidth: 40 }}>
            {rightComponent ? (
              rightComponent
            ) : (
              rightIcon && (
                <TouchableOpacity
                  onPress={onRightPress}
                  activeOpacity={0.7}
                  style={{ padding: 4 }}
                >
                  <FontAwesome name={rightIcon as any} size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )
            )}
          </Box>
        </HStack>
      </Box>
    </>
  );
};

export default HeaderComponent;

