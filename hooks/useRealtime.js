'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { toast } from 'sonner';

/**
 * Hook for simplified real-time updates with automatic error handling
 * 
 * Usage:
 * const { data, loading, error, subscribe, unsubscribe } = useRealtime(
 *   'task:updated',
 *   (data) => console.log('Task updated:', data)
 * );
 */
export function useRealtime(eventName, onDataReceived, options = {}) {
  const { socket, isConnected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const {
    showErrorToast = true,
    errorMessage = 'Connection lost',
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [retryCount, setRetryCount] = useState(0);

  // Subscribe to event
  const subscribe = useCallback(() => {
    if (!socket || !isConnected) {
      setError(new Error('Socket not connected'));
      return;
    }

    const handleEvent = (receivedData) => {
      try {
        setData(receivedData);
        setError(null);
        if (onDataReceived) {
          onDataReceived(receivedData);
        }
      } catch (err) {
        console.error(`Error handling ${eventName}:`, err);
        setError(err);
        if (showErrorToast) {
          toast.error(`Error processing ${eventName}: ${err.message}`);
        }
      }
    };

    socket.on(eventName, handleEvent);

    // Return cleanup function
    return () => {
      socket.off(eventName, handleEvent);
    };
  }, [socket, isConnected, eventName, onDataReceived, showErrorToast]);

  // Unsubscribe from event
  const unsubscribe = useCallback(() => {
    if (socket) {
      socket.off(eventName);
    }
  }, [socket, eventName]);

  // Auto-subscribe on mount and when dependencies change
  useEffect(() => {
    if (!isConnected) {
      setError(new Error('Socket disconnected'));
      if (showErrorToast && retryCount < maxRetries) {
        // Retry after delay
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000);
        return () => clearTimeout(timer);
      }
      return;
    }

    const cleanup = subscribe();
    return () => cleanup?.();
  }, [isConnected, subscribe, showErrorToast, retryCount, maxRetries]);

  // Handle connection state changes
  useEffect(() => {
    if (!isConnected && showErrorToast) {
      toast.error(errorMessage);
    }
  }, [isConnected, showErrorToast, errorMessage]);

  return {
    data,
    loading,
    error,
    isConnected,
    subscribe,
    unsubscribe
  };
}

/**
 * Hook for emitting real-time events
 * 
 * Usage:
 * const { emit, loading, error } = useRealtimeEmit();
 * await emit('task:update', { taskId, status: 'done' });
 */
export function useRealtimeEmit() {
  const { socket, isConnected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const emit = useCallback(
    async (eventName, data = {}, timeout = 30000) => {
      if (!socket || !isConnected) {
        const err = new Error('Socket not connected');
        setError(err);
        toast.error('Connection lost');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('Event timeout'));
          }, timeout);

          socket.emit(eventName, data, (response) => {
            clearTimeout(timer);
            if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });
      } catch (err) {
        setError(err);
        toast.error(`Failed to emit ${eventName}: ${err.message}`);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [socket, isConnected]
  );

  return {
    emit,
    loading,
    error,
    isConnected
  };
}

/**
 * Hook for listening to multiple events at once
 * 
 * Usage:
 * const { unsubscribe } = useRealtimeMulti({
 *   'task:created': (data) => console.log('Task created', data),
 *   'task:updated': (data) => console.log('Task updated', data),
 *   'task:deleted': (data) => console.log('Task deleted', data)
 * });
 */
const DEFAULT_HANDLERS = {};

export function useRealtimeMulti(eventHandlers = DEFAULT_HANDLERS) {
  const { socket, isConnected } = useSocket();
  const [error, setError] = useState(null);

  const unsubscribe = useCallback(() => {
    if (!socket) return;
    Object.keys(eventHandlers).forEach(eventName => {
      socket.off(eventName);
    });
  }, [socket, eventHandlers]);

  useEffect(() => {
    if (!socket || !isConnected) {
      setError(new Error('Socket not connected'));
      return;
    }

    setError(null);

    // Subscribe to all events
    const unsubscribers = Object.entries(eventHandlers).map(([eventName, handler]) => {
      const handleEvent = (data) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in handler for ${eventName}:`, err);
          setError(err);
          toast.error(`Error in ${eventName} handler: ${err.message}`);
        }
      };

      socket.on(eventName, handleEvent);

      return () => socket.off(eventName, handleEvent);
    });

    // Cleanup
    return () => {
      unsubscribers.forEach(cleanup => cleanup?.());
    };
  }, [socket, isConnected, eventHandlers]);

  return { error, unsubscribe };
}
