export type ContactFriend = {
  id: string;
  fullname: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: string;
};

export type ContactGroup = {
  id: string;
  name: string;
  avatar?: string;
  members: number;
  lastMessage?: string;
  lastMessageTime?: string;
};

export type ContactFriendRequest = {
  id: string;
  fullname: string;
  avatar: string;
  message?: string;
  time: string;
};

export const contactMockFriends: ContactFriend[] = [
  { id: '1', fullname: 'Jesus', avatar: 'https://avatar.iran.liara.run/public', status: 'online' },
  { id: '2', fullname: 'Mari', avatar: 'https://avatar.iran.liara.run/public', status: 'away' },
  { id: '3', fullname: 'Kristin', avatar: 'https://avatar.iran.liara.run/public', status: 'offline', lastSeen: '2 giờ trước' },
  { id: '4', fullname: 'Lea', avatar: 'https://avatar.iran.liara.run/public', status: 'online' },
  { id: '5', fullname: 'John', avatar: 'https://avatar.iran.liara.run/public', status: 'online' },
  { id: '6', fullname: 'Sarah', avatar: 'https://avatar.iran.liara.run/public', status: 'offline', lastSeen: '1 ngày trước' },
];

export const contactMockGroups: ContactGroup[] = [
  { id: '1', name: 'Nhóm dự án', members: 12, lastMessage: 'Họp lúc 3 giờ chiều', lastMessageTime: '10:30 AM' },
  { id: '2', name: 'Bạn thân', members: 5, lastMessage: 'Đi ăn tối không?', lastMessageTime: 'Yesterday' },
  { id: '3', name: 'Gia đình', members: 8, lastMessage: 'Nhớ về sớm nhé', lastMessageTime: '2 days ago' },
  { id: '4', name: 'Học tập', members: 15, lastMessage: 'Bài tập đã làm xong chưa?', lastMessageTime: '1 week ago' },
];

export const contactMockFriendRequests: ContactFriendRequest[] = [
  { id: '1', fullname: 'Alex', avatar: 'https://avatar.iran.liara.run/public', message: 'Xin chào!', time: '10:30 AM' },
  { id: '2', fullname: 'Emma', avatar: 'https://avatar.iran.liara.run/public', message: 'Muốn kết bạn với bạn', time: 'Yesterday' },
  { id: '3', fullname: 'Mike', avatar: 'https://avatar.iran.liara.run/public', time: '2 days ago' },
];


