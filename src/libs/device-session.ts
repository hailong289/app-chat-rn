export function deriveDeviceFromUA(ua: string | null | undefined): {
  browser?: string;
  os?: string;
  deviceType?: string;
} {
  if (!ua) return {};
  const lower = ua.toLowerCase();

  let browser: string | undefined;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";

  let os: string | undefined;
  if (lower.includes("windows nt 10")) os = "Windows 10/11";
  else if (lower.includes("windows nt")) os = "Windows";
  else if (/mac os x/.test(lower)) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (/iphone|ipad|ipod/.test(lower)) os = "iOS";
  else if (lower.includes("linux")) os = "Linux";

  let deviceType: string | undefined;
  if (/iphone|ipod|android.*mobile/.test(lower)) deviceType = "mobile";
  else if (/ipad|android(?!.*mobile)/.test(lower)) deviceType = "tablet";
  else if (browser) deviceType = "desktop";

  return { browser, os, deviceType };
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
}
