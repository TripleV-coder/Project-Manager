/**
 * EXAMPLE: How to integrate the workflow status system into existing API routes
 * 
 * This file shows how to update the app/api/[[...path]]/route.js endpoints
 * to use the centralized workflow configuration.
 * 
 * Copy relevant patterns to your actual route handlers.
 */

import { NextResponse } from 'next/server';
import { handleStatusChangeApi } from './statusApiHandler';
import { formatStatusInfo } from './statusTransitionUtils';
import { createAuditLog, emitSocketEvent } from '@/lib/socket-emitter';
import Task from '@/models/Task';
import TimesheetEntry from '@/models/TimesheetEntry';
import Expense from '@/models/Budget';
import Sprint from '@/models/Sprint';

/**
 * EXAMPLE 1: Task Move Endpoint (Kanban)
 * PUT /api/tasks/:id/move
 * 
 * OLD CODE:
 * task.colonne_kanban = nouvelle_colonne;
 * if (nouveau_statut) task.statut = nouveau_statut;
 * ...
 * 
 * NEW CODE (using centralized workflow):
 */
export async function exampleTaskMoveHandler(path, body, user) {
  const taskId = path.split('/')[2];
  const { nouvelle_colonne, nouveau_statut, nouvel_ordre } = body;

  const task = await Task.findById(taskId);
  if (!task) {
    return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 });
  }

  // Use centralized workflow system for status validation
  const result = await handleStatusChangeApi(
    task,
    'task',
    nouveau_statut,
    user,
    {
      saveFunc: async (entity) => {
        entity.colonne_kanban = nouvelle_colonne;
        if (nouvel_ordre !== undefined) entity.ordre_priorité = nouvel_ordre;
        return await entity.save();
      },
      auditFunc: createAuditLog,
      emitFunc: (data) => emitSocketEvent('TASK_MOVED', data)
    }
  );

  return result;
}

/**
 * EXAMPLE 2: Timesheet Status Endpoint
 * PUT /api/timesheets/:id/status
 * 
 * OLD CODE:
 * const validTransitions = { 'brouillon': ['soumis'], ... };
 * if (!validTransitions[timesheet.statut]?.includes(statut)) {
 *   return error;
 * }
 * timesheet.statut = statut;
 * 
 * NEW CODE (using centralized workflow):
 */
export async function exampleTimesheetStatusHandler(path, body, user) {
  const timesheetId = path.split('/')[2];
  const { statut: newStatus } = body;

  const timesheet = await TimesheetEntry.findById(timesheetId);
  if (!timesheet) {
    return NextResponse.json(
      { error: 'Timesheet non trouvé' },
      { status: 404 }
    );
  }

  // Check ownership
  const isOwner = timesheet.utilisateur.toString() === user._id.toString();
  const canValidate = user.role_id?.permissions?.voirTempsPasses;

  if (!isOwner && !canValidate) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Use centralized workflow system
  const result = await handleStatusChangeApi(
    timesheet,
    'timesheet',
    newStatus,
    user,
    {
      saveFunc: async (entity) => await entity.save(),
      auditFunc: createAuditLog,
      emitFunc: (data) => emitSocketEvent('TIMESHEET_STATUS_CHANGED', data)
    }
  );

  return result;
}

/**
 * EXAMPLE 3: Expense Status Endpoint
 * PUT /api/expenses/:id/status
 */
export async function exampleExpenseStatusHandler(path, body, user) {
  const expenseId = path.split('/')[2];
  const { statut: newStatus } = body;

  const expense = await Expense.findById(expenseId);
  if (!expense) {
    return NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 });
  }

  const isCreator = expense.saisi_par.toString() === user._id.toString();
  const canValidate = user.role_id?.permissions?.modifierBudget;

  if (!isCreator && !canValidate) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const result = await handleStatusChangeApi(
    expense,
    'expense',
    newStatus,
    user,
    {
      saveFunc: async (entity) => await entity.save(),
      auditFunc: createAuditLog,
      emitFunc: (data) => emitSocketEvent('EXPENSE_STATUS_CHANGED', data)
    }
  );

  return result;
}

/**
 * EXAMPLE 4: Sprint Status Endpoints
 * PUT /api/sprints/:id/start
 * PUT /api/sprints/:id/complete
 */
export async function exampleSprintStartHandler(path, user) {
  const sprintId = path.split('/')[2];
  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    return NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 });
  }

  // Use centralized workflow for Planifié → Actif transition
  const result = await handleStatusChangeApi(
    sprint,
    'sprint',
    'Actif',
    user,
    {
      saveFunc: async (entity) => await entity.save(),
      auditFunc: createAuditLog,
      emitFunc: (data) => emitSocketEvent('SPRINT_STARTED', data)
    }
  );

  return result;
}

export async function exampleSprintCompleteHandler(path, user) {
  const sprintId = path.split('/')[2];
  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    return NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 });
  }

  // Use centralized workflow for Actif → Terminé transition
  const result = await handleStatusChangeApi(
    sprint,
    'sprint',
    'Terminé',
    user,
    {
      saveFunc: async (entity) => {
        entity.date_fin_réelle = new Date();
        return await entity.save();
      },
      auditFunc: createAuditLog,
      emitFunc: (data) => emitSocketEvent('SPRINT_COMPLETED', data)
    }
  );

  return result;
}

/**
 * EXAMPLE 5: Get Available Status Transitions (for UI)
 * GET /api/:entity/:id/status/options
 * 
 * This endpoint returns all available transitions for the current status
 * Useful for dynamically building UI buttons
 */
export async function exampleGetStatusOptionsHandler(path, user) {
  const parts = path.split('/');
  const entityType = parts[2]; // Extract from path: /api/:entityType/:id/status/options
  const entityId = parts[3];

  let entity = null;
  let modelMap = {
    tasks: Task,
    timesheets: TimesheetEntry,
    expenses: Expense,
    sprints: Sprint
  };

  const Model = modelMap[entityType];
  if (!Model) {
    return NextResponse.json({ error: 'Unknown entity type' }, { status: 400 });
  }

  entity = await Model.findById(entityId);
  if (!entity) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  // Get status info including available transitions
  const statusInfo = formatStatusInfo(entity, entityType.slice(0, -1), {}); // Remove 's' from plural

  return NextResponse.json({
    current: statusInfo.current,
    available: statusInfo.available,
    autoTransition: statusInfo.autoTransition,
    escalation: statusInfo.escalation
  });
}

/**
 * Integration Pattern Summary:
 * 
 * 1. Import necessary functions:
 *    import { handleStatusChangeApi } from '@/lib/statusApiHandler';
 *    import { formatStatusInfo } from '@/lib/statusTransitionUtils';
 * 
 * 2. For any status transition, use handleStatusChangeApi:
 *    const result = await handleStatusChangeApi(
 *      entity,
 *      entityType,
 *      newStatus,
 *      user,
 *      {
 *        saveFunc: async (entity) => await entity.save(),
 *        auditFunc: createAuditLog,
 *        emitFunc: (data) => emitSocketEvent(eventName, data)
 *      }
 *    );
 * 
 * 3. This automatically:
 *    - Validates the transition
 *    - Checks user permissions
 *    - Applies entity-specific fields (dates, validation info, etc.)
 *    - Calls your custom save function
 *    - Creates audit logs
 *    - Emits socket events for real-time updates
 * 
 * 4. Remove duplicated transition logic:
 *    - Delete hardcoded VALID_TRANSITIONS objects
 *    - Delete manual transition validation
 *    - Let the centralized system handle all rules
 * 
 * 5. Update UI components to use WorkflowStatusBadge or TaskStatusWorkflow
 *    instead of old StatusBadge
 */
