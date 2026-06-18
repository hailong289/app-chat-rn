import { Socket } from 'socket.io-client';

export type { P2pState } from './call-p2p.state';
export type { SfuSessionState, SfuStoreState } from './call-sfu.state';

export interface CallMember {
  id: string;
  user_id?: string;
  fullname: string;
  avatar: string;
  is_caller: boolean;
  status:
    | 'initiated'
    | 'started'
    | 'pending'
    | 'accepted'
    | 'cancelled'
    | 'rejected'
    | 'missed'
    | 'ended'
    | 'joined';
}

/**
 * Payload kept in memory while the IncomingCallModal is showing.
 * Driven by `call:request` socket event, cleared on accept / reject / timeout.
 */
export interface IncomingCallPayload {
  callId: string;
  roomId: string;
  callType: 'audio' | 'video';
  callMode: 'p2p' | 'sfu';
  members: CallMember[];
  /** ULID of the caller — used to display the right avatar/name in the modal */
  actionUserId: string;
  /** ms epoch when the request arrived — for timeout calculation */
  receivedAt: number;
}

export interface CallState {
  roomId: string | null;
  status:
    | 'idle'
    | 'calling'
    | 'incoming'
    | 'ended'
    | 'accepted'
    | 'declined'
    | 'joined';
  mode: 'audio' | 'video';
  callMode: 'p2p' | 'sfu';
  members: CallMember[];
  error: string | null;
  configPeerConnection: {
    iceServers: any[];
    iceCandidatePoolSize: number;
    iceTransportPolicy: 'all' | 'public' | 'relay';
    bundlePolicy: 'max-bundle' | 'max-compat' | 'balanced';
    rtcpMuxPolicy: 'negotiate' | 'require';
  };
  stream: {
    /** Local camera + mic MediaStream */
    localStream: any | null;
    /** Remote camera+audio streams keyed by `${roomId}-${userId}` */
    remoteStreams: Map<string, any>;
    /** Local screen-share capture (null when not sharing) */
    localScreenStream: any | null;
    /** Remote screen-share streams keyed by `${roomId}-${userId}` */
    remoteScreenStreams: Map<string, any>;
  };
  /** userIds currently broadcasting their screen */
  peersSharingScreen: Set<string>;
  action: {
    isMicEnabled: boolean;
    isCameraEnabled: boolean;
    isSpeakerphoneEnabled: boolean;
    duration: number;
    startedAt: string | null;
    isSharingScreen: boolean;
    /** userId of camera-pinned participant */
    userIdGhimmed: string;
    /** userId of screen-share-pinned participant */
    screenSharerIdGhimmed: string;
  };
  socket: Socket | null;
  devices: {
    audioInputs: any[];
    audioOutputs: any[];
    videoInputs: any[];
    selectedAudioInput: string;
    selectedAudioOutput: string;
    selectedVideoInput: string;
    cameraFacing: 'user' | 'environment';
  };
  actionUserId: string | null;
  callId: string | null;
  answer: string | null;
  /** Showing IncomingCallModal — null means modal is closed */
  incomingCall: IncomingCallPayload | null;

  // Actions
  openCall: (data: any) => void;
  endCall: (data: any) => Promise<void>;
  releaseLocalCall: () => void;
  eventCall: (event: string, payload: any) => Promise<void>;
  acceptCall: (data: any) => Promise<void>;
  handleCreateLocalStream: () => Promise<void>;
  handleCreatePeerConnection: (roomId: string, actionUserId: string) => Promise<any>;
  updateCallState: (state: Partial<CallState>) => Promise<void>;
  flushPendingCandidates: (roomId: string, actionUserId: string) => Promise<void>;
  actionToggleTrack: (
    action: 'mic' | 'video' | 'speaker' | 'shareScreen',
    value: boolean,
  ) => Promise<void>;
  handleEndCall: (data: any) => void;
  handleRequestCall: (data: any) => Promise<void>;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  missIncomingCall: () => void;
  clearIncomingCall: () => void;
  handleAcceptCall: (data: any) => Promise<void>;
  handleShareScreen: (value: boolean) => Promise<void>;
  upgradeToVideo: () => Promise<void>;
  setUserIdGhimmed: (userId: string) => void;
  setScreenSharerIdGhimmed: (userId: string) => void;
  getDevices: () => Promise<void>;
  setDevice: (type: 'audioInput' | 'audioOutput' | 'videoInput', deviceId: string) => Promise<void>;
  switchCamera: () => Promise<void>;
  initSFU: () => Promise<void>;
  handleSFUSignal: (payload: any) => Promise<void>;
}
