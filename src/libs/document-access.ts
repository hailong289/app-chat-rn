import type { Document } from "../types/document.type";

type UserLike = {
  _id?: string;
  id?: string;
  usr_id?: string;
} | null | undefined;

export function getCurrentUserIds(user: UserLike): string[] {
  if (!user) return [];
  const ids = [user._id, user.id, user.usr_id].filter(Boolean) as string[];
  return [...new Set(ids)];
}

export function isDocumentOwner(document: Document, user: UserLike): boolean {
  const ownerId = document.ownerId?.toString();
  if (!ownerId) return false;
  return getCurrentUserIds(user).some((id) => id === ownerId);
}

export function getDocumentPermission(document: Document, user: UserLike) {
  const ids = getCurrentUserIds(user);
  return document.sharedWith?.find((entry) =>
    ids.some((id) => id === entry.userId?.toString()),
  );
}

export function canAccessDocument(document: Document, user: UserLike): boolean {
  if (isDocumentOwner(document, user)) return true;
  if (getDocumentPermission(document, user)) return true;
  if (document.visibility === "public") return true;
  return false;
}

export function canEditDocument(document: Document, user: UserLike): boolean {
  if (isDocumentOwner(document, user)) return true;
  return getDocumentPermission(document, user)?.role === "editor";
}
