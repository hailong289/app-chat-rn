import { create } from "zustand";
import RoomService from "../service/room.service";
import { Room, PayloadGetRooms, PayloadGetRoomsCallback, PayloadGetRoomsSuccess } from "../types/room.type";
import ApiResponse from "../types/response.type";
import DB from "../libs/db";

interface RoomState {
    rooms: Room[];
    room: Room | null;
    isLoading: boolean;
    total: number;
    offset: number;
    type: 'private' | 'group';
    getRooms: (payload: PayloadGetRooms & PayloadGetRoomsCallback) => Promise<void>;
    addRoom: (room: Room) => void;
    updateRoom: (roomId: string, updates: Partial<Room>) => void;
    removeRoom: (roomId: string) => void;
    clearRooms: () => void;
}

const useRoomStore = create<RoomState>()(
    (set, get) => ({
        rooms: [],
        room: null,
        isLoading: false,
        total: 0,
        offset: 0,
        type: 'private',
        getRooms: async (payload) => {
            set({ isLoading: true });
            try {
        
                const response = await RoomService.getRooms({
                    q: payload.q,
                    limit: payload.limit,
                    offset: payload.offset,
                    type: payload.type,
                });
                
                const responseData = response.data as ApiResponse<PayloadGetRoomsSuccess | Room[]>;
                const metadata = responseData?.metadata as Room[];
                if (metadata && metadata.length > 0) {
                    set({
                        rooms: metadata,
                        offset: payload.offset,
                        type: payload.type,
                    });
                    const roomIds = metadata.map((room) => room.id);
                    for (const room of metadata) {
                        const roomExists = await DB.getInstance()
                            .setTable('rooms')
                            .select(['id'])
                            .where('id', '=', room.id).exists();
                        // Nếu phòng đã tồn tại trong db thì bỏ qua
                        if (roomExists) {
                            continue;
                        }
                        console.log('room', room);
                        if (!room.roomId) {
                            continue;
                        }
                        await DB.getInstance().setTable('rooms').insert({
                            id: room.id,
                            roomId: room.roomId,
                            updatedAt: new Date(room.updatedAt).getTime(),
                            type: room.type,
                            last_message: room.last_message ? JSON.stringify(room.last_message) : null,
                            name: room.name,
                            is_read: room.is_read ? 1 : 0,
                            avatar: room.avatar || null,
                            members: room.members ? JSON.stringify(room.members) : null,
                            unread_count: typeof room.unread_count === 'string' ? parseInt(room.unread_count) : room.unread_count,
                            pinned: room.pinned ? 1 : 0,
                            muted: room.muted ? 1 : 0,
                            created_at: Date.now(),
                        });
                    }
                }
                
                payload.success();
            } catch (error) {
                // Nếu lỗi 500, lấy dữ liệu từ db
                if((error as any).status === 500) {
                    const rooms = await DB.getInstance()
                    .setTable('rooms')
                    .select(['*'])
                    .where('type', '=', payload.type)
                    .limit(payload.limit)
                    .offset(payload.offset)
                    .get();
                    set({
                        rooms: (rooms as unknown as Room[]),
                        offset: payload.offset,
                        type: payload.type,
                        isLoading: false,
                    });
                    payload.error(error);
                } else {
                    set({ isLoading: false });
                    payload.error(error);
                }
            }
        },
        addRoom: (room) => {
            set((state) => ({
                rooms: [room, ...state.rooms],
            }));
        },
        updateRoom: (roomId, updates) => {
            set((state) => ({
                rooms: state.rooms.map((room) =>
                    room.roomId === roomId || room.id === roomId
                        ? { ...room, ...updates }
                        : room
                ),
            }));
        },
        removeRoom: (roomId) => {
            set((state) => ({
                rooms: state.rooms.filter(
                    (room) => room.roomId !== roomId && room.id !== roomId
                ),
            }));
        },
        clearRooms: () => {
            set({
                rooms: [],
                total: 0,
                offset: 0,
                type: 'private',
            });
        },
    }),
    
);

export default useRoomStore;

