import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Dimensions, ScrollView, Linking } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { FilePreview } from '@/src/types/message.type';

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

  const currentVideo = videos[currentIndex];

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
            const thumbnail = getAttachmentSource(video);
            const url = video.uploadedUrl || video.url;
            
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
                {thumbnail ? (
                  <Image
                    source={{ uri: thumbnail }}
                    style={{
                      width: SCREEN_WIDTH,
                      height: '80%',
                    }}
                    resizeMode="contain"
                  />
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
                    <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20 }}>
                      Không có bản xem trước
                    </Text>
                  </View>
                )}
                {/* Play button */}
                <TouchableOpacity
                  onPress={() => {
                    if (url) {
                      Linking.openURL(url).catch(() => {});
                    }
                  }}
                  style={{
                    position: 'absolute',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome name="play" size={32} color="#fff" />
                  </View>
                </TouchableOpacity>
                {/* Video info */}
                {video.name && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 100,
                      left: 20,
                      right: 20,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                      {video.name}
                    </Text>
                    {video.duration && (
                      <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>
                        {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                      </Text>
                    )}
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

