import type { Room } from '../types/room.type';
import useRoomStore from '../store/useRoom';

type RoomWithMongo = Room & { _id?: string; _mongoId?: string };

/** Map socket/API room id (often Mongo _id) → canonical `room.id` used in navigation & store. */
export function resolveCanonicalRoomId(socketRoomId: string): string {
  if (!socketRoomId) return socketRoomId;

  const { rooms, room: activeRoom } = useRoomStore.getState();

  const matches = (r: RoomWithMongo | null | undefined) =>
    !!r &&
    (r.id === socketRoomId ||
      r.roomId === socketRoomId ||
      r._id === socketRoomId ||
      r._mongoId === socketRoomId);

  const found =
    rooms.find((r) => matches(r as RoomWithMongo)) ||
    (matches(activeRoom as RoomWithMongo) ? (activeRoom as RoomWithMongo) : undefined);

  return found?.id || socketRoomId;
}

export function resolveMessageId(raw: Record<string, unknown> | null | undefined): string {
  if (!raw) return '';
  const id = raw.id;
  if (typeof id === 'string' && id.length > 0) return id;
  const oid = raw._id;
  if (typeof oid === 'string' && oid.length > 0) return oid;
  if (oid && typeof oid === 'object' && '$oid' in (oid as object)) {
    return String((oid as { $oid: string }).$oid);
  }
  return '';
}

/** Normalize raw `message:upsert` payload before store (matches app-chat-fe upsetMsg). */
export function prepareMessageFromSocket(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = resolveMessageId(raw);
  if (!id) return null;

  const socketRoomId = String(raw.roomId ?? raw.room_id ?? '');
  if (!socketRoomId) return null;

  const roomId = resolveCanonicalRoomId(socketRoomId);

  return {
    ...raw,
    id,
    roomId,
    createdAt:
      (typeof raw.createdAt === 'string' && raw.createdAt) ||
      new Date().toISOString(),
  };
}
