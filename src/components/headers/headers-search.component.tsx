import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, StatusBarStyle, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@/src/components/ui/box';
import { HStack } from '@/src/components/ui/hstack';
import { VStack } from '@/src/components/ui/vstack';
import FontAwesome from '@react-native-vector-icons/fontawesome';

interface HeaderSearchProps {
  leftIcon?: string;
  rightIcon?: string;
  rightComponent?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  height?: number;
  searchHeight?: number;
  showStatusBar?: boolean;
  className?: string;
  
  // Search props
  searchPlaceholder?: string;
  autoFocus?: boolean;
  showClearButton?: boolean;
  searchInputClassName?: string;
  searchContainerClassName?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onSearchClear?: () => void;
}

const HeaderSearchComponent: React.FC<HeaderSearchProps> = ({
  leftIcon,
  rightIcon,
  rightComponent,
  onLeftPress,
  onRightPress,
  backgroundColor = '#42A59F',
  statusBarStyle = 'light-content',
  height = 56,
  searchHeight = 44,
  showStatusBar = true,
  className = '',
  searchPlaceholder = 'Tìm kiếm...',
  autoFocus = false,
  showClearButton = true,
  searchInputClassName = '',
  searchContainerClassName = '',
  searchValue: searchValueProp,
  onSearchChange,
  onSearchClear,
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [internalSearchValue, setInternalSearchValue] = useState('');
  
  // Use controlled value if provided, otherwise use internal state
  const isControlled = searchValueProp !== undefined;
  const searchValue = isControlled ? searchValueProp : internalSearchValue;

  const handleClear = () => {
    if (isControlled) {
      onSearchClear?.();
    } else {
      setInternalSearchValue('');
    }
    onSearchChange?.(''); 
    inputRef.current?.focus();
  };

  const handleSearchChange = (text: string) => {
    if (isControlled) {
      onSearchChange?.(text);
    } else {
      setInternalSearchValue(text);
    }
  };

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

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
          backgroundColor,
        }}
        className={`${className}`}
      >
        {/* Header Row with Search */}
        <HStack
          className="items-center px-5"
          style={{ height, minHeight: height }}
        >
          {/* Left Section - Back Button */}
          {leftIcon && (
            <TouchableOpacity
              onPress={onLeftPress}
              activeOpacity={0.7}
              style={{ padding: 4, marginRight: 12 }}
            >
              <FontAwesome name={leftIcon as any} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Search Input - Center Section */}
          <HStack 
            className="items-center bg-white rounded-lg px-3 flex-1" 
            style={{ 
              minHeight: searchHeight,
              flexShrink: 1,
              marginRight: rightIcon || rightComponent ? 12 : 0,
            }}
          >
            <Box style={{ marginRight: 8 }}>
              <FontAwesome name="search" size={16} color="#9CA3AF" />
            </Box>
            <TextInput
              ref={inputRef}
              className={`flex-1 text-gray-700 text-[16px] ${searchInputClassName}`}
              placeholder={searchPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={searchValue}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ 
                paddingVertical: 8,
                flex: 1,
                minWidth: 0,
              }}
            />
            {showClearButton && searchValue.length > 0 && (
              <TouchableOpacity 
                onPress={handleClear} 
                activeOpacity={0.7} 
                style={{ 
                  padding: 4,
                  marginLeft: 4,
                  flexShrink: 0,
                }}
              >
                <FontAwesome name="times-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </HStack>

          {/* Right Section */}
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
        </HStack>
      </Box>
    </>
  );
};

export default HeaderSearchComponent;

