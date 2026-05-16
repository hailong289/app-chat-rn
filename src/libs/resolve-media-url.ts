import { Platform } from "react-native";
import { API_URL, API_URL_PRODUCTION, APP_ENV } from "@/env.json";

function getApiOrigin(): string {
  let base = (APP_ENV === "production" ? API_URL_PRODUCTION : API_URL).replace(
    /\/api\/?$/,
    "",
  );
  base = base.replace(/\/+$/, "");
  if (Platform.OS === "android" && base.includes("localhost")) {
    base = base.replace(/localhost/g, "10.0.2.2");
  }
  return base;
}

/** URL ảnh tuyệt đối cho Image (avatar, file B2, path tương đối) */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url || !String(url).trim()) return null;
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = getApiOrigin();
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** Chiều cao tab bar (khớp MainNavigator tabBarStyle.height) */
export const MAIN_TAB_BAR_HEIGHT = 90;
