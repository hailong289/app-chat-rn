/**
 * Call state types for P2P + SFU calls.
 * Used in Phase 4 (Voice/Video Calls).
 */

export interface CallMember {
  id: string;
  fullname: string;
  avatar?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface IncomingCallPayload {
  roomId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  type: "audio" | "video";
  isP2P: boolean;
  sfuRoomId?: string;
}

export interface CallState {
  status: "idle" | "ringing" | "connecting" | "connected" | "ended";
  direction: "incoming" | "outgoing";
  type: "audio" | "video";
  roomId: string | null;
  sfuRoomId: string | null;
  isP2P: boolean;
  localStream: any | null;
  remoteStreams: Record<string, any>;
  remoteScreenStreams: Record<string, any>;
  members: CallMember[];
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isScreenSharing: boolean;
  callDuration: number; // seconds
  startedAt: string | null;
  error: string | null;
}
