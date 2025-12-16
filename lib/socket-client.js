import { io } from 'socket.io-client';

let socket = null;
let connectionAttempted = false;

/**
 * Initialize Socket.io client connection
 * Should be called once with the JWT token
 */
export function initializeSocketClient(token) {
  if (socket?.connected) return socket;

  // If we already tried and failed, don't spam connection attempts
  if (connectionAttempted && socket && !socket.connected) {
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';

  // Check if socket server URL is configured
  if (!process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
    console.warn('[Socket] NEXT_PUBLIC_SOCKET_SERVER_URL not configured, using default localhost:4000');
  }

  connectionAttempted = true;

  socket = io(socketUrl, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 3,
    transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
    timeout: 10000,
    autoConnect: true
  });

  // Connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected successfully');
    connectionAttempted = false; // Reset on successful connection
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.warn('[Socket] Error:', error?.message || error);
  });

  socket.on('connect_error', (error) => {
    // Only log once, not every retry
    if (!socket._hasLoggedError) {
      console.warn('[Socket] Connection failed:', error?.message || 'Server unavailable');
      socket._hasLoggedError = true;
    }
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
