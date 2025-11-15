import apiService from "./api.service";
import { PayloadGetRooms, PayloadGetRoomsCallback, PayloadGetRoomsSuccess } from "../types/room.type";
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
}