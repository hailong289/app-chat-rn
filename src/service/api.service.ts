import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, APP_ENV, API_URL_PRODUCTION } from "@/env.json";
import useAuthStore from "../store/useAuth";

class ApiService {
    private static instance: ApiService;
    private axiosInstance;

    private constructor() {
        const baseURL = APP_ENV === 'production' ? API_URL_PRODUCTION : API_URL;
        // Khởi tạo axios instance với cấu hình mặc định
        this.axiosInstance = axios.create({
            baseURL: `${baseURL}/api`,
            timeout: 10000, // Thời gian chờ mặc định 10 giây (Nếu cần tăng thêm, có thể sử dụng phương thức withTimeout)
        });
        this.axiosInstance.interceptors.request.use(async (config) => {
            if (config.data instanceof FormData) {
                config.headers["Content-Type"] = "multipart/form-data";
            } else if (config.data instanceof Blob || config.data instanceof File) {
                config.headers["Content-Type"] = "application/octet-stream";
            } else if (config.data && typeof config.data === "object") {
                config.headers["Content-Type"] = "application/json";
            } else if (typeof config.data === "string" && config.data.includes("=")) {
                config.headers["Content-Type"] = "application/x-www-form-urlencoded";
            } else if (
                config.data instanceof ArrayBuffer ||
                ArrayBuffer.isView(config.data)
            ) {
                config.headers["Content-Type"] = "application/octet-stream";
            } else {
                config.headers["Content-Type"] = "text/plain";
            }
            // Kiểm tra và thêm header Authorization nếu token tồn tại
            const { accessToken } = await this.getTokens();
            if (accessToken) {
                config.headers["Authorization"] = `Bearer ${accessToken}`;
            }
            console.log('Request:', config);
            return config;
        });

        this.axiosInstance.interceptors.response.use(
            (response) => {
                console.log('Response:', response);
                return response;
            },
            (error) => {
                console.error('Response:', error);
                const statusCode = error.response?.status || 500;
                const reasonStatusCode = error.response?.statusText || "Internal Server Error";
                const responseData = error.response?.data;
                return Promise.reject({
                    statusCode,
                    reasonStatusCode,
                    message: this.formatValidationErrors(responseData) || responseData?.message || error.message,
                    metadata: responseData || null,
                });
            }
        );
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    public get axios() {
        return this.axiosInstance;
    }

    public async get<T>(url: string, params?: any) {
        return await this.axiosInstance.get<T>(url, { params });
    }

    public async post<T>(url: string, data?: any) {
        return await this.axiosInstance.post<T>(url, data);
    }

    public async put<T>(url: string, data?: any) {
        return await this.axiosInstance.put<T>(url, data);
    }

    public async patch<T>(url: string, data?: any) {
        return await this.axiosInstance.patch<T>(url, data);
    }

    public async delete<T>(url: string, data?: any) {
        return await this.axiosInstance.delete<T>(url, { data });
    }

    public async withTimeout<T>(timeoutMs: number) {
        this.axiosInstance.defaults.timeout = timeoutMs;
        return this;
    }

    public async setHeader(key: string, value: string) {
        this.axiosInstance.defaults.headers.common[key] = value;
        return this;
    }

    public async removeHeader(key: string) {
        delete this.axiosInstance.defaults.headers.common[key];
        return this;
    }

    public async setAuthorization(token: string) {
        this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        return this;
    }

    public async setBaseURL(url: string) {
        this.axiosInstance.defaults.baseURL = url;
        return this;
    }

    /**
     * Xử lý và format lỗi validation từ API response
     * @param errorData - Dữ liệu lỗi từ API response
     * @returns Chuỗi lỗi đã được format
     */
    private formatValidationErrors(errorData: any): string {
        if (Array.isArray(errorData)) {
            return errorData.map((item: any) => {
                if (item.field && item.errors && Array.isArray(item.errors)) {
                    return `${item.field}: ${item.errors.join(', ')}`;
                }
                return item.toString();
            }).join('; ');
        }
        
        if (Array.isArray(errorData?.message)) {
            return errorData.message.map((item: any) => {
                if (item.field && item.errors && Array.isArray(item.errors)) {
                    return `${item.field}: ${item.errors.join(', ')}`;
                }
                return item.toString();
            }).join('; ');
        }

        return errorData?.message || errorData?.toString() || 'Có lỗi xảy ra';
    }

    private getTokens = async () => {
        const tokens = useAuthStore.getState().tokens;
        return {
            accessToken: tokens?.accessToken || null,
            refreshToken: tokens?.refreshToken || null,
            expiresIn: tokens?.expiresIn || 0,
            expiredAt: tokens?.expiredAt || 0,
        };
    };
}

export default ApiService.getInstance();