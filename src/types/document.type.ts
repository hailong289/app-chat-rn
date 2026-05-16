export interface UserInfo {
  _id: string;
  usr_id: string;
  usr_slug: string;
  usr_fullname: string;
  usr_avatar: string;
  usr_email: string;
}

export interface SharedWithItem {
  userId: string;
  role: string;
  user: UserInfo;
  sharedAt: string;
}

export interface Document {
  _id: string;
  ownerId: string;
  title: string;
  roomIds: string[];
  visibility: string;
  yjsSnapshot?: number[] | Uint8Array | string;
  plainText?: string;
  sharedWith?: SharedWithItem[];
  attachmentIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  owner?: UserInfo;
}

export interface CreateDocumentDto {
  title: string;
  roomId?: string;
  visibility?: "private" | "shared" | "public";
}
