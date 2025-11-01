export interface PayloadGetRooms {
    q?: string;
    limit: number;
    offset: number;
    type: 'private' | 'group';
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
    id: string;
    roomId: string;
    updatedAt: string;
    type: 'private' | 'group';
    last_message?: LastMessage | null;
    name: string;
    is_read: boolean;
    avatar?: string | null;
    members?: RoomMember[];
    unread_count: string | number;
    pinned: boolean;
    muted: boolean;
}

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