// SocketProvider.tsx
import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import useAuthStore from '../store/useAuth'; // nếu có auth
import { WS_URL } from '@/env.json';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { tokens } = useAuthStore();
  const socket = useMemo(
    () => io(WS_URL, {
      transports: ['websocket'],
      autoConnect: false,
      auth: { tokens },
    }),
    [tokens]
  );

  useEffect(() => {
    try {
        socket.connect();
        console.log('Connected to socket');
    } catch (error) {
        console.error('Error connecting to socket:', error);
    }
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error('useSocket must be used within SocketProvider');
  return socket;
};
