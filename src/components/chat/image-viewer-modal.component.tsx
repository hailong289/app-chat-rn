import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { FilePreview } from '@/src/types/message.type';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Attachment = FilePreview;

export interface ImageViewerModalProps {
  visible: boolean;
  images: Attachment[];
  initialIndex: number;
  onClose: () => void;
  getAttachmentSource: (attachment: Attachment) => string | undefined;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
  getAttachmentSource,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentImage = images[currentIndex];
  const sourceUri = currentImage ? getAttachmentSource(currentImage) : undefined;

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
            {currentIndex + 1} / {images.length}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <FontAwesome name="times" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Image ScrollView */}
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
          {images.map((img, idx) => {
            const uri = getAttachmentSource(img);
            if (!uri) return null;
            return (
              <View
                key={img._id}
                style={{
                  width: SCREEN_WIDTH,
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={{ uri }}
                  style={{
                    width: SCREEN_WIDTH,
                    height: '80%',
                  }}
                  resizeMode="contain"
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default ImageViewerModal;

