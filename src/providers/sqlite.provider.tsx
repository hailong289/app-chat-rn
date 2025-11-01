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
  executeSql: (query: string, params?: any[]) => Promise<DatabaseResult>;
  close: () => Promise<void>;
}

export const SQLiteContext = createContext<SQLiteContextType>({
  db: null,
  isInitialized: false,
  executeSql: async () => ({ rowsAffected: 0 }),
  close: async () => {},
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
  schemaVersion = CURRENT_SCHEMA_VERSION
}: SQLiteProviderProps) => {
  const [db, setDb] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
      throw error;
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
      throw error;
    }
  };

  /* Tạo bảng rooms */
  const createTableRoom = async (database: any) => {
    try {
      await executeSqlQuery(database, `
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          roomId TEXT NOT NULL,
          updatedAt INTEGER NOT NULL,
          type TEXT DEFAULT 'private',
          last_message TEXT,
          name TEXT NOT NULL,
          is_read INTEGER DEFAULT 1,
          avatar TEXT,
          members TEXT,
          unread_count INTEGER DEFAULT 0,
          pinned INTEGER DEFAULT 0,
          muted INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        )
      `);
      console.log('✅ Thành công tạo bảng rooms');
    } catch (error) {
      console.error('❌ Lỗi tạo bảng rooms:', error);
      throw error;
    }
  };

  /* Tạo các bảng cần thiết nếu chưa tồn tại */
  const createTables = async (database: any) => {
    try {
      // Tạo bảng schema_version trước
      await createSchemaVersionTable(database);
      
      // Kiểm tra version hiện tại
      const currentVersion = await checkSchemaVersion(database);
      
      // Nếu version đã đúng thì không tạo lại
      if (currentVersion >= schemaVersion) {
        console.log(`✅ Database schema đã ở version ${currentVersion}, không cần tạo lại`);
        return;
      }
      
      // Tạo các bảng
      await createTableRoom(database);
      
      // Cập nhật version sau khi tạo xong
      await updateSchemaVersion(database, schemaVersion);
      
      console.log(`✅ Thành công tạo các bảng cần thiết (version ${schemaVersion})`);
    } catch (error) {
      console.error('❌ Lỗi tạo các bảng cần thiết:', error);
      throw error;
    }
  };

  // Khởi tạo database
  const initializeDatabase = async () => {
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
    }
  };

  const executeSql = async (
    query: string,
    params: any[] = []
  ): Promise<DatabaseResult> => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    return executeSqlQuery(db, query, params);
  };

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
    executeSql,
    close,
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

