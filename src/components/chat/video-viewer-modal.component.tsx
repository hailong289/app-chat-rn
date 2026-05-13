import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Video from 'react-native-video';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import Slider from '@react-native-community/slider';
import type { FilePreview } from '../../types/message.type';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type VideoViewerModalProps = {
  visible: boolean;
  videos: FilePreview[];
  initialIndex?: number;
  onClose: () => void;
  getAttachmentSource?: (att: FilePreview) => string | undefined;
};

type VideoState = {
  paused: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  muted: boolean;
};

const VideoPlayer: React.FC<{
  uri: string;
  isActive: boolean;
}> = ({ uri, isActive }) => {
  const videoRef = useRef<any>(null);
  const [state, setState] = useState<VideoState>({
    paused: !isActive,
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    muted: false,
  });
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const togglePlay = useCallback(() => {
    setState(prev => ({ ...prev, paused: !prev.paused }));
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  React.useEffect(() => {
    setState(prev => ({ ...prev, paused: !isActive }));
  }, [isActive]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.videoPage}
      onPress={showControlsTemporarily}
    >
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        paused={state.paused}
        muted={state.muted}
        resizeMode="contain"
        onLoad={data => setState(prev => ({ ...prev, duration: data.duration }))}
        onProgress={data => setState(prev => ({ ...prev, currentTime: data.currentTime }))}
        onBuffer={data => setState(prev => ({ ...prev, isBuffering: data.isBuffering }))}
        onEnd={() => setState(prev => ({ ...prev, paused: true, currentTime: 0 }))}
      />

      {/* Buffering */}
      {state.isBuffering && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Controls overlay */}
      {showControls && (
        <View style={styles.controlsOverlay}>
          {/* Play/Pause center */}
          <TouchableOpacity onPress={togglePlay} style={styles.playPauseBtn}>
            <FontAwesome
              name={state.paused ? 'play' : 'pause'}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{formatTime(state.currentTime)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={state.duration || 1}
              value={state.currentTime}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="rgba(255,255,255,0.4)"
              thumbTintColor="#fff"
              onSlidingComplete={value => {
                videoRef.current?.seek(value);
                setState(prev => ({ ...prev, currentTime: value }));
              }}
            />
            <Text style={styles.timeText}>{formatTime(state.duration)}</Text>
            <TouchableOpacity
              onPress={() => setState(prev => ({ ...prev, muted: !prev.muted }))}
              style={styles.muteBtn}
            >
              <FontAwesome
                name={state.muted ? 'volume-off' : 'volume-up'}
                size={16}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const VideoViewerModal: React.FC<VideoViewerModalProps> = ({
  visible,
  videos,
  initialIndex = 0,
  onClose,
  getAttachmentSource,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const getUri = useCallback(
    (vid: FilePreview) => {
      if (getAttachmentSource) return getAttachmentSource(vid) || '';
      return vid.uploadedUrl || vid.url || '';
    },
    [getAttachmentSource],
  );

  React.useEffect(() => {
    if (visible && flatListRef.current && videos.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: Math.min(initialIndex, videos.length - 1),
          animated: false,
        });
        setCurrentIndex(initialIndex);
      }, 100);
    }
  }, [visible, initialIndex, videos.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar hidden />

        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <FontAwesome name="times" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Counter */}
        {videos.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {videos.length}
            </Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={videos}
          keyExtractor={item => item._id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, videos.length - 1)}
          getItemLayout={(_data, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          renderItem={({ item, index }) => (
            <VideoPlayer uri={getUri(item)} isActive={index === currentIndex} />
          )}
        />
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 24) + 8,
    right: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  counter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 24) + 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoPage: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingBottom: 40,
    paddingTop: 80,
  },
  playPauseBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  muteBtn: {
    padding: 6,
  },
});

export default VideoViewerModal;
