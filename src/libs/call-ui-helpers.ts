import type { CallMember } from '../types/call.state';

const IN_ROOM_STATUSES = new Set(['accepted', 'started', 'joined']);
const LEFT_STATUSES = new Set(['ended', 'rejected', 'missed', 'cancelled']);

/** Members actually in the call (BE updates via member-joined). */
export function getInRoomMembers(members: CallMember[]): CallMember[] {
  const active = members.filter((m) => IN_ROOM_STATUSES.has(m.status));
  if (active.length > 0) return active;
  return members.filter((m) => !LEFT_STATUSES.has(m.status));
}

export function getMemberFromStreamKey(
  roomId: string,
  members: CallMember[],
  key: string,
): CallMember | null {
  const userId = key.replace(`${roomId}-`, '');
  return members.find((m) => m.id === userId) ?? null;
}

export function getOtherParticipant(
  members: CallMember[],
  currentUserId: string,
): CallMember | null {
  const pool = getInRoomMembers(members);
  const list = pool.length > 0 ? pool : members;
  if (list.length === 0) return null;
  return list.find((m) => m.id !== currentUserId) ?? list[0];
}

export function getCallHeaderTitle(
  members: CallMember[],
  currentUserId: string,
  callStatus: string,
): string {
  if (callStatus === 'accepted') return 'Đã kết nối';

  const inRoom = getInRoomMembers(members);
  const count = inRoom.length > 0 ? inRoom.length : members.length;
  const isCaller = members.some(
    (m) => m.id === currentUserId && m.is_caller,
  );

  if (count > 2) {
    return isCaller
      ? `Đang gọi ${count - 1} người…`
      : `Cuộc gọi nhóm · ${count - 1} người`;
  }

  const other = getOtherParticipant(members, currentUserId);
  if (isCaller) {
    return other?.fullname ? `Đang gọi ${other.fullname}…` : 'Đang gọi…';
  }

  const caller = members.find((m) => m.is_caller);
  return caller?.fullname ? `Cuộc gọi từ ${caller.fullname}` : 'Cuộc gọi đến';
}

export function getGridColumns(streamCount: number): number {
  if (streamCount <= 1) return 1;
  if (streamCount <= 4) return 2;
  if (streamCount <= 6) return 3;
  return 4;
}
