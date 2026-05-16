import { User } from "../types/user.type";
import { resolveMediaUrl } from "./resolve-media-url";

/**
 * Trích user từ response API:
 * - getMe/login: metadata.user
 * - updateProfile (gRPC): metadata là User phẳng (không bọc .user)
 */
export function extractAuthUserRaw(
  data: unknown,
): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") return undefined;
  const root = data as Record<string, unknown>;
  const metadata = root.metadata;
  if (!metadata || typeof metadata !== "object") return undefined;
  const meta = metadata as Record<string, unknown>;

  if (meta.user && typeof meta.user === "object") {
    return meta.user as Record<string, unknown>;
  }
  if (
    "_id" in meta ||
    "id" in meta ||
    "fullname" in meta ||
    "usr_fullname" in meta
  ) {
    return meta;
  }
  return undefined;
}

export function isValidAuthUserId(user: User | null | undefined): boolean {
  return Boolean(user?.id?.trim() || user?._id?.trim());
}

/** Gộp user mới lên bản hiện tại — tránh mất email/phone khi patch thiếu field */
export function mergeAuthUsers(
  current: User | null,
  patch: User | null,
): User | null {
  if (!patch) return current;
  if (!current) return patch;
  if (!isValidAuthUserId(patch)) return current;

  return {
    ...current,
    ...patch,
    _id: patch._id || current._id,
    id: patch.id || current.id,
    fullname: patch.fullname || current.fullname,
    phone: patch.phone || current.phone,
    email: patch.email ?? current.email,
    avatar: patch.avatar ?? current.avatar,
    gender: patch.gender || current.gender,
    dateOfBirth: patch.dateOfBirth || current.dateOfBirth,
    address: patch.address ?? current.address,
    status: patch.status || current.status,
    createdAt: patch.createdAt || current.createdAt,
    updatedAt: patch.updatedAt || current.updatedAt,
    friendship: patch.friendship ?? current.friendship,
  };
}

export function applyProfilePayloadToUser(
  current: User,
  payload: {
    fullname?: string;
    gender?: User["gender"];
    dateOfBirth?: string;
    address?: string;
    email?: string;
    phone?: string;
  },
): User {
  return {
    ...current,
    fullname: payload.fullname ?? current.fullname,
    gender: payload.gender ?? current.gender,
    dateOfBirth: payload.dateOfBirth ?? current.dateOfBirth,
    address: payload.address ?? current.address,
    email: payload.email ?? current.email,
    phone: payload.phone ?? current.phone,
  };
}

/** Chuẩn hóa user từ /auth/me, login (hỗ trợ cả field có/không prefix usr_) */
export function normalizeAuthUser(raw: Record<string, unknown> | null | undefined): User | null {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id ?? raw.usr_id ?? raw._id ?? "");
  const _id = String(raw._id ?? raw.id ?? "");

  return {
    _id,
    id,
    fullname: String(raw.fullname ?? raw.usr_fullname ?? ""),
    slug: raw.slug as string | undefined,
    email: (raw.email ?? raw.usr_email) as string | undefined,
    phone: String(raw.phone ?? raw.usr_phone ?? ""),
    gender: (raw.gender ?? raw.usr_gender ?? "other") as User["gender"],
    dateOfBirth: String(raw.dateOfBirth ?? raw.usr_dateOfBirth ?? ""),
    avatar: resolveMediaUrl(
      (raw.avatar ?? raw.usr_avatar) as string | undefined,
    ) ?? undefined,
    address: (raw.address ?? raw.usr_address) as string | undefined,
    status: (raw.status ?? raw.usr_status ?? "active") as User["status"],
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
    friendship: raw.friendship as User["friendship"],
  };
}

export function formatDateOfBirthForInput(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function userToProfileForm(user: User) {
  return {
    fullname: user.fullname || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    gender: user.gender || ("other" as const),
    dateOfBirth: formatDateOfBirthForInput(user.dateOfBirth),
  };
}
