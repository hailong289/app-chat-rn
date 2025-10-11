import { AuthMetadata, PayloadForgotPassword, PayloadLogin, PayloadRegister, PayloadResetPassword } from "../types/auth.type";
import ApiResponse from "../types/response.type";
import apiService from "./api.service";


export default class AuthService {
    // Các phương thức xác thực như login, register, logout, v.v.
    public static async login(payload: Omit<PayloadLogin, 'success' | 'error'>) {
        return apiService.post<ApiResponse<AuthMetadata>>('/auth/login', payload);
    }

    public static async register(payload: Omit<PayloadRegister, 'success' | 'error'>) {
        return apiService.post<ApiResponse<AuthMetadata>>('/auth/register', payload);
    }

    public static async logout() {
        return apiService.post('/auth/logout');
    }

    public static async forgotPassword(payload: Omit<PayloadForgotPassword, 'success' | 'error'>) {
        return apiService.post('/auth/forgot-password', payload);
    }

    public static async resetPassword(payload: Omit<PayloadResetPassword, 'success' | 'error'>) {
        return apiService.post('/auth/reset-password', payload);
    }
}