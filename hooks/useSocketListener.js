import { useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';

/**
 * Hook to subscribe to socket events
 * Automatically cleans up listeners on unmount
 * 
 * @param {string|string[]} events - Event name(s) to listen to
 * @param {function} callback - Callback function when event is received
 * @param {boolean} enabled - Whether to listen (default: true)
 */
export function useSocketListener(events, callback, enabled = true) {
  const { on, off } = useSocket();

  useEffect(() => {
    if (!enabled) return;

    const eventList = Array.isArray(events) ? events : [events];

    eventList.forEach(event => {
      on(event, callback);
    });

    return () => {
      eventList.forEach(event => {
        off(event, callback);
      });
    };
  }, [events, callback, enabled, on, off]);
}

/**
 * Hook to listen for single event occurrence
 */
export function useSocketOnce(event, callback, enabled = true) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !enabled) return;

    socket.once(event, callback);

    return () => {
      // Clean up if component unmounts before event fires
      socket.off(event, callback);
    };
  }, [event, callback, enabled, socket]);
}
