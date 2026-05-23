/**
 * Lightweight equality helpers for React.memo comparators.
 * Replaces JSON.stringify which is O(n) per field and allocates strings.
 */

export const sameIds = <T extends { _id?: string; id?: string }>(
  a: T[] | undefined,
  b: T[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i]._id ?? a[i].id) !== (b[i]._id ?? b[i].id)) return false;
  }
  return true;
};

export const sameReactions = (
  a: { emoji: string; users?: { _id?: string }[] }[] | undefined,
  b: { emoji: string; users?: { _id?: string }[] }[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].emoji !== b[i].emoji) return false;
    if ((a[i].users?.length ?? 0) !== (b[i].users?.length ?? 0)) return false;
  }
  return true;
};

export const sameStringArr = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/** Shallow compare attachment arrays by key fields only (avoids full stringify). */
export const sameAttachments = (
  a: { _id?: string; url?: string; uploadedUrl?: string; kind?: string }[] | undefined,
  b: { _id?: string; url?: string; uploadedUrl?: string; kind?: string }[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]._id !== b[i]._id ||
      a[i].url !== b[i].url ||
      a[i].uploadedUrl !== b[i].uploadedUrl ||
      a[i].kind !== b[i].kind
    ) {
      return false;
    }
  }
  return true;
};
