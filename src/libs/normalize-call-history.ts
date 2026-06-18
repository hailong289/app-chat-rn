import { normalizeEntityId } from './helpers';
import type { CallHistoryType, MessageType } from '../types/message.type';

const parseJsonValue = <T,>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null') return fallback;
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const normalizeMembers = (raw: unknown): CallHistoryType['members'] => {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
    ? Object.values(raw as Record<string, unknown>)
    : [];

  return list
    .map((member) => {
      const m = member as Record<string, unknown>;
      const id = normalizeEntityId(m.id ?? m.user_id ?? m.userId);
      if (!id) return null;
      return {
        id,
        user_id: m.user_id ? normalizeEntityId(m.user_id) : undefined,
        fullname: String(m.fullname ?? m.name ?? 'User'),
        avatar: String(m.avatar ?? ''),
        is_caller: Boolean(m.is_caller ?? m.isCaller),
        status: (m.status ?? 'ended') as CallHistoryType['members'][number]['status'],
      } as CallHistoryType['members'][number];
    })
    .filter((m): m is CallHistoryType['members'][number] => m != null);
};

const buildCallHistory = (
  parsed: Record<string, unknown>,
  msg: Record<string, unknown>,
): CallHistoryType | null => {
  const members = normalizeMembers(parsed.members ?? msg.members);
  const callTypeRaw =
    parsed.call_type ?? parsed.callType ?? msg.call_type ?? msg.callType;
  const callId = normalizeEntityId(
    parsed.call_id ?? parsed.callId ?? parsed._id ?? parsed.id ?? msg.call_id ?? msg.callId,
  );
  const roomId = normalizeEntityId(
    parsed.room_id ?? parsed.roomId ?? msg.roomId ?? msg.room_id,
  );

  if (!callId && members.length === 0 && !callTypeRaw) return null;

  return {
    _id: normalizeEntityId(parsed._id ?? parsed.id ?? callId),
    call_id: callId,
    room_id: roomId,
    call_type: callTypeRaw === 'video' ? 'video' : 'audio',
    call_mode:
      parsed.call_mode === 'p2p' || parsed.callMode === 'p2p' ? 'p2p' : 'sfu',
    message_id: normalizeEntityId(
      parsed.message_id ?? parsed.messageId ?? msg.id ?? msg._id,
    ),
    members,
    started_at: String(parsed.started_at ?? parsed.startedAt ?? ''),
    ended_at: String(parsed.ended_at ?? parsed.endedAt ?? ''),
    duration: Number(parsed.duration ?? 0),
    caller_id: parsed.caller_id
      ? normalizeEntityId(parsed.caller_id)
      : parsed.callerId
      ? normalizeEntityId(parsed.callerId)
      : undefined,
    callee_id: parsed.callee_id
      ? normalizeEntityId(parsed.callee_id)
      : parsed.calleeId
      ? normalizeEntityId(parsed.calleeId)
      : undefined,
  };
};

/** Normalize call_history from API / socket / SQLite row shapes. */
export function normalizeCallHistory(
  msg: Record<string, unknown>,
): CallHistoryType | null {
  const candidates: unknown[] = [
    msg.call_history,
    msg.callHistory,
    msg.history,
    (msg.metadata as Record<string, unknown> | undefined)?.call_history,
    (msg.metadata as Record<string, unknown> | undefined)?.callHistory,
    (msg.metadata as Record<string, unknown> | undefined)?.history,
  ];

  for (const candidate of candidates) {
    const parsed = parseJsonValue<Record<string, unknown> | null>(candidate, null);
    if (!parsed || typeof parsed !== 'object') continue;
    const built = buildCallHistory(parsed, msg);
    if (built) return built;
  }

  if (msg.type === 'call') {
    return buildCallHistory(msg, msg);
  }

  return null;
}

/** Keep call_history from store/cache when API reload omits populated relation. */
export function mergeMessagePreserveCallHistory(
  incoming: MessageType,
  existing?: MessageType | null,
): MessageType {
  if (!existing) return incoming;

  const incomingHistory = normalizeCallHistory(incoming as Record<string, unknown>);
  const existingHistory = normalizeCallHistory(existing as Record<string, unknown>);

  if (existingHistory && !incomingHistory) {
    return {
      ...incoming,
      type: 'call',
      call_history: existingHistory,
    };
  }

  if (existingHistory && incomingHistory) {
    return {
      ...incoming,
      type: 'call',
      call_history: {
        ...existingHistory,
        ...incomingHistory,
        members:
          incomingHistory.members.length > 0
            ? incomingHistory.members
            : existingHistory.members,
      },
    };
  }

  if (incomingHistory) {
    return { ...incoming, type: 'call', call_history: incomingHistory };
  }

  return incoming;
}

export function mergeChatMessages(
  incoming: MessageType[],
  existing: MessageType[],
): MessageType[] {
  const existingById = new Map(existing.map((m) => [m.id, m]));
  const mergedIncoming = incoming.map((msg) =>
    mergeMessagePreserveCallHistory(msg, existingById.get(msg.id)),
  );
  const incomingIds = new Set(incoming.map((m) => m.id));
  const socketOnly = existing.filter((m) => !incomingIds.has(m.id));
  return [...mergedIncoming, ...socketOnly].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
