import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { FilePreview } from '@/src/types/message.type';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_GRID_WIDTH = SCREEN_WIDTH * 0.75;

type Attachment = FilePreview;

export interface ImageGridItemProps {
  attachment: Attachment;
  index: number;
  count: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
  onImagePress: (index: number) => void;
  onLongPress?: () => void;
  getAttachmentSource: (attachment: Attachment) => string | undefined;
}

const ImageGridItem: React.FC<ImageGridItemProps> = ({
  attachment,
  index,
  count,
  itemWidth,
  itemHeight,
  gap,
  onImagePress,
  onLongPress,
  getAttachmentSource,
}) => {
  const sourceUri = getAttachmentSource(attachment);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, index * 50);

    return () => clearTimeout(timer);
  }, [index]);

  const isLastInGrid = count > 4 && index === 3;
  const remainingCount = count > 4 ? count - 4 : 0;
  const isThirdImage = count === 3 && index === 2;
  const tapIndex = isLastInGrid && remainingCount > 0 ? 4 : index;

  const finalWidth = isThirdImage ? MAX_GRID_WIDTH : itemWidth;
  const finalHeight = isThirdImage ? 150 : itemHeight;

  const uploadStatus = attachment.status || 'uploaded';
  const uploadProgress = attachment.uploadProgress ?? 100;
  const isUploading = uploadStatus === 'uploading';
  const isFailed = uploadStatus === 'failed';
  const isPending = uploadStatus === 'pending';

  const gesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(400)
      .onStart(() => {
        if (onLongPress) runOnJS(onLongPress)();
      });

    const tap = Gesture.Tap().onEnd(() => {
      runOnJS(onImagePress)(tapIndex);
    });

    return Gesture.Exclusive(longPress, tap);
  }, [onLongPress, onImagePress, tapIndex]);

  if (!sourceUri) return null;

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{
          width: finalWidth,
          height: finalHeight,
          marginRight: (count === 1 || isThirdImage) ? 0 : (index % 2 === 0 ? gap : 0),
          marginBottom: gap,
        }}
      >
        {shouldLoad && !hasError ? (
          <>
            {isLoading && (
              <View
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: 8,
                  backgroundColor: '#f0f0f0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1,
                }}
              >
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            )}
            <Image
              source={{ uri: sourceUri }}
              style={{ width: '100%', height: '100%', borderRadius: 8 }}
              resizeMode="cover"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          </>
        ) : hasError ? (
          <View
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 8,
              backgroundColor: '#f0f0f0',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 10 }}>Lỗi tải ảnh</Text>
          </View>
        ) : (
          <View
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 8,
              backgroundColor: '#f0f0f0',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="small" color="#9CA3AF" />
          </View>
        )}

        {(isUploading || isPending || isFailed) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            {isUploading && (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                  {uploadProgress}%
                </Text>
              </View>
            )}
            {isPending && (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                  Đang chờ...
                </Text>
              </View>
            )}
            {isFailed && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 20, marginBottom: 4 }}>⚠️</Text>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                  Lỗi upload
                </Text>
              </View>
            )}
          </View>
        )}

        {isUploading && uploadProgress < 100 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${uploadProgress}%`,
                backgroundColor: '#4CAF50',
              }}
            />
          </View>
        )}

        {isLastInGrid && remainingCount > 0 && !(isUploading || isPending || isFailed) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              +{remainingCount}
            </Text>
          </View>
        )}

        {isLastInGrid && remainingCount > 0 && (isUploading || isPending || isFailed) && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
              zIndex: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
              +{remainingCount}
            </Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

export default ImageGridItem;
