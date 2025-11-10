import React from 'react';
import { View } from 'react-native';
import { FilePreview } from '@/src/types/message.type';
import { Dimensions } from 'react-native';
import VideoGridItem from './video-grid-item.component';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_GRID_WIDTH = SCREEN_WIDTH * 0.75;

type Attachment = FilePreview;

export interface VideoGridProps {
  videos: Attachment[];
  onVideoPress: (index: number) => void;
  getAttachmentSource: (attachment: Attachment) => string | undefined;
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos, onVideoPress, getAttachmentSource }) => {
  const count = videos.length;
  const gap = 2;
  
  if (count === 0) return null;

  // Tính toán kích thước và layout
  let itemWidth: number;
  let itemHeight: number;

  if (count === 1) {
    // 1 video: full width
    itemWidth = MAX_GRID_WIDTH;
    itemHeight = 200;
  } else {
    // 2+ video: 2 cột
    itemWidth = (MAX_GRID_WIDTH - gap) / 2;
    itemHeight = 150;
  }

  // Hiển thị tối đa 4 video trong grid
  const displayVideos = count > 4 ? videos.slice(0, 4) : videos;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: MAX_GRID_WIDTH }}>
      {displayVideos.map((video, idx) => (
        <VideoGridItem
          key={video._id}
          attachment={video}
          index={idx}
          count={count}
          itemWidth={itemWidth}
          itemHeight={itemHeight}
          gap={gap}
          onVideoPress={onVideoPress}
          getAttachmentSource={getAttachmentSource}
        />
      ))}
    </View>
  );
};

export default VideoGrid;

