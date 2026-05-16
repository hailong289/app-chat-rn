import apiService from "./api.service";
import { PayloadCreateGroupRoom, PayloadGetRooms, Room } from "../types/room.type";
import ApiResponse from "../types/response.type";

export default class RoomService {
    // ── Get Rooms ──────────────────────────────────────────────────────
    public static async getRooms(payload: Omit<PayloadGetRooms, 'success' | 'error'>) {
        return await apiService.withTimeout(5000).get('/chat/rooms', payload);
    }

    // ── Get Group Rooms ────────────────────────────────────────────────
    public static async getGroupRooms(payload: Omit<PayloadGetRooms, 'success' | 'error'>) {
        return await apiService.withTimeout(5000).get<ApiResponse<any>>('/chat/rooms', {
            limit: payload.limit,
            offset: payload.offset,
            type: 'group',
            q: payload.q,
        });
    }

    // ── Create Group Room ──────────────────────────────────────────────
    public static async createGroupRoom(payload: Omit<PayloadCreateGroupRoom, 'success' | 'error'>) {
        return await apiService.withTimeout(5000).post<ApiResponse<Room>>('/chat/rooms', {
            name: payload.name,
            type: payload.type,
            memberIds: payload.members,
        });
    }

    // ── Change Room Name ───────────────────────────────────────────────
    public static async changeRoomName(roomId: string, name: string) {
        return await apiService.patch(`/chat/rooms/${roomId}/name`, { name });
    }

    // ── Leave Room ─────────────────────────────────────────────────────
    public static async leaveRoom(roomId: string) {
        return await apiService.post(`/chat/rooms/${roomId}/leave`);
    }

    // ── Clear History ──────────────────────────────────────────────────
    public static async clearHistory(roomId: string) {
        return await apiService.delete(`/chat/rooms/${roomId}/messages`);
    }

    // ── Delete Member ──────────────────────────────────────────────────
    public static async deleteMember(roomId: string, memberId: string) {
        return await apiService.delete(`/chat/rooms/${roomId}/members/${memberId}`);
    }

    // ── Change Nickname ────────────────────────────────────────────────
    public static async changeNickName(roomId: string, memberId: string, nickname: string) {
        return await apiService.patch(`/chat/rooms/${roomId}/members/${memberId}/nickname`, { nickname });
    }

    // ── Pin Room ───────────────────────────────────────────────────────
    public static async pinRoom(roomId: string, pinned: boolean) {
        return await apiService.patch(`/chat/rooms/${roomId}/pin`, { pinned });
    }

    // ── Mute Room ──────────────────────────────────────────────────────
    public static async muteRoom(roomId: string, muted: boolean) {
        return await apiService.patch(`/chat/rooms/${roomId}/mute`, { muted });
    }

    // ── Get Room Detail ────────────────────────────────────────────────
    public static async getRoomDetail(roomId: string) {
        return await apiService.get<ApiResponse<Room>>(`/chat/rooms/${roomId}`);
    }

    // ── Add Members ────────────────────────────────────────────────────
    public static async addMembers(roomId: string, memberIds: string[]) {
        return await apiService.post(`/chat/rooms/${roomId}/members`, { memberIds });
    }

    // ── Delete Room (owner only) ───────────────────────────────────────
    public static async deleteRoom(roomId: string) {
        return await apiService.delete(`/chat/rooms/${roomId}`);
    }
}
