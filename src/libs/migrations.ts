import { open, NitroSQLiteConnection } from 'react-native-nitro-sqlite';

export const DB_NAME = 'AppChatRN.db';

// Định nghĩa các migration theo version
export const MIGRATIONS: Record<number, (db: NitroSQLiteConnection) => Promise<void>> = {
  1: async (db) => {
    // V1: Tạo bảng Rooms và Messages cơ bản
    await db.executeAsync(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        type TEXT DEFAULT 'private',
        name TEXT,
        updatedAt TEXT,
        unread_count INTEGER DEFAULT 0
      );
    `);
    await db.executeAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        isMine INTEGER DEFAULT 0
      );
    `);
    // Tạo index
    await db.executeAsync(`CREATE INDEX IF NOT EXISTS idx_messages_roomId ON messages(roomId);`);
    await db.executeAsync(`CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt);`);
  },
  // Ví dụ: Sau này lên version 2 cần thêm cột "reaction"
  // 2: async (db) => {
  //   await db.executeAsync("ALTER TABLE messages ADD COLUMN reactions TEXT");
  // }
};