import { User } from "../types/user.type";
import { resolveMediaUrl } from "./resolve-media-url";

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
