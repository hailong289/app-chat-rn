import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';
import { open } from 'react-native-nitro-sqlite';

export interface DatabaseResult {
  insertId?: number;
  rowsAffected: number;
  rows?: any[];
}

export interface SQLiteContextType {
  db: any | null;
  isInitialized: boolean;
  close: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const SQLiteContext = createContext<SQLiteContextType>({
  db: null,
  isInitialized: false,
  close: async () => {},
  resetDatabase: async () => {},
  isLoading: false,
  error: null,
});

interface SQLiteProviderProps {
  children: ReactNode;
  dbName?: string;
  schemaVersion?: number;
}

const CURRENT_SCHEMA_VERSION = 1;

export const SQLiteProvider = ({ 
  children, 
  dbName = 'AppChatRN.db',
  schemaVersion = CURRENT_SCHEMA_VERSION,
}: SQLiteProviderProps) => {
  const [db, setDb] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Thực hiện câu lệnh SQL */
  const executeSqlQuery = async (
    database: any,
    query: string,
    params: any[] = []
  ): Promise<DatabaseResult> => {
    if (!database) {
      throw new Error('Database chưa được khởi tạo');
    }

    try {
      // nitro-sqlite sử dụng executeAsync cho async queries
      const result = await database.executeAsync(query, params);
      
      const rows: any[] = [];
      if (result && result.rows) {
        // nitro-sqlite có rows._array hoặc có thể iterate qua rows
        if (result.rows._array) {
          rows.push(...result.rows._array);
        } else if (result.rows.length) {
          // Nếu không có _array, dùng item() để lấy từng row
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            if (row) rows.push(row);
          }
        }
      }

      return {
        insertId: result?.insertId,
        rowsAffected: result?.rowsAffected || 0,
        rows,
      };
    } catch (error) {
      console.error('SQL Error:', error);
      throw error;
    }
  };

  /* Kiểm tra schema version */
  const checkSchemaVersion = async (database: any): Promise<number> => {
    try {
      // Kiểm tra xem bảng schema_version đã tồn tại chưa
      const result = await executeSqlQuery(database, `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_version'
      `);
      
      if (result.rows && result.rows.length > 0) {
        // Bảng đã tồn tại, lấy version hiện tại
        const versionResult = await executeSqlQuery(database, `
          SELECT version FROM schema_version ORDER BY id DESC LIMIT 1
        `);
        if (versionResult.rows && versionResult.rows.length > 0) {
          return versionResult.rows[0].version || 0;
        }
      }
      return 0;
    } catch (error) {
      // Nếu có lỗi, trả về 0 để tạo lại schema
      return 0;
    }
  };

  /* Tạo bảng schema_version */
  const createSchemaVersionTable = async (database: any) => {
    try {
      await executeSqlQuery(database, `
        CREATE TABLE IF NOT EXISTS schema_version (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      console.log('✅ Thành công tạo bảng schema_version');
    } catch (error) {
      console.error('❌ Lỗi tạo bảng schema_version:', error);
    }
  };

  /* Cập nhật schema version */
  const updateSchemaVersion = async (database: any, version: number) => {
    try {
      await executeSqlQuery(database, `
        INSERT INTO schema_version (version, created_at) 
        VALUES (?, strftime('%s', 'now'))
      `, [version]);
      console.log(`✅ Đã cập nhật schema version: ${version}`);
    } catch (error) {
      console.error('❌ Lỗi cập nhật schema version:', error);
    }
  };

  /* Tạo bảng rooms */
  const createTableRoom = async (database: any) => {
    try {
      await executeSqlQuery(database, `
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          roomId TEXT NOT NULL,
          type TEXT DEFAULT 'private',
          name TEXT,
          avatar TEXT,
          members TEXT,
          updatedAt TEXT,
          last_message TEXT,
          is_read INTEGER DEFAULT 1,
          unread_count INTEGER DEFAULT 0,
          pinned INTEGER DEFAULT 0,
          muted INTEGER DEFAULT 0,
          last_read_id TEXT
        )
      `);
      console.log('✅ Thành công tạo bảng rooms');
    } catch (error) {
      console.error('❌ Lỗi tạo bảng rooms:', error);
    }
  };

  /* Tạo bảng messages */
  const createTableMessages = async (database: any) => {
    try {
      await executeSqlQuery(database, `
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          roomId TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'text',
          content TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          editedAt TEXT,
          deletedAt TEXT,
          pinned INTEGER DEFAULT 0,
          sender TEXT,
          attachments TEXT,
          reactions TEXT,
          reply TEXT,
          isMine INTEGER DEFAULT 0,
          isRead INTEGER DEFAULT 0,
          hiddenByMe INTEGER DEFAULT 0,
          hiddenAt TEXT,
          read_by TEXT,
          read_by_count INTEGER DEFAULT 0,
          status TEXT
        )
      `);
      
      // Tạo index cho roomId để query nhanh hơn
      await executeSqlQuery(database, `
        CREATE INDEX IF NOT EXISTS idx_messages_roomId ON messages(roomId)
      `);
      
      // Tạo index cho createdAt để sort nhanh hơn
      await executeSqlQuery(database, `
        CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt)
      `);
      
      // Tạo index cho roomId và createdAt kết hợp
      await executeSqlQuery(database, `
        CREATE INDEX IF NOT EXISTS idx_messages_roomId_createdAt ON messages(roomId, createdAt)
      `);
      
      // Tạo index cho isMine để filter nhanh hơn
      await executeSqlQuery(database, `
        CREATE INDEX IF NOT EXISTS idx_messages_isMine ON messages(isMine)
      `);
      
      console.log('✅ Thành công tạo bảng messages');
    } catch (error) {
      console.error('❌ Lỗi tạo bảng messages:', error);
    }
  };

  /* Tạo các bảng cần thiết nếu chưa tồn tại */
  const createTables = async (database: any) => {
    // Tạo bảng schema_version trước
    await createSchemaVersionTable(database);
    // Kiểm tra version hiện tại
    const currentVersion = await checkSchemaVersion(database);
    // Tạo bảng rooms nếu chưa tồn tại
    await createTableRoom(database);
    await createTableMessages(database);
    // Cập nhật version nếu cần
    if (currentVersion < schemaVersion) {
      await updateSchemaVersion(database, schemaVersion);
      console.log(`✅ Đã cập nhật schema từ version ${currentVersion} lên ${schemaVersion}`);
    }
    console.log(`✅ Thành công tạo các bảng cần thiết (version ${schemaVersion})`);
  };

  // Khởi tạo database
  const initializeDatabase = async () => {
    setIsLoading(true);
    try {
      const database = open({
        name: dbName,
      });

      console.log('✅ Database opened:', dbName);
      
      setDb(database);
      
      // Tạo các bảng cần thiết
      await createTables(database);
      setIsInitialized(true);
      console.log('✅ Thành công khởi tạo database');
    } catch (error) {
      console.error('❌ Lỗi khởi tạo database:', error);
      setIsInitialized(false);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };


  const resetDatabase = async () => {
    setIsLoading(true);
    try {
      // Xóa tất cả bảng
      await executeSqlQuery(db, `
        DROP TABLE IF EXISTS schema_version
      `);
      await executeSqlQuery(db, `
        DROP TABLE IF EXISTS rooms
      `);
      await executeSqlQuery(db, `
        DROP TABLE IF EXISTS messages
      `);
      // Tạo lại các bảng
      await createTables(db);
      console.log('✅ Thành công xóa và tạo lại các bảng');
    } catch (error) {
      console.error('❌ Lỗi xóa và tạo lại các bảng:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  }

  const close = async () => {
    try {
      if (db) {
        await db.close();
        setDb(null);
        setIsInitialized(false);
        console.log('✅ Database closed');
      }
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
  };

  useEffect(() => {
    initializeDatabase();
    return () => {
      close();
    };
  }, []);

  const value: SQLiteContextType = {
    db,
    isInitialized,
    close,
    resetDatabase,
    isLoading,
    error,
  };

  return (
    <SQLiteContext.Provider value={value}>
      {children}
    </SQLiteContext.Provider>
  );
};

export const useSQLite = () => {
  const context = useContext(SQLiteContext);
  if (!context) {
    throw new Error('useSQLite must be used within SQLiteProvider');
  }
  return context;
};

