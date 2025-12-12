import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize Socket.io client connection
 * Should be called once with the JWT token
 */
export function initializeSocketClient(token) {
  if (socket?.connected) return socket;

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';

  socket = io(socketUrl, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
  });

  // Connection events
  socket.on('connect', () => {
    // Socket connected
  });

  socket.on('disconnect', () => {
    // Socket disconnected
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

/**
 * Get Socket.io client instance
 */
export function getSocketClient() {
  return socket;
}

/**
 * Disconnect socket client
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
  return socket?.connected || false;
}
