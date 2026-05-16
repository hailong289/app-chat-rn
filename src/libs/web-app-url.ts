import { Platform } from "react-native";
import { WEB_APP_URL } from "@/env.json";

/** Base URL của app-chat-fe (Next.js) dùng cho WebView nhúng */
export function getWebAppBaseUrl(): string {
  let url = WEB_APP_URL || "http://localhost:3000";
  if (Platform.OS === "android" && url.includes("localhost")) {
    url = url.replace(/localhost/g, "10.0.2.2");
  }
  return url.replace(/\/+$/, "");
}

/** Gắn access token — app-chat-fe EmbedTokenLayout đọc `?token=` rồi xóa khỏi URL */
export function withAccessToken(path: string, accessToken: string): string {
  const base = `${getWebAppBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const token = accessToken.trim();
  if (!token) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

/** Danh sách tài liệu: `/docs?token=...` */
export function getDocsListWebUrl(accessToken: string): string {
  return withAccessToken("/docs", accessToken);
}

/** Trình soạn thảo: `/docs/[id]?token=...` */
export function getDocumentEditorWebUrl(
  docId: string,
  accessToken: string,
): string {
  return withAccessToken(
    `/docs/${encodeURIComponent(docId)}`,
    accessToken,
  );
}

/** Flashcard: `/flash-card?token=...` */
export function getFlashCardWebUrl(accessToken: string): string {
  return withAccessToken("/flash-card", accessToken);
}

/** Todo danh sách dự án: `/todo?token=...` */
export function getTodoWebUrl(accessToken: string): string {
  return withAccessToken("/todo", accessToken);
}

/** Todo board theo project: `/todo/[projectId]?token=...` */
export function getTodoProjectWebUrl(
  projectId: string,
  accessToken: string,
): string {
  return withAccessToken(
    `/todo/${encodeURIComponent(projectId)}`,
    accessToken,
  );
}
