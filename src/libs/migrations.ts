import { NitroSQLiteConnection } from 'react-native-nitro-sqlite';
import { Rooms } from '../models/rooms.model';
import { Messages } from '../models/messages.model';

export const DB_NAME = 'AppChatRN.db';
export const CURRENT_VERSION = 2;

export const MIGRATIONS: Record<number, (db: NitroSQLiteConnection) => Promise<void>> = {
  1: async (db) => {
    const roomsModel = new Rooms();
    const messagesModel = new Messages();
    await db.executeAsync(roomsModel.createTable().trim());
    await db.executeAsync(messagesModel.createTable().trim());
    await db.executeAsync(roomsModel.createIndex().trim());
    await db.executeAsync(messagesModel.createIndex().trim());
    console.log('✅ Thành công tạo bảng rooms và messages và index');
  },
  2: async (db) => {
    // Drop old low-cardinality indexes and recreate optimized ones
    await db.executeAsync('DROP INDEX IF EXISTS idx_rooms_is_read');
    await db.executeAsync('DROP INDEX IF EXISTS idx_rooms_unread_count');
    await db.executeAsync('DROP INDEX IF EXISTS idx_rooms_last_message');
    await db.executeAsync('DROP INDEX IF EXISTS idx_messages_isMine');
    const roomsModel = new Rooms();
    const messagesModel = new Messages();
    await db.executeAsync(roomsModel.createIndex().trim());
    await db.executeAsync(messagesModel.createIndex().trim());
    console.log('✅ Đã tối ưu indexes cho rooms và messages');
  },
  100: async (db) => { // reset và tạo lại các bảng
    const roomsModel = new Rooms();
    const messagesModel = new Messages();
    const dropQueries = [
      roomsModel.dropTable().trim(),
      messagesModel.dropTable().trim(),
    ];
    for (const query of dropQueries) {
      await db.executeAsync(query);
    }
    await db.executeAsync('PRAGMA foreign_keys = OFF;');
    const createQueries = [
      roomsModel.createTable().trim(),
      messagesModel.createTable().trim(),
      roomsModel.createIndex().trim(),
      messagesModel.createIndex().trim(),
    ];
    for (const query of createQueries) {
      await db.executeAsync(query);
    }
    await db.executeAsync('PRAGMA foreign_keys = ON;');
    console.log('✅ Thành công reset và tạo lại các bảng rooms và messages và index');
  }
};