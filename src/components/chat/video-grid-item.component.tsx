import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { FilePreview } from '@/src/types/message.type';
import { Dimensions } from 'react-native';
import Video from 'react-native-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_GRID_WIDTH = SCREEN_WIDTH * 0.75;

type Attachment = FilePreview;

export interface VideoGridItemProps {
  attachment: Attachment;
  index: number;
  count: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
  onVideoPress: (index: number) => void;
  getAttachmentSource: (attachment: Attachment) => string | undefined;
}

const VideoGridItem: React.FC<VideoGridItemProps> = ({
  attachment,
  index,
  count,
  itemWidth,
  itemHeight,
  gap,
  onVideoPress,
  getAttachmentSource,
}) => {
  const sourceUri = getAttachmentSource(attachment);
  const [isLoading, setIsLoading] = useState(true);
  const isLastInGrid = count > 4 && index === 3;
  const remainingCount = count > 4 ? count - 4 : 0;
  const isThirdVideo = count === 3 && index === 2;
  
  const finalWidth = isThirdVideo ? MAX_GRID_WIDTH : itemWidth;
  const finalHeight = isThirdVideo ? 150 : itemHeight;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onVideoPress(index)}
      style={{
        width: finalWidth,
        height: finalHeight,
        marginRight: (count === 1 || isThirdVideo) ? 0 : (index % 2 === 0 ? gap : 0),
        marginBottom: gap,
        position: 'relative',
      }}
    >
      {sourceUri ? (
        <>
          {isLoading && (
            <View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: 8,
                backgroundColor: '#000',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
              }}
            >
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          )}
          <Video
            source={{ uri: sourceUri }}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
            resizeMode="cover"
            paused={true}
            muted={true}
            controls={false}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </>
      ) : (
        <View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            backgroundColor: '#000',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Không có bản xem trước</Text>
        </View>
      )}
      {/* Play button overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FontAwesome name="play" size={20} color="#fff" />
        </View>
      </View>
      {isLastInGrid && remainingCount > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onVideoPress(4)}
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
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            +{remainingCount}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default VideoGridItem;

