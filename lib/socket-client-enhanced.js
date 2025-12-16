import { io } from 'socket.io-client';

/**
 * Enhanced Socket.io client with automatic reconnection, error handling, and health monitoring
 */

let socketInstance = null;
let reconnectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_DELAY = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
let healthCheckInterval = null;

/**
 * Initialize Socket.io client with enhanced error handling and recovery
 */
export function initializeSocketClientEnhanced(token) {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';

  socketInstance = io(socketServerUrl, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: RECONNECTION_DELAY,
    reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
    transports: ['websocket', 'polling'],
    secure: true,
    rejectUnauthorized: false
  });

  setupEventHandlers();
  startHealthCheck();

  return socketInstance;
}

/**
 * Setup comprehensive event handlers
 */
function setupEventHandlers() {
  socketInstance.on('connect', handleConnect);
  socketInstance.on('disconnect', handleDisconnect);
  socketInstance.on('connect_error', handleConnectError);
  socketInstance.on('reconnect_attempt', handleReconnectAttempt);
  socketInstance.on('error', handleSocketError);
}

/**
 * Handle successful connection
 */
function handleConnect() {
  reconnectionAttempts = 0;
  if (typeof window !== 'undefined') {
    console.log('[OK] Socket connected');
    window.dispatchEvent(new CustomEvent('socket:connected'));
  }
}

/**
 * Handle disconnection
 */
function handleDisconnect(reason) {
  // Clean up health check interval on disconnect to prevent memory leaks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  if (typeof window !== 'undefined') {
    console.warn('Socket disconnected:', reason);
    window.dispatchEvent(new CustomEvent('socket:disconnected', { detail: { reason } }));
  }
}

/**
 * Handle connection errors with exponential backoff
 */
function handleConnectError(error) {
  if (typeof window !== 'undefined') {
    console.error('[ERROR] Socket connection error:', error);
    window.dispatchEvent(new CustomEvent('socket:error', { detail: { error } }));
  }

  if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
    reconnectionAttempts++;
    const delay = RECONNECTION_DELAY * Math.pow(1.5, reconnectionAttempts - 1);
    console.log(`🔄 Retrying connection (attempt ${reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS}) in ${delay}ms`);
  }
}

/**
 * Handle reconnection attempts
 */
function handleReconnectAttempt() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('socket:reconnecting'));
  }
}

/**
 * Handle socket errors
 */
function handleSocketError(error) {
  if (typeof window !== 'undefined') {
    console.error('[ERROR] Socket error:', error);
    window.dispatchEvent(new CustomEvent('socket:error', { detail: { error } }));
  }
}

/**
 * Start periodic health checks to ensure connection is alive
 */
function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(() => {
    if (socketInstance?.connected) {
      socketInstance.emit('ping', (_response) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socket:health', { detail: { healthy: true } }));
        }
      });
    }
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Get Socket.io client instance
 */
export function getSocketClientEnhanced() {
  if (!socketInstance) {
    throw new Error('Socket.io not initialized. Call initializeSocketClientEnhanced first.');
  }
  return socketInstance;
}

/**
 * Disconnect Socket.io
 */
export function disconnectSocketEnhanced() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Listen to socket events with automatic cleanup
 */
export function onSocketEvent(eventName, callback) {
  const socket = getSocketClientEnhanced();
  socket.on(eventName, callback);

  // Return cleanup function
  return () => {
    socket.off(eventName, callback);
  };
}

/**
 * Emit socket event with acknowledgment
 */
export function emitSocketEvent(eventName, data = {}) {
  return new Promise((resolve, reject) => {
    const socket = getSocketClientEnhanced();

    if (!socket.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit(eventName, data, (response) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Socket event timeout'));
    }, 30000);
  });
}

/**
 * Join project room
 */
export function joinProjectRoom(projectId) {
  return emitSocketEvent('join:project', { projectId });
}

/**
 * Leave project room
 */
export function leaveProjectRoom(projectId) {
  return emitSocketEvent('leave:project', { projectId });
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
  return socketInstance?.connected ?? false;
}

/**
 * Get socket connection stats
 */
export function getSocketStats() {
  return {
    connected: socketInstance?.connected ?? false,
    reconnectionAttempts,
    maxReconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
    serverUrl: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000',
    transportName: socketInstance?.io?.engine?.transport?.name ?? 'unknown'
  };
}
