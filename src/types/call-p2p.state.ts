/**
 * P2P Call sub-store state types.
 * Uses `any` for RTCPeerConnection / RTCRtpTransceiver / RTCRtpSender
 * because these come from `react-native-webrtc` and their TS declarations
 * may not be available at compile-time on all setups.
 */

export interface P2pState {
  /** RTCPeerConnection instances keyed by `${roomId}-${userId}` */
  peerConnections: Map<string, any>;
  /** Queued ICE candidates waiting for remoteDescription to be set */
  pendingCandidates: Map<string, any[]>;
  /**
   * Per-peer screen share transceiver (sender side).
   * Stored so subsequent share-off can replaceTrack(null) without renegotiation.
   */
  screenTransceivers: Map<string, any>;
  /**
   * Receiver-side screen transceivers — separate Map to avoid key collision
   * when both peers share in a 1-on-1 call.
   */
  remoteScreenTransceivers: Map<string, any>;
  /**
   * Tracked camera RTCRtpSender per peer so camera-off (replaceTrack(null))
   * doesn't break subsequent camera-on lookup (sender.track becomes null).
   */
  cameraSenders: Map<string, any>;

  handleCreatePeerConnection: (roomId: string, actionUserId: string) => Promise<any>;
  handleAcceptCall: (payload: any) => Promise<void>;
  flushPendingCandidates: (roomId: string, actionUserId: string) => Promise<void>;
  replaceTracksInPeers: (
    newStream: any,
    type?: 'audio' | 'video' | 'both',
  ) => Promise<void>;
  replaceScreenTrackInPeers: (track: any | null) => Promise<void>;
  teardownP2p: () => void;
}
