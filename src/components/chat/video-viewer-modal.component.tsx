import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { FilePreview } from '@/src/types/message.type';
import Video from 'react-native-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Attachment = FilePreview;

export interface VideoViewerModalProps {
  visible: boolean;
  videos: Attachment[];
  initialIndex: number;
  onClose: () => void;
  getAttachmentSource: (attachment: Attachment) => string | undefined;
}

const VideoViewerModal: React.FC<VideoViewerModalProps> = ({
  visible,
  videos,
  initialIndex,
  onClose,
  getAttachmentSource,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
        {/* Header */}
        <View
          style={{
            paddingTop: 50,
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>
            {currentIndex + 1} / {videos.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <FontAwesome name="times" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Video ScrollView */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
          contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
        >
          {videos.map((video, idx) => {
            const videoUrl = getAttachmentSource(video);
            const isCurrentVideo = idx === currentIndex;
            const isLoading = loadingStates[video._id] !== false;
            
            return (
              <View
                key={video._id}
                style={{
                  width: SCREEN_WIDTH,
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {videoUrl ? (
                  <>
                    {isLoading && (
                      <View
                        style={{
                          position: 'absolute',
                          width: SCREEN_WIDTH,
                          height: '80%',
                          backgroundColor: '#000',
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 1,
                        }}
                      >
                        <ActivityIndicator size="large" color="#fff" />
                      </View>
                    )}
                    <Video
                      source={{ uri: videoUrl }}
                      style={{
                        width: SCREEN_WIDTH,
                        height: '80%',
                      }}
                      resizeMode="contain"
                      paused={!isCurrentVideo}
                      controls={true}
                      repeat={false}
                      onLoad={() => {
                        setLoadingStates(prev => ({ ...prev, [video._id]: false }));
                      }}
                      onError={() => {
                        setLoadingStates(prev => ({ ...prev, [video._id]: false }));
                      }}
                    />
                  </>
                ) : (
                  <View
                    style={{
                      width: SCREEN_WIDTH,
                      height: '80%',
                      backgroundColor: '#000',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 16 }}>
                      Không có bản xem trước
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default VideoViewerModal;

