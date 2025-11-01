import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
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
}

export const SQLiteProvider = ({ 
  children, 
  dbName = 'AppChatRN.db'
}: SQLiteProviderProps) => {
  const [db, setDb] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /* Thực hiện câu lệnh SQL */
  const executeSqlQuery = useCallback(async (
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
  }, []);

  /* Tạo bảng rooms */
  const createTableRoom = useCallback(async (database: any) => {
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
  }, [executeSqlQuery]);

  /* Tạo các bảng cần thiết nếu chưa tồn tại */
  const createTables = useCallback(async (database: any) => {
    try {
      await createTableRoom(database);
      console.log('✅ Thành công tạo các bảng cần thiết');
    } catch (error) {
      console.error('❌ Lỗi tạo các bảng cần thiết:', error);
      throw error;
    }
  }, [createTableRoom]);

  // Khởi tạo database
  const initializeDatabase = useCallback(async () => {
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
  }, [dbName, createTables]);

  const executeSql = useCallback(async (
    query: string,
    params: any[] = []
  ): Promise<DatabaseResult> => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    return executeSqlQuery(db, query, params);
  }, [db, executeSqlQuery]);

  const close = useCallback(async () => {
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
  }, [db]);

  useEffect(() => {
    initializeDatabase();

    return () => {
      close();
    };
  }, [initializeDatabase, close]);

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

