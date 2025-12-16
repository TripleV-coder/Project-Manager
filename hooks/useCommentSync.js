import { useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@/lib/socket-events';

/**
 * Hook to synchronize comments in real-time
 * Listens for comment creation, updates, and deletions
 *
 * @param {string} projectId - Project ID to sync comments for
 * @param {function} onCommentCreated - Callback when comment is created
 * @param {function} onCommentUpdated - Callback when comment is updated
 * @param {function} onCommentDeleted - Callback when comment is deleted
 */
export function useCommentSync(projectId, callbacks = {}) {
  const { on, off, joinProject } = useSocket();

  // Use refs to avoid re-subscribing when callbacks change
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Join project on mount
  useEffect(() => {
    if (projectId) {
      joinProject(projectId);
    }
  }, [projectId, joinProject]);

  // Setup event listeners
  useEffect(() => {
    if (!projectId) return;

    const handleCommentCreated = (data) => {
      callbacksRef.current.onCommentCreated?.(data);
    };

    const handleCommentUpdated = (data) => {
      callbacksRef.current.onCommentUpdated?.(data);
    };

    const handleCommentDeleted = (data) => {
      callbacksRef.current.onCommentDeleted?.(data);
    };

    on(SOCKET_EVENTS.COMMENT_CREATED, handleCommentCreated);
    on(SOCKET_EVENTS.COMMENT_UPDATED, handleCommentUpdated);
    on(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);

    return () => {
      off(SOCKET_EVENTS.COMMENT_CREATED, handleCommentCreated);
      off(SOCKET_EVENTS.COMMENT_UPDATED, handleCommentUpdated);
      off(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);
    };
  }, [projectId, on, off]);
}
