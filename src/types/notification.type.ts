export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  isRead: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  sender?: {
    _id: string;
    fullname: string;
    avatar: string;
  } | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => Promise<void>;
}
