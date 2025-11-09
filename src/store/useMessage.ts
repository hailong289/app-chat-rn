import { create } from "zustand";
import { MessageType, RoomData, SendMessageArgs } from "../types/message.type";
import { ObjectId } from "bson";
import Helpers from "../libs/helpers";
import MessageService from "../service/message.service";
import db from "../libs/db";

interface MessageState {
    messagesRoom: Record<string, RoomData>; // roomId -> room data;
    readedRooms: Record<string, string>; // roomId -> lastMessageId;
    isLoading: boolean;
    sendMessage: (payload: SendMessageArgs) => void;
    getMessages: (roomId: string, lastMessageId?: string) => void;
    upsertMessage: (msg: MessageType) => Promise<void>;
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
            socket?.emit("message:send", {
                roomId,
                type,
                content,
                replyTo,
                id,
            });
            set({ isLoading: false });
        },
        getMessages: async (roomId: string, lastMessageId?: string) => {
            try {
                set((state) => ({
                  ...state,
                  isLoading: true,
                }));
      
                // Lấy tin nhắn mới từ API
                const response = await MessageService.getMessages({
                  roomId,
                  queryParams: {
                    msgId: lastMessageId, // Lấy tin nhắn sau ID này
                    limit: 50,
                    type: "new",
                  },
                });
      
                if (!response.data.metadata || response.data.metadata.length === 0) {
                  set((state) => ({ ...state, isLoading: false }));
                  return;
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

                console.log("uniqueNewMessages", uniqueNewMessages);
      
                if (uniqueNewMessages.length > 0) {
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
      
                  // Cập nhật messages trong room
                  set((state) => ({
                    ...state,
                    messagesRoom: {
                      ...state.messagesRoom,
                      [roomId]: {
                        messages: [...currentMessages, ...uniqueNewMessages],
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
              } catch (error) {
                console.error("Error fetching new messages:", error);
                set((state) => ({
                  ...state,
                  isLoading: false,
                }));
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