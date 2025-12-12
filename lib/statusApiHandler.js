import { NextResponse } from 'next/server';
import {
  executeStatusTransition,
  getNextStatuses,
  formatStatusInfo
} from './statusTransitionUtils';
import { WORKFLOW_CONFIG } from './workflows';

/**
 * Handle status transition via API
 * Used by all endpoints that change status
 * @param {object} entity - Entity to transition
 * @param {string} entityType - Type of entity
 * @param {string} newStatus - Target status
 * @param {object} user - Current user
 * @param {object} options - Additional options
 * @returns {NextResponse} JSON response
 */
export async function handleStatusChangeApi(
  entity,
  entityType,
  newStatus,
  user,
  options = {}
) {
  const {
    saveFunc = null,
    auditFunc = null,
    emitFunc = null,
    validateFunc = null
  } = options;

  if (!entity) {
    return NextResponse.json(
      { error: `${entityType} not found` },
      { status: 404 }
    );
  }

  // Get user permissions
  const userPermissions = user.role_id?.permissions || {};

  // Execute transition check and get update data
  const transitionResult = await executeStatusTransition(
    entity,
    entityType,
    newStatus,
    user._id,
    userPermissions
  );

  if (!transitionResult.success) {
    return NextResponse.json(
      { error: transitionResult.message },
      { status: 400 }
    );
  }

  // Apply any custom validation
  if (validateFunc) {
    const validationResult = validateFunc(entity, newStatus);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.message },
        { status: 400 }
      );
    }
  }

  // Update entity with transition data
  Object.assign(entity, transitionResult.updateData);

  // Save entity
  if (saveFunc) {
    await saveFunc(entity);
  } else {
    await entity.save();
  }

  // Create audit log if provided
  if (auditFunc) {
    await auditFunc(
      user,
      'modification',
      entityType,
      entity._id,
      `Changement statut: ${transitionResult.previousStatus} → ${transitionResult.newStatus}`
    );
  }

  // Emit socket event if provided
  if (emitFunc) {
    emitFunc({
      type: 'status_changed',
      entity: entityType,
      entityId: entity._id,
      oldStatus: transitionResult.previousStatus,
      newStatus: transitionResult.newStatus,
      timestamp: new Date()
    });
  }

  return NextResponse.json({
    message: `Statut changé à ${newStatus}`,
    entity,
    transition: {
      from: transitionResult.previousStatus,
      to: transitionResult.newStatus,
      reason: transitionResult.transition.reason
    }
  });
}

/**
 * Get available transitions for an entity
 * Used for UI to show valid next statuses
 * @param {object} entity - Entity document
 * @param {string} entityType - Type of entity
 * @param {object} user - Current user
 * @returns {NextResponse} JSON response with available transitions
 */
export function handleGetStatusOptionsApi(entity, entityType, user) {
  const userPermissions = user.role_id?.permissions || {};
  const statusInfo = formatStatusInfo(entity, entityType, userPermissions);

  return NextResponse.json({
    current: statusInfo.current,
    available: statusInfo.available,
    config: WORKFLOW_CONFIG[entityType]?.statuses || {},
    autoTransition: statusInfo.autoTransition,
    escalation: statusInfo.escalation
  });
}

/**
 * Validate a status transition without executing it
 * Used to check if transition is allowed before user attempts it
 * @param {string} entityType - Type of entity
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {object} user - Current user
 * @returns {NextResponse} JSON response with validation result
 */
export function validateStatusTransitionApi(entityType, fromStatus, toStatus, user) {
  const userPermissions = user.role_id?.permissions || {};

  // Import validation functions
  const { isTransitionAllowed } = require('./workflows');

  const result = isTransitionAllowed(entityType, fromStatus, toStatus, userPermissions);

  return NextResponse.json({
    allowed: result.allowed,
    reason: result.reason,
    timeRequired: result.timeRequired
  });
}

/**
 * Get all workflow configurations
 * Useful for frontend to build UI based on available transitions
 * @returns {NextResponse} JSON response with workflow configs
 */
export function getWorkflowConfigApi() {
  const configWithoutFunctions = {};

  for (const [entityType, config] of Object.entries(WORKFLOW_CONFIG)) {
    configWithoutFunctions[entityType] = {
      statuses: config.statuses,
      transitions: config.transitions,
      autoTransitions: Object.keys(config.autoTransitions || {}).reduce((acc, status) => {
        const auto = config.autoTransitions[status];
        acc[status] = {
          targetStatus: auto.targetStatus,
          timeAfterDays: auto.timeAfterDays,
          description: auto.description
        };
        return acc;
      }, {}),
      escalationRules: config.escalationRules || {}
    };
  }

  return NextResponse.json(configWithoutFunctions);
}

export default {
  handleStatusChangeApi,
  handleGetStatusOptionsApi,
  validateStatusTransitionApi,
  getWorkflowConfigApi
};
