import apiService from "./api.service";
import { PayloadCreateGroupRoom, PayloadGetRooms, PayloadGetRoomsCallback, PayloadGetRoomsSuccess, Room } from "../types/room.type";
import ApiResponse from "../types/response.type";


export default class RoomService {
    public static async getRooms(payload: Omit<PayloadGetRooms, 'success' | 'error'>) {
        return await apiService.withTimeout(5000).get('/chat/rooms', payload);
    }

    public static async getGroupRooms(payload: Omit<PayloadGetRooms, 'success' | 'error'>) {
        return await apiService.withTimeout(5000).get<ApiResponse<any>>('/chat/rooms', {
            limit: payload.limit,
            offset: payload.offset,
            type: 'group',
            q: payload.q,
        });
    }

    public static async createGroupRoom(payload: Omit<PayloadCreateGroupRoom, 'success' | 'error'>) {
        return await apiService.withTimeout(5000).post<ApiResponse<Room>>('/chat/rooms', {
            name: payload.name,
            type: payload.type,
            memberIds: payload.members,
        });
    }
}