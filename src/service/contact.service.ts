import { AcceptFriendRequestPayload, GetListFriendsPayload, GetSentFriendRequestsPayload, GetUsersPayload, RejectFriendRequestPayload, SendFriendRequestPayload } from "../types/contact.type";
import ApiResponse from "../types/response.type";
import { User } from "../types/user.type";
import apiService from "./api.service";


class ContactService {
    public static async getContacts() {
        return await apiService.get('/contacts');
    }

    public static async getListFriends(payload: Omit<GetListFriendsPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ friends: User[] }>>('/social/users/friends', {
            limit: payload.limit,
            page: payload.page,
            search: payload.search
        });
    }

    public static async searchUsers(payload: Omit<GetUsersPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ users: User[] }>>('/social/users/search', {
            search: payload.search,
            limit: payload.limit,
            page: payload.page
        });
    }

    public static async sendFriendRequest(payload: Omit<SendFriendRequestPayload, 'success' | 'error'>) {
        return await apiService.post('/social/friend-requests', payload);
    }

    // Lấy danh sách yêu cầu kết bạn
    public static async getFriendRequests(payload: Omit<GetListFriendsPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ friendRequests: User[] }>>('/social/friend-requests', {
            limit: payload.limit,
            page: payload.page,
            type: 'received'
        });
    }
    // Danh sách đã gửi yêu cầu kết bạn
    public static async getSentFriendRequests(payload: Omit<GetSentFriendRequestsPayload, 'success' | 'error'>) {
        return await apiService.get<ApiResponse<{ friendRequests: User[] }>>('/social/friend-requests', {
            limit: payload.limit,
            page: payload.page,
            type: 'sent',
            search: payload.search
        });
    }

    // Chấp nhận yêu cầu kết bạn
    public static async acceptFriendRequest(payload: Omit<AcceptFriendRequestPayload, 'success' | 'error'>) {
        return await apiService.patch(`/social/friend-requests/${payload.senderId}/accept`);
    }

    // Từ chối yêu cầu kết bạn
    public static async rejectFriendRequest(payload: Omit<RejectFriendRequestPayload, 'success' | 'error'>) {
        return await apiService.patch(`/social/friend-requests/${payload.senderId}/reject`);
    }
}

export default ContactService;