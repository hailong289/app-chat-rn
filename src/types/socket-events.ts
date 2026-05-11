/**
 * Socket event types enum — mirrors server-side events.
 * Used for type-safe emit/on calls across the app.
 */

export enum SocketEvent {
  // ── Connection ──
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  CONNECT_ERROR = "connect_error",
  EXCEPTION = "exception",

  // ── Message ──
  MESSAGE_SEND = "message:send",
  MESSAGE_NEW = "message:new",
  MESSAGE_UPDATED = "message:updated",
  MESSAGE_DELETED = "message:deleted",
  MESSAGE_RECALLED = "message:recalled",
  MESSAGE_PINNED = "message:pinned",
  MESSAGE_UNPINNED = "message:unpinned",
  MESSAGE_REACTION_ADDED = "message:reaction:added",
  MESSAGE_REACTION_REMOVED = "message:reaction:removed",

  // ── Room ──
  ROOM_CREATED = "room:created",
  ROOM_UPDATED = "room:updated",
  ROOM_DELETED = "room:deleted",
  ROOM_MEMBER_JOINED = "room:member:joined",
  ROOM_MEMBER_LEFT = "room:member:left",
  ROOM_MEMBER_REMOVED = "room:member:removed",
  ROOM_NAME_CHANGED = "room:name:changed",
  ROOM_AVATAR_CHANGED = "room:avatar:changed",

  // ── Typing ──
  TYPING_START = "typing:start",
  TYPING_STOP = "typing:stop",

  // ── Presence ──
  PRESENCE_ONLINE = "presence:online",
  PRESENCE_OFFLINE = "presence:offline",
  PRESENCE_UPDATE = "presence:update",

  // ── Read ──
  MESSAGE_READ = "message:read",

  // ── Call (P2P + SFU) ──
  CALL_INCOMING = "call:incoming",
  CALL_ACCEPTED = "call:accepted",
  CALL_REJECTED = "call:rejected",
  CALL_CANCELLED = "call:cancelled",
  CALL_ENDED = "call:ended",
  CALL_MISSED = "call:missed",
  CALL_UPGRADED = "call:upgraded",
  /** Peer sends its SDP offer/answer */
  CALL_SDP = "call:sdp",
  CALL_ICE_CANDIDATE = "call:ice:candidate",
  CALL_MUTE_CHANGED = "call:mute:changed",
  CALL_SCREEN_SHARE = "call:screen:share",

  // SFU specific
  SFU_NEW_PRODUCER = "sfu:new-producer",
  SFU_CONSUMER_CLOSED = "sfu:consumer:closed",
  SFU_PRODUCER_PAUSED = "sfu:producer:paused",
  SFU_PRODUCER_RESUMED = "sfu:producer:resumed",
}

/**
 * Re-export CallEvents for convenience (maps old call-events.ts)
 */
export const CallEvents = {
  CALL_INCOMING: SocketEvent.CALL_INCOMING,
  CALL_ACCEPTED: SocketEvent.CALL_ACCEPTED,
  CALL_REJECTED: SocketEvent.CALL_REJECTED,
  CALL_CANCELLED: SocketEvent.CALL_CANCELLED,
  CALL_ENDED: SocketEvent.CALL_ENDED,
  CALL_MISSED: SocketEvent.CALL_MISSED,
  CALL_UPGRADED: SocketEvent.CALL_UPGRADED,
  CALL_SDP: SocketEvent.CALL_SDP,
  CALL_ICE_CANDIDATE: SocketEvent.CALL_ICE_CANDIDATE,
  CALL_MUTE_CHANGED: SocketEvent.CALL_MUTE_CHANGED,
  CALL_SCREEN_SHARE: SocketEvent.CALL_SCREEN_SHARE,
  SFU_NEW_PRODUCER: SocketEvent.SFU_NEW_PRODUCER,
  SFU_CONSUMER_CLOSED: SocketEvent.SFU_CONSUMER_CLOSED,
  SFU_PRODUCER_PAUSED: SocketEvent.SFU_PRODUCER_PAUSED,
  SFU_PRODUCER_RESUMED: SocketEvent.SFU_PRODUCER_RESUMED,
} as const;

// ── Payload types for socket events ──────────────────────────────────

export interface MessageNewPayload {
  id: string;
  roomId: string;
  type: string;
  content: string;
  attachments?: any[];
  sender: {
    _id: string;
    fullname: string;
    avatar: string;
  };
  reply?: any;
  createdAt: string;
  status?: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  fullname: string;
}

export interface PresencePayload {
  userId: string;
  status?: "online" | "offline" | "away";
  lastSeen?: string;
}

export interface CallIncomingPayload {
  roomId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  type: "audio" | "video";
  isP2P: boolean;
}

export interface CallSDPPayload {
  roomId: string;
  sdp: any;
  type: "offer" | "answer";
}

export interface CallICEPayload {
  roomId: string;
  candidate: any;
}

export interface ReadPayload {
  roomId: string;
  messageId: string;
  userId: string;
}

export interface MessageReactionPayload {
  roomId: string;
  messageId: string;
  emoji: string;
  userId: string;
}
