/**
 * Picture-in-Picture (PiP) mini floating call window.
 *
 * Shown when the user navigates away from the CallScreen but a call is
 * still active. Tapping it brings the user back to the full CallScreen.
 *
 * On Android, react-native-pip-handler or @voximplant/react-native-foreground-service
 * can extend this to a true system PiP. For now it's an overlay View.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import useCallStore from '../../store/useCallStore';

let RTCView: any = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch {}

const { width: SCREEN_W } = Dimensions.get('window');
const PIP_W = 120;
const PIP_H = 160;

interface PipViewProps {
  localStream: any;
  isMicEnabled: boolean;
  /** Called when user taps the PiP to restore the full call UI */
  onTap: () => void;
}

export function PipView({ localStream, isMicEnabled, onTap }: PipViewProps) {
  const { action, endCall, roomId, callId } = useCallStore();
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - PIP_W - 16, y: 80 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    }),
  ).current;

  const handleEndCall = async () => {
    await endCall({
      roomId,
      actionUserId: undefined,
      status: 'ended',
      callId,
    });
  };

  return (
    <Animated.View
      style={[styles.pip, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.videoArea} onPress={onTap} activeOpacity={0.9}>
        {localStream && RTCView && action.isCameraEnabled ? (
          <RTCView
            streamURL={localStream.toURL?.() ?? localStream.id}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            mirror
          />
        ) : (
          <View style={styles.audioFallback}>
            <Text style={styles.audioIcon}>📞</Text>
          </View>
        )}

        {/* Duration overlay */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(action.duration)}</Text>
        </View>

        {/* Mic off indicator */}
        {!isMicEnabled && (
          <View style={styles.micOffBadge}>
            <Text style={{ fontSize: 10 }}>🔇</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* End call button */}
      <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
        <Text style={styles.endIcon}>📵</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Root-level PiP overlay — renders only when a call is active and
 * the user is NOT on the CallScreen.
 */
export function CallPipOverlay({ isOnCallScreen }: { isOnCallScreen: boolean }) {
  const { status, stream, action } = useCallStore();

  if (isOnCallScreen) return null;
  if (status !== 'accepted' && status !== 'calling') return null;

  return (
    <PipView
      localStream={stream.localStream}
      isMicEnabled={action.isMicEnabled}
      onTap={() => {
        // Navigation back to CallScreen is handled by the navigation ref
      }}
    />
  );
}

const styles = StyleSheet.create({
  pip: {
    position: 'absolute',
    width: PIP_W,
    zIndex: 9999,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#1C1C2E',
  },
  videoArea: {
    width: PIP_W,
    height: PIP_H,
    position: 'relative',
  },
  audioFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A3E',
  },
  audioIcon: {
    fontSize: 32,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  micOffBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 2,
  },
  endBtn: {
    width: '100%',
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  endIcon: {
    fontSize: 18,
  },
});
