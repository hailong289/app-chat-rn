export type RevokeReason = "logout" | "revoked" | "expired" | "security" | string;

export interface DeviceSession {
  clientId: string;
  ip: string | null;
  userAgent: string | null;
  deviceInfo: {
    browser?: string;
    os?: string;
    deviceType?: string;
  } | null;
  location: {
    city?: string;
    country?: string;
  } | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  revokedAt: string | null;
  revokedReason?: RevokeReason | null;
  isCurrent?: boolean;
}
