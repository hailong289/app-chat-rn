import React from 'react';
import { View } from 'react-native';
import { FilePreview } from '@/src/types/message.type';
import { Dimensions } from 'react-native';
import ImageGridItem from './image-grid-item.component';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_GRID_WIDTH = SCREEN_WIDTH * 0.75;

type Attachment = FilePreview;

export interface ImageGridProps {
  images: Attachment[];
  onImagePress: (index: number) => void;
  getAttachmentSource: (attachment: Attachment) => string | undefined;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImagePress, getAttachmentSource }) => {
  const count = images.length;
  const gap = 2;
  
  if (count === 0) return null;

  // Tính toán kích thước và layout
  let itemWidth: number;
  let itemHeight: number;

  if (count === 1) {
    // 1 ảnh: full width
    itemWidth = MAX_GRID_WIDTH;
    itemHeight = 200;
  } else {
    // 2+ ảnh: 2 cột
    itemWidth = (MAX_GRID_WIDTH - gap) / 2;
    itemHeight = 150;
  }

  // Hiển thị tối đa 4 ảnh trong grid
  const displayImages = count > 4 ? images.slice(0, 4) : images;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: MAX_GRID_WIDTH }}>
      {displayImages.map((img, idx) => (
        <ImageGridItem
          key={img._id}
          attachment={img}
          index={idx}
          count={count}
          itemWidth={itemWidth}
          itemHeight={itemHeight}
          gap={gap}
          onImagePress={onImagePress}
          getAttachmentSource={getAttachmentSource}
        />
      ))}
    </View>
  );
};

export default ImageGrid;

