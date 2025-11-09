import { GetMessageType, MessageType } from "../types/message.type";
import ApiResponse from "../types/response.type";
import apiService from "./api.service";

export default class MessageService {
    public static async getMessages({ roomId, queryParams }: GetMessageType) {
      return await apiService.withTimeout(5000).get<ApiResponse<MessageType[]>>(`/chat/messages/${roomId}`, queryParams);
    }

    
  }