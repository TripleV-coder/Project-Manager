'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { formatStatusInfo } from '@/lib/statusTransitionUtils';
import { getStatusConfig, WORKFLOW_CONFIG } from '@/lib/workflows';

/**
 * TaskStatusWorkflow
 * Advanced status component showing:
 * - Current status with visual indicators
 * - Available transitions
 * - Auto-transition countdown
 * - Escalation warnings
 * - Status history timeline
 */
export default function TaskStatusWorkflow({
  task,
  onStatusChange,
  readOnly = false,
  showHistory = true,
  showAutoTransition = true,
  showEscalation = true
}) {
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);
  const [checklist, setChecklist] = useState(task?.checklist || []);

  // Recalculate status info when task changes
  useEffect(() => {
    if (task) {
      const info = formatStatusInfo(task, 'task', {});
      setStatusInfo(info);
      setChecklist(task.checklist || []);
    }
  }, [task]);

  const currentStatusConfig = useMemo(() => {
    return getStatusConfig('task', task?.statut);
  }, [task?.statut]);

  const completionPercentage = useMemo(() => {
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter(item => item.complété).length;
    return (completed / checklist.length) * 100;
  }, [checklist]);

  const workflowConfig = WORKFLOW_CONFIG.task;
  const statusTransitions = workflowConfig.transitions[task?.statut] || {};
  const availableNextStatuses = Object.keys(statusTransitions).filter(
    status => statusTransitions[status].allowed !== false
  );

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error changing status');
      }

      const data = await response.json();
      toast.success('Status updated successfully');
      
      if (onStatusChange) {
        onStatusChange(data.task);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!task || !currentStatusConfig) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Current Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={currentStatusConfig.color}>
                {currentStatusConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentStatusConfig.description}
              </span>
            </div>

            {!readOnly && availableNextStatuses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    Change <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableNextStatuses.map(status => {
                    const statusConfig = getStatusConfig('task', status);
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={loading}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col gap-1">
                          <span>{statusConfig?.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {statusConfig?.description}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Completion Progress */}
          {checklist && checklist.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          )}

          {/* Available Transitions */}
          {availableNextStatuses.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Available next status:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableNextStatuses.map(status => {
                  const statusConfig = getStatusConfig('task', status);
                  return (
                    <div
                      key={status}
                      className="flex items-center gap-2 text-xs"
                    >
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Transition Section */}
      {showAutoTransition && statusInfo?.autoTransition && (
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="font-semibold mb-1">
              Auto-transition scheduled
            </div>
            <div className="text-sm">
              Will automatically change to{' '}
              <strong>{statusInfo.autoTransition.targetStatus}</strong>
              {statusInfo.autoTransition.readyInDays > 0 ? (
                <>
                  {' '}in {statusInfo.autoTransition.readyInDays} days
                </>
              ) : (
                <> when ready</>
              )}
            </div>
            <div className="text-xs mt-2 opacity-75">
              {statusInfo.autoTransition.reason}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Escalation Warning */}
      {showEscalation && statusInfo?.escalation && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <div className="font-semibold mb-1">
              Escalation needed
            </div>
            <div className="text-sm">
              {statusInfo.escalation.action}: {statusInfo.escalation.reason}
            </div>
            <div className="text-xs mt-2 opacity-75">
              Been in this status for {statusInfo.escalation.daysSince} days
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline Section */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Workflow Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Current Status Timeline Item */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${currentStatusConfig.color}`} />
                  <div className="w-0.5 h-12 bg-border" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {currentStatusConfig.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Since {task.updated_at
                      ? new Date(task.updated_at).toLocaleDateString()
                      : 'unknown'}
                  </p>
                </div>
              </div>

              {/* Created Status Timeline Item */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">
                    {task.created_at
                      ? new Date(task.created_at).toLocaleDateString()
                      : 'unknown'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Rules Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Workflow Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-2 text-muted-foreground">
            <p>
              <strong>Current Status:</strong> {currentStatusConfig.label}
            </p>
            <p>
              <strong>Auto-advance:</strong> When 80% of checklist is complete,
              task automatically moves to Review
            </p>
            <p>
              <strong>Completion:</strong> Task marked as completed only after
              passing review
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
