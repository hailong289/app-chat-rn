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


export interface User {
  _id: string; // mongodb objectId
  id: string;
  fullname: string;
  slug: string;
  email?: string; 
  phone: string;
  avatar: string;
  gender: 'male' | 'female' | 'other'; 
  dateOfBirth: string;
  createdAt: string;  
  updatedAt: string;   
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

// type state 
export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
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
}