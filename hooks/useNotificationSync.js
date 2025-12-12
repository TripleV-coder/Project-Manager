import { useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@/lib/socket-events';

/**
 * Hook to synchronize notifications in real-time
 * Listens for new notifications and read status updates
 * 
 * @param {function} onNotificationCreated - Callback when notification is created
 * @param {function} onNotificationRead - Callback when notification is read
 */
export function useNotificationSync(callbacks = {}) {
  const { on, off } = useSocket();

  const {
    onNotificationCreated,
    onNotificationRead
  } = callbacks;

  // Setup event listeners
  useEffect(() => {
    const handleNotificationCreated = (data) => {
      onNotificationCreated?.(data);
    };

    const handleNotificationRead = (data) => {
      onNotificationRead?.(data);
    };

    on(SOCKET_EVENTS.NOTIFICATION_CREATED, handleNotificationCreated);
    on(SOCKET_EVENTS.NOTIFICATION_READ, handleNotificationRead);

    return () => {
      off(SOCKET_EVENTS.NOTIFICATION_CREATED, handleNotificationCreated);
      off(SOCKET_EVENTS.NOTIFICATION_READ, handleNotificationRead);
    };
  }, [on, off, onNotificationCreated, onNotificationRead]);
}
