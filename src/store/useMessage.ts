import { create } from "zustand";
import { FilePreview, MessageType, RoomData, SendMessageArgs } from "../types/message.type";
import { ObjectId } from "bson";
import Helpers, { normalizeEntityId } from "../libs/helpers";
import MessageService from "../service/message.service";
import db from "../libs/db";
import {
    prepareMessageFromSocket,
    resolveCanonicalRoomId,
    resolveMessageId,
} from "../libs/normalize-socket-message";
import UploadService from "../service/upload.service";
import { Messages } from "../models/messages.model";
import useAuthStore from "./useAuth";
import useRoomStore from "./useRoom";
import { mergeLeanSafe } from "./lib/messageStatus";

// ── Helpers ──────────────────────────────────────────────────────────

const sanitizeMessageForDB = (msg: MessageType): Record<string, any> => {
  const clean = {
    id: msg.id,
    roomId: msg.roomId,
    type: msg.type || "text",
    content: msg.content ? String(msg.content) : "",
    createdAt: msg.createdAt || new Date().toISOString(),
    editedAt: msg.editedAt ?? null,
    deletedAt: msg.deletedAt ?? null,
    pinned: msg.pinned ? 1 : 0,
    sender: JSON.stringify(msg.sender || {}),
    attachments: JSON.stringify((msg.attachments || []).map((a) => ({
      _id: a._id, kind: a.kind, url: a.url, name: a.name,
      size: a.size, mimeType: a.mimeType, thumbUrl: a.thumbUrl,
      width: a.width, height: a.height, duration: a.duration,
      status: a.status, uploadProgress: a.uploadProgress,
      uploadedUrl: a.uploadedUrl,
    }))),
    reactions: JSON.stringify(msg.reactions || []),
    reply: JSON.stringify(msg.reply || {}),
    isMine: msg.isMine ? 1 : 0,
    isRead: msg.isRead ? 1 : 0,
    hiddenBy: JSON.stringify(msg.hiddenBy || []),
    hiddenByMe: msg.hiddenByMe ? 1 : 0,
    hiddenAt: msg.hiddenAt ?? null,
    read_by: JSON.stringify(msg.read_by || []),
    isDeleted: msg.isDeleted ? 1 : 0,
    read_by_count: msg.read_by_count ?? 0,
    status: msg.status || "delivered",
    call_history: JSON.stringify((msg as any).call_history || null),
  };
  return clean;
};

const sanitizeMessageFromAPI = (msg: any): MessageType => {
  const currentUser = useAuthStore.getState().user;
  const hiddenBy: string[] = Array.isArray(msg.hiddenBy) ? msg.hiddenBy : [];
  const rawRoomId = String(msg.roomId ?? msg.room_id ?? "");
  return {
    id: resolveMessageId(msg) || msg.id,
    roomId: resolveCanonicalRoomId(rawRoomId),
    type: msg.type || "text",
    content: msg.content || "",
    createdAt: msg.createdAt,
    editedAt: msg.editedAt ?? null,
    deletedAt: msg.deletedAt ?? null,
    pinned: !!msg.pinned,
    sender: msg.sender || { _id: "", fullname: "Unknown", avatar: "" },
    attachments: (msg.attachments || []).map((a: any) => ({
      _id: a._id, kind: a.kind, url: a.url, name: a.name,
      size: a.size, mimeType: a.mimeType, thumbUrl: a.thumbUrl,
      width: a.width, height: a.height, duration: a.duration,
      status: a.status, uploadProgress: a.uploadProgress,
      uploadedUrl: a.uploadedUrl,
    })),
    reactions: msg.reactions || [],
    reply: msg.reply
      ? {
          ...msg.reply,
          sender: {
            _id: msg.reply.sender?._id || '',
            name: msg.reply.sender?.name || '',
            fullname: msg.reply.sender?.fullname || msg.reply.sender?.name || '',
          },
        }
      : undefined,
    isMine: msg.sender?._id === currentUser?._id || msg.sender?.id === currentUser?._id,
    isRead: true,
    hiddenBy,
    hiddenByMe: hiddenBy.includes(currentUser?._id || ""),
    hiddenAt: msg.hiddenAt ?? null,
    read_by: msg.read_by || [],
    isDeleted: !!msg.isDeleted,
    read_by_count: msg.read_by_count ?? 0,
    status: (msg.status || "delivered") as MessageType["status"],
    room_event: msg.room_event ?? null,
    call_history: msg.call_history ?? null,
    placeholder: msg.placeholder,
    summary: msg.summary ?? null,
    translation: msg.translation ?? null,
    quiz: msg.quiz,
    desk: msg.desk,
    documentId: msg.documentId,
    todoProjectId: msg.todoProjectId,
    todoProject: msg.todoProject,
  };
};

// ── Store ────────────────────────────────────────────────────────────

const parseMessageFromDB = (row: Record<string, unknown>): MessageType => {
  const parseJson = <T,>(v: unknown, fallback: T): T => {
    if (v == null) return fallback;
    if (typeof v === "string") {
      try {
        return JSON.parse(v) as T;
      } catch {
        return fallback;
      }
    }
    return v as T;
  };
  return sanitizeMessageFromAPI({
    ...row,
    sender: parseJson(row.sender, { _id: "", fullname: "Unknown", avatar: "" }),
    attachments: parseJson(row.attachments, []),
    reactions: parseJson(row.reactions, []),
    reply: parseJson(row.reply, undefined),
    hiddenBy: parseJson(row.hiddenBy, []),
    read_by: parseJson(row.read_by, []),
    pinned: !!row.pinned,
    isMine: !!row.isMine,
    isDeleted: !!row.isDeleted,
    hiddenByMe: !!row.hiddenByMe,
  });
};

interface MessageState {
    messagesRoom: Record<string, RoomData>;
    readedRooms: Record<string, string>;
    isLoading: boolean;
    // Core
    sendMessage: (payload: SendMessageArgs) => void;
    resendMessage: (roomId: string, messageId: string, socket?: any) => Promise<void>;
    loadRoomFromCache: (
      roomId: string,
      limit?: number,
    ) => Promise<{ cached: MessageType[]; fetched: Promise<void> }>;
    getMessages: (roomId: string, pivotMessageId?: string, direction?: "new" | "old") => Promise<boolean>;
    fetchNewMessages: (roomId: string, lastMessageId?: string) => Promise<void>;
    loadOlderMessages: (roomId: string, limit?: number) => Promise<MessageType[]>;
    findMessage: (roomId: string, messageId: string) => Promise<boolean>;
    // Upsert / Delete / Recall
    upsertMessage: (msg: MessageType | Record<string, unknown>) => Promise<void>;
    /** Alias matching app-chat-fe `upsetMsg` — handles socket `message:upsert`. */
    upsetMsg: (msg: MessageType | Record<string, unknown>) => Promise<void>;
    deleteMessage: (roomId: string, messageId: string) => Promise<void>;
    recallMessage: (roomId: string, messageId: string) => Promise<void>;
    // Attachments
    sendMessageWithAttachments: (roomId: string, messageId: string, attachments: FilePreview[], socket: any, data: MessageType) => Promise<void>;
    updateAttachmentProgress: (roomId: string, messageId: string, fileId: string, progress: number, status?: string) => void;
    autoMarkMessageSent: (roomId: string, messageId: string, delayMs?: number) => void;
    // Reactions
    addReaction: (roomId: string, messageId: string, emoji: string, userId: string) => void;
    removeReaction: (roomId: string, messageId: string, emoji: string, userId: string) => void;
    // Draft state
    setReplyMessage: (roomId: string, message: MessageType | null) => void;
    setInput: (roomId: string, input: string | null) => void;
    setAttachments: (roomId: string, attachments: FilePreview[] | null) => void;
    // Pin
    togglePin: (roomId: string, messageId: string, pinned: boolean) => void;
    // Error handling
    upsetMsgError: (payload: { message: string; error: string; data: { roomId: string; id?: string; content: string } }) => void;
    // Call
    patchCallMessage: (
      roomId: string,
      callId: string,
      patch: { members?: any[]; ended_at?: string | null },
    ) => void;
    // Quiz
    updateQuizInMessages: (roomId: string, quizId: string, updatedQuiz: any) => void;
    /** Sync room's ghim array when a message pin state changes via socket */
    upsertPinnedMessage: (roomId: string, msg: { id: string; content: string; pinned: boolean }) => void;
}

const useMessageStore = create<MessageState>()(
    (set, get) => ({
        messagesRoom: {},
        readedRooms: {},
        isLoading: false,

        // ── Send Message ──────────────────────────────────────────
        sendMessage: async (payload) => {
            const { roomId, type, content, replyTo, socket, attachments, userId, userFullname, userAvatar, quiz } = payload;
            const prevRoom = get().messagesRoom[roomId] || { messages: [], input: null, attachments: null, ghim: [], updatedAt: null };
            const prevMessages = prevRoom.messages || [];

            const id = new ObjectId().toHexString();
            const foundReply = prevMessages.find((m) => m.id === replyTo);
            const reply = foundReply
                ? { _id: foundReply.id, type: foundReply.type, content: foundReply.content, createdAt: foundReply.createdAt, sender: { _id: foundReply.sender._id, name: foundReply.sender.fullname || "Unknown", fullname: foundReply.sender.fullname || "Unknown" }, isMine: foundReply.isMine, hiddenByMe: foundReply.hiddenByMe || false, isDeleted: foundReply.isDeleted || false }
                : undefined;

            const data: MessageType = {
                id, roomId, content, attachments: attachments || [], reply,
                type: type || "text", createdAt: new Date().toISOString(), pinned: false,
                sender: { _id: userId || "", id: userId || "", fullname: userFullname || "Unknown", avatar: userAvatar || "" },
                isMine: true, isRead: true,
                status: attachments && attachments.length > 0 ? "uploading" : "pending",
                hiddenBy: [], hiddenByMe: false, hiddenAt: null, isDeleted: false, read_by: [], read_by_count: 0,
                quiz: quiz as any,
            };

            set({
                messagesRoom: {
                    ...get().messagesRoom,
                    [roomId]: { ...prevRoom, messages: [...prevMessages, data], updatedAt: new Date().toISOString() },
                },
            });

            // Optimistic room update
            Promise.resolve().then(() => {
                try {
                    const roomStore = useRoomStore.getState();
                    const targetRoom = roomStore.rooms.find((r) => r.id === roomId || r.roomId === roomId);
                    if (targetRoom) {
                        let snippet = content || "";
                        if (type === "quiz") {
                            snippet = `[Quiz] ${quiz?.quiz_title || content}`;
                        } else if (attachments && attachments.length > 0) {
                            const first = attachments[0];
                            snippet = first.mimeType?.startsWith("image") || first.kind === "image" ? "[Hình ảnh]" : "[Tệp]";
                        }
                        roomStore.updateRoomLastMessage(roomId, {
                            id, content: snippet, createdAt: data.createdAt,
                            sender: { id: userId, name: userFullname || "", avatar: userAvatar || "" },
                            isMine: true,
                        });
                    }
                } catch (_) { /* no-op */ }
            });

            if (attachments && attachments.length > 0) {
                await get().sendMessageWithAttachments(roomId, id, attachments, socket, data);
                return;
            }

            socket?.emit("message:send", { roomId, type, content, replyTo, id, quizId: quiz?._id || quiz?.id });
            get().autoMarkMessageSent(roomId, id, 3000);
        },

        // ── Resend Message ───────────────────────────────────────
        resendMessage: async (roomId, messageId, socket) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;
            const message = currentRoom.messages.find((m) => m.id === messageId);
            if (!message) return;

            const updatedMessages = currentRoom.messages.map((m) =>
                m.id === messageId ? { ...m, status: "pending" as const } : m
            );
            set({
                messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: updatedMessages } },
            });

            if (!message.attachments || message.attachments.length === 0) {
                socket?.emit("message:send", { roomId, type: message.type, content: message.content, replyTo: message.reply?._id, id: messageId });
                get().autoMarkMessageSent(roomId, messageId, 3000);
                return;
            }

            try {
                const uploadResult = await UploadService.uploadMultipleParallel(
                    message.attachments.filter((a) => a.status === "failed").map((a) => a.file!).filter(Boolean),
                    { roomId, id: message.attachments.filter((a) => a.status === "failed").map((a) => a._id), onEachProgress: () => {} },
                );
                socket?.emit("message:send", { roomId, type: message.type, content: message.content, replyTo: message.reply?._id, id: messageId, attachments: uploadResult.map((r: any) => r._id) });
                get().autoMarkMessageSent(roomId, messageId, 3000);
            } catch {
                const currentRoom = get().messagesRoom[roomId];
                if (!currentRoom?.messages) return;
                const msgs = currentRoom.messages.map((m) => m.id === messageId ? { ...m, status: "failed" as const } : m);
                set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
            }
        },

        // ── Auto Mark Sent ─────────────────────────────────────────
        autoMarkMessageSent: (roomId, messageId, delayMs = 3000) => {
            setTimeout(() => {
                const currentRoom = get().messagesRoom[roomId];
                if (!currentRoom?.messages) return;
                const message = currentRoom.messages.find((m) => m.id === messageId);
                if (message && message.status === "pending") {
                    const msgs = currentRoom.messages.map((m) =>
                        m.id === messageId ? { ...m, status: "sent" as const } : m
                    );
                    set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
                }
            }, delayMs);
        },

        // ── Send with Attachments ──────────────────────────────────
        sendMessageWithAttachments: async (roomId, messageId, attachments, socket, data) => {
            const filesToUpload = attachments.filter((att) => att.file);
            const fileIds = filesToUpload.map((att) => att._id);
            const files = filesToUpload.map((att) => att.file!);

            filesToUpload.forEach((file) => {
                get().updateAttachmentProgress(roomId, messageId, file._id, 0, "uploading");
            });

            try {
                const uploadedResults = await UploadService.uploadMultipleParallel(files, {
                    roomId, id: fileIds,
                    onEachProgress: (index, progress) => {
                        get().updateAttachmentProgress(roomId, messageId, filesToUpload[index]._id, progress, "uploading");
                    },
                });

                const updatedAttachments = attachments.map((att) => {
                    const uploadIndex = filesToUpload.findIndex((f) => f._id === att._id);
                    if (uploadIndex === -1) return att;
                    const result = uploadedResults[uploadIndex];
                    return { ...att, _id: result._id, uploadedUrl: result.url, url: result.url, kind: result.kind || att.kind, name: result.name || att.name, size: result.size || att.size, mimeType: result.mimeType || att.mimeType, status: "uploaded", uploadProgress: 100, file: undefined } as FilePreview;
                });

                const currentRoom = get().messagesRoom[roomId];
                if (currentRoom?.messages) {
                    const msgs = currentRoom.messages.map((m) => m.id === messageId ? { ...m, attachments: updatedAttachments } : m);
                    set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
                }

                socket?.emit("message:send", { roomId, type: data.type, content: data.content, replyTo: data.reply?._id, id: messageId, attachments: updatedAttachments.filter((a) => a.status === "uploaded").map((a) => a._id) });
                get().autoMarkMessageSent(roomId, messageId, 3000);
            } catch {
                for (const att of filesToUpload) {
                    get().updateAttachmentProgress(roomId, messageId, att._id, 0, "failed");
                }
            }
        },

        // ── Update Attachment Progress ─────────────────────────────
        updateAttachmentProgress: (roomId, messageId, fileId, progress, status) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;
            const msgs = currentRoom.messages.map((msg) => {
                if (msg.id !== messageId) return msg;
                const updatedAttachments = (msg.attachments || []).map((att) =>
                    att._id === fileId ? { ...att, uploadProgress: progress, ...(status && { status }) } : att
                );
                return { ...msg, attachments: updatedAttachments };
            });
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
        },

        // ── Load room: API-first, fallback to SQLite cache on error ──
        loadRoomFromCache: async (roomId, limit = 10) => {
            const chatId = resolveCanonicalRoomId(roomId);
            if (!chatId) return { cached: [], fetched: Promise.resolve() };

            const setMessages = (msgs: MessageType[]) => {
                const currentRoom = get().messagesRoom[chatId] || {
                    messages: [], input: null, attachments: null, ghim: [], updatedAt: null,
                };
                const existing = currentRoom.messages || [];
                const apiIds = new Set(msgs.map((m) => m.id));
                const socketOnly = existing.filter((m) => !apiIds.has(m.id));
                const merged = [...msgs, ...socketOnly].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                );
                set({
                    messagesRoom: {
                        ...get().messagesRoom,
                        [chatId]: { ...currentRoom, messages: merged, updatedAt: new Date().toISOString() },
                    },
                });
                return merged;
            };

            // 1. Try API first
            const fetched = (async () => {
                try {
                    const response = await MessageService.getMessages({
                        roomId: chatId,
                        queryParams: { limit, type: "new" },
                    });
                    const fresh = (response.data.metadata || []).map(
                        (msg: unknown) => sanitizeMessageFromAPI({ ...(msg as object), roomId: chatId }),
                    );

                    // Persist to SQLite
                    for (const msg of fresh) {
                        await Messages.getInstance().getQuery().upsert(sanitizeMessageForDB(msg as MessageType));
                    }
                    setMessages(fresh);
                } catch {
                    try {
                        const rows = (await Messages.getInstance()
                            .getQuery()
                            .where("roomId", "=", chatId)
                            .orderBy("createdAt", "DESC")
                            .limit(limit)
                            .get()) ?? [];
                        const cached = (rows as Record<string, unknown>[]).map(parseMessageFromDB).reverse();
                        if (cached.length > 0) setMessages(cached);
                    } catch {
                        // ignore
                    }
                }
            })();

            return { cached: [], fetched };
        },

        // ── Get Messages ──────────────────────────────────────────
        getMessages: async (roomId, pivotMessageId?, direction = "new") => {
            const chatId = resolveCanonicalRoomId(roomId);
            try {
                const queryParams: Record<string, string | number> = {
                    limit: 50,
                    type: direction,
                };
                if (pivotMessageId) queryParams.msgId = pivotMessageId;

                const response = await MessageService.getMessages({
                    roomId: chatId,
                    queryParams,
                });

                if (!response.data.metadata || response.data.metadata.length === 0) {
                    return false;
                }

                const newMessages = response.data.metadata.map((msg: any) =>
                    sanitizeMessageFromAPI({ ...msg, roomId: chatId }),
                );

                for (const msg of newMessages) {
                    await Messages.getInstance().getQuery().upsert(sanitizeMessageForDB(msg as any));
                }

                const freshRoom = get().messagesRoom[chatId] || {
                    messages: [],
                    input: null,
                    attachments: null,
                    ghim: [],
                    updatedAt: null,
                };
                const freshMessages = freshRoom.messages || [];

                if (direction === "new") {
                    const apiIds = new Set(newMessages.map((m: MessageType) => m.id));
                    const socketOnly = freshMessages.filter((m) => !apiIds.has(m.id));
                    const merged = [...newMessages, ...socketOnly].sort(
                        (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime(),
                    );
                    const kept = merged.slice(-50);
                    const lastNewMessageId = kept[kept.length - 1]?.id;
                    set({
                        readedRooms: {
                            ...get().readedRooms,
                            [chatId]: lastNewMessageId,
                        },
                        messagesRoom: {
                            ...get().messagesRoom,
                            [chatId]: {
                                ...freshRoom,
                                messages: kept,
                                updatedAt: new Date().toISOString(),
                            },
                        },
                    });
                } else {
                    const uniqueNew = newMessages.filter(
                        (nm) => !freshMessages.some((m) => m.id === nm.id),
                    );
                    if (uniqueNew.length > 0) {
                        const merged = [...uniqueNew, ...freshMessages].sort(
                            (a, b) =>
                                new Date(a.createdAt).getTime() -
                                new Date(b.createdAt).getTime(),
                        );
                        set({
                            messagesRoom: {
                                ...get().messagesRoom,
                                [chatId]: {
                                    ...freshRoom,
                                    messages: merged,
                                    updatedAt: new Date().toISOString(),
                                },
                            },
                        });
                        return true;
                    }
                }
                return true;
            } catch {
                return false;
            }
        },

        // ── Fetch New Messages (delta) ────────────────────────────
        fetchNewMessages: async (roomId, lastMessageId?) => {
            try {
                if (!roomId) return;
                const response = await MessageService.getMessages({ roomId, queryParams: { msgId: lastMessageId, limit: 50, type: "new" } });

                const newMessages = (response.data.metadata || []).map((msg: any) => sanitizeMessageFromAPI({ ...msg, roomId }));
                if (newMessages.length === 0) return;

                for (const msg of newMessages) {
                    await Messages.getInstance().getQuery().upsert(sanitizeMessageForDB(msg as any));
                }

                const currentRoom = get().messagesRoom[roomId] || { messages: [], input: null, attachments: null, ghim: [], updatedAt: null };
                const currentMessages = currentRoom.messages || [];
                const uniqueNew = newMessages.filter((nm) => !currentMessages.some((m) => m.id === nm.id));

                if (uniqueNew.length > 0) {
                    const merged = [...currentMessages, ...uniqueNew].sort((a, b) => a.id.localeCompare(b.id));
                    set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: merged, updatedAt: new Date().toISOString() } } });
                }
            } catch (_) { /* no-op */ }
        },

        // ── Load Older Messages ────────────────────────────────────
        loadOlderMessages: async (roomId, limit = 50) => {
            const currentRoom = get().messagesRoom[roomId];
            const msgs = currentRoom?.messages || [];
            if (msgs.length === 0) return [];
            const oldestId = msgs[0]?.id;
            if (!oldestId) return [];

            try {
                const response = await MessageService.getMessages({ roomId, queryParams: { msgId: oldestId, limit, type: "old" } });
                const olderMessages = (response.data.metadata || []).map((msg: any) => sanitizeMessageFromAPI({ ...msg, roomId }));
                if (olderMessages.length === 0) return [];

                const freshRoom = get().messagesRoom[roomId];
                const freshMessages = freshRoom?.messages || [];
                const uniqueOlder = olderMessages.filter((om) => !freshMessages.some((m) => m.id === om.id));
                if (uniqueOlder.length === 0) return [];

                for (const msg of uniqueOlder) {
                    await Messages.getInstance().getQuery().upsert(sanitizeMessageForDB(msg as any));
                }

                const updated = [...uniqueOlder, ...freshMessages];
                set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...(freshRoom || { input: null, attachments: null, ghim: [], updatedAt: null }), messages: updated } } });
                return uniqueOlder;
            } catch {
                return [];
            }
        },

        // ── Find Message ──────────────────────────────────────────
        findMessage: async (roomId, messageId) => {
            if (!messageId || messageId === "null" || messageId === "undefined") return false;
            try {
                const response = await MessageService.getMessages({ roomId, queryParams: { msgId: messageId, limit: 50, type: "around" } });
                const messages = (response.data.metadata || []).map((msg: any) => sanitizeMessageFromAPI({ ...msg, roomId }));
                if (messages.length > 0) {
                    for (const msg of messages) {
                        await Messages.getInstance().getQuery().upsert(sanitizeMessageForDB(msg as any));
                    }
                    await get().getMessages(roomId);
                    return messages.some((m) => m.id === messageId);
                }
                return false;
            } catch {
                return false;
            }
        },

        // ── Upsert Message (from socket) ───────────────────────────
        upsertMessage: async (msgInput) => {
            const prepared = prepareMessageFromSocket(
                msgInput as Record<string, unknown>,
            );
            if (!prepared) return;

            const msg = { ...prepared } as MessageType;
            const sanitized = sanitizeMessageFromAPI(msg);

            // Persist to DB
            Messages.getInstance().getQuery().upsert(sanitizeMessageForDB(sanitized as any))
                .catch((e: any) => console.warn("upsertMessage DB persist failed:", e));

            const prevRoom = get().messagesRoom[sanitized.roomId] || { messages: [], input: null, attachments: null, ghim: [], updatedAt: null };
            const prevMessages = prevRoom.messages || [];
            const existingIndex = prevMessages.findIndex((m) => m.id === sanitized.id);

            let updatedMessages: MessageType[];
            if (existingIndex === -1) {
                updatedMessages = [...prevMessages, { ...sanitized, status: sanitized.status ?? "sent" } as MessageType];
            } else {
                updatedMessages = prevMessages.map((m, idx) => idx === existingIndex ? (mergeLeanSafe(m, sanitized) as MessageType) : m);
            }

            set({
                messagesRoom: {
                    ...get().messagesRoom,
                    [sanitized.roomId]: { ...prevRoom, messages: updatedMessages, ...(sanitized.isRead && { last_message_id: sanitized.id }) },
                },
            });

            // Update room last_message + unread count
            Promise.resolve().then(() => {
                try {
                    const roomStore = useRoomStore.getState();
                    const targetRoom = roomStore.rooms.find((r) => r.id === sanitized.roomId || r.roomId === sanitized.roomId);
                    if (targetRoom) {
                        let snippet = sanitized.content || "";
                        if (sanitized.type === "image") snippet = "[Hình ảnh]";
                        else if (sanitized.attachments?.length) {
                            const first = sanitized.attachments[0];
                            snippet = first.mimeType?.startsWith("image") || first.kind === "image" ? "[Hình ảnh]" : "[Tệp]";
                        }
                        const isActiveRoom = roomStore.room?.id === sanitized.roomId;
                        let newUnread = targetRoom.unread_count;
                        if (!sanitized.isMine && !isActiveRoom && existingIndex === -1) {
                            newUnread = (targetRoom.unread_count || 0) + 1;
                        }
                        if (isActiveRoom) newUnread = 0;
                        roomStore.updateRoomLastMessage(sanitized.roomId, {
                            id: sanitized.id, content: snippet, createdAt: sanitized.createdAt,
                            sender: { id: sanitized.sender._id, name: sanitized.sender.fullname || "", avatar: sanitized.sender.avatar || "" },
                            isMine: sanitized.isMine,
                        });
                    }
                } catch (_) { /* no-op */ }
            });
        },

        upsetMsg: async (msgInput) => get().upsertMessage(msgInput),

        // ── Delete Message ─────────────────────────────────────────
        deleteMessage: async (roomId, messageId) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;
            const msgs = currentRoom.messages.filter((m) => m.id !== messageId);
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
            try { await db.setTable("messages").where("id", "=", messageId).delete(); } catch (_) { /* no-op */ }
        },

        // ── Recall Message ────────────────────────────────────────
        recallMessage: async (roomId, messageId) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;
            const msgs = currentRoom.messages.map((m) =>
                m.id === messageId ? { ...m, isDeleted: true, content: "", status: "recalled" as const } : m
            );
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
            try {
                await db.setTable("messages").where("id", "=", messageId).update({ isDeleted: 1, content: "", status: "recalled" } as any);
            } catch (_) { /* no-op */ }
        },

        // ── Toggle Pin ────────────────────────────────────────────
        togglePin: (roomId, messageId, pinned) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;
            const msgs = currentRoom.messages.map((m) => m.id === messageId ? { ...m, pinned } : m);
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
        },

        // ── Upsert Pinned Message (ghim sync) ─────────────────────
        upsertPinnedMessage: (roomId, msg) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom) return;
            const ghim = currentRoom.ghim || [];
            const exists = ghim.some((id) => id === msg.id);
            let updatedGhim: string[];
            if (msg.pinned && !exists) {
                updatedGhim = [...ghim, msg.id];
            } else if (!msg.pinned && exists) {
                updatedGhim = ghim.filter((id) => id !== msg.id);
            } else {
                return;
            }
            set({
                messagesRoom: {
                    ...get().messagesRoom,
                    [roomId]: { ...currentRoom, ghim: updatedGhim },
                },
            });
        },

        // ── Upsert Message Error ──────────────────────────────────
        upsetMsgError: (payload) => {
            const { roomId, id, content } = payload.data || {};
            if (!roomId || !id) return;
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;
            const msgs = currentRoom.messages.map((m) =>
                m.id === id ? { ...m, status: "failed" as const } : m
            );
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, messages: msgs } } });
        },

        // ── Reactions ──────────────────────────────────────────────
        addReaction: (roomId, messageId, emoji, userId) => {
            const room = get().messagesRoom[roomId];
            if (!room?.messages) return;
            const msgs = room.messages.map((msg) => {
                if (msg.id !== messageId) return msg;
                const reactions = [...(msg.reactions || [])];
                const existingIdx = reactions.findIndex((r) => r.emoji === emoji);
                if (existingIdx >= 0) {
                    reactions[existingIdx] = { ...reactions[existingIdx], users: [...(reactions[existingIdx].users || []), { _id: userId, usr_id: userId, usr_fullname: "", usr_avatar: "" }], count: (reactions[existingIdx].count || 0) + 1 };
                } else {
                    reactions.push({ emoji, count: 1, users: [{ _id: userId, usr_id: userId, usr_fullname: "", usr_avatar: "" }] });
                }
                return { ...msg, reactions };
            });
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...room, messages: msgs } } });
        },

        removeReaction: (roomId, messageId, emoji, userId) => {
            const room = get().messagesRoom[roomId];
            if (!room?.messages) return;
            const msgs = room.messages.map((msg) => {
                if (msg.id !== messageId) return msg;
                const reactions = (msg.reactions || [])
                    .map((r) => {
                        if (r.emoji !== emoji) return r;
                        const users = (r.users || []).filter((u: any) => u._id !== userId && u.usr_id !== userId);
                        return users.length > 0 ? { ...r, users, count: users.length } : null;
                    })
                    .filter(Boolean);
                return { ...msg, reactions };
            });
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...room, messages: msgs } } });
        },

        // ── Draft State ────────────────────────────────────────────
        setReplyMessage: (roomId, message) => {
            const currentRoom = get().messagesRoom[roomId] || { messages: [], input: null, attachments: null, ghim: [], updatedAt: null };
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, reply: message as any } } });
        },

        setInput: (roomId, input) => {
            const currentRoom = get().messagesRoom[roomId] || { messages: [], input: null, attachments: null, ghim: [], updatedAt: null };
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, input } } });
        },

        setAttachments: (roomId, attachments) => {
            const currentRoom = get().messagesRoom[roomId] || { messages: [], input: null, attachments: null, ghim: [], updatedAt: null };
            set({ messagesRoom: { ...get().messagesRoom, [roomId]: { ...currentRoom, attachments } } });
        },

        // ── Patch Call Message ────────────────────────────────────────
        patchCallMessage: (roomId, callId, patch) => {
            const currentRoom = get().messagesRoom[roomId];
            if (!currentRoom) return;

            const msgs = currentRoom.messages;
            const idx = msgs.findIndex(
                (m) => m.type === 'call' && (m as any).call_history?.call_id === callId,
            );
            if (idx === -1) return;

            const updatedMessages = msgs.map((msg, i) =>
                i === idx
                    ? {
                          ...msg,
                          call_history: {
                              ...((msg as any).call_history ?? {}),
                              ...(patch.members ? { members: patch.members } : {}),
                              ...(patch.ended_at !== undefined ? { ended_at: patch.ended_at } : {}),
                          },
                      }
                    : msg,
            );

            set({
                messagesRoom: {
                    ...get().messagesRoom,
                    [roomId]: { ...currentRoom, messages: updatedMessages },
                },
            });
        },

        // ── Update Quiz in Messages ─────────────────────────────────
        updateQuizInMessages: (roomId, quizId, updatedQuiz) => {
            const canonicalRoomId = resolveCanonicalRoomId(roomId);
            const currentRoom =
                get().messagesRoom[canonicalRoomId] ?? get().messagesRoom[roomId];
            if (!currentRoom?.messages) return;

            const targetIds = new Set(
                [quizId, updatedQuiz?._id, updatedQuiz?.id, updatedQuiz?.quiz_id]
                    .filter(Boolean)
                    .map(String),
            );

            let changed = false;
            const msgs = currentRoom.messages.map((msg) => {
                if (msg.type !== 'quiz') return msg;
                const msgQuiz = (msg as any).quiz;
                if (!msgQuiz) return msg;
                const ids = [msgQuiz._id, msgQuiz.id, msgQuiz.quiz_id].filter(Boolean).map(String);
                if (!ids.some((id) => targetIds.has(id))) return msg;

                changed = true;
                const mergedQuiz = { ...msgQuiz, ...updatedQuiz };
                if (Array.isArray(mergedQuiz.quiz_results)) {
                    mergedQuiz.quiz_results = mergedQuiz.quiz_results.map((r: any) => ({
                        ...r,
                        user_id: normalizeEntityId(r.user_id),
                    }));
                }
                return { ...msg, quiz: mergedQuiz };
            });

            if (!changed) return;

            set({
                messagesRoom: {
                    ...get().messagesRoom,
                    [canonicalRoomId]: { ...currentRoom, messages: msgs },
                },
            });
        },
    })
);

export default useMessageStore;