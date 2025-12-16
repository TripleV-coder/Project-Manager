/**
 * Helper to emit socket events from Next.js API routes
 * Since Next.js doesn't support WebSocket directly,
 * we communicate with a separate socket.io server via HTTP
 */

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:4000';

const SOCKET_TIMEOUT_MS = 5000;

/**
 * Helper to emit socket event with timeout (non-blocking, fire-and-forget)
 */
function sendSocketEvent(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SOCKET_TIMEOUT_MS);

  fetch(`${SOCKET_SERVER_URL}/emit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Socket event delivery failed (non-critical):', error.message);
    }
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Emit event to project members
 *
 * @param {string} projectId - Project ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export async function emitToProject(projectId, event, data) {
  sendSocketEvent({
    type: 'project',
    projectId,
    event,
    data
  });
}

/**
 * Emit event to specific user
 */
export async function emitToUser(userId, event, data) {
  sendSocketEvent({
    type: 'user',
    userId,
    event,
    data
  });
}

/**
 * Emit event to all connected users with specific permission
 */
export async function emitToUsersWithPermission(permission, event, data) {
  sendSocketEvent({
    type: 'permission',
    permission,
    event,
    data
  });
}

/**
 * Emit event to all connected users (broadcast)
 */
export async function emitToAll(event, data) {
  sendSocketEvent({
    type: 'broadcast',
    event,
    data
  });
}
