import React, { useEffect, useRef } from 'react';
import { StatusBar, BackHandler } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import useCallStore from '../store/useCallStore';
import useAuthStore from '../store/useAuth';
import { useSocket } from '../providers/socket.provider';
import Helpers from '../libs/helpers';
import CallUI from '../components/call/call-ui';
import type { MainStackParamList } from '../navigations/MainStackNavigator';

type CallScreenRouteProp = RouteProp<MainStackParamList, 'Call'>;
type CallScreenNavProp = StackNavigationProp<MainStackParamList, 'Call'>;

export default function CallPage() {
  const navigation = useNavigation<CallScreenNavProp>();
  const route = useRoute<CallScreenRouteProp>();
  const { socket: providerSocket } = useSocket();
  const currentUser = useAuthStore((s) => s.user);
  const { updateCallState, status, socket } = useCallStore();
  const initializedRef = useRef(false);

  const {
    roomId,
    members: membersEncrypted,
    callType,
    callMode = 'p2p',
    callId,
    isCaller,
    status: initialStatus,
  } = route.params as any;

  // Decode members
  const members = (() => {
    try {
      return Helpers.decryptUserInfo(membersEncrypted) ?? [];
    } catch {
      return [];
    }
  })();

  // Initialize call state on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const effectiveSocket = socket ?? providerSocket;
    if (!effectiveSocket || !currentUser) return;

    void updateCallState({
      status: (initialStatus === 'joined' || !isCaller) ? 'joined' : 'calling',
      mode: callType,
      callMode,
      roomId,
      members,
      socket: effectiveSocket,
      callId: callId ?? null,
      action: {
        isMicEnabled: true,
        isCameraEnabled: callType === 'video',
        isSpeakerphoneEnabled: true,
        duration: 0,
        startedAt: null,
        isSharingScreen: false,
        userIdGhimmed: '',
        screenSharerIdGhimmed: '',
      },
    } as any);
  }, []);

  // Android back button: don't accidentally exit call
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back press minimizes to PiP rather than ending call
      navigation.goBack();
      return true;
    });
    return () => handler.remove();
  }, [navigation]);

  // Auto-navigate back when call ends
  useEffect(() => {
    if (status === 'ended') {
      navigation.goBack();
    }
  }, [status, navigation]);

  const handleEndCall = () => {
    navigation.goBack();
  };

  return (
    <>
      <StatusBar hidden />
      <CallUI onEndCall={handleEndCall} />
    </>
  );
}
