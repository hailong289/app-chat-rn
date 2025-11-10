import AsyncStorage from "@react-native-async-storage/async-storage";

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
}

export default Helpers;