import { create } from "zustand";
import { FilePreview, MessageType, RoomData, SendMessageArgs } from "../types/message.type";
import { ObjectId } from "bson";
import Helpers from "../libs/helpers";
import MessageService from "../service/message.service";
import db from "../libs/db";
import UploadService from "../service/upload.service";

interface MessageState {
    messagesRoom: Record<string, RoomData>; // roomId -> room data;
    readedRooms: Record<string, string>; // roomId -> lastMessageId;
    isLoading: boolean;
    sendMessage: (payload: SendMessageArgs) => void;
    getMessages: (roomId: string, pivotMessageId?: string, direction?: "new" | "old") => Promise<boolean>;
    upsertMessage: (msg: MessageType) => Promise<void>;
    sendMessageWithAttachments: (roomId: string, messageId: string, attachments: FilePreview[], socket: any, data: MessageType) => Promise<void>;
    updateAttachmentProgress: (roomId: string, messageId: string, fileId: string, progress: number, status?: string) => void;
}

const useMessageStore = create<MessageState>()(
    (set, get) => ({
        messagesRoom: {},
        readedRooms: {},
        isLoading: false,
        sendMessage: async (payload) => {
            set({ isLoading: true });
            const { roomId, type, content, replyTo, socket, attachments, userId, userFullname, userAvatar } = payload;
            // Lưu dữ liệu tạm trước khi gửi
            const prevRoom = get().messagesRoom[roomId] || {};

            const id = new ObjectId().toHexString();
            const data: MessageType = {
                id,
                roomId: roomId,
                content: content,
                attachments: attachments || [],
                reply: undefined,
                type: type || "text",
                createdAt: new Date().toISOString(),
                pinned: false,
                sender: {
                  _id: userId || "",
                  id: userId || "",
                  fullname: userFullname || "Unknown",
                  avatar: userAvatar || "",
                },
                isMine: true,
                isRead: true,
                status: attachments && attachments.length > 0 ? "uploading" : "pending",
             };

             // Thêm dữ liệu tạm vào messages để hiển thị ngay
            set({
                messagesRoom: {
                    ...get().messagesRoom,
                    [roomId]: {
                      ...prevRoom,
                      input: content,
                      attachments: attachments, // Lưu trực tiếp File[]
                      ghim: prevRoom.ghim || [],
                      updatedAt: new Date().toISOString(),
                      messages: [...(prevRoom.messages || []), data],
                  },
                },
            });

            // Nếu có attachments, upload và gửi message
            if (attachments && attachments.length > 0) {
              await get().sendMessageWithAttachments(roomId, id, attachments, socket, data);
              return;
            }

            
            socket?.emit("message:send", {
                roomId,
                type,
                content,
                replyTo,
                id,
            });
            set({ isLoading: false });
        },
        sendMessageWithAttachments: async ( 
          roomId: string,
          messageId: string,
          attachments: FilePreview[],
          socket: any,
          data: MessageType
        ) => {
          const filesToUpload = attachments.filter((att) => att.file);
          const fileIds = filesToUpload.map((att) => att._id);
          const files = filesToUpload.map((att) => att.file!);
          // Cập nhật progress upload
          filesToUpload.forEach(async (file) => {
            get().updateAttachmentProgress(
              roomId,
              messageId,
              file._id,
              0,
              "uploading"
            );
          });
          console.log('files', filesToUpload);
          // Upload files
           try {
            // Upload song song với progress tracking - sử dụng _id có sẵn của FilePreview
            const uploadedResults = await UploadService.uploadMultipleParallel(
              files,
              {
                roomId,
                id: fileIds,
                onEachProgress: (index, progress) => {
                  const fileId = filesToUpload[index]._id;
                  get().updateAttachmentProgress(
                    roomId,
                    messageId,
                    fileId,
                    progress,
                    "uploading"
                  );
                },
              }
            );

            console.log('uploadedResults', uploadedResults);
  
            // Cập nhật attachments với URL đã upload
            const updatedAttachments = attachments.map((att) => {
              const uploadIndex = filesToUpload.findIndex(
                (f) => f._id === att._id
              );
              if (uploadIndex === -1) return att; // File đã upload trước đó
  
              const uploadResult = uploadedResults[uploadIndex];
  
              // Revoke blob URL cũ
              if (att.url.startsWith("blob:")) {
                URL.revokeObjectURL(att.url);
              }
  
              return {
                ...att,
                // _id giữ nguyên (đã dùng att._id khi upload, server trả về cùng _id)
                _id: uploadResult._id,
                uploadedUrl: uploadResult.url,
                url: uploadResult.url, // Update main URL từ server
                kind: uploadResult.kind || att.kind, // Cập nhật kind từ server
                name: uploadResult.name || att.name, // Cập nhật name từ server
                size: uploadResult.size || att.size, // Cập nhật size từ server
                mimeType: uploadResult.mimeType || att.mimeType, // Cập nhật mimeType từ server
                status: "uploaded",
                uploadProgress: 100,
                file: undefined, // Xóa file gốc sau khi upload
              } as FilePreview;
            });
  
            // Cập nhật attachments trong message
            const currentRoom = get().messagesRoom[roomId];
            const updatedMessages = (currentRoom?.messages || []).map((msg) =>
              msg.id === messageId
                ? { ...msg, attachments: updatedAttachments }
                : msg
            );
  
            // Cập nhật state
            set({
              messagesRoom: {
                ...get().messagesRoom,
                [roomId]: {
                  ...currentRoom,
                  messages: updatedMessages,
                },
              },
            });

            console.log('updatedAttachments', updatedAttachments);

            socket?.emit("message:send", {
              roomId,
              type: data.type,
              content: data.content,
              replyTo: data.reply?._id,
              id: messageId,
              attachments: updatedAttachments,
            });
  
          } catch (error) {
            // Đánh dấu tất cả là "failed"
            for (const att of filesToUpload) {
              get().updateAttachmentProgress(
                roomId,
                messageId,
                att._id,
                0,
                "failed"
              );
            }
          }
        },
        updateAttachmentProgress: (
          roomId: string,
          messageId: string,
          fileId: string,
          progress: number,
          status?: string
        ) => {
          const currentRoom = get().messagesRoom[roomId];
          if (!currentRoom?.messages) return;
  
          // Tìm message và cập nhật attachment progress
          const updatedMessages = currentRoom.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
  
            const updatedAttachments = (msg.attachments || []).map((att) =>
              att._id === fileId
                ? {
                    ...att,
                    uploadProgress: progress,
                    ...(status && { status }),
                  }
                : att
            );
  
            return {
              ...msg,
              attachments: updatedAttachments,
            };
          });
  
          set({
            messagesRoom: {
              ...get().messagesRoom,
              [roomId]: {
                ...currentRoom,
                messages: updatedMessages,
              },
            },
          });
        },
        getMessages: async (roomId: string, pivotMessageId?: string, direction: "new" | "old" = "new") => {
            try {
                set((state) => ({
                  ...state,
                  isLoading: true,
                }));
      
                // Lấy tin nhắn mới từ API
                const response = await MessageService.getMessages({
                  roomId,
                  queryParams: {
                    msgId: pivotMessageId, // Lấy tin nhắn quanh ID này
                    limit: 20,
                    type: direction,
                  },
                });
      
                if (!response.data.metadata || response.data.metadata.length === 0) {
                  set((state) => ({ ...state, isLoading: false }));
                  return false;
                }
      
                const newMessages = response.data.metadata.map((msg: MessageType) => ({
                  ...msg,
                  roomId,
                  isRead: true,
                  status: (msg.status || "delivered") as MessageType["status"],
                }));
      
                // Lưu từng tin nhắn vào IndexedDB
                // DB.enableLog(true);
                await Promise.all(
                  newMessages.map((msg: MessageType) => {  
                      db.setTable('messages').upsert({
                        ...msg,
                        sender: JSON.stringify(msg.sender || {}),
                        attachments: JSON.stringify(msg.attachments || []),
                        reactions: JSON.stringify(msg.reactions || []),
                        reply: JSON.stringify(msg.reply || {}),
                        read_by: JSON.stringify(msg.read_by || []),
                      });
                  })
                );
      
                // Cập nhật state
                const currentRoom = get().messagesRoom[roomId] || {};
                const currentMessages = (currentRoom as any).messages || [];
      
                // Lọc ra những tin nhắn chưa có trong state
                const uniqueNewMessages = newMessages.filter(
                  (newMsg: MessageType) =>
                    !currentMessages.some((msg: MessageType) => msg.id === newMsg.id)
                );

                if (uniqueNewMessages.length > 0) {
                  if (direction === "new") {
                    const lastNewMessageId =
                      uniqueNewMessages[uniqueNewMessages.length - 1].id;

                    // Cập nhật vào readedRooms nếu có tin nhắn mới
                    set((state) => ({
                      ...state,
                      readedRooms: {
                        ...state.readedRooms,
                        [roomId]: lastNewMessageId,
                      },
                    }));
                  }

                  const mergedMessages =
                    direction === "old"
                      ? [...uniqueNewMessages, ...currentMessages]
                      : [...currentMessages, ...uniqueNewMessages];

                  const sortedMessages = mergedMessages.sort(
                    (a: MessageType, b: MessageType) =>
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  );

                  // Cập nhật messages trong room
                  set((state) => ({
                    ...state,
                    messagesRoom: {
                      ...state.messagesRoom,
                      [roomId]: {
                        messages: sortedMessages,
                        input: currentRoom.input || null,
                        attachments: currentRoom.attachments || null,
                        ghim: currentRoom.ghim || null,
                        updatedAt: new Date().toISOString(),
                      },
                    },
                    isLoading: false,
                  }));
                } else {
                  set((state) => ({ ...state, isLoading: false }));
                }

                return uniqueNewMessages.length > 0;
              } catch (error) {
                set((state) => ({
                  ...state,
                  isLoading: false,
                }));
                return false;
            }
        },
        upsertMessage: async (msg: MessageType) => {
          if (!msg.roomId) return;
          msg.status = "delivered";
          // Lấy state hiện tại
          const prevRoom = get().messagesRoom[msg.roomId] || {};
          const prevMessages = prevRoom.messages || [];
  
          // Tìm vị trí message theo id
          const existingIndex = prevMessages.findIndex(
            (m) => m.id === msg.id
          );
  
          let updatedMessages: MessageType[];
          if (existingIndex === -1) {
            // ID không tồn tại → thêm vào cuối
            updatedMessages = [...prevMessages, msg];
          } else {
            // ID đã tồn tại → cập nhật tại chỗ
            updatedMessages = prevMessages.map((msg, idx) =>
              idx === existingIndex ? msg : msg
            );
          }

          set({
            messagesRoom: {
              ...get().messagesRoom,
              [msg.roomId]: {
                ...prevRoom,
                messages: updatedMessages,
                // Cập nhật last_message_id nếu tin đã đọc
                ...(msg.isRead && { last_message_id: msg.id }),
              },
            },
          });
            
          try {
            // lưu vào db
            db.setTable('messages').upsert({
              ...msg,
              sender: JSON.stringify(msg.sender || {}),
              attachments: JSON.stringify(msg.attachments || []),
              reactions: JSON.stringify(msg.reactions || []),
              reply: JSON.stringify(msg.reply || {}),
              read_by: JSON.stringify(msg.read_by || []),
            });
          } catch (error) {
            
          }

        }
    })
);

export default useMessageStore;