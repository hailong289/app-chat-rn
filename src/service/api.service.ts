import axios from "axios";
import { API_URL, APP_ENV, API_URL_PRODUCTION } from "@/env.json";
import useAuthStore from "../store/useAuth";

// Endpoints must NOT trigger refresh-and-retry on 401
// (refresh endpoint itself, login/register failing with 401 = credentials issue)
const NO_REFRESH_PATHS = [
  "/auth/refresh-token",
  "/auth/login",
  "/auth/register",
  "/auth/logout",
];

function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) return false;
  return NO_REFRESH_PATHS.some((p) => url.includes(p));
}

class ApiService {
    private static instance: ApiService;
    private axiosInstance;
    // In-flight GET dedup. Same (url, params) tuple → shares one promise.
    private inFlightGets = new Map<string, Promise<unknown>>();

    private constructor() {
        const baseURL = APP_ENV === 'production' ? API_URL_PRODUCTION : API_URL;
        this.axiosInstance = axios.create({
            baseURL: `${baseURL}/api`,
            timeout: 10000,
            // RefreshToken lives in HttpOnly cookie (path: /auth).
            // Required for /auth/refresh-token to work cross-origin in dev.
            withCredentials: true,
        });

        // ── Request interceptor ─────────────────────────────────────
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                // 1. Set Content-Type
                const isFormData = config.data instanceof FormData || (config.data && config.data._parts);
                if (isFormData) {
                    config.headers["Content-Type"] = 'multipart/form-data';
                } else if (config.data instanceof Blob || config.data instanceof File) {
                    config.headers["Content-Type"] = "application/octet-stream";
                } else if (config.data && typeof config.data === "object") {
                    config.headers["Content-Type"] = "application/json";
                } else if (typeof config.data === "string" && config.data.includes("=")) {
                    config.headers["Content-Type"] = "application/x-www-form-urlencoded";
                } else if (config.data instanceof ArrayBuffer || ArrayBuffer.isView(config.data)) {
                    config.headers["Content-Type"] = "application/octet-stream";
                } else {
                    config.headers["Content-Type"] = "text/plain";
                }

                // 2. If token refresh is in-flight, queue behind it
                const state = useAuthStore.getState();
                if (typeof state.checkRefreshing === 'function' && state.checkRefreshing() && !shouldSkipRefresh(config.url)) {
                    await state.awaitRefreshIfAny?.();
                } else if (state.isRefreshing && !shouldSkipRefresh(config.url)) {
                    await state.awaitRefreshIfAny?.();
                }

                // 3. If login/register is in-flight, queue behind it
                const state2 = useAuthStore.getState();
                if (typeof state2.checkAuthInFlight === 'function' && state2.checkAuthInFlight() && !shouldSkipRefresh(config.url)) {
                    await state2.awaitAuthInFlight?.();
                }

                // 4. Attach Authorization header (read AFTER awaiting refresh)
                if (config.headers["Authorization"] === undefined) {
                    const { accessToken } = await this.getTokens();
                    if (accessToken) {
                        config.headers["Authorization"] = `Bearer ${accessToken}`;
                    }
                }
                return config;
            }
        );

        // ── Response interceptor ────────────────────────────────────
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config as any;
                const statusCode = error.response?.status || 500;
                const reasonStatusCode = error.response?.statusText || "Internal Server Error";
                const responseData = error.response?.data;

                // 401 + not already retried + not a loop path → refresh & retry once
                if (
                    statusCode === 401 &&
                    originalRequest &&
                    !originalRequest._retry &&
                    !shouldSkipRefresh(originalRequest.url)
                ) {
                    originalRequest._retry = true;
                    const store = useAuthStore.getState();
                    let newToken: string | null = null;
                    if (typeof store.refreshAccessToken === 'function') {
                        newToken = await store.refreshAccessToken() ?? null;
                    } else if (typeof store.refreshToken === 'function') {
                        newToken = await store.refreshToken() ?? null;
                    }
                    if (newToken) {
                        originalRequest.headers.set?.("Authorization", `Bearer ${newToken}`);
                        (originalRequest.headers as any)["Authorization"] = `Bearer ${newToken}`;
                        return this.axiosInstance(originalRequest);
                    }
                    // Refresh failed → fall through to logout
                }

                // 401 with no recovery → clear auth
                if (statusCode === 401) {
                    useAuthStore.getState().clearStorage();
                }

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
        // GET dedup: same (url, params) → share the same in-flight promise
        const key = `GET:${url}:${params ? JSON.stringify(params) : ""}`;
        const existing = this.inFlightGets.get(key) as Promise<any> | undefined;
        if (existing) return existing;
        const promise = this.axiosInstance.get<T>(url, { params }).finally(() => {
            this.inFlightGets.delete(key);
        });
        this.inFlightGets.set(key, promise);
        return promise;
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

    public withTimeout(timeoutMs: number): this {
        this.axiosInstance.defaults.timeout = timeoutMs;
        return this;
    }

    public setHeader(key: string, value: string) {
        this.axiosInstance.defaults.headers.common[key] = value;
        return this;
    }

    public removeHeader(key: string) {
        delete this.axiosInstance.defaults.headers.common[key];
        return this;
    }

    public setAuthorization(token: string) {
        this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        return this;
    }

    public setBaseURL(url: string) {
        this.axiosInstance.defaults.baseURL = url;
        return this;
    }

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
