'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import {
  getStatusConfig,
  getAvailableTransitions
} from '@/lib/workflows';

/**
 * WorkflowStatusBadge
 * Universal status badge that works with any entity type
 * Uses centralized workflow configuration for all validation and UI
 * 
 * Props:
 * - type: Entity type (task, timesheet, expense, sprint, project, deliverable)
 * - status: Current status value
 * - entityId: ID of the entity
 * - entityType: Alternative to 'type' for clarity
 * - onStatusChange: Callback when status changes
 * - readOnly: If true, don't allow status changes
 * - canChange: User permission to change status
 * - endpoint: Custom endpoint for status update (defaults to /api/{type}s/{id}/status)
 * - autoRefresh: If true, refetch entity data after status change
 * - showTimeUntilAuto: If true, show countdown to auto-transition
 * - autoTransitionInfo: Object with {targetStatus, readyInDays} for display
 */
export default function WorkflowStatusBadge({
  type = 'task',
  status,
  entityId,
  entityType = null,
  onStatusChange,
  readOnly = false,
  canChange = true,
  endpoint = null,
  autoRefresh = false,
  showTimeUntilAuto = false,
  autoTransitionInfo = null
}) {
  const [loading, setLoading] = useState(false);
  const effectiveType = entityType || type;

  // Get status configuration
  const statusConfig = useMemo(() => {
    return getStatusConfig(effectiveType, status);
  }, [effectiveType, status]);

  // Get available transitions
  const availableTransitions = useMemo(() => {
    return getAvailableTransitions(effectiveType, status, {});
  }, [effectiveType, status]);

  if (!statusConfig) {
    return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
  }

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);

      // Build endpoint URL
      let apiEndpoint = endpoint;
      if (!apiEndpoint) {
        // Determine endpoint based on entity type
        const typeMap = {
          task: `tasks/${entityId}`,
          timesheet: `timesheets/${entityId}/status`,
          expense: `expenses/${entityId}/status`,
          sprint: `sprints/${entityId}`,
          project: `projects/${entityId}`,
          deliverable: `deliverables/${entityId}`
        };

        const basePath = typeMap[effectiveType] || `${effectiveType}s/${entityId}`;
        apiEndpoint = `/api/${basePath}`;
      }

      const token = localStorage.getItem('pm_token');
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: newStatus, status: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error changing status');
      }

      const data = await response.json();
      toast.success('Status updated successfully');
      
      if (onStatusChange) {
        onStatusChange(newStatus, data);
      }

      if (autoRefresh) {
        // Refresh page or refetch data
        window.location.reload();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const canTransition = availableTransitions.length > 0 && canChange && !readOnly;

  // Read-only view
  if (!canTransition) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={statusConfig.color}>
          {statusConfig.label}
        </Badge>
        {showTimeUntilAuto && autoTransitionInfo && autoTransitionInfo.readyInDays > 0 && (
          <span className="text-xs text-muted-foreground">
            Auto in {autoTransitionInfo.readyInDays}d
          </span>
        )}
      </div>
    );
  }

  // Editable view
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`${statusConfig.color} gap-1 h-6 px-2 text-xs`}
            disabled={loading}
          >
            {statusConfig.label}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableTransitions.map(targetStatus => {
            const targetConfig = getStatusConfig(effectiveType, targetStatus);
            return (
              <DropdownMenuItem
                key={targetStatus}
                onClick={() => handleStatusChange(targetStatus)}
                disabled={loading}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <span>{targetConfig?.label || targetStatus}</span>
                  {targetConfig?.description && (
                    <span className="text-xs text-muted-foreground">
                      {targetConfig.description}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {showTimeUntilAuto && autoTransitionInfo && autoTransitionInfo.readyInDays > 0 && (
        <span className="text-xs text-muted-foreground">
          Auto: {autoTransitionInfo.targetStatus} in {autoTransitionInfo.readyInDays}d
        </span>
      )}
    </div>
  );
}
