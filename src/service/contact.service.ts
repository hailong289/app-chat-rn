import { AcceptFriendRequestPayload, GetListFriendsPayload, GetSentFriendRequestsPayload, GetUsersPayload, RejectFriendRequestPayload, SendFriendRequestPayload } from "../types/contact.type";
import ApiResponse from "../types/response.type";
import { User } from "../types/user.type";
import apiService from "./api.service";

class ContactService {
    // ── Get Contacts (legacy) ─────────────────────────────────────────
    public static async getContacts() {
        return await apiService.get('/contacts');
    }

    // ── Get Friends List ──────────────────────────────────────────────
    public static async getListFriends(payload: Omit<GetListFriendsPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ friends: User[] }>>('/social/users/friends', {
            limit: payload.limit,
            page: payload.page,
            search: payload.search
        });
    }

    // ── Search Users ──────────────────────────────────────────────────
    public static async searchUsers(payload: Omit<GetUsersPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ users: User[] }>>('/social/users/search', {
            search: payload.search,
            limit: payload.limit,
            page: payload.page
        });
    }

    // ── Send Friend Request ───────────────────────────────────────────
    public static async sendFriendRequest(payload: Omit<SendFriendRequestPayload, 'success' | 'error'>) {
        return await apiService.post('/social/friend-requests', payload);
    }

    // ── Get Friend Requests (Received) ────────────────────────────────
    public static async getFriendRequests(payload: Omit<GetListFriendsPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ friendRequests: User[] }>>('/social/friend-requests', {
            limit: payload.limit,
            page: payload.page,
            type: 'received'
        });
    }

    // ── Get Sent Friend Requests ──────────────────────────────────────
    public static async getSentFriendRequests(payload: Omit<GetSentFriendRequestsPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ friendRequests: User[] }>>('/social/friend-requests', {
            limit: payload.limit,
            page: payload.page,
            type: 'sent',
            search: payload.search
        });
    }

    // ── Accept Friend Request ─────────────────────────────────────────
    public static async acceptFriendRequest(payload: Omit<AcceptFriendRequestPayload, 'success' | 'error'>) {
        return await apiService.patch(`/social/friend-requests/${payload.senderId}/accept`);
    }

    // ── Reject Friend Request ─────────────────────────────────────────
    public static async rejectFriendRequest(payload: Omit<RejectFriendRequestPayload, 'success' | 'error'>) {
        return await apiService.patch(`/social/friend-requests/${payload.senderId}/reject`);
    }

    // ── Block Friend ──────────────────────────────────────────────────
    public static async blockFriend(userId: string) {
        return await apiService.patch(`/social/friends/${userId}/block`);
    }

    // ── Unblock Friend ────────────────────────────────────────────────
    public static async unblockFriend(userId: string) {
        return await apiService.patch(`/social/friends/${userId}/open-blocked`);
    }

    // ── Get Friend Suggestions ────────────────────────────────────────
    public static async getFriendSuggestions(limit = 10) {
        return await apiService.get<ApiResponse<{ suggestions: any[]; total: number }>>('/social/users/suggestions', { limit });
    }
}

export default ContactService;
