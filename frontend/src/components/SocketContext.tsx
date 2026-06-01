import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

/**
 * Checks if the JWT is a pre-auth token (before biometric verification).
 * Pre-auth tokens are rejected by the NestJS events gateway to avoid early socket binding.
 */
function isPreAuthToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    return payload.type === 'pre-auth';
  } catch {
    return false;
  }
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    // If not authenticated, no token, or token is pre-auth, do not connect (and disconnect if active)
    if (!isAuthenticated || !token || isPreAuthToken(token)) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    setConnectionStatus('connecting');

    // Initialize root namespace connection with token credentials
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('[Global Socket] Connected successfully');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      console.warn('[Global Socket] Disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      setConnectionStatus('error');
      console.error('[Global Socket] Connection error:', err.message);
    });

    setSocket(newSocket);

    // Clean up connection on store update / unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionStatus }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
