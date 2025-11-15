export type UserGender = 'male' | 'female' | 'other';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';

export interface Friendship {
  _id: string;
  userId1: string;
  userId2: string;
  actionUserId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string; 
  id: string;
  fullname: string;
  slug?: string; 
  email?: string;
  phone: string;
  gender: UserGender;
  dateOfBirth: string;
  avatar?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  friendship?: Friendship; 
}

export interface SearchUser extends Omit<User, 'friendship'> {
  username?: string;
  requestSent?: boolean; 
}
