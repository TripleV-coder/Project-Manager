import {
  isTransitionAllowed,
  getAvailableTransitions,
  checkAutoTransition,
  getEscalationAction
} from './workflows';

/**
 * Execute a status transition and return result with audit info
 * @param {object} entity - Entity being transitioned
 * @param {string} entityType - Type of entity (task, timesheet, etc)
 * @param {string} newStatus - Target status
 * @param {string} userId - User ID performing the transition
 * @param {object} userPermissions - User permissions
 * @returns {object} {success, message, previousStatus, newStatus, transition}
 */
export async function executeStatusTransition(
  entity,
  entityType,
  newStatus,
  userId,
  userPermissions = {}
) {
  const currentStatus = entity.statut || entity.status || entity.lu;
  
  // Validate transition
  const transitionCheck = isTransitionAllowed(
    entityType,
    currentStatus,
    newStatus,
    userPermissions
  );

  if (!transitionCheck.allowed) {
    return {
      success: false,
      message: transitionCheck.reason,
      error: true
    };
  }

  // Update entity with new status and metadata
  const updateData = {
    statut: newStatus,
    status: newStatus, // Some models use 'status' instead of 'statut'
    updated_at: new Date()
  };

  // Add validation metadata if transitioning to approved state
  if (newStatus === 'validé' || newStatus === 'Validé') {
    updateData.validé_par = userId;
    updateData.date_validation = new Date();
  }

  // Add completion date if transitioning to completed state
  if (newStatus === 'Terminé') {
    updateData.date_complétion = new Date();
  }

  return {
    success: true,
    message: `Transition de ${currentStatus} à ${newStatus} autorisée`,
    previousStatus: currentStatus,
    newStatus,
    updateData,
    transition: transitionCheck
  };
}

/**
 * Get all valid next statuses for an entity
 * @param {object} entity - Entity document
 * @param {string} entityType - Type of entity
 * @param {object} userPermissions - User permissions
 * @returns {array} Array of available status objects with metadata
 */
export function getNextStatuses(entity, entityType, userPermissions = {}) {
  const currentStatus = entity.statut || entity.status;
  
  const availableStatusIds = getAvailableTransitions(
    entityType,
    currentStatus,
    userPermissions
  );

  return availableStatusIds;
}

/**
 * Check and apply automatic status transitions based on time and conditions
 * @param {object} entity - Entity to check
 * @param {string} entityType - Type of entity
 * @returns {object|null} Auto-transition info or null
 */
export function evaluateAutoTransition(entity, entityType) {
  const currentStatus = entity.statut || entity.status;
  
  const autoTransition = checkAutoTransition(entityType, currentStatus, entity);

  if (!autoTransition) {
    return null;
  }

  // Check if enough time has passed since last status change
  if (entity.updated_at) {
    const daysSinceUpdate = Math.floor(
      (new Date() - new Date(entity.updated_at)) / (1000 * 60 * 60 * 24)
    );
    
    // If variation days adjusted the requirement, use that
    const requiredDays = autoTransition.variationDays ?? autoTransition.originalDays;
    
    if (daysSinceUpdate < requiredDays) {
      return null; // Not ready for auto-transition yet
    }
  }

  return autoTransition;
}

/**
 * Process an escalation action if status timeout is exceeded
 * @param {object} entity - Entity to check
 * @param {string} entityType - Type of entity
 * @returns {object|null} Escalation action or null
 */
export function evaluateEscalation(entity, entityType) {
  const currentStatus = entity.statut || entity.status;
  
  // Use updated_at as status start date
  const statusStartDate = entity.updated_at || entity.created_at;
  
  if (!statusStartDate) {
    return null;
  }

  return getEscalationAction(entityType, currentStatus, statusStartDate);
}

/**
 * Format status information for API response
 * @param {object} entity - Entity document
 * @param {string} entityType - Type of entity
 * @param {object} userPermissions - User permissions
 * @returns {object} Formatted status object
 */
export function formatStatusInfo(entity, entityType, userPermissions = {}) {
  const currentStatus = entity.statut || entity.status;
  
  const nextStatuses = getNextStatuses(entity, entityType, userPermissions);
  const autoTransition = evaluateAutoTransition(entity, entityType);
  const escalation = evaluateEscalation(entity, entityType);

  return {
    current: currentStatus,
    available: nextStatuses,
    autoTransition: autoTransition ? {
      targetStatus: autoTransition.targetStatus,
      reason: autoTransition.reason,
      readyInDays: Math.max(0, (autoTransition.variationDays ?? autoTransition.originalDays) - Math.floor((new Date() - new Date(entity.updated_at)) / (1000 * 60 * 60 * 24)))
    } : null,
    escalation: escalation ? {
      action: escalation.action,
      reason: escalation.reason,
      daysSince: escalation.daysSince
    } : null
  };
}

/**
 * Apply time-based status adjustments to a batch of entities
 * Useful for scheduled jobs or bulk operations
 * @param {array} entities - Array of entities
 * @param {string} entityType - Type of entities
 * @returns {array} Array of entities that need auto-transitions
 */
export function findEntitiesNeedingAutoTransition(entities, entityType) {
  return entities
    .map(entity => {
      const autoTransition = evaluateAutoTransition(entity, entityType);
      if (autoTransition) {
        return {
          entity,
          autoTransition,
          id: entity._id
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Check if a status change requires approval/permissions
 * @param {string} entityType - Type of entity
 * @param {string} fromStatus - From status
 * @param {string} toStatus - To status
 * @returns {object} {requiresApproval: boolean, permissions: array}
 */
export function getTransitionRequirements(entityType, fromStatus, toStatus) {
  const config = {
    task: {},
    timesheet: {
      'brouillon:soumis': false,
      'soumis:validé': { permissions: ['voirTempsPasses', 'adminConfig'] },
      'soumis:refusé': { permissions: ['voirTempsPasses', 'adminConfig'] }
    },
    expense: {
      'en_attente:validé': { permissions: ['modifierBudget', 'adminConfig'] },
      'en_attente:refusé': { permissions: ['modifierBudget', 'adminConfig'] }
    },
    sprint: {},
    project: {},
    deliverable: {
      'En validation:Validé': { permissions: ['validerLivrables', 'adminConfig'] },
      'En validation:Refusé': { permissions: ['validerLivrables', 'adminConfig'] }
    }
  };

  const transitionKey = `${fromStatus}:${toStatus}`;
  const requirements = config[entityType]?.[transitionKey];

  if (!requirements) {
    return {
      requiresApproval: false,
      permissions: []
    };
  }

  return {
    requiresApproval: true,
    permissions: requirements.permissions || []
  };
}

export default {
  executeStatusTransition,
  getNextStatuses,
  evaluateAutoTransition,
  evaluateEscalation,
  formatStatusInfo,
  findEntitiesNeedingAutoTransition,
  getTransitionRequirements
};
