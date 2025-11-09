


export type MessageSender = {
    _id: string;
    fullname: string;
    avatar: string;
  };
 
  export type MessageType = {
    id: string;
    roomId: string;
    type: "text" | "image" | "file" | "video";
    content: string;
    createdAt: string;
    editedAt?: string | null;
    deletedAt?: string | null;
    pinned: boolean;
    sender: MessageSender & { id?: string };
    attachments?: Array<FilePreview>;
    reactions?: Array<{
      emoji: string;
      count: number;
      users: Array<{
        _id: string;
        usr_id: string;
        usr_fullname: string;
        usr_avatar: string;
      }>;
    }>;
    reply?: {
      _id: string;
      type: string;
      content: string;
      createdAt: string;
      sender: {
        _id: string;
        name: string;
      };
    };
    isMine: boolean;
    isRead: boolean;
    hiddenByMe?: boolean;
    hiddenAt?: string | null;
    read_by?: Array<{
      readAt: string;
      user: {
        _id: string;
        id: string;
        fullname: string;
        avatar: string;
      };
    }>;
    read_by_count?: number;
    status?:
      | "sent"
      | "delivered"
      | "read"
      | "failed"
      | "pending"
      | "uploading"
      | "uploaded"
      | "recalled";
  };

export type FilePreview = {
    _id: string;
    kind: string;
    url: string; // Local blob URL hoặc remote URL sau upload
    name: string;
    size: number;
    mimeType: string;
    thumbUrl?: string;
    width?: number;
    height?: number;
    duration?: number | null;
    status?: string; // "pending" | "uploading" | "uploaded" | "failed"
    uploadProgress?: number; // 0-100 (%)
    uploadedUrl?: string; // URL sau khi upload thành công
    file?: File; // File gốc để upload
  };

  export interface RoomData {
    messages: MessageType[];
    input: string | null;
    attachments: FilePreview[] | null;
    ghim: string[] | null;
    updatedAt: string | null;
  }

export interface SendMessageArgs {
    roomId: string;
    content: string;
    attachments: FilePreview[];
    type: "text" | "image" | "file" | "video";
    replyTo?: string;
    socket?: any; // Socket instance
    userId?: string; // User ID
    userFullname?: string; // User fullname
    userAvatar?: string; // User avatar
  }


  export interface GetMessageType {
    roomId: string;
    queryParams?: {
        limit?: number;
        type?:string;
        msgId?: string;
    }
}