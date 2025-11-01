import apiService from "./api.service";
import { PayloadGetRooms } from "../types/room.type";


export default class RoomService {
    public static async getRooms(payload: PayloadGetRooms) {
        return await apiService.get('/rooms', payload);
    }
}