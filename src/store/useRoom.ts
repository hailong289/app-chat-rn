import { create } from "zustand";
import RoomService from "../service/room.service";
import { Room, PayloadGetRooms, PayloadGetRoomsCallback, PayloadGetRoomsSuccess, PayloadCreateGroupRoom } from "../types/room.type";
import ApiResponse from "../types/response.type";
import db from "../libs/db";

interface RoomState {
    rooms: Room[];
    room: Room | null;
    isLoading: boolean;
    total: number;
    isCreatingGroupRoom: boolean;
    getRooms: (payload: PayloadGetRooms & PayloadGetRoomsCallback) => Promise<void>;
    getRoomsByType: (type: string, limit: number, offset: number) => Promise<Room[]>;
    addRoom: (room: Room) => void;
    upsertRoom: (data: Room) => Promise<void>;
    removeRoom: (roomId: string) => void;
    clearRooms: () => void;
    createGroupRoom: (payload: PayloadCreateGroupRoom) => Promise<void>;
}

const useRoomStore = create<RoomState>()(
    (set, get) => ({
        rooms: [],
        room: null,
        isLoading: false,
        total: 0,
        isCreatingGroupRoom: false,
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
                const metadata = responseData?.metadata as Room[] || [];
                set({
                    rooms: metadata as Room[],
                    isLoading: false,
                });
                Promise.all(metadata.map(async (room) => {
                    await db.setTable('rooms').upsert(room);
                }));
                payload.success();
            } catch (error) {
                // Nếu lỗi, lấy dữ liệu từ db
                await get().getRoomsByType(payload.type, payload.limit, payload.offset);
                payload.error(error);
            }
        },
        getRoomsByType: async (type: string, limit: number, offset: number) => {
            let rooms;
            const query = db.setTable('rooms').select(['*']).orderBy('updatedAt', 'ASC').limit(limit).offset(offset);
            if (type == "all") {
              rooms = await query.get() as unknown as Room[];
            } else {
              rooms = await query.where('type', '=', type).get() as unknown as Room[];
            }
            set({
              rooms: (rooms || []).sort((a: Room, b: Room) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              ).map((room) => ({
                ...room,
                last_message: typeof room.last_message === 'string' ? JSON.parse(room.last_message) : room.last_message,
              }) as Room),
            });
            return rooms;
        },
        addRoom: (room) => {
            set((state) => ({
                rooms: [room, ...state.rooms],
            }));
        },
        upsertRoom: async (room: Room) => {
            await get().getRoomsByType('all', 20, 0);
        },
        removeRoom: async (roomId) => {
            await db.setTable('rooms').where('roomId', '=', roomId).delete();
            get().getRoomsByType('all', 50, 0);
        },
        clearRooms: () => {
            set({
                rooms: [],
                total: 0,
            });
        },
        createGroupRoom: async (payload: PayloadCreateGroupRoom) => {
            set({ isCreatingGroupRoom: true });
            try {
                const response = await RoomService.createGroupRoom(payload);
                const responseData = response.data.metadata as Room;
                try {
                    await db.setTable('rooms').upsert(responseData);
                } catch (error) {
                    console.error("Error upserting room:", error);
                }
                const rooms = get().rooms;
                const existingRoom = rooms.find((r) => r.id === responseData.id);
                if (!existingRoom) {
                    rooms.unshift(responseData);
                }
                set((state) => ({
                    rooms: rooms,
                }));
                payload.success(responseData as Room);
            } catch (error) {
                payload.error(error);
            } finally {
                set({ isCreatingGroupRoom: false });
            }
        }
    })
);
export default useRoomStore;
