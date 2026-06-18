import db from './db';
import offlineQueue from './offlineQueue';
import useMessageStore from '../store/useMessage';
import useRoomStore from '../store/useRoom';

/** Xóa cache cục bộ (SQLite + store in-memory). Không đăng xuất, không xóa token. */
export async function clearAppCache(): Promise<void> {
  await db.resetDatabase();

  useMessageStore.setState({
    messagesRoom: {},
    readedRooms: {},
    isLoading: false,
  });

  useRoomStore.getState().clearRooms();
  offlineQueue.clear();
}
