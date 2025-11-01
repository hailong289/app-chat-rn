export interface PayloadGetRooms {
    q?: string;
    limit: number;
    offset: number;
    type: 'private' | 'group';
}