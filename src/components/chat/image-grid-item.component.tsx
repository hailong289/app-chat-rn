import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FilePreview } from '@/src/types/message.type';
import { Dimensions } from 'react-native';

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
  getAttachmentSource,
}) => {
  const sourceUri = getAttachmentSource(attachment);
  if (!sourceUri) return null;

  const isLastInGrid = count > 4 && index === 3;
  const remainingCount = count > 4 ? count - 4 : 0;
  const isThirdImage = count === 3 && index === 2;
  
  // Với 3 ảnh, ảnh thứ 3 (index 2) sẽ full width
  const finalWidth = isThirdImage ? MAX_GRID_WIDTH : itemWidth;
  const finalHeight = isThirdImage ? 150 : itemHeight;

  // Lấy trạng thái upload
  const uploadStatus = attachment.status || 'uploaded';
  const uploadProgress = attachment.uploadProgress ?? 100;
  const isUploading = uploadStatus === 'uploading';
  const isFailed = uploadStatus === 'failed';
  const isPending = uploadStatus === 'pending';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onImagePress(index)}
      style={{
        width: finalWidth,
        height: finalHeight,
        marginRight: (count === 1 || isThirdImage) ? 0 : (index % 2 === 0 ? gap : 0),
        marginBottom: gap,
      }}
    >
      <Image
        source={{ uri: sourceUri }}
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
        resizeMode="cover"
      />
      
      {/* Overlay hiển thị trạng thái upload */}
      {(isUploading || isPending || isFailed) && (
        <View
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

      {/* Progress bar */}
      {isUploading && uploadProgress < 100 && (
        <View
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

      {/* Overlay số lượng ảnh còn lại - hiển thị trên cùng nếu không có upload status */}
      {isLastInGrid && remainingCount > 0 && !(isUploading || isPending || isFailed) && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onImagePress(4)}
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
        </TouchableOpacity>
      )}
      
      {/* Hiển thị số lượng ảnh còn lại ở góc trên bên phải nếu đang upload */}
      {isLastInGrid && remainingCount > 0 && (isUploading || isPending || isFailed) && (
        <View
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
    </TouchableOpacity>
  );
};

export default ImageGridItem;

