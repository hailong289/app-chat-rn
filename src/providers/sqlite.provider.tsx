import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from 'react';
import { NitroSQLiteConnection } from 'react-native-nitro-sqlite';
import db from '../libs/db';

export interface DatabaseResult {
  insertId?: number;
  rowsAffected: number;
  rows?: any[];
}

export interface SQLiteContextType {
  database: NitroSQLiteConnection | null;
  isInitialized: boolean;
  close: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const SQLiteContext = createContext<SQLiteContextType>({
  database: null,
  isInitialized: false,
  close: async () => { },
  resetDatabase: async () => { },
  isLoading: false,
  error: null,
});

interface SQLiteProviderProps {
  children: ReactNode;
}

export const CURRENT_VERSION = 1;

export const SQLiteProvider = ({
  children
}: SQLiteProviderProps) => {
  const [database, setDatabase] = useState<NitroSQLiteConnection | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const resetDatabase = async () => {
    setIsLoading(true);
    try {
      await db.resetDatabase();
    } catch (error) {
      console.error('❌ Lỗi xóa và tạo lại các bảng:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  }

  const close = async () => {
    try {
      if (database) {
        await database.close();
        setDatabase(null);
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

  const initializeDatabase = async () => {
    setIsLoading(true);
    try {
      // Khởi tạo database và thực hiện migrations
      const newDB = db;
      await newDB.migrations();
      setDatabase(newDB.getDb());
      setIsInitialized(true);
    } catch (error) {
      setIsInitialized(false);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  }

  const value: SQLiteContextType = {
    database,
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

