import apiService from "./api.service";
import { PayloadGetRooms, PayloadGetRoomsCallback } from "../types/room.type";


export default class RoomService {
    public static async getRooms(payload: Omit<PayloadGetRooms, 'success' | 'error'>) {
        return await apiService.get('/chat/rooms', payload);
    }
}