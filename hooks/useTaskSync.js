import { useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@/lib/socket-events';

/**
 * Hook to synchronize tasks in real-time
 * Listens for task creation, updates, and deletions
 *
 * @param {string} projectId - Project ID to sync tasks for
 * @param {function} onTaskCreated - Callback when task is created
 * @param {function} onTaskUpdated - Callback when task is updated
 * @param {function} onTaskDeleted - Callback when task is deleted
 * @param {function} onTaskMoved - Callback when task is moved (Kanban)
 */
export function useTaskSync(projectId, callbacks = {}) {
  const { on, off, joinProject } = useSocket();

  // Use refs to avoid re-subscribing when callbacks change
  // This prevents memory leaks and unnecessary re-renders
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

    const handleTaskCreated = (data) => {
      callbacksRef.current.onTaskCreated?.(data);
    };

    const handleTaskUpdated = (data) => {
      callbacksRef.current.onTaskUpdated?.(data);
    };

    const handleTaskDeleted = (data) => {
      callbacksRef.current.onTaskDeleted?.(data);
    };

    const handleTaskMoved = (data) => {
      callbacksRef.current.onTaskMoved?.(data);
    };

    on(SOCKET_EVENTS.TASK_CREATED, handleTaskCreated);
    on(SOCKET_EVENTS.TASK_UPDATED, handleTaskUpdated);
    on(SOCKET_EVENTS.TASK_DELETED, handleTaskDeleted);
    on(SOCKET_EVENTS.TASK_MOVED, handleTaskMoved);

    return () => {
      off(SOCKET_EVENTS.TASK_CREATED, handleTaskCreated);
      off(SOCKET_EVENTS.TASK_UPDATED, handleTaskUpdated);
      off(SOCKET_EVENTS.TASK_DELETED, handleTaskDeleted);
      off(SOCKET_EVENTS.TASK_MOVED, handleTaskMoved);
    };
  }, [projectId, on, off]);
}
