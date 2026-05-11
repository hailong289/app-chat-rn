import { create } from "zustand";
import { AcceptFriendRequestPayload, GetListFriendsPayload, GetSentFriendRequestsPayload, GetUsersPayload, RejectFriendRequestPayload, SendFriendRequestPayload } from "../types/contact.type";
import { User } from "../types/user.type";
import ContactService from "../service/contact.service";
import RoomService from "../service/room.service";
import { PayloadGetRooms, Room } from "../types/room.type";
import db from "../libs/db";
import { Rooms } from "../models/rooms.model";

interface ContactState {
    friends: User[];
    friendRequests: User[];
    sentFriendRequests: User[];
    groups: Room[];
    users: User[];
    friends_suggestions: any[];
    loading: { 
        friends: boolean; 
        friendRequests: boolean; 
        users: boolean; 
        sendFriendRequest: boolean; 
        sentFriendRequests: boolean; 
        acceptFriendRequest: boolean; 
        rejectFriendRequest: boolean; 
        groups: boolean;
        blockFriend: boolean;
        friendSuggestions: boolean;
    };
    getFriends: (payload: GetListFriendsPayload) => Promise<void>;
    getFriendRequests: (payload: GetListFriendsPayload) => Promise<void>;
    getSentFriendRequests: (payload: GetSentFriendRequestsPayload) => Promise<void>;
    getUsers: (payload: GetUsersPayload) => Promise<void>;
    sendFriendRequest: (payload: SendFriendRequestPayload) => Promise<void>;
    acceptFriendRequest: (payload: AcceptFriendRequestPayload) => Promise<void>;
    rejectFriendRequest: (payload: RejectFriendRequestPayload) => Promise<void>;
    getGroups: (payload: PayloadGetRooms) => Promise<void>;
    blockFriend: (userId: string) => Promise<void>;
    unblockFriend: (userId: string) => Promise<void>;
    getFriendSuggestions: (limit?: number) => Promise<void>;
}

const useContactStore = create<ContactState>()(
    (set, get) => ({
        friends: [],
        friendRequests: [],
        sentFriendRequests: [],
        groups: [],
        users: [],
        friends_suggestions: [],
        loading: { 
            friends: false, 
            friendRequests: false, 
            users: false, 
            sendFriendRequest: false, 
            sentFriendRequests: false, 
            acceptFriendRequest: false, 
            rejectFriendRequest: false,
            groups: false,
            blockFriend: false,
            friendSuggestions: false,
        },
        getFriends: async (payload: GetListFriendsPayload) => {
            set({ loading: { ...get().loading, friends: true } });
            try {
                const response = await ContactService.getListFriends({
                    limit: payload.limit,
                    page: payload.page,
                    search: payload.search
                });
                set({
                    friends: response?.data?.metadata?.friends || [],
                    loading: { ...get().loading, friends: false }
                });
                payload.success(true);
            } catch (error) {
                set({ loading: { ...get().loading, friends: false } });
                payload.error(error as any);
            }
        },
        getUsers: async (payload: GetUsersPayload) => {
            set({ loading: { ...get().loading, users: true } });
            try {
                const response = await ContactService.searchUsers({ 
                    search: payload.search, 
                    limit: payload.limit, 
                    page: payload.page 
                });
                set({ 
                    users: response?.data?.metadata?.users || [],
                    loading: { ...get().loading, users: false }
                });
                payload.success(response?.data?.metadata?.users || []);
            } catch (error) {
                console.error('Error fetching users:', error);
                set({ loading: { ...get().loading, users: false } });
                payload.error(error as any);
            }
        },
        sendFriendRequest: async (payload: SendFriendRequestPayload) => {
            set({ loading: { ...get().loading, sendFriendRequest: true } });
            try {
                const response = await ContactService.sendFriendRequest({ receiverId: payload.receiverId });
                const filterUsers = get().users.filter((user: User) => user.id !== payload.receiverId) || [];
                set({
                    loading: { ...get().loading, sendFriendRequest: false }, 
                    users: filterUsers as User[],
                });
                payload.success(true);
            } catch (error) {
                set({ loading: { ...get().loading, sendFriendRequest: false } });
                payload.error(error);
            }
        },
        getSentFriendRequests: async (payload: GetSentFriendRequestsPayload) => {
            set({ loading: { ...get().loading, sentFriendRequests: true } });
            try {
                const response = await ContactService.getSentFriendRequests({
                    limit: payload.limit,
                    page: payload.page,
                    search: payload.search
                });
                set({ 
                    sentFriendRequests: response?.data?.metadata?.friendRequests || [],
                    loading: { ...get().loading, sentFriendRequests: false }
                });
                payload.success(response?.data?.metadata?.friendRequests || []);
            } catch (error) {
                set({ loading: { ...get().loading, sentFriendRequests: false } });
                payload.error(error as any);
            }
        },
        getFriendRequests: async (payload: GetListFriendsPayload) => {
            set({ loading: { ...get().loading, friendRequests: true } });
            try {
                const response = await ContactService.getFriendRequests({
                    limit: payload.limit,
                    page: payload.page,
                    search: payload.search
                });
                set({ 
                    friendRequests: response?.data?.metadata?.friendRequests || [],
                    loading: { ...get().loading, friendRequests: false }
                });
                payload.success(response?.data?.metadata?.friendRequests || []);
            } catch (error) {
                set({ loading: { ...get().loading, friendRequests: false } });
                payload.error(error as any);
            }
        },
        acceptFriendRequest: async (payload: AcceptFriendRequestPayload) => {
            set({ loading: { ...get().loading, acceptFriendRequest: true } });
            try {
                const response = await ContactService.acceptFriendRequest({ senderId: payload.senderId });
                set({ 
                    friendRequests: get().friendRequests.filter((request: User) => request.id !== payload.senderId),
                    loading: { ...get().loading, acceptFriendRequest: false } 
                });
                payload.success(true);
            } catch (error) {
                set({ loading: { ...get().loading, acceptFriendRequest: false } });
                payload.error(error as any);
            }
        },
        rejectFriendRequest: async (payload: RejectFriendRequestPayload) => {
            set({ loading: { ...get().loading, rejectFriendRequest: true } });
            try {
                const response = await ContactService.rejectFriendRequest({ senderId: payload.senderId });
                set({ 
                    friendRequests: get().friendRequests.filter((request: User) => request.id !== payload.senderId),
                    loading: { ...get().loading, rejectFriendRequest: false } 
                });
                payload.success(true);
            } catch (error) {
                set({ loading: { ...get().loading, rejectFriendRequest: false } });
                payload.error(error as any);
            }
        },
        getGroups: async (payload: PayloadGetRooms) => {
            set({ loading: { ...get().loading, groups: true } });
            try {
                db.enableLog(true);
                if (payload.q) {
                    const roomGroupDb = await Rooms.getInstance()
                    .getQuery()
                    .orderBy('updatedAt', 'ASC')
                    .limit(payload.limit)
                    .offset(payload.offset)
                    .where('type', '=', 'group')
                    .where('name', 'like', `%${payload.q}%`)
                    .get() as unknown as Room[];
                    set({
                        groups: roomGroupDb,
                        loading: { ...get().loading, groups: false }
                    });
                    if (roomGroupDb.length > 0) {
                        payload.success(roomGroupDb);
                        return;
                    }
                }
                const response = await RoomService.getGroupRooms({
                    limit: payload.limit,
                    offset: payload.offset,
                    q: payload.q,
                    type: 'group',
                });
                const roomsGroup = response?.data?.metadata as Room[] || [];
                Promise.all(roomsGroup.map((room: Room) => {
                    Rooms.upsert(room);
                }));
                set({
                    groups: roomsGroup,
                    loading: { ...get().loading, groups: false }
                });
                payload.success(true);
            } catch (error) {
                const roomGroupDb = await Rooms
                .getInstance()
                .getQuery()
                .orderBy('updatedAt', 'ASC')
                .limit(payload.limit)
                .offset(payload.offset)
                .where('type', '=', 'group')
                .get() as unknown as Room[];
                set({
                    groups: roomGroupDb,
                    loading: { ...get().loading, groups: false }
                });
                payload.error(error as any);
            }
        },
        // ── Block Friend ────────────────────────────────────────────────
        blockFriend: async (userId: string) => {
            set({ loading: { ...get().loading, blockFriend: true } });
            try {
                await ContactService.blockFriend(userId);
                set({
                    friends: get().friends.filter((f: User) => f.id !== userId),
                    loading: { ...get().loading, blockFriend: false }
                });
            } catch (error) {
                set({ loading: { ...get().loading, blockFriend: false } });
                console.error("Block friend failed:", error);
            }
        },
        // ── Unblock Friend ──────────────────────────────────────────────
        unblockFriend: async (userId: string) => {
            set({ loading: { ...get().loading, blockFriend: true } });
            try {
                await ContactService.unblockFriend(userId);
                set({ loading: { ...get().loading, blockFriend: false } });
            } catch (error) {
                set({ loading: { ...get().loading, blockFriend: false } });
                console.error("Unblock friend failed:", error);
            }
        },
        // ── Get Friend Suggestions ──────────────────────────────────────
        getFriendSuggestions: async (limit = 10) => {
            set({ loading: { ...get().loading, friendSuggestions: true } });
            try {
                const response = await ContactService.getFriendSuggestions(limit);
                set({
                    friends_suggestions: response?.data?.metadata?.suggestions || [],
                    loading: { ...get().loading, friendSuggestions: false }
                });
            } catch (error) {
                set({ loading: { ...get().loading, friendSuggestions: false } });
                console.error("Get friend suggestions failed:", error);
            }
        },
    })
);

export default useContactStore;
