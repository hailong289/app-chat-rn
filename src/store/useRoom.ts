import { create } from "zustand";
import RoomService from "../service/room.service";
import { Room, PayloadGetRooms, PayloadGetRoomsCallback, PayloadGetRoomsSuccess } from "../types/room.type";
import ApiResponse from "../types/response.type";
import DB from "../libs/db";
import db from "../libs/db";

interface RoomState {
    rooms: Room[];
    room: Room | null;
    isLoading: boolean;
    total: number;
    type: 'private' | 'group';
    getRooms: (payload: PayloadGetRooms & PayloadGetRoomsCallback) => Promise<void>;
    getRoomsByType: (type: string, limit: number, offset: number) => Promise<Room[]>;
    addRoom: (room: Room) => void;
    upsertRoom: (data: Room) => Promise<void>;
    removeRoom: (roomId: string) => void;
    clearRooms: () => void;
}

const useRoomStore = create<RoomState>()(
    (set, get) => ({
        rooms: [],
        room: null,
        isLoading: false,
        total: 0,
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
                        rooms: metadata as Room[],
                        type: payload.type,
                        isLoading: false,
                    });
                    await Promise.all(metadata.map(async (room) => {
                        await db.setTable('rooms').upsert(room);
                    }));
                }
                payload.success();
            } catch (error) {
                // Nếu lỗi, lấy dữ liệu từ db
                const rooms = await db
                .setTable('rooms')
                .select(['*'])
                .where('type', '=', payload.type)
                .limit(payload.limit)
                .offset(payload.offset)
                .get();
                set({
                    rooms: (rooms as unknown as Room[]),
                    isLoading: false,
                });
                payload.error(error);
            }
        },
        getRoomsByType: async (type: string, limit: number, offset: number) => {
            let rooms;
            const query = db.setTable('rooms').select(['*']).limit(limit).offset(offset);
            if (type == "all") {
              rooms = await query.get() as unknown as Room[];
            } else {
              rooms = await query.where('type', '=', type).get() as unknown as Room[];
            }
            set({
              rooms: (rooms || []).sort((a: Room, b: Room) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              ) as Room[],
            });
            console.log('rooms2', JSON.parse(JSON.stringify(rooms)));
            return rooms;
        },
        addRoom: (room) => {
            set((state) => ({
                rooms: [room, ...state.rooms],
            }));
        },
        upsertRoom: async (room: Room) => {
            db.enableLog(true);
            try {
                const roomDB = await db.setTable('rooms').where('id', '=', room.id).getOne() as unknown as Room;
                if (roomDB) {
                    // cập nhật room trong state
                    set((state) => ({
                        rooms: state.rooms.map((r) => r.id === room.id ? room : r),
                    }));
                    // cập nhật room trong db
                    await db.setTable('rooms').where('id', '=', room.id).update({
                        ...room,
                        updatedAt: Date.now(),
                    });
                    return;
                }
                await db.setTable('rooms').insert(room);
                // Thêm room vào state
                set((state) => ({
                    rooms: [room, ...state.rooms],
                }));
            } catch (error) {
                console.error("Error upserting room:", error);
                // Nếu lỗi, lấy dữ liệu từ api
                get().getRoomsByType(room.type, 50, 0);
            } finally {
                console.log("upsertRoom success", db.getLog());
            }
        },
        removeRoom: async (roomId) => {
            await db.setTable('rooms').where('roomId', '=', roomId).delete();
            get().getRoomsByType(get().type, 50, 0);
        },
        clearRooms: () => {
            set({
                rooms: [],
                total: 0,
                type: 'private',
            });
        },
    }),
    
);

export default useRoomStore;

