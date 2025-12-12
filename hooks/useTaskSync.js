import { useEffect, useCallback } from 'react';
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

  const {
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTaskMoved
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

    const handleTaskCreated = (data) => {
      onTaskCreated?.(data);
    };

    const handleTaskUpdated = (data) => {
      onTaskUpdated?.(data);
    };

    const handleTaskDeleted = (data) => {
      onTaskDeleted?.(data);
    };

    const handleTaskMoved = (data) => {
      onTaskMoved?.(data);
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
  }, [projectId, on, off, onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskMoved]);
}
