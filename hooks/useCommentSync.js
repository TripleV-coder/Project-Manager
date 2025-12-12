import { useEffect } from 'react';
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

  const {
    onCommentCreated,
    onCommentUpdated,
    onCommentDeleted
  } = callbacks;

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
      onCommentCreated?.(data);
    };

    const handleCommentUpdated = (data) => {
      onCommentUpdated?.(data);
    };

    const handleCommentDeleted = (data) => {
      onCommentDeleted?.(data);
    };

    on(SOCKET_EVENTS.COMMENT_CREATED, handleCommentCreated);
    on(SOCKET_EVENTS.COMMENT_UPDATED, handleCommentUpdated);
    on(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);

    return () => {
      off(SOCKET_EVENTS.COMMENT_CREATED, handleCommentCreated);
      off(SOCKET_EVENTS.COMMENT_UPDATED, handleCommentUpdated);
      off(SOCKET_EVENTS.COMMENT_DELETED, handleCommentDeleted);
    };
  }, [projectId, on, off, onCommentCreated, onCommentUpdated, onCommentDeleted]);
}
