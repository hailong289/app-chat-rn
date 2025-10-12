import { AuthMetadata, PayloadForgotPassword, PayloadLogin, PayloadRegister, PayloadResetPassword, PayloadVerifyOtp } from "../types/auth.type";
import ApiResponse from "../types/response.type";
import apiService from "./api.service";


export default class AuthService {
    // Các phương thức xác thực như login, register, logout, v.v.
    public static async login(payload: Omit<PayloadLogin, 'success' | 'error'>) {
        return apiService.post<ApiResponse<AuthMetadata>>('/auth/login', payload);
    }

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

    public static async logout() {
        return await apiService.post('/auth/logout');
    }

    public static async forgotPassword(payload: Omit<PayloadForgotPassword, 'success' | 'error'>) {
        return await apiService.post('/auth/forgot-password', { ...payload, isMobile: true });
    }

    public static async verifyOtp(payload: Omit<PayloadVerifyOtp, 'success' | 'error'>) {
        return await apiService.post<ApiResponse<any>>('/auth/verify-otp', payload);
    }

    public  static async resetPassword(data: Omit<PayloadResetPassword, 'success' | 'error'>) {
        return (await apiService.setAuthorization(data.token)).post<ApiResponse<any>>('/auth/reset-password', { newPassword: data.newPassword });
    }
}