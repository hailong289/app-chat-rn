import { create } from "zustand";
import RoomService from "../service/room.service";
import { Room, PayloadGetRooms, PayloadGetRoomsCallback, PayloadGetRoomsSuccess, PayloadCreateGroupRoom, RoomMember } from "../types/room.type";
import ApiResponse from "../types/response.type";
import { Rooms } from "../models/rooms.model";

interface RoomState {
    rooms: Room[];
    room: Room | null;
    isLoading: boolean;
    total: number;
    isCreatingGroupRoom: boolean;
    typingUsers: Record<string, { userId: string; fullname: string }[]>;
    // ── Room CRUD ──
    getRooms: (payload: PayloadGetRooms & { success?: (data?: any) => void; error?: (error?: any) => void }) => Promise<void>;
    getRoomsByType: (type: string, limit: number, offset: number) => Promise<Room[]>;
    addRoom: (room: Room) => void;
    upsertRoom: (data: Room) => Promise<void>;
    removeRoom: (roomId: string) => void;
    clearRooms: () => void;
    createGroupRoom: (payload: PayloadCreateGroupRoom) => Promise<void>;
    getRoomDetail: (roomId: string) => Promise<Room | null>;
    // ── Room Actions ──
    changeRoomName: (roomId: string, name: string) => Promise<void>;
    leaveRoom: (roomId: string) => Promise<void>;
    clearHistory: (roomId: string) => Promise<void>;
    deleteMember: (roomId: string, memberId: string) => Promise<void>;
    changeNickName: (roomId: string, memberId: string, nickname: string) => Promise<void>;
    togglePinRoom: (roomId: string, pinned: boolean) => Promise<void>;
    toggleMuteRoom: (roomId: string, muted: boolean) => Promise<void>;
    addMembers: (roomId: string, memberIds: string[]) => Promise<void>;
    deleteRoom: (roomId: string) => Promise<void>;
    // ── Typing ──
    setTypingUsers: (roomId: string, users: { userId: string; fullname: string }[]) => void;
    clearTypingUsers: (roomId: string) => void;
    // ── Socket sync ──
    updateRoomLastMessage: (roomId: string, lastMessage: any) => void;
    updateRoomUnreadCount: (roomId: string, count: number) => void;
}

const useRoomStore = create<RoomState>()(
    (set, get) => ({
        rooms: [],
        room: null,
        isLoading: false,
        total: 0,
        isCreatingGroupRoom: false,
        typingUsers: {},

        // ── Get Rooms ───────────────────────────────────────────────────
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
                const metadata = (responseData?.metadata as Room[] | undefined) || [];
                const normalizedRooms = metadata.map((room: Room & { _mongoId?: string }) => ({
                    ...room,
                    _id: room._id ?? room._mongoId,
                }));
                set({
                    rooms: normalizedRooms as Room[],
                    isLoading: false,
                });
                // Sync to SQLite (fire-and-forget)
                metadata.forEach(async (room: Room) => {
                    try {
                        await Rooms.upsert(room);
                    } catch {}
                });
                payload.success?.(metadata);
            } catch (error) {
                // Fallback to SQLite on error
                await get().getRoomsByType(payload.type, payload.limit, payload.offset);
                payload.error?.(error);
            }
        },

        // ── Get Rooms By Type (from SQLite) ─────────────────────────────
        getRoomsByType: async (type: string, limit: number, offset: number) => {
            try {
                const rooms = await Rooms.getRooms(limit, offset, type);
                set({
                  rooms: ((rooms || []) as Room[]).sort((a: Room, b: Room) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                  ).map((room: Room) => ({
                    ...room,
                    last_message: typeof room.last_message === 'string'
                      ? (() => { try { return JSON.parse(room.last_message); } catch { return room.last_message; } })()
                      : room.last_message,
                  })),
                });
                return rooms;
            } catch {
                return [];
            }
        },

        // ── Add Room ────────────────────────────────────────────────────
        addRoom: (room) => {
            set((state) => ({
                rooms: [room, ...state.rooms],
            }));
        },

        // ── Upsert Room ─────────────────────────────────────────────────
        upsertRoom: async (room: Room) => {
            try {
                await Rooms.upsert(room);
            } catch {}
            // Refresh list in background
            get().getRoomsByType('all', 20, 0).catch(() => {});
        },

        // ── Remove Room ─────────────────────────────────────────────────
        removeRoom: async (roomId) => {
            try {
                const roomsModel = Rooms.getInstance();
                await roomsModel.getQuery().where('roomId', '=', roomId).delete();
            } catch {}
            get().getRoomsByType('all', 50, 0).catch(() => {});
        },

        // ── Clear Rooms ─────────────────────────────────────────────────
        clearRooms: () => {
            set({ rooms: [], total: 0 });
        },

        // ── Create Group Room ───────────────────────────────────────────
        createGroupRoom: async (payload: PayloadCreateGroupRoom) => {
            set({ isCreatingGroupRoom: true });
            try {
                const response = await RoomService.createGroupRoom(payload);
                const responseData = response.data.metadata as Room;
                try {
                    await Rooms.upsert(responseData);
                } catch {}
                set((state) => ({
                    rooms: [responseData, ...state.rooms],
                }));
                payload.success(responseData as Room);
            } catch (error) {
                payload.error(error);
            } finally {
                set({ isCreatingGroupRoom: false });
            }
        },

        // ── Get Room Detail ─────────────────────────────────────────────
        getRoomDetail: async (roomId: string) => {
            try {
                const response = await RoomService.getRoomDetail(roomId);
                const room = response.data?.metadata as Room;
                if (room) {
                    const normalized = {
                        ...room,
                        _id: (room as Room & { _mongoId?: string })._id ?? (room as Room & { _mongoId?: string })._mongoId,
                    };
                    set({ room: normalized });
                    try {
                        await Rooms.upsert(normalized);
                    } catch {}
                    return normalized;
                }
                return room;
            } catch (error) {
                return null;
            }
        },

        // ── Change Room Name ────────────────────────────────────────────
        changeRoomName: async (roomId: string, name: string) => {
            try {
                await RoomService.changeRoomName(roomId, name);
                set((state) => ({
                    rooms: state.rooms.map((r) =>
                        r.roomId === roomId || r.id === roomId ? { ...r, name } : r
                    ),
                }));
            } catch (error) {
                console.error("Failed to change room name:", error);
            }
        },

        // ── Leave Room ─────────────────────────────────────────────────
        leaveRoom: async (roomId: string) => {
            try {
                await RoomService.leaveRoom(roomId);
                set((state) => ({
                    rooms: state.rooms.filter((r) => r.roomId !== roomId && r.id !== roomId),
                }));
            } catch (error) {
                console.error("Failed to leave room:", error);
            }
        },

        // ── Clear History ──────────────────────────────────────────────
        clearHistory: async (roomId: string) => {
            try {
                await RoomService.clearHistory(roomId);
                get().getRoomsByType('all', 20, 0).catch(() => {});
            } catch (error) {
                console.error("Failed to clear history:", error);
            }
        },

        // ── Delete Member ──────────────────────────────────────────────
        deleteMember: async (roomId: string, memberId: string) => {
            try {
                await RoomService.deleteMember(roomId, memberId);
                const currentRoom = get().room;
                if (currentRoom && (currentRoom.roomId === roomId || currentRoom.id === roomId)) {
                    set({
                        room: {
                            ...currentRoom,
                            members: (currentRoom.members ?? []).filter((m: any) => m.id !== memberId),
                        },
                    });
                }
            } catch (error) {
                console.error("Failed to delete member:", error);
            }
        },

        // ── Change Nickname ────────────────────────────────────────────
        changeNickName: async (roomId: string, memberId: string, nickname: string) => {
            try {
                await RoomService.changeNickName(roomId, memberId, nickname);
            } catch (error) {
                console.error("Failed to change nickname:", error);
            }
        },

        // ── Toggle Pin Room ────────────────────────────────────────────
        togglePinRoom: async (roomId: string, pinned: boolean) => {
            try {
                await RoomService.pinRoom(roomId, pinned);
                set((state) => ({
                    rooms: state.rooms.map((r) =>
                        r.roomId === roomId || r.id === roomId ? { ...r, pinned } : r
                    ),
                }));
            } catch (error) {
                console.error("Failed to toggle pin:", error);
            }
        },

        // ── Toggle Mute Room ───────────────────────────────────────────
        toggleMuteRoom: async (roomId: string, muted: boolean) => {
            try {
                await RoomService.muteRoom(roomId, muted);
                set((state) => ({
                    rooms: state.rooms.map((r) =>
                        r.roomId === roomId || r.id === roomId ? { ...r, muted } : r
                    ),
                }));
            } catch (error) {
                console.error("Failed to toggle mute:", error);
            }
        },

        // ── Add Members ──────────────────────────────────────────────
        addMembers: async (roomId: string, memberIds: string[]) => {
            try {
                await RoomService.addMembers(roomId, memberIds);
            } catch (error) {
                console.error("Failed to add members:", error);
            }
        },

        // ── Delete Room ─────────────────────────────────────────────────
        deleteRoom: async (roomId: string) => {
            try {
                await RoomService.deleteRoom(roomId);
                set((state) => ({
                    rooms: state.rooms.filter((r) => r.roomId !== roomId && r.id !== roomId),
                }));
            } catch (error) {
                console.error("Failed to delete room:", error);
            }
        },

        // ── Typing ─────────────────────────────────────────────────────
        setTypingUsers: (roomId, users) => {
            set((state) => ({
                typingUsers: { ...state.typingUsers, [roomId]: users },
            }));
        },

        clearTypingUsers: (roomId) => {
            set((state) => ({
                typingUsers: { ...state.typingUsers, [roomId]: [] },
            }));
        },

        // ── Socket sync helpers ────────────────────────────────────────
        updateRoomLastMessage: (roomId, lastMessage) => {
            set((state) => ({
                rooms: state.rooms.map((r) =>
                    r.roomId === roomId || r.id === roomId
                        ? { ...r, last_message: lastMessage, updatedAt: new Date().toISOString() }
                        : r
                ),
            }));
        },

        updateRoomUnreadCount: (roomId, count) => {
            set((state) => ({
                rooms: state.rooms.map((r) =>
                    r.roomId === roomId || r.id === roomId
                        ? { ...r, unread_count: count }
                        : r
                ),
            }));
        },
    })
);

export default useRoomStore;
