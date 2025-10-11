import { create } from "zustand";
import { persist } from "zustand/middleware";
import Helpers from "../libs/helpers";
import { AuthState } from "../types/auth.type";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthService from "../service/auth.service";

// Lưu trạng thái xác thực trong localStorage
const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            tokens: {
                accessToken: null,
                refreshToken: null,
                expiresIn: 0,
                expiredAt: 0,
            },
            login: async (payload) => {
                set({ isLoading: true });
                const { username, password, fcmToken } = payload;
                try {
                    const dateNow = Math.floor(Date.now() / 1000)
                    const response = await AuthService.login({ username, password, fcmToken });
                    set({
                        isAuthenticated: true,
                        isLoading: false, user: response.data.metadata?.user,
                        tokens: {
                            accessToken: response.data.metadata?.accessToken || null,
                            refreshToken: response.data.metadata?.refreshToken || null,
                            expiresIn: response.data.metadata?.expiresIn || 0,
                            expiredAt: dateNow + (response.data.metadata?.expiresIn || 0),
                        }
                    });
                    payload.success(response.data);
                } catch (error) {
                    set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
                    payload.error(error);
                }
            },
            register: async (payload) => {
                set({ isLoading: true });
                try {
                    const response = await AuthService.register(payload);
                    set({ isAuthenticated: true, isLoading: false, user: response.data.metadata?.user });
                    payload.success?.(response.data);
                } catch (error) {
                    set({ isAuthenticated: false, isLoading: false, user: null });
                    payload.error?.(error);
                }
            },
            logout: async (payload) => {
                set({ isLoading: true });
                try {
                    await AuthService.logout();
                    set({ isAuthenticated: false, isLoading: false, user: null, tokens: null });
                    await Helpers.removeStorage("tokens");
                    payload.success?.();
                } catch (error) {
                    payload.error?.(error);
                }

            },
            forgotPassword: async (payload) => {
                set({ isLoading: true });
                try {
                    await AuthService.forgotPassword(payload);
                    set({ isLoading: false });
                    payload.success?.();
                } catch (error) {
                    payload.error?.(error);
                    set({ isLoading: false });
                }
            },
            resetPassword: async (payload) => {
                set({ isLoading: true });
                try {
                    await AuthService.resetPassword(payload);
                    set({ isLoading: false });
                    payload.success?.();
                } catch (error) {
                    payload.error?.(error);
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'auth', // key trong AsyncStorage
            storage: {
                getItem: async (name) => {
                    const value = await AsyncStorage.getItem(name);
                    return value ? JSON.parse(value) : null;
                },
                setItem: async (name, value) => {
                    await AsyncStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: async (name) => {
                    await AsyncStorage.removeItem(name);
                },
            },
        }
    )
);

export default useAuthStore;