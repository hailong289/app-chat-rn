import { GetMessageType, MessageType } from "../types/message.type";
import ApiResponse from "../types/response.type";
import apiService from "./api.service";

export default class MessageService {
    // ── Get Messages ───────────────────────────────────────────────────
    public static async getMessages({ roomId, queryParams }: GetMessageType) {
      return await apiService.withTimeout(30000).get<ApiResponse<MessageType[]>>(`/chat/messages/${roomId}`, queryParams);
    }

    // ── Delete Message ─────────────────────────────────────────────────
    public static async deleteMessage(roomId: string, messageId: string) {
      return await apiService.delete(`/chat/messages/${roomId}/${messageId}`);
    }

    // ── Recall Message ─────────────────────────────────────────────────
    public static async recallMessage(roomId: string, messageId: string) {
      return await apiService.patch(`/chat/messages/${roomId}/${messageId}/recall`);
    }

    // ── Pin Message ───────────────────────────────────────────────────
    public static async pinMessage(roomId: string, messageId: string, pinned: boolean) {
      return await apiService.patch(`/chat/messages/${roomId}/${messageId}/pin`, { pinned });
    }

    // ── Add Reaction ───────────────────────────────────────────────────
    public static async addReaction(roomId: string, messageId: string, emoji: string) {
      return await apiService.post(`/chat/messages/${roomId}/${messageId}/reactions`, { emoji });
    }

    // ── Remove Reaction ────────────────────────────────────────────────
    public static async removeReaction(roomId: string, messageId: string, emoji: string) {
      return await apiService.delete(`/chat/messages/${roomId}/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    }

    // ── Forward Message ────────────────────────────────────────────────
    public static async forwardMessage(messageId: string, targetRoomIds: string[]) {
      return await apiService.post('/chat/messages/forward', { messageId, targetRoomIds });
    }

    // ── Mark as Read ───────────────────────────────────────────────────
    public static async markAsRead(roomId: string, messageId: string) {
      return await apiService.post(`/chat/messages/${roomId}/read`, { messageId });
    }

    // ── Search Messages ────────────────────────────────────────────────
    public static async searchMessages(roomId: string, query: string, limit?: number) {
      return await apiService.get<ApiResponse<MessageType[]>>(`/chat/messages/${roomId}/search`, { q: query, limit });
    }
}
