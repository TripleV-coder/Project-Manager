'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const SocketContext = createContext();

// États possibles de la connexion socket
const SOCKET_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  NO_TOKEN: 'no_token'
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(SOCKET_STATUS.IDLE);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initSocket = async () => {
      setConnectionStatus(SOCKET_STATUS.CONNECTING);
      setConnectionError(null);

      try {
        const { initializeSocketClient, disconnectSocket } = await import('@/lib/socket-client');

        const token = localStorage.getItem('pm_token');

        if (!token) {
          setConnectionStatus(SOCKET_STATUS.NO_TOKEN);
          console.warn('[Socket] No authentication token found - socket not initialized');
          return;
        }

        const socketInstance = initializeSocketClient(token);
        setSocket(socketInstance);

        const handleConnect = () => {
          setIsConnected(true);
          setConnectionStatus(SOCKET_STATUS.CONNECTED);
          setConnectionError(null);
          reconnectAttempts.current = 0;
          console.log('[Socket] Connected successfully');
        };

        const handleDisconnect = (reason) => {
          setIsConnected(false);
          setConnectionStatus(SOCKET_STATUS.DISCONNECTED);
          console.log('[Socket] Disconnected:', reason);
        };

        const handleConnectError = (error) => {
          setConnectionStatus(SOCKET_STATUS.ERROR);
          setConnectionError(error.message || 'Connection failed');

          // Only log first error, not every retry
          if (reconnectAttempts.current === 0) {
            console.warn('[Socket] Connection error:', error.message || 'Server unavailable');
          }

          // Track retry attempts
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
          }
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);
        socketInstance.on('connect_error', handleConnectError);

        // Store cleanup function
        cleanupRef.current = () => {
          socketInstance.off('connect', handleConnect);
          socketInstance.off('disconnect', handleDisconnect);
          socketInstance.off('connect_error', handleConnectError);
          disconnectSocket();
          setSocket(null);
          setIsConnected(false);
          setConnectionStatus(SOCKET_STATUS.IDLE);
        };

        return cleanupRef.current;
      } catch (error) {
        console.error('[Socket] Failed to initialize socket:', error);
        setConnectionStatus(SOCKET_STATUS.ERROR);
        setConnectionError(error.message || 'Failed to initialize socket');
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const on = useCallback((event, callback) => {
    if (!socket) return;
    socket.on(event, callback);
  }, [socket]);

  const off = useCallback((event, callback) => {
    if (!socket) return;
    socket.off(event, callback);
  }, [socket]);

  const emit = useCallback((event, data) => {
    if (!socket || typeof window === 'undefined') {
      return;
    }
    socket.emit(event, data);
  }, [socket]);

  const joinProject = useCallback((projectId) => {
    if (!socket || typeof window === 'undefined') return;
    socket.emit('join:project', projectId);
  }, [socket]);

  const leaveProject = useCallback((projectId) => {
    if (!socket || typeof window === 'undefined') return;
    socket.emit('leave:project', projectId);
  }, [socket]);

  // Fonction pour reconnecter manuellement
  const reconnect = useCallback(async () => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }
    reconnectAttempts.current = 0;

    // Réinitialiser le socket - le useEffect sera re-triggé
    setSocket(null);
    setIsConnected(false);
    setConnectionStatus(SOCKET_STATUS.IDLE);
  }, []);

  const value = {
    socket,
    isConnected,
    connectionStatus,
    connectionError,
    on,
    off,
    emit,
    joinProject,
    leaveProject,
    reconnect,
    // Expose status constants for consumers
    SOCKET_STATUS
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

// Export status constants for external use
export { SOCKET_STATUS };
