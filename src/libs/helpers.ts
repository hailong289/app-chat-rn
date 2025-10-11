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