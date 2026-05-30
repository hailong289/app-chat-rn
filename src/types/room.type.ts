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
    /** MongoDB document id — socket `message:upsert` may use this as `roomId`. */
    _id?: string;
    _mongoId?: string;
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
    pinned_messages?: { id: string; content: string; type?: string }[];
    pinned_count?: number;
    isBlocked?: boolean;
    blockByMine?: boolean;
}

export type RoomMembers = {
    id: string;
    user_id?: string;
    name: string | null;
    role: string | null;
    avatar: string | null;
    last_delivered_id?: string | null;
    last_read_id?: string | null;
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