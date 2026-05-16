import React from 'react';
import { View, Text } from 'react-native';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import type { MessageType, RoomEventType } from '../../types/message.type';

type SystemMessageBubbleProps = {
  msg: MessageType;
};

const iconMap: Record<string, string> = {
  'member.added': 'user-plus',
  'member.joined': 'user-plus',
  'member.create': 'user-plus',
  'member.left': 'user-minus',
  'member.deleted': 'user-minus',
  'member.change.role': 'star',
  'member.change.name': 'pen',
  'member.change.avatar': 'image',
  'member.change.nickName': 'circle-user',
  'call.started': 'phone',
  'call.joined': 'phone',
  'call.left': 'phone-slash',
  'call.ended': 'phone-slash',
};

function pickIcon(ev: RoomEventType | null | undefined, placeholder?: string): string {
  if (ev?.event_type && iconMap[ev.event_type]) return iconMap[ev.event_type];

  if (placeholder) {
    const t = placeholder.toLowerCase();
    if (t.includes('cuộc gọi')) {
      if (t.includes('kết thúc') || t.includes('rời')) return 'phone-slash';
      if (t.includes('video')) return 'video';
      return 'phone';
    }
    if (t.includes('tham gia nhóm') || t.includes('đã thêm')) return 'user-plus';
    if (t.includes('rời khỏi nhóm') || t.includes('đã xoá')) return 'user-minus';
    if (t.includes('đổi tên')) return 'pen';
    if (t.includes('ảnh đại diện')) return 'image';
    if (t.includes('biệt danh')) return 'circle-user';
    if (t.includes('quyền')) return 'star';
  }

  return 'wand-magic-sparkles';
}

function pickAccent(ev: RoomEventType | null | undefined, placeholder?: string): string {
  if (ev?.event_type) {
    if (ev.event_type.startsWith('call.')) return 'text-emerald-600';
    if (ev.event_type.startsWith('member.change.')) return 'text-amber-600';
    if (ev.event_type === 'member.added' || ev.event_type === 'member.joined') return 'text-blue-600';
    if (ev.event_type === 'member.left' || ev.event_type === 'member.deleted') return 'text-rose-600';
    return 'text-gray-500';
  }
  if (placeholder) {
    const t = placeholder.toLowerCase();
    if (t.includes('cuộc gọi')) return 'text-emerald-600';
    if (t.includes('tham gia nhóm') || t.includes('đã thêm')) return 'text-blue-600';
    if (t.includes('rời khỏi nhóm') || t.includes('đã xoá')) return 'text-rose-600';
    if (t.includes('đổi tên') || t.includes('ảnh đại diện') || t.includes('biệt danh') || t.includes('quyền'))
      return 'text-amber-600';
  }
  return 'text-gray-500';
}

function getEventPayload(ev: RoomEventType | null | undefined): Record<string, unknown> | undefined {
  if (!ev) return undefined;
  if (ev.payload && typeof ev.payload === 'object') return ev.payload;
  if (typeof ev.payloadJson === 'string' && ev.payloadJson.length > 0) {
    try {
      const parsed = JSON.parse(ev.payloadJson);
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function buildFragments(msg: MessageType): { text: string; boldParts: string[] } {
  const ev = msg.room_event;
  if (!ev) {
    return { text: msg.placeholder || msg.content || '', boldParts: [] };
  }

  const actor = ev.actor;
  const targets = ev.targets ?? [];
  const actorName = actor?.fullname ?? 'Ai đó';

  switch (ev.event_type) {
    case 'member.added': {
      const names = targets.map((t) => t.fullname).join(', ');
      return { text: `${actorName} đã thêm ${names || 'thành viên'} vào nhóm`, boldParts: [actorName, names || 'thành viên'] };
    }
    case 'member.deleted': {
      const names = targets.map((t) => t.fullname).join(', ');
      return { text: `${actorName} đã xoá ${names || 'thành viên'} khỏi nhóm`, boldParts: [actorName, names || 'thành viên'] };
    }
    case 'member.left':
      return { text: `${actorName} đã rời khỏi nhóm`, boldParts: [actorName] };
    case 'member.joined':
      return { text: `${actorName} đã tham gia nhóm`, boldParts: [actorName] };
    case 'member.change.role':
      return { text: `${actorName} đã cập nhật quyền của ${targets[0]?.fullname ?? 'thành viên'}`, boldParts: [actorName, targets[0]?.fullname ?? 'thành viên'] };
    case 'member.change.name': {
      const payload = getEventPayload(ev);
      const newName = (payload?.name as string) ?? (payload?.new_name as string);
      return newName
        ? { text: `${actorName} đã đổi tên nhóm thành "${newName}"`, boldParts: [actorName, `"${newName}"`] }
        : { text: `${actorName} đã đổi tên nhóm`, boldParts: [actorName] };
    }
    case 'member.change.avatar':
      return { text: `${actorName} đã cập nhật ảnh đại diện nhóm`, boldParts: [actorName] };
    case 'member.change.nickName': {
      const target = targets[0]?.fullname ?? 'thành viên';
      const newNick = getEventPayload(ev)?.new_name as string | undefined;
      return newNick
        ? { text: `${actorName} đã đổi biệt danh của ${target} thành "${newNick}"`, boldParts: [actorName, target, `"${newNick}"`] }
        : { text: `${actorName} đã đổi biệt danh của ${target}`, boldParts: [actorName, target] };
    }
    case 'call.started': {
      const callType = getEventPayload(ev)?.callType === 'video' ? 'video' : 'thoại';
      return { text: `${actorName} đã bắt đầu cuộc gọi ${callType} nhóm`, boldParts: [actorName] };
    }
    case 'call.joined':
      return { text: `${actorName} đã tham gia cuộc gọi`, boldParts: [actorName] };
    case 'call.left':
      return { text: `${actorName} đã rời cuộc gọi`, boldParts: [actorName] };
    case 'call.ended':
      return { text: ev.placeholder, boldParts: [] };
    default:
      return { text: ev.placeholder || msg.placeholder || '', boldParts: [] };
  }
}

function highlightBold(text: string, boldParts: string[]): React.ReactNode[] {
  if (boldParts.length === 0) return [<Text key="t">{text}</Text>];

  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  for (const bold of boldParts) {
    const idx = remaining.indexOf(bold);
    if (idx === -1) continue;

    if (idx > 0) {
      result.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>);
    }
    result.push(<Text key={key++} className="font-semibold text-gray-800">{bold}</Text>);
    remaining = remaining.slice(idx + bold.length);
  }

  if (remaining.length > 0) {
    result.push(<Text key={key++}>{remaining}</Text>);
  }

  return result.length > 0 ? result : [<Text key="t">{text}</Text>];
}

export const SystemMessageBubble: React.FC<SystemMessageBubbleProps> = ({ msg }) => {
  const ev = msg.room_event;
  const placeholder = ev?.placeholder ?? msg.placeholder ?? msg.content;
  const iconName = pickIcon(ev, placeholder);
  const accent = pickAccent(ev, placeholder);
  const { text, boldParts } = buildFragments(msg);
  const fragments = highlightBold(text, boldParts);

  return (
    <View className="my-2 flex items-center justify-center">
      <View className="flex-row items-center gap-2 rounded-full bg-gray-100/80 px-3 py-1 max-w-[85%]">
        <FontAwesome6 name={iconName as any} iconStyle="solid" size={12} color="#6b7280" style={{ width: 14, height: 14 }} />
        <Text className={`text-xs text-gray-500 text-center leading-relaxed ${accent}`}>
          {fragments}
        </Text>
      </View>
    </View>
  );
};

export default SystemMessageBubble;
