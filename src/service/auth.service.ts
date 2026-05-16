import { AuthMetadata, PayloadForgotPassword, PayloadLogin, PayloadRegister, PayloadResetPassword, PayloadVerifyOtp, UpdateProfilePayload } from "../types/auth.type";
import ApiResponse from "../types/response.type";
import apiService from "./api.service";

export default class AuthService {
    // ── Login ──────────────────────────────────────────────────────────
    public static async login(payload: Omit<PayloadLogin, 'success' | 'error'>) {
        return apiService.post<ApiResponse<AuthMetadata>>('/auth/login', payload);
    }

    // ── Register ───────────────────────────────────────────────────────
    public static async register(payload: Omit<PayloadRegister, 'success' | 'error'>) {
        const params: any = { ...payload };
        if (params.type === 'phone') {
            params.phone = params.username;
            delete params.username;
        } else {
            params.email = params.username;
            delete params.username;
        }
        delete params.confirm;
        return await apiService.post<ApiResponse<AuthMetadata>>('/auth/register', params);
    }

    // ── Logout ─────────────────────────────────────────────────────────
    public static async logout(data?: { fcmToken?: string }) {
        return await apiService.post('/auth/logout', data);
    }

    // ── Get Me (fetch authenticated user) ──────────────────────────────
    public static async getMe() {
        return apiService.get<ApiResponse<any>>('/auth/me');
    }

    // ── Forgot Password ────────────────────────────────────────────────
    public static async forgotPassword(payload: Omit<PayloadForgotPassword, 'success' | 'error'>) {
        return await apiService.post('/auth/forgot-password', { ...payload, isMobile: true });
    }

    // ── Verify OTP ─────────────────────────────────────────────────────
    public static async verifyOtp(payload: Omit<PayloadVerifyOtp, 'success' | 'error'>) {
        return await apiService.post<ApiResponse<any>>('/auth/verify-otp', payload);
    }

    // ── Reset Password ─────────────────────────────────────────────────
    public static async resetPassword(data: Omit<PayloadResetPassword, 'success' | 'error'>) {
        return (await apiService.setAuthorization(data.token)).post<ApiResponse<any>>('/auth/reset-password', { newPassword: data.newPassword });
    }

    // ── Refresh Token (BE reads HttpOnly cookie, returns new accessToken) ──
    public static async refreshToken() {
        // Empty Authorization header forces BE into refresh-token branch
        return apiService.axios.post<ApiResponse<AuthMetadata>>(
            '/auth/refresh-token',
            {},
            { headers: { Authorization: '' } }
        );
    }

    // ── Update Profile ─────────────────────────────────────────────────
    public static async updateProfile(data: UpdateProfilePayload) {
        return apiService.post<ApiResponse<any>>('/auth/update-profile', data);
    }

    // ── Update Avatar ──────────────────────────────────────────────────
    public static async updateAvatar(data: { file: any }) {
        const formData = new FormData();
        formData.append('avatar', data.file);
        return apiService.post<ApiResponse<any>>('/auth/update-avatar', formData);
    }

    // ── Update Password ────────────────────────────────────────────────
    public static async updatePassword(data: { currentPassword: string; newPassword: string }) {
        return apiService.post<ApiResponse<any>>('/auth/update-password', data);
    }

    // ── Search Users ──────────────────────────────────────────────────
    public static async searchUser(params: { keyword: string; page?: number; limit?: number }) {
        return apiService.get('/auth/search', params);
    }

    // ── List Sessions (active devices) ────────────────────────────────
    public static async listSessions() {
        return apiService.get<{ data: { metadata: any[] } }>('/auth/sessions');
    }

    // ── Logout Device ──────────────────────────────────────────────────
    public static async logoutDevice(clientId: string) {
        return apiService.post(`/auth/sessions/${encodeURIComponent(clientId)}/revoke`);
    }

    // ── Logout All Devices ─────────────────────────────────────────────
    public static async logoutAllDevices() {
        return apiService.post('/auth/sessions/revoke-all');
    }
}
