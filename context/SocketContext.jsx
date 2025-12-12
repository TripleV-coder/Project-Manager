'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initSocket = async () => {
      try {
        const { initializeSocketClient, disconnectSocket } = await import('@/lib/socket-client');
        
        const token = localStorage.getItem('pm_token');

        if (!token) {
          return;
        }

        const socketInstance = initializeSocketClient(token);
        setSocket(socketInstance);

        const handleConnect = () => {
          setIsConnected(true);
        };

        const handleDisconnect = () => {
          setIsConnected(false);
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);

        return () => {
          socketInstance.off('connect', handleConnect);
          socketInstance.off('disconnect', handleDisconnect);
          disconnectSocket();
        };
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();
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

  const value = {
    socket,
    isConnected,
    on,
    off,
    emit,
    joinProject,
    leaveProject
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
