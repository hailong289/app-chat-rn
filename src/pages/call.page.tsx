import React, { useEffect, useRef, useCallback } from 'react';
import { StatusBar, BackHandler } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import useCallStore from '../store/useCallStore';
import useAuthStore from '../store/useAuth';
import { useSocket } from '../providers/socket.provider';
import Helpers from '../libs/helpers';
import { exitCallScreen } from '../libs/safe-navigation';
import CallUI from '../components/call/call-ui';
import type { MainStackParamList } from '../navigations/MainStackNavigator';
import type { CallMember } from '../types/call.state';

function resolveCallMembers(
  membersParam: CallMember[] | string | undefined,
  storeMembers: CallMember[],
): CallMember[] {
  if (Array.isArray(membersParam) && membersParam.length > 0) {
    return membersParam;
  }
  if (storeMembers.length > 0) {
    return storeMembers;
  }
  if (typeof membersParam === 'string' && membersParam.length > 0) {
    try {
      return Helpers.decryptUserInfo(membersParam) ?? [];
    } catch {
      return [];
    }
  }
  return [];
}

type CallScreenRouteProp = RouteProp<MainStackParamList, 'Call'>;
type CallScreenNavProp = StackNavigationProp<MainStackParamList, 'Call'>;

export default function CallPage() {
  const navigation = useNavigation<CallScreenNavProp>();
  const route = useRoute<CallScreenRouteProp>();
  const { socket: providerSocket } = useSocket('/call');
  const currentUser = useAuthStore((s) => s.user);
  const { updateCallState, status, socket, members: storeMembers } = useCallStore();
  const initializedRef = useRef(false);
  const didExitRef = useRef(false);
  const prevStatusRef = useRef(status);

  const {
    roomId,
    members: membersParam,
    callType,
    callMode = 'p2p',
    callId,
    isCaller,
    status: initialStatus,
  } = route.params;

  const members = resolveCallMembers(membersParam, storeMembers);

  const leaveCallScreen = useCallback(() => {
    if (didExitRef.current) return;
    didExitRef.current = true;
    exitCallScreen(navigation);
  }, [navigation]);

  // Initialize call state on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    didExitRef.current = false;
    prevStatusRef.current = initialStatus === 'joined' ? 'joined' : 'calling';

    const effectiveSocket = socket ?? providerSocket;
    if (!effectiveSocket || !currentUser) return;

    void updateCallState({
      status: initialStatus === 'joined' || !isCaller ? 'joined' : 'calling',
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

  // Remote hangup / endCall in store → leave once (local hangup uses same path via status)
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (status === 'ended' && prev !== 'ended' && prev !== 'idle') {
      leaveCallScreen();
    }
  }, [status, leaveCallScreen]);

  // Android back: leave call screen (call may continue in background until torn down)
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveCallScreen();
      return true;
    });
    return () => handler.remove();
  }, [leaveCallScreen]);

  return (
    <>
      <StatusBar hidden />
      <CallUI />
    </>
  );
}
