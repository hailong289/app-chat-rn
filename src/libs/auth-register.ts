import type { PayloadRegister } from "../types/auth.type";

/** Chuẩn hóa email trước khi gửi OTP / verify (khớp BE lowercase). */
export function normalizeAuthEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/** Body POST /auth/register — chỉ field được RegisterDto chấp nhận. */
export function buildRegisterRequestBody(
  payload: Omit<PayloadRegister, "success" | "error">,
) {
  return {
    fullname: payload.fullname,
    tempRegisterToken: payload.tempRegisterToken,
    password: payload.password,
    gender: payload.gender,
    dateOfBirth: payload.dateOfBirth,
    fcmToken: payload.fcmToken ?? null,
  };
}

export function isApiErrorBody(data: { statusCode?: number } | undefined): boolean {
  return !!data?.statusCode && data.statusCode >= 400;
}
