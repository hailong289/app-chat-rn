/**
 * Screen sharing utilities for P2P and SFU calls.
 *
 * On mobile (iOS/Android) screen share is handled via `mediaDevices.getDisplayMedia()`
 * from react-native-webrtc. The actual start/stop is orchestrated by
 * useCallStore.handleShareScreen(). This module exports a convenience hook
 * and a UI banner shown when a remote peer is sharing their screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useCallStore from '../../store/useCallStore';

let RTCView: any = null;
try {
  RTCView = require('react-native-webrtc').RTCView;
} catch {}

interface ScreenShareBannerProps {
  /** userId who is sharing */
  sharerId: string;
  /** The remote screen stream */
  stream: any;
  /** Called when user pins/unpins this screen share */
  onPin?: (sharerId: string) => void;
}

/**
 * Banner shown at the top of the call UI when a remote peer is sharing their screen.
 */
export function ScreenShareBanner({ sharerId, stream, onPin }: ScreenShareBannerProps) {
  const members = useCallStore((s) => s.members);
  const sharer = members.find((m) => m.id === sharerId);

  if (!stream || !RTCView) return null;

  return (
    <View style={styles.banner}>
      <RTCView
        streamURL={stream.toURL?.() ?? stream.id}
        style={styles.preview}
        objectFit="contain"
      />
      <View style={styles.info}>
        <Text style={styles.sharerName} numberOfLines={1}>
          {sharer?.fullname ?? 'Người dùng'} đang chia sẻ màn hình
        </Text>
        {onPin && (
          <TouchableOpacity style={styles.pinBtn} onPress={() => onPin(sharerId)}>
            <Text style={styles.pinText}>📌 Ghim</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Hook: returns whether the local user is currently sharing screen and
 * a toggle function.
 */
export function useScreenShare() {
  const { action, actionToggleTrack } = useCallStore();
  const isSharingScreen = action.isSharingScreen;

  const toggleScreenShare = () => {
    void actionToggleTrack('shareScreen', !isSharingScreen);
  };

  return { isSharingScreen, toggleScreenShare };
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: '#1C1C2E',
    borderRadius: 10,
    overflow: 'hidden',
    margin: 8,
    height: 72,
    borderWidth: 1,
    borderColor: '#42A59F',
  },
  preview: {
    width: 96,
    height: 72,
    backgroundColor: '#0D0D1A',
  },
  info: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 6,
  },
  sharerName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  pinBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#42A59F',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pinText: {
    color: '#fff',
    fontSize: 12,
  },
});
