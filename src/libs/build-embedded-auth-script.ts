import { API_URL, WS_URL } from "@/env.json";
import { getWebAppBaseUrl } from "./web-app-url";

export type EmbeddedAuthPayload = {
  token: string;
  userId: string;
  userName: string;
  userAvatar: string;
  editable: boolean;
  sharedWith: unknown[];
  apiUrl: string;
  wsUrl: string;
  webAppUrl: string;
};

/** Script chạy trước khi trang web load — đồng bộ token cho Next.js */
export function buildEmbeddedAuthScript(payload: EmbeddedAuthPayload): string {
  const json = JSON.stringify(payload);
  return `
(function () {
  var auth = ${json};
  window.__APPCHAT_AUTH__ = auth;
  window.__APPCHAT_EMBEDDED__ = true;
  try {
    if (auth.token) localStorage.setItem('accessToken', auth.token);
  } catch (e) {}
})();
true;
`;
}

export function buildEmbeddedAuthPayload(params: {
  token: string;
  userId: string;
  userName: string;
  userAvatar: string;
  editable: boolean;
  sharedWith: unknown[];
}): EmbeddedAuthPayload {
  const apiBase = API_URL.replace(/\/+$/, "");
  const wsBase = WS_URL.replace(/^ws/i, "http").replace(/\/chat\/?$/i, "");

  return {
    ...params,
    apiUrl: `${apiBase}/api`,
    wsUrl: wsBase,
    webAppUrl: getWebAppBaseUrl(),
  };
}
