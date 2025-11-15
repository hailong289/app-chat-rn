export interface PayloadGetRooms {
    q?: string;
    limit: number;
    offset: number;
    type: 'private' | 'group' | 'channel' | 'all';
    success: (data: any) => void;
    error: (error: any) => void;
}

export interface PayloadCreateGroupRoom {
    name: string;
    members: string[];
    type: 'group' | 'private' | 'channel';
    success: (data: any) => void;
    error: (error: any) => void;
}
export interface RoomMember {
    id: string;
    name: string;
    role: 'owner' | 'member' | 'admin';
    avatar?: string | null;
    joinedAt: string;
}

export interface LastMessage {
    [key: string]: any;
}

export interface Room {
    id: string; // Primary key - must not be null
    roomId: string;
    type: "group" | "private" | "channel";
    name: string | null;
    avatar: string | null;
    members: RoomMembers[];
    updatedAt: string;
    last_message: {
      id: string | null;
      content: string | null;
      createdAt: string | null;
      sender_fullname: string | null;
      sender_id: string | null;
    };
    is_read: boolean;
    unread_count: number;
    pinned: boolean;
    muted: boolean;
    last_read_id: string | null;
}

export type RoomMembers = {
    id: string;
    name: string | null;
    role: string | null;
    avatar: string | null;
};

export interface PayloadGetRoomsSuccess {
    rooms: Room[];
    total: number;
    limit: number;
    offset: number;
}

export interface PayloadGetRoomsCallback {
    success: (data?: PayloadGetRoomsSuccess | Room[]) => void;
    error: (error?: any) => void;
}