import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";

const SECRET_KEY = "123456";

class Helpers {

    static getDefaultDate = () => {
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return eighteenYearsAgo;
    };

    static parseDateString = (dateString: string): Date => {
        const [day, month, year] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    static formatDateToString = (date: Date, format: string = 'dd/mm/YYYY'): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());

        return format
            .replace(/dd/i, day)
            .replace(/mm/i, month)
            .replace(/yyyy/i, year);
    }

    static formatNumber = (num: number): string => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    static formatDate = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('en-GB', options).replace(/\//g, '-');
    }

    static formatTimeAgo = (input: string | Date): string => {
        const now = new Date();
        const date = typeof input === "string" ? new Date(input) : input;
      
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
      
        if (diffSec < 60) return "vừa xong";
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHr < 24) return `${diffHr} giờ trước`;
        if (diffDay === 1) return "hôm qua";
        if (diffDay < 7) return `${diffDay} ngày trước`;
      
        // Format ngày/tháng/năm nếu đã quá 1 tuần
        return date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
    }

    static formatTime = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    static formatVideoDuration = (seconds: number | undefined | null): string => {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    static formatDateMessage = (date: Date): string => {
        const dateMessage = new Date(date);

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
      
        const isSameDay = (a: Date, b: Date) =>
          a.getDate() === b.getDate() &&
          a.getMonth() === b.getMonth() &&
          a.getFullYear() === b.getFullYear();
      
        if (isSameDay(date, today)) {
          return 'Hôm nay';
        }
      
        if (isSameDay(date, yesterday)) {
          return 'Hôm qua';
        }
      
        return date.toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
    }

    public static generateRandomString = (length: number): string => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    public static setStorage = async (key: string, value: any) => {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("Error setting storage:", error);
        }
    }

    public static getStorage = async (key: string) => {
        try {
            const value = await AsyncStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error("Error getting storage:", error);
            return null;
        }
    }

    public static removeStorage = async (key: string) => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error("Error removing storage:", error);
        }
    }

    public static clearStorage = async () => {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error("Error clearing storage:", error);
        }
    }

    static enCryptUserInfo = (userInfo: any): string => {
        const userInfoString = JSON.stringify(userInfo);
        return CryptoJS.AES.encrypt(userInfoString, SECRET_KEY).toString();
    };

    static decryptUserInfo = (encryptedUserInfo: string): any => {
        try {
            if (!encryptedUserInfo) return null;
            let cleanStr = decodeURIComponent(encryptedUserInfo);
            if (
                (cleanStr.startsWith('"') && cleanStr.endsWith('"')) ||
                (cleanStr.startsWith("'") && cleanStr.endsWith("'"))
            ) {
                cleanStr = cleanStr.slice(1, -1);
            }
            cleanStr = cleanStr.replace(/ /g, '+');
            const bytes = CryptoJS.AES.decrypt(cleanStr, SECRET_KEY);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);
            if (!originalText) return null;
            return JSON.parse(originalText);
        } catch {
            return null;
        }
    };

    public static safeJsonParse = (input: any, defaultValue: any) => {
        if (typeof input !== 'string') return input;
        try {
            return JSON.parse(input) || defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
}

export default Helpers;

// ── Quiz / Flashcard helpers ──────────────────────────────────────────

export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeUntil(ms: number): string {
  if (ms <= 0 || !Number.isFinite(ms)) return "0 giây";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} ngày`);
  if (h > 0) parts.push(`${h} giờ`);
  if (m > 0) parts.push(`${m} phút`);
  if (s > 0 || parts.length === 0) parts.push(`${s} giây`);
  return parts.join(" ");
}

export function getMsUntilStart(startTime?: string): number {
  if (!startTime) return 0;
  const now = Date.now();
  const start = new Date(startTime).getTime();
  return Math.max(0, start - now);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "Không giới hạn";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Không xác định";
  }
}

export type QuizStatusColor = "success" | "warning" | "danger" | "default";

export interface QuizStatusResult {
  label: string;
  color: QuizStatusColor;
}

export function getQuizStatus(quiz: {
  quiz_startTime?: string;
  quiz_endTime?: string;
  quiz_status?: string;
}): QuizStatusResult {
  const now = new Date();
  if (quiz.quiz_startTime && new Date(quiz.quiz_startTime) > now) {
    return { label: "Chưa bắt đầu", color: "warning" };
  }
  if (quiz.quiz_endTime && new Date(quiz.quiz_endTime) < now) {
    return { label: "Đã kết thúc", color: "danger" };
  }
  if (quiz.quiz_status === "active") {
    return { label: "Đang mở", color: "success" };
  }
  return { label: "Bản nháp", color: "default" };
}

export function getMsUntilNextTransition(quiz: {
  quiz_startTime?: string;
  quiz_endTime?: string;
}): number {
  const now = Date.now();
  const start = quiz.quiz_startTime ? new Date(quiz.quiz_startTime).getTime() : 0;
  const end = quiz.quiz_endTime ? new Date(quiz.quiz_endTime).getTime() : 0;
  if (start && now < start) return start - now;
  if (end && now < end) return end - now;
  return Infinity;
}