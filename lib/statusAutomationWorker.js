import {
  findEntitiesNeedingAutoTransition,
  evaluateAutoTransition,
  evaluateEscalation
} from './statusTransitionUtils';
import { connectToDatabase } from './mongodb';
import Task from '@/models/Task';
import TimesheetEntry from '@/models/TimesheetEntry';
import Expense from '@/models/Budget';
import Sprint from '@/models/Sprint';
import Project from '@/models/Project';
import Deliverable from '@/models/Deliverable';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';

/**
 * Automation configuration for each entity type
 */
const ENTITY_CONFIGS = {
  task: {
    model: Task,
    statusField: 'statut',
    queryFilter: { statut: { $ne: 'Terminé' } }
  },
  timesheet: {
    model: TimesheetEntry,
    statusField: 'statut',
    queryFilter: { statut: { $in: ['brouillon', 'soumis'] } }
  },
  expense: {
    model: Expense,
    statusField: 'statut',
    queryFilter: { statut: { $in: ['en_attente', 'validé'] } }
  },
  sprint: {
    model: Sprint,
    statusField: 'statut',
    queryFilter: { statut: { $ne: 'Terminé' } }
  },
  project: {
    model: Project,
    statusField: 'statut',
    queryFilter: { statut: { $in: ['Planification', 'En cours', 'En pause'] } }
  },
  deliverable: {
    model: Deliverable,
    statusField: 'statut_global',
    queryFilter: { statut_global: { $in: ['À produire', 'En validation'] } }
  }
};

/**
 * Process auto-transitions for a specific entity type
 * @param {string} entityType - Type of entity (task, timesheet, etc)
 * @returns {object} Summary of changes made
 */
export async function processAutoTransitionsForEntity(entityType) {
  try {
    await connectToDatabase();

    const config = ENTITY_CONFIGS[entityType];
    if (!config) {
      return {
        success: false,
        error: `Unknown entity type: ${entityType}`,
        processed: 0,
        transitioned: 0
      };
    }

    // Fetch entities that might need auto-transition
    const entities = await config.model.find(config.queryFilter).lean();

    const transitioned = [];
    
    for (const entity of entities) {
      const autoTransition = evaluateAutoTransition(entity, entityType);

      if (autoTransition) {
        // Perform the auto-transition
        try {
          const result = await config.model.findByIdAndUpdate(
            entity._id,
            {
              [config.statusField]: autoTransition.targetStatus,
              updated_at: new Date(),
              ...getStatusSpecificFields(entityType, autoTransition.targetStatus)
            },
            { new: true }
          );

          if (result) {
            transitioned.push({
              id: entity._id,
              from: entity[config.statusField],
              to: autoTransition.targetStatus,
              reason: autoTransition.reason
            });

            // Create audit log for auto-transition
            await createAutoTransitionAuditLog(
              entityType,
              entity._id,
              entity[config.statusField],
              autoTransition.targetStatus,
              autoTransition.reason
            );

            // Send notification
            await createTransitionNotification(
              entityType,
              entity._id,
              entity[config.statusField],
              autoTransition.targetStatus
            );
          }
        } catch (error) {
          console.error(`Error auto-transitioning ${entityType} ${entity._id}:`, error);
        }
      }

      // Also check for escalations
      const escalation = evaluateEscalation(entity, entityType);
      if (escalation) {
        await handleEscalation(entityType, entity, escalation);
      }
    }

    return {
      success: true,
      entityType,
      processed: entities.length,
      transitioned: transitioned.length,
      details: transitioned
    };
  } catch (error) {
    console.error(`Error processing auto-transitions for ${entityType}:`, error);
    return {
      success: false,
      error: error.message,
      entityType
    };
  }
}

/**
 * Process auto-transitions for all entity types
 * @returns {object} Summary of all changes
 */
export async function processAllAutoTransitions() {
  const results = {
    timestamp: new Date(),
    results: [],
    totalTransitioned: 0
  };

  for (const entityType of Object.keys(ENTITY_CONFIGS)) {
    try {
      const result = await processAutoTransitionsForEntity(entityType);
      results.results.push(result);
      if (result.success) {
        results.totalTransitioned += result.transitioned || 0;
      }
    } catch (error) {
      console.error(`Error processing ${entityType}:`, error);
      results.results.push({
        success: false,
        entityType,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get status-specific fields to update when changing status
 * @param {string} entityType - Type of entity
 * @param {string} newStatus - New status value
 * @returns {object} Additional fields to update
 */
function getStatusSpecificFields(entityType, newStatus) {
  const fields = {};

  // Task-specific
  if (entityType === 'task' && newStatus === 'Terminé') {
    fields.date_complétion = new Date();
  }

  // Timesheet-specific
  if (entityType === 'timesheet' && newStatus === 'validé') {
    fields.date_validation = new Date();
  }

  // Expense-specific
  if (entityType === 'expense' && newStatus === 'payé') {
    fields.date_paiement = new Date();
  }

  // Sprint-specific
  if (entityType === 'sprint') {
    if (newStatus === 'Actif') {
      fields.date_début_réelle = new Date();
    } else if (newStatus === 'Terminé') {
      fields.date_fin_réelle = new Date();
    }
  }

  return fields;
}

/**
 * Create audit log for auto-transition
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Entity ID
 * @param {string} fromStatus - From status
 * @param {string} toStatus - To status
 * @param {string} reason - Reason for transition
 */
async function createAutoTransitionAuditLog(entityType, entityId, fromStatus, toStatus, reason) {
  try {
    await AuditLog.create({
      utilisateur: null, // System action
      action: 'modification',
      type_entité: entityType,
      entité_id: entityId,
      description: `Auto-transition de ${fromStatus} à ${toStatus}: ${reason}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

/**
 * Create notification for auto-transition
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Entity ID
 * @param {string} fromStatus - From status
 * @param {string} toStatus - To status
 */
async function createTransitionNotification(entityType, entityId, fromStatus, toStatus) {
  try {
    let message = `Transition automatique de ${fromStatus} à ${toStatus}`;
    let priority = 'info';

    if (entityType === 'task') {
      message = `Tâche automatiquement passée à "${toStatus}"`;
    } else if (entityType === 'timesheet') {
      message = `Timesheet automatiquement soumis pour approbation`;
      priority = 'warning';
    } else if (entityType === 'expense') {
      message = `Dépense automatiquement traitée`;
    } else if (entityType === 'sprint') {
      message = `Sprint automatiquement ${toStatus === 'Actif' ? 'démarré' : 'terminé'}`;
      priority = 'warning';
    }

    await Notification.create({
      type: 'status_change',
      titre: `Changement de statut - ${entityType}`,
      message,
      entité_type: entityType,
      entité_id: entityId,
      priority,
      lu: false,
      date_création: new Date()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Handle escalation action
 * @param {string} entityType - Type of entity
 * @param {object} entity - Entity document
 * @param {object} escalation - Escalation info
 */
async function handleEscalation(entityType, entity, escalation) {
  try {
    let message = '';
    let notifyUserId = null;

    switch (escalation.action) {
      case 'notify':
        message = `${entityType} en attente depuis ${escalation.daysSince} jours`;
        notifyUserId = entity.assigné_à || entity.utilisateur || entity.créé_par;
        break;

      case 'notify_manager':
        message = `${entityType} en attente d'approbation depuis ${escalation.daysSince} jours`;
        break;

      case 'process_payment':
        // Auto-process payment
        await ENTITY_CONFIGS[entityType].model.findByIdAndUpdate(
          entity._id,
          {
            statut: 'payé',
            date_paiement: new Date(),
            updated_at: new Date()
          }
        );
        message = 'Paiement automatiquement traité';
        break;

      case 'reassign':
        message = `${entityType} non démarrée - réassignation requise`;
        break;

      default:
        return;
    }

    if (notifyUserId) {
      await Notification.create({
        type: 'escalation',
        titre: 'Escalade',
        message,
        entité_type: entityType,
        entité_id: entity._id,
        destinataire: notifyUserId,
        priority: 'warning',
        lu: false,
        date_création: new Date()
      });
    }
  } catch (error) {
    console.error('Error handling escalation:', error);
  }
}

/**
 * Check and update overdue tasks
 * Tasks with date_échéance in the past should be flagged
 */
export async function checkOverdueTasks() {
  try {
    await connectToDatabase();

    const overdueTasks = await Task.find({
      date_échéance: { $lt: new Date() },
      statut: { $ne: 'Terminé' }
    });

    for (const task of overdueTasks) {
      // Create notification or update task flags
      await Notification.create({
        type: 'overdue_task',
        titre: 'Tâche en retard',
        message: `La tâche "${task.titre}" a dépassé la date d'échéance`,
        entité_type: 'task',
        entité_id: task._id,
        destinataire: task.assigné_à,
        priority: 'critical',
        lu: false,
        date_création: new Date()
      });
    }

    return {
      success: true,
      overdueTasks: overdueTasks.length
    };
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  processAutoTransitionsForEntity,
  processAllAutoTransitions,
  checkOverdueTasks
};
