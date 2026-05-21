
export type MessageSender = {
  _id: string;
  fullname: string;
  avatar: string;
};

export type RoomEventActor = {
  _id: string;
  id: string;
  fullname: string;
  avatar: string;
};

export type RoomEventType = {
  event_id: string;
  event_type:
    | "member.joined"
    | "member.added"
    | "member.left"
    | "member.deleted"
    | "member.create"
    | "member.edit"
    | "member.pinded"
    | "member.unPinded"
    | "member.change.role"
    | "member.change.name"
    | "member.change.avatar"
    | "member.change.nickName"
    | "call.started"
    | "call.joined"
    | "call.left"
    | "call.ended";
  placeholder: string;
  payload?: Record<string, unknown>;
  payloadJson?: string;
  createdAt: string;
  actor: RoomEventActor | null;
  targets: RoomEventActor[];
};

export interface CallMember {
  id: string;
  user_id?: string;
  fullname: string;
  avatar: string;
  is_caller: boolean;
  status: "initiated" | "started" | "pending" | "accepted" | "cancelled" | "rejected" | "missed" | "ended" | "joined";
}

export interface CallHistoryType {
  _id: string;
  call_id: string;
  room_id: string;
  call_type: "audio" | "video";
  call_mode?: "p2p" | "sfu";
  message_id: string;
  members: CallMember[];
  started_at: string;
  ended_at: string;
  duration: number;
  caller_id?: string;
  callee_id?: string;
}

export type MessageSummary = {
  text: string;
  title?: string;
  keyPoints?: string[];
  language?: string;
};

export type MessageTranslation = {
  text: string;
  from?: string;
  to: string;
};

export type MessageType = {
  id: string;
  roomId: string;
  type: "text" | "image" | "file" | "system" | "video" | "audio" | "gif" | "flashcard" | "quiz" | "document" | "todo_project" | "call";
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
      fullname?: string;
    };
    isMine: boolean;
    hiddenByMe: boolean;
    isDeleted: boolean;
    isDelete?: boolean;
    status?: string;
  };
  isMine: boolean;
  isRead: boolean;
  hiddenBy?: string[];
  hiddenByMe: boolean;
  hiddenAt: string | null;
  read_by?: Array<{
    readAt: string;
    user: {
      _id: string;
      id: string;
      fullname: string;
      avatar: string;
    };
  }>;
  isDeleted: boolean;
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
  room_event?: RoomEventType | null;
  call_history?: CallHistoryType | null;
  placeholder?: string;
  summary?: MessageSummary | null;
  translation?: MessageTranslation | null;
  quiz?: any;
  desk?: any;
  documentId?: string;
  todoProjectId?: string;
  todoProject?: any;
};


export type FilePreview = {
  _id: string;
  kind: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
  duration?: number | null;
  status?: string;
  uploadProgress?: number;
  uploadedUrl?: string;
  file?: File;
  uploadError?: any;
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
  type: "text" | "image" | "file" | "video" | "audio" | "flashcard" | "quiz" | "document" | "todo_project" | "call";
  replyTo?: string;
  socket?: any;
  userId?: string;
  userFullname?: string;
  userAvatar?: string;
  quiz?: import('../types/quizz.type').QuizzResponse;
}


export interface GetMessageType {
  roomId: string;
  queryParams?: {
    limit?: number;
    type?: string;
    msgId?: string;
  }
}
