
export interface GetListFriendsPayload {
    page: number;
    limit: number;
    search: string;
    success: (data: any) => void;
    error: (error: any) => void;
}

export interface GetUsersPayload {
    page: number;
    limit: number;
    search: string;
    success: (data: any) => void;
    error: (error: any) => void;
}

export interface SendFriendRequestPayload {
    receiverId: string;
    success: (data: any) => void;
    error: (error: any) => void;
}

export interface GetSentFriendRequestsPayload {
    page: number;
    limit: number;
    search: string;
    success: (data: any) => void;
    error: (error: any) => void;
}

export interface AcceptFriendRequestPayload {
    senderId: string;
    success: (data: any) => void;
    error: (error: any) => void;
}

export interface RejectFriendRequestPayload {
    senderId: string;
    success: (data: any) => void;
    error: (error: any) => void;
}