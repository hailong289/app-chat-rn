/**
 * Signal payload types for P2P + SFU WebRTC signaling.
 * Mirrors app-chat-fe/src/types/signal-payload.ts
 */

// ── Common ───────────────────────────────────────────────────────────

export interface SignalBase {
  roomId: string;
  userId: string;
}

// ── P2P Signaling ────────────────────────────────────────────────────

// WebRTC types are not available in RN built-ins; use `any` for portability.
// Actual RTCSessionDescriptionInit/RTCIceCandidateInit will be used at runtime.

export interface P2PSignalOffer extends SignalBase {
  type: "offer";
  sdp: any; // RTCSessionDescriptionInit at runtime
}

export interface P2PSignalAnswer extends SignalBase {
  type: "answer";
  sdp: any; // RTCSessionDescriptionInit at runtime
}

export interface P2PSignalICE extends SignalBase {
  type: "ice-candidate";
  candidate: any; // RTCIceCandidateInit at runtime
}

export type P2PSignal = P2PSignalOffer | P2PSignalAnswer | P2PSignalICE;

// ── SFU Signaling ────────────────────────────────────────────────────

export interface SFUSignalJoin {
  type: "sfu:join";
  roomId: string;
  userId: string;
  produce: boolean;
  consume: boolean;
}

export interface SFUSignalJoined {
  type: "sfu:joined";
  sfuRoomId: string;
  peers: string[];
  routerRtpCapabilities: any;
}

export interface SFUSignalCreateTransport {
  type: "sfu:create-transport";
  direction: "send" | "recv";
}

export interface SFUSignalTransportCreated {
  type: "sfu:transport-created";
  transportId: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
}

export interface SFUSignalConnectTransport {
  type: "sfu:connect-transport";
  transportId: string;
  dtlsParameters: any;
  direction: "send" | "recv";
}

export interface SFUSignalProduce {
  type: "sfu:produce";
  transportId: string;
  kind: "audio" | "video";
  rtpParameters: any;
  appData?: any;
}

export interface SFUSignalProduced {
  type: "sfu:produced";
  producerId: string;
}

export interface SFUSignalConsume {
  type: "sfu:consume";
  transportId: string;
  producerId: string;
  rtpCapabilities: any;
}

export interface SFUSignalConsumed {
  type: "sfu:consumed";
  consumerId: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: any;
}

export interface SFUSignalResumeConsumer {
  type: "sfu:resume-consumer";
  consumerId: string;
}

export interface SFUSignalNewProducer {
  type: "sfu:new-producer";
  producerId: string;
  kind: "audio" | "video";
  userId: string;
}

export interface SFUSignalConsumerClosed {
  type: "sfu:consumer-closed";
  consumerId: string;
}

export type SFUSignal =
  | SFUSignalJoin
  | SFUSignalJoined
  | SFUSignalCreateTransport
  | SFUSignalTransportCreated
  | SFUSignalConnectTransport
  | SFUSignalProduce
  | SFUSignalProduced
  | SFUSignalConsume
  | SFUSignalConsumed
  | SFUSignalResumeConsumer
  | SFUSignalNewProducer
  | SFUSignalConsumerClosed;

// ── Unified wrapper ──────────────────────────────────────────────────

export type SignalPayload =
  | { protocol: "p2p"; payload: P2PSignal }
  | { protocol: "sfu"; payload: SFUSignal };
