import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../modules/auth/state/auth.context';
import { TokenStore } from '../../core/storage/secure-store';
import { API_BASE_URL } from '../../core/config/api.config';
import { isJwtExpired, refreshAccessTokenIfNeeded } from '../../core/network/http.client';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

const resolveSocketUrl = (apiBaseUrl: string): string => {
  let resolved = apiBaseUrl.replace(':5000', ':5002');
  if (resolved === apiBaseUrl) {
    try {
      const match = apiBaseUrl.match(/^https?:\/\/([^/:]+)/i);
      const host = match ? match[1] : '';
      if (host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host)) {
        resolved = apiBaseUrl.replace(host, `${host}:5002`);
      }
    } catch (e) {
      console.warn('[SocketProvider] Failed parsing host for port replacement:', e);
    }
  }
  
  if (resolved.endsWith('/api')) {
    resolved = resolved.slice(0, -4);
  } else if (resolved.endsWith('/api/')) {
    resolved = resolved.slice(0, -5);
  }
  return resolved;
};

const MSG_SERVICE_SOCKET_URL = resolveSocketUrl(API_BASE_URL);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[SocketProvider] Disconnecting socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      let token = await TokenStore.getAccessToken();
      if (token && isJwtExpired(token)) {
        try {
          const refreshed = await refreshAccessTokenIfNeeded();
          if (refreshed) token = refreshed;
        } catch {
          // ignore error, will fail on socket connection
        }
      }

      if (!token || !user) {
        disconnect();
        return;
      }

      // If we already have a connection, don't re-create it
      if (socketRef.current && socketRef.current.connected) {
        return;
      }

      // If there's an existing socket that is disconnected, clean it up first
      if (socketRef.current) {
        disconnect();
      }

      console.log('[SocketProvider] Connecting to socket service:', MSG_SERVICE_SOCKET_URL);
      const s = io(MSG_SERVICE_SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'], // Allow polling fallback for maximum reliability
      });

      s.on('connect', () => {
        console.log('[SocketProvider] Socket connected successfully');
        setIsConnected(true);
      });

      s.on('disconnect', (reason) => {
        console.log('[SocketProvider] Socket disconnected, reason:', reason);
        setIsConnected(false);
      });

      s.on('connect_error', async (err) => {
        console.warn('[SocketProvider] Socket connect_error:', err.message || err);
        
        const isAuthError = err.message === 'Invalid token' || 
                            err.message === 'Authentication required' || 
                            err.message === 'jwt expired';
                            
        if (isAuthError) {
          try {
            console.log('[SocketProvider] Socket auth error, attempting to refresh token...');
            const freshToken = await refreshAccessTokenIfNeeded();
            if (freshToken) {
              console.log('[SocketProvider] Token refreshed, reconnecting socket...');
              s.auth = { token: freshToken };
              s.connect();
              return;
            }
          } catch (refreshErr) {
            console.warn('[SocketProvider] Token refresh failed for socket reconnect:', refreshErr);
          }
        }
        setIsConnected(false);
      });

      socketRef.current = s;
      setSocket(s);
    } catch (err) {
      console.warn('[SocketProvider] Failed to initialize socket connection:', err);
      setIsConnected(false);
    }
  }, [user, disconnect]);

  // Connect socket automatically when user changes (login/logout/token updates)
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      // We don't necessarily want to disconnect on every rerender, 
      // but clean up when provider unmounts or user changes.
      if (!user) {
        disconnect();
      }
    };
  }, [user, connect, disconnect]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used inside a <SocketProvider>');
  }
  return ctx;
}
