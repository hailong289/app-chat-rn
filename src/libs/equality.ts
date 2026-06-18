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

/** Shallow compare attachment arrays — includes upload progress & status. */
export const sameAttachments = (
  a: { _id?: string; url?: string; uploadedUrl?: string; thumbUrl?: string; kind?: string; status?: string; uploadProgress?: number }[] | undefined,
  b: { _id?: string; url?: string; uploadedUrl?: string; thumbUrl?: string; kind?: string; status?: string; uploadProgress?: number }[] | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]._id !== b[i]._id ||
      a[i].url !== b[i].url ||
      a[i].uploadedUrl !== b[i].uploadedUrl ||
      a[i].thumbUrl !== b[i].thumbUrl ||
      a[i].kind !== b[i].kind ||
      a[i].status !== b[i].status ||
      a[i].uploadProgress !== b[i].uploadProgress
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Compare the reactive content fields of two MessageType objects.
 * Used by both MessageBubble and MessageItem comparators.
 */
export const sameMessageFields = (
  a: {
    content?: string | null;
    status?: string;
    isDeleted?: boolean;
    pinned?: boolean;
    editedAt?: string | null;
    read_by_count?: number;
    hiddenBy?: string[];
    reactions?: { emoji: string; users?: { _id?: string }[] }[];
    read_by?: unknown[];
    attachments?: { _id?: string; url?: string; uploadedUrl?: string; thumbUrl?: string; kind?: string; status?: string; uploadProgress?: number }[];
    reply?: { _id?: string } | null;
    translation?: { text?: string; to?: string } | null;
    summary?: { text?: string } | null;
    call_history?: {
      call_id?: string | null;
      ended_at?: string | null;
      members?: unknown[];
      call_type?: string | null;
    } | null;
  },
  b: typeof a,
): boolean => {
  return (
    a.content === b.content &&
    a.status === b.status &&
    a.isDeleted === b.isDeleted &&
    a.pinned === b.pinned &&
    a.editedAt === b.editedAt &&
    a.read_by_count === b.read_by_count &&
    (a.reply?._id ?? null) === (b.reply?._id ?? null) &&
    (a.translation?.text ?? null) === (b.translation?.text ?? null) &&
    (a.translation?.to ?? null) === (b.translation?.to ?? null) &&
    (a.summary?.text ?? null) === (b.summary?.text ?? null) &&
    (a.call_history?.call_id ?? null) === (b.call_history?.call_id ?? null) &&
    (a.call_history != null) === (b.call_history != null) &&
    (a.call_history?.ended_at ?? null) === (b.call_history?.ended_at ?? null) &&
    (a.call_history?.call_type ?? null) === (b.call_history?.call_type ?? null) &&
    (a.call_history?.members?.length ?? 0) === (b.call_history?.members?.length ?? 0) &&
    sameStringArr(a.hiddenBy as string[], b.hiddenBy as string[]) &&
    sameReactions(a.reactions, b.reactions) &&
    (a.read_by?.length ?? 0) === (b.read_by?.length ?? 0) &&
    sameAttachments(a.attachments, b.attachments)
  );
};
