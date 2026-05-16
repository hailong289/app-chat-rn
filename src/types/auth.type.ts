import { User } from './user.type';

export interface PayloadLogin {
  username: string;
  password: string;
  type?: 'email' | 'phone';
  fcmToken: string | null;
  success: (data?: any) => void;
  error: (error?: any) => void;
}

export interface PayloadRegister {
    fullname: string;
    username: string;
    password: string;
    confirm: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth: string;
    type?: 'email' | 'phone';
    fcmToken: string | null;
    success: (data?: any) => void;
    error: (error?: any) => void;
}

export interface PayloadLogout {
    success: (data?: any) => void;
    error: (error?: any) => void;
}

export interface AuthMetadata {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // Thời gian token hết hạn (tính bằng giây)
    user: User;
}


export interface PayloadForgotPassword {
    email: string;
    username: string;
    success: (data?: any) => void;
    error: (error?: any) => void;
}

export interface PayloadVerifyOtp {
    indicator: string;
    otp: string;
    type: "reset-password" | "verify-account";
    success: (data?: any) => void;
    error: (error?: any) => void;
}

export interface PayloadResetPassword {
    token: string; // token nhận được sau khi xác thực OTP thành công
    newPassword: string;
    success: (data?: any) => void;
    error: (error?: any) => void;
}

export interface UpdateProfilePayload {
    fullname?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: string;
    address?: string;
    email?: string;
    phone?: string;
    callback?: (error?: any) => void;
}

export interface UpdateAvatarPayload {
    file: any; // File object for RN
    callback?: (error?: any) => void;
}

export interface UpdatePasswordPayload {
    oldPassword: string;
    newPassword: string;
    callback?: (error?: any) => void;
}

// type state 
export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    isRefreshing: boolean;
    user: User | null;
    tokens: {
        accessToken: string | null;
        refreshToken: string | null;
        expiresIn: number;
        expiredAt: number; // timestamp token hết hạn
    } | null;
    login: (payload: PayloadLogin) => Promise<void>;
    register: (payload: PayloadRegister) => Promise<void>;
    logout: (payload: PayloadLogout) => Promise<void>;
    forgotPassword: (payload: PayloadForgotPassword) => Promise<void>;
    verifyOtp: (payload: PayloadVerifyOtp) => Promise<void>;
    resetPassword: (payload: PayloadResetPassword) => Promise<void>;
    clearStorage: () => Promise<void>;
        // ── New methods added for Phase 1 completeness ──
    fetchMe: () => Promise<import("./user.type").User | null>;
    refreshToken: () => Promise<string | null>;
    refreshAccessToken: () => Promise<string | null>;
    // checkRefreshing (function form) — for axios interceptor
    checkRefreshing: () => boolean;
    awaitRefreshIfAny: () => Promise<string | null>;
    checkAuthInFlight: () => boolean;
    awaitAuthInFlight: () => Promise<unknown>;
    updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
    updateAvatar: (payload: UpdateAvatarPayload) => Promise<void>;
    updatePassword: (payload: UpdatePasswordPayload) => Promise<void>;
    setAuth: (isAuthenticated: boolean) => void;
}