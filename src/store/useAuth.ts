/**
 * Zustand auth store for React Native.
 *
 * Intentionally NOT wrapped in `persist` — accessToken is mirrored into
 * AsyncStorage via inline helpers so socket handshake + axios interceptor
 * can read it without touching Zustand. refreshToken stays in HttpOnly
 * cookie (BE handles it). User is fetched fresh on boot via fetchMe().
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthState, PayloadLogin, PayloadRegister, PayloadLogout, PayloadForgotPassword, PayloadSendOtp, PayloadVerifyOtp, PayloadResetPassword, AuthMetadata, UpdatePasswordPayload, UpdateProfilePayload, UpdateAvatarPayload } from "../types/auth.type";
import { User } from "../types/user.type";
import AuthService from "../service/auth.service";
import {
  applyProfilePayloadToUser,
  extractAuthUserRaw,
  isValidAuthUserId,
  mergeAuthUsers,
  normalizeAuthUser,
} from "../libs/normalize-auth-user";
import { resolveMediaUrl } from "../libs/resolve-media-url";

// ── Token Storage helpers (AsyncStorage) ─────────────────────────────
const ACCESS_TOKEN_KEY = "accessToken";

export const tokenStorage = {
  get: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: async (token: string | null): Promise<void> => {
    try {
      if (token) await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
      else await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

// ── Refresh singleton ────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;
type Subscriber = (token: string | null) => void;
const subscribers: Set<Subscriber> = new Set();

// Auth in-flight tracker
let authPromise: Promise<unknown> | null = null;

// Allow external subscription to token refresh events (for socket, etc.)
export function subscribeTokenRefresh(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

const useAuthStore = create<AuthState>()(
  (set, get) => ({
    isAuthenticated: false, // Will be seeded from AsyncStorage on boot
    isLoading: false,
    isRefreshing: false,
    user: null,
    tokens: {
      accessToken: null,
      refreshToken: null,
      expiresIn: 0,
      expiredAt: 0,
    },

    // ── Login ──────────────────────────────────────────────────────
    login: async (payload: PayloadLogin) => {
      set({ isLoading: true });
      const { username, password, fcmToken } = payload;
      // Hold auth lock until token is persisted
      let release!: () => void;
      authPromise = new Promise<void>((r) => { release = r; });
      try {
        const dateNow = Math.floor(Date.now() / 1000);
        const response = await AuthService.login({ username, password, fcmToken });
        const metadata = response.data?.metadata as AuthMetadata;
        const accessToken = metadata?.accessToken || null;
        await tokenStorage.set(accessToken);
        const loginUser = normalizeAuthUser(
          extractAuthUserRaw(response.data) ??
            (metadata?.user as Record<string, unknown> | undefined),
        );
        set({
          isAuthenticated: true,
          isLoading: false,
          user: loginUser,
          tokens: {
            accessToken,
            refreshToken: null,
            expiresIn: metadata?.expiresIn || 0,
            expiredAt: dateNow + (metadata?.expiresIn || 0),
          },
        });
        payload.success?.(response.data);
      } catch (error) {
        set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
        payload.error?.(error);
      } finally {
        release?.();
      }
    },

    // ── Send OTP ───────────────────────────────────────────────────
    sendOtp: async (payload: PayloadSendOtp) => {
      set({ isLoading: true });
      try {
        const response = await AuthService.sendOtp({
          email: payload.email,
          type: payload.type,
        });
        const data = response.data;
        if (data?.statusCode && data.statusCode >= 400) {
          payload.error?.({
            message: data.message,
            statusCode: data.statusCode,
            reasonStatusCode: data.reasonStatusCode,
          });
          return;
        }
        payload.success?.();
      } catch (error) {
        payload.error?.(error);
      } finally {
        set({ isLoading: false });
      }
    },

    // ── Register ───────────────────────────────────────────────────
    register: async (payload: PayloadRegister) => {
      set({ isLoading: true });
      let release!: () => void;
      authPromise = new Promise<void>((r) => { release = r; });
      try {
        const response = await AuthService.register(payload);
        const metadata = response.data?.metadata as AuthMetadata;
        const accessToken = metadata?.accessToken || null;
        await tokenStorage.set(accessToken);
        const registerUser = normalizeAuthUser(
          extractAuthUserRaw(response.data) ??
            (metadata?.user as Record<string, unknown> | undefined),
        );
        set({
          isAuthenticated: true,
          isLoading: false,
          user: registerUser,
          tokens: {
            accessToken,
            refreshToken: null,
            expiresIn: metadata?.expiresIn || 0,
            expiredAt: Math.floor(Date.now() / 1000) + (metadata?.expiresIn || 0),
          },
        });
        payload.success?.(response.data);
      } catch (error) {
        set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
        payload.error?.(error);
      } finally {
        release?.();
      }
    },

    // ── Logout ─────────────────────────────────────────────────────
    logout: async (payload: PayloadLogout) => {
      set({ isLoading: true });
      try {
        // Try to get FCM token for cleanup
        try {
          await AuthService.logout();
        } catch (apiErr) {
          console.warn("[logout] BE call failed, clearing FE anyway", apiErr);
        }

        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: { accessToken: null, refreshToken: null, expiresIn: 0, expiredAt: 0 },
        });
        await tokenStorage.clear();
        payload.success?.();
      } catch (error) {
        set({ isLoading: false });
        payload.error?.(error);
      }
    },

    // ── fetchMe ────────────────────────────────────────────────────
    fetchMe: async () => {
      try {
        const response = await AuthService.getMe();
        const user = normalizeAuthUser(extractAuthUserRaw(response.data));
        if (user && isValidAuthUserId(user)) {
          set({
            user: mergeAuthUsers(get().user, user) ?? user,
            isAuthenticated: true,
          });
          return user;
        }
        console.warn("[fetchMe] no user in response", response.data);
        return null;
      } catch (err: any) {
        const status = err?.statusCode ?? err?.response?.status;
        const message = err?.message || err?.response?.data?.message;
        console.warn(`[fetchMe] failed${status ? ` (${status})` : ""}: ${message}`);
        throw err;
      }
    },

    // ── refreshToken (called by refreshAccessToken singleton) ──────
    refreshToken: async (): Promise<string | null> => {
      set({ isRefreshing: true });
      try {
        const response = await AuthService.refreshToken();
        const dateNow = Math.floor(Date.now() / 1000);
        const metadata = response.data?.metadata as AuthMetadata;

        if (!metadata || typeof metadata.accessToken !== "string" || typeof metadata.expiresIn !== "number") {
          throw new Error("No valid metadata returned from refresh");
        }

        await tokenStorage.set(metadata.accessToken);
        set({
          isAuthenticated: true,
          user: (metadata as any).user || get().user,
          tokens: {
            accessToken: metadata.accessToken,
            refreshToken: null,
            expiresIn: metadata.expiresIn,
            expiredAt: dateNow + metadata.expiresIn,
          },
          isRefreshing: false,
        });
        return metadata.accessToken;
      } catch (error: any) {
        set({ isRefreshing: false });
        console.error("Refresh failed:", error?.message || error);
        // Fallback: clear storage (don't call logout to avoid loop)
        await tokenStorage.clear();
        set({
          isAuthenticated: false,
          user: null,
          tokens: { accessToken: null, refreshToken: null, expiresIn: 0, expiredAt: 0 },
        });
        return null;
      }
    },

    // ── refreshAccessToken (singleton for axios interceptor) ────────
    refreshAccessToken: async (): Promise<string | null> => {
      if (refreshPromise) return refreshPromise;

      refreshPromise = (async () => {
        try {
          const token = await get().refreshToken();
          // Notify subscribers
          subscribers.forEach((cb) => {
            try { cb(token); } catch {}
          });
          return token;
        } catch (err) {
          subscribers.forEach((cb) => {
            try { cb(null); } catch {}
          });
          return null;
        } finally {
          refreshPromise = null;
        }
      })();

      return refreshPromise;
    },

    // ── Refresh helpers (for axios interceptor) ─────────────────────
    // isRefreshing (boolean) tracks the refresh-in-progress flag
    // checkRefreshing is a function form for API service to call
    checkRefreshing: (): boolean => refreshPromise !== null,
    awaitRefreshIfAny: async (): Promise<string | null> => refreshPromise ?? Promise.resolve(null),
    checkAuthInFlight: (): boolean => authPromise !== null,
    awaitAuthInFlight: async (): Promise<unknown> => authPromise ?? Promise.resolve(null),

    // ── Forgot Password ────────────────────────────────────────────
    forgotPassword: async (payload: PayloadForgotPassword) => {
      set({ isLoading: true });
      try {
        await AuthService.forgotPassword(payload);
        set({ isLoading: false });
        payload.success?.();
      } catch (error) {
        set({ isLoading: false });
        payload.error?.(error);
      }
    },

    // ── Verify OTP ─────────────────────────────────────────────────
    verifyOtp: async (payload: PayloadVerifyOtp) => {
      set({ isLoading: true });
      try {
        const response = await AuthService.verifyOtp(payload);
        set({ isLoading: false });
        payload.success?.(response.data?.metadata);
      } catch (error) {
        set({ isLoading: false });
        payload.error?.(error);
      }
    },

    // ── Reset Password ─────────────────────────────────────────────
    resetPassword: async (payload: PayloadResetPassword) => {
      set({ isLoading: true });
      try {
        const response = await AuthService.resetPassword(payload);
        set({ isLoading: false });
        payload.success?.(response.data?.metadata);
      } catch (error) {
        set({ isLoading: false });
        payload.error?.(error);
      }
    },

    // ── Update Profile ─────────────────────────────────────────────
    updateProfile: async (payload: UpdateProfilePayload) => {
      const { callback, ...profileFields } = payload;
      set({ isLoading: true });
      try {
        await AuthService.updateProfile(payload);
        try {
          await get().fetchMe();
        } catch {
          const currentUser = get().user;
          if (currentUser) {
            set({ user: applyProfilePayloadToUser(currentUser, profileFields) });
          }
        }
        set({ isLoading: false });
        callback?.();
      } catch (error) {
        set({ isLoading: false });
        callback?.(error);
      }
    },

    // ── Update Avatar ──────────────────────────────────────────────
    updateAvatar: async (payload: UpdateAvatarPayload) => {
      const { callback } = payload;
      set({ isLoading: true });
      try {
        const response = await AuthService.updateAvatar(payload);
        const avatarUrl = (response.data?.metadata as { url?: string } | undefined)?.url;
        try {
          await get().fetchMe();
        } catch {
          const currentUser = get().user;
          if (currentUser && avatarUrl) {
            set({
              user: {
                ...currentUser,
                avatar: resolveMediaUrl(avatarUrl) ?? avatarUrl,
              },
            });
          }
        }
        set({ isLoading: false });
        callback?.();
      } catch (error) {
        set({ isLoading: false });
        callback?.(error);
      }
    },

    // ── Update Password ────────────────────────────────────────────
    updatePassword: async (payload: UpdatePasswordPayload) => {
      set({ isLoading: true });
      try {
        await AuthService.updatePassword(payload);
        set({ isLoading: false });
        payload.callback?.();
      } catch (error) {
        set({ isLoading: false });
        payload.callback?.(error);
      }
    },

    // ── clearStorage ───────────────────────────────────────────────
    clearStorage: async () => {
      await tokenStorage.clear();
      set({
        isAuthenticated: false,
        isLoading: false,
        isRefreshing: false,
        user: null,
        tokens: { accessToken: null, refreshToken: null, expiresIn: 0, expiredAt: 0 },
      });
    },

    // ── setAuth (for boot bootstrap) ────────────────────────────────
    setAuth: (isAuthenticated: boolean) => set({ isAuthenticated }),
  })
);

// Boot: token từ AsyncStorage → fetchMe để có user (giống web AuthBootstrap)
(async () => {
  try {
    const token = await tokenStorage.get();
    if (!token) return;
    useAuthStore.setState({
      isAuthenticated: true,
      tokens: { accessToken: token, refreshToken: null, expiresIn: 0, expiredAt: 0 },
    });
    await useAuthStore.getState().fetchMe();
  } catch {
    /* fetchMe logs warning; giữ token để interceptor refresh thử */
  }
})();

export default useAuthStore;
