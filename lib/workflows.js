/**
 * Centralized Workflow Configuration System
 * Defines all status transitions, time-based rules, and variation factors
 * 
 * For each entity, define:
 * - statuses: Available status values
 * - transitions: Valid transitions between statuses with conditions
 * - autoTransitions: Time-based automatic transitions
 * - variationFactors: Factors that affect transition timing
 */

export const WORKFLOW_CONFIG = {
  // Task workflow
  task: {
    statuses: {
      'Backlog': {
        label: 'Backlog',
        color: 'bg-gray-100 text-gray-800',
        description: 'Not yet started'
      },
      'À faire': {
        label: 'À faire',
        color: 'bg-blue-100 text-blue-800',
        description: 'Ready to start'
      },
      'En cours': {
        label: 'En cours',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Work in progress'
      },
      'Review': {
        label: 'Review',
        color: 'bg-purple-100 text-purple-800',
        description: 'Awaiting review'
      },
      'Terminé': {
        label: 'Terminé',
        color: 'bg-green-100 text-green-800',
        description: 'Completed'
      }
    },
    transitions: {
      'Backlog': {
        'À faire': {
          allowed: true,
          timeRequired: null,
          reason: 'Can move to ready state'
        }
      },
      'À faire': {
        'En cours': {
          allowed: true,
          timeRequired: null,
          reason: 'Can start work'
        },
        'Backlog': {
          allowed: true,
          timeRequired: null,
          reason: 'Can move back to backlog'
        }
      },
      'En cours': {
        'Review': {
          allowed: true,
          timeRequired: null,
          reason: 'Can request review'
        },
        'À faire': {
          allowed: true,
          timeRequired: null,
          reason: 'Can return to ready state'
        },
        'Terminé': {
          allowed: false,
          timeRequired: null,
          reason: 'Must go through review first'
        }
      },
      'Review': {
        'En cours': {
          allowed: true,
          timeRequired: null,
          reason: 'Can return to work'
        },
        'Terminé': {
          allowed: true,
          timeRequired: null,
          reason: 'Can complete after review'
        }
      },
      'Terminé': {}
    },
    // Automatic transitions based on time and factors
    autoTransitions: {
      'À faire': {
        targetStatus: 'En cours',
        timeAfterDays: 3,
        variationFactors: {
          priority: {
            'Critique': -2,
            'Haute': -1,
            'Moyenne': 0,
            'Basse': 1
          }
        },
        condition: (task) => task.date_début && new Date(task.date_début) <= new Date(),
        description: 'Auto-start task after X days if due date is reached'
      },
      'En cours': {
        targetStatus: 'Review',
        timeAfterDays: 5,
        variationFactors: {
          completionRatio: {
            min: 80,
            description: 'Auto-move to review when 80% of checklist is done'
          }
        },
        condition: (task) => {
          if (!task.checklist || task.checklist.length === 0) return false;
          const completed = task.checklist.filter(c => c.complété).length;
          return (completed / task.checklist.length) >= 0.8;
        },
        description: 'Auto-move to review when mostly complete'
      }
    },
    // Overdue handling
    overdueHandling: {
      threshold: 'date_échéance',
      statusIfOverdue: 'À faire',
      notifyAfterDays: 1,
      escalationLevels: [
        { days: 1, action: 'notify' },
        { days: 3, action: 'reassign' },
        { days: 7, action: 'escalate' }
      ]
    }
  },

  // Timesheet workflow
  timesheet: {
    statuses: {
      'brouillon': {
        label: 'Brouillon',
        color: 'bg-gray-100 text-gray-800',
        description: 'Draft - not submitted'
      },
      'soumis': {
        label: 'Soumis',
        color: 'bg-blue-100 text-blue-800',
        description: 'Submitted for approval'
      },
      'validé': {
        label: 'Validé',
        color: 'bg-green-100 text-green-800',
        description: 'Approved'
      },
      'refusé': {
        label: 'Refusé',
        color: 'bg-red-100 text-red-800',
        description: 'Rejected'
      }
    },
    transitions: {
      'brouillon': {
        'soumis': {
          allowed: true,
          timeRequired: null,
          reason: 'Owner can submit for approval'
        }
      },
      'soumis': {
        'brouillon': {
          allowed: true,
          timeRequired: null,
          reason: 'Owner can return to draft'
        },
        'validé': {
          allowed: true,
          timeRequired: null,
          permissions: ['voirTempsPasses', 'adminConfig'],
          reason: 'Approver can validate'
        },
        'refusé': {
          allowed: true,
          timeRequired: null,
          permissions: ['voirTempsPasses', 'adminConfig'],
          reason: 'Approver can reject'
        }
      },
      'validé': {
        // Terminal state - cannot change
      },
      'refusé': {
        'brouillon': {
          allowed: true,
          timeRequired: null,
          reason: 'Owner can rework after rejection'
        }
      }
    },
    // Auto-submission after X days
    autoTransitions: {
      'brouillon': {
        targetStatus: 'soumis',
        timeAfterDays: 7,
        variationFactors: {
          daysInMonth: {
            description: 'Auto-submit timesheets 5 days before month end'
          }
        },
        condition: (_timesheet) => {
          const today = new Date();
          const daysUntilMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
          return daysUntilMonthEnd <= 5;
        },
        description: 'Auto-submit timesheet near month end'
      }
    },
    // Approval timeout
    escalationRules: {
      'soumis': {
        timeoutAfterDays: 14,
        action: 'notify_manager',
        description: 'Notify manager if timesheet pending approval > 14 days'
      }
    }
  },

  // Expense workflow
  expense: {
    statuses: {
      'en_attente': {
        label: 'En attente',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Awaiting validation'
      },
      'validé': {
        label: 'Validé',
        color: 'bg-green-100 text-green-800',
        description: 'Approved'
      },
      'refusé': {
        label: 'Refusé',
        color: 'bg-red-100 text-red-800',
        description: 'Rejected'
      },
      'payé': {
        label: 'Payé',
        color: 'bg-indigo-100 text-indigo-800',
        description: 'Payment processed'
      }
    },
    transitions: {
      'en_attente': {
        'validé': {
          allowed: true,
          timeRequired: null,
          permissions: ['modifierBudget', 'adminConfig'],
          reason: 'Approver can validate'
        },
        'refusé': {
          allowed: true,
          timeRequired: null,
          permissions: ['modifierBudget', 'adminConfig'],
          reason: 'Approver can reject'
        }
      },
      'validé': {
        'payé': {
          allowed: true,
          timeRequired: 3,
          reason: 'Can process payment after validation'
        },
        'refusé': {
          allowed: true,
          timeRequired: null,
          reason: 'Can reject even after approval'
        }
      },
      'refusé': {
        'en_attente': {
          allowed: true,
          timeRequired: null,
          reason: 'Creator can resubmit'
        }
      },
      'payé': {
        // Terminal state
      }
    },
    // Auto-payment processing
    autoTransitions: {
      'validé': {
        targetStatus: 'payé',
        timeAfterDays: 3,
        variationFactors: {
          amount: {
            'low': 1,
            'medium': 2,
            'high': 3
          }
        },
        condition: (expense) => {
          if (!expense.date_validation) return false;
          const daysValidated = Math.floor((new Date() - new Date(expense.date_validation)) / (1000 * 60 * 60 * 24));
          return daysValidated >= 3;
        },
        description: 'Auto-process payment 3 days after approval'
      }
    },
    escalationRules: {
      'validé': {
        timeoutAfterDays: 7,
        action: 'process_payment',
        description: 'Auto-process payment if not done within 7 days'
      }
    }
  },

  // Sprint workflow
  sprint: {
    statuses: {
      'Planifié': {
        label: 'Planifié',
        color: 'bg-gray-100 text-gray-800',
        description: 'Planned but not started'
      },
      'Actif': {
        label: 'Actif',
        color: 'bg-blue-100 text-blue-800',
        description: 'Currently running'
      },
      'Terminé': {
        label: 'Terminé',
        color: 'bg-green-100 text-green-800',
        description: 'Completed'
      }
    },
    transitions: {
      'Planifié': {
        'Actif': {
          allowed: true,
          timeRequired: null,
          condition: (sprint) => new Date(sprint.date_début) <= new Date(),
          reason: 'Can start when date_début is reached'
        }
      },
      'Actif': {
        'Terminé': {
          allowed: true,
          timeRequired: null,
          condition: (sprint) => new Date(sprint.date_fin) <= new Date(),
          reason: 'Can complete when date_fin is reached'
        }
      },
      'Terminé': {}
    },
    // Auto-start and auto-complete sprints
    autoTransitions: {
      'Planifié': {
        targetStatus: 'Actif',
        timeAfterDays: 0,
        condition: (sprint) => new Date(sprint.date_début) <= new Date(),
        description: 'Auto-start sprint when start date is reached'
      },
      'Actif': {
        targetStatus: 'Terminé',
        timeAfterDays: 0,
        condition: (sprint) => new Date(sprint.date_fin) <= new Date(),
        description: 'Auto-complete sprint when end date is reached'
      }
    }
  },

  // Project workflow
  project: {
    statuses: {
      'Planification': {
        label: 'Planification',
        color: 'bg-gray-100 text-gray-800',
        description: 'In planning phase'
      },
      'En cours': {
        label: 'En cours',
        color: 'bg-blue-100 text-blue-800',
        description: 'Active'
      },
      'En pause': {
        label: 'En pause',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Paused'
      },
      'Terminé': {
        label: 'Terminé',
        color: 'bg-green-100 text-green-800',
        description: 'Completed'
      },
      'Annulé': {
        label: 'Annulé',
        color: 'bg-red-100 text-red-800',
        description: 'Cancelled'
      }
    },
    transitions: {
      'Planification': {
        'En cours': {
          allowed: true,
          timeRequired: null,
          reason: 'Can start project'
        }
      },
      'En cours': {
        'En pause': {
          allowed: true,
          timeRequired: null,
          reason: 'Can pause project'
        },
        'Terminé': {
          allowed: true,
          timeRequired: null,
          reason: 'Can complete project'
        },
        'Annulé': {
          allowed: true,
          timeRequired: null,
          reason: 'Can cancel project'
        }
      },
      'En pause': {
        'En cours': {
          allowed: true,
          timeRequired: null,
          reason: 'Can resume project'
        },
        'Annulé': {
          allowed: true,
          timeRequired: null,
          reason: 'Can cancel paused project'
        }
      },
      'Terminé': {},
      'Annulé': {}
    },
    autoTransitions: {
      'En cours': {
        targetStatus: 'Terminé',
        timeAfterDays: 0,
        variationFactors: {
          completionPercentage: {
            threshold: 100,
            description: 'Auto-complete when 100% of tasks/sprints are done'
          }
        },
        condition: (project) => {
          if (!project.stats) return false;
          const total = (project.stats.tâches || 0) + (project.stats.sprints || 0);
          const completed = (project.stats.tâches_terminées || 0) + (project.stats.sprints_terminés || 0);
          return total > 0 && (completed / total) === 1;
        },
        description: 'Auto-complete when all tasks and sprints are done'
      }
    }
  },

  // Deliverable workflow
  deliverable: {
    statuses: {
      'À produire': {
        label: 'À produire',
        color: 'bg-gray-100 text-gray-800',
        description: 'Not yet created'
      },
      'En validation': {
        label: 'En validation',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Under review'
      },
      'Validé': {
        label: 'Validé',
        color: 'bg-green-100 text-green-800',
        description: 'Approved'
      },
      'Refusé': {
        label: 'Refusé',
        color: 'bg-red-100 text-red-800',
        description: 'Rejected'
      },
      'Archivé': {
        label: 'Archivé',
        color: 'bg-gray-500 text-gray-100',
        description: 'Archived'
      }
    },
    transitions: {
      'À produire': {
        'En validation': {
          allowed: true,
          timeRequired: null,
          reason: 'Can submit for validation'
        }
      },
      'En validation': {
        'Validé': {
          allowed: true,
          timeRequired: null,
          permissions: ['validerLivrables', 'adminConfig'],
          reason: 'Can approve deliverable'
        },
        'Refusé': {
          allowed: true,
          timeRequired: null,
          permissions: ['validerLivrables', 'adminConfig'],
          reason: 'Can reject deliverable'
        }
      },
      'Validé': {
        'Archivé': {
          allowed: true,
          timeRequired: null,
          reason: 'Can archive'
        }
      },
      'Refusé': {
        'À produire': {
          allowed: true,
          timeRequired: null,
          reason: 'Can rework'
        }
      },
      'Archivé': {}
    },
    autoTransitions: {
      'En validation': {
        targetStatus: 'Validé',
        timeAfterDays: 14,
        condition: (deliverable) => {
          if (!deliverable.date_soumise) return false;
          const daysSinceSubmit = Math.floor((new Date() - new Date(deliverable.date_soumise)) / (1000 * 60 * 60 * 24));
          return daysSinceSubmit >= 14;
        },
        description: 'Auto-approve if no review after 14 days'
      }
    }
  }
};

/**
 * Check if a transition is valid between two statuses
 * @param {string} entityType - Type of entity (task, timesheet, expense, sprint, project, deliverable)
 * @param {string} currentStatus - Current status
 * @param {string} targetStatus - Target status
 * @param {object} userPermissions - User permissions
 * @returns {object} {allowed: boolean, reason: string, timeRequired: number}
 */
export function isTransitionAllowed(entityType, currentStatus, targetStatus, userPermissions = {}) {
  const config = WORKFLOW_CONFIG[entityType];
  
  if (!config) {
    return {
      allowed: false,
      reason: `Entity type '${entityType}' not found in workflow config`,
      timeRequired: null
    };
  }

  const transitions = config.transitions[currentStatus];
  
  if (!transitions) {
    return {
      allowed: false,
      reason: `Status '${currentStatus}' not found for entity type '${entityType}'`,
      timeRequired: null
    };
  }

  const transition = transitions[targetStatus];
  
  if (!transition) {
    return {
      allowed: false,
      reason: `No transition from '${currentStatus}' to '${targetStatus}'`,
      timeRequired: null
    };
  }

  if (transition.allowed === false) {
    return {
      allowed: false,
      reason: transition.reason || 'Transition not allowed',
      timeRequired: null
    };
  }

  // Check permissions if required
  if (transition.permissions) {
    const hasPermission = transition.permissions.some(perm => userPermissions[perm]);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Insufficient permissions. Required: ${transition.permissions.join(', ')}`,
        timeRequired: transition.timeRequired
      };
    }
  }

  return {
    allowed: true,
    reason: transition.reason || 'Transition allowed',
    timeRequired: transition.timeRequired || null
  };
}

/**
 * Get available transitions from a given status
 * @param {string} entityType - Type of entity
 * @param {string} currentStatus - Current status
 * @param {object} userPermissions - User permissions
 * @returns {array} Array of available target statuses
 */
export function getAvailableTransitions(entityType, currentStatus, userPermissions = {}) {
  const config = WORKFLOW_CONFIG[entityType];
  
  if (!config) return [];

  const transitions = config.transitions[currentStatus];
  
  if (!transitions) return [];

  return Object.keys(transitions).filter(targetStatus => {
    const result = isTransitionAllowed(entityType, currentStatus, targetStatus, userPermissions);
    return result.allowed;
  });
}

/**
 * Get status configuration (color, label, description)
 * @param {string} entityType - Type of entity
 * @param {string} status - Status value
 * @returns {object} Status configuration
 */
export function getStatusConfig(entityType, status) {
  const config = WORKFLOW_CONFIG[entityType];
  
  if (!config) return null;

  return config.statuses[status] || null;
}

/**
 * Check if an entity should auto-transition based on conditions
 * @param {string} entityType - Type of entity
 * @param {string} currentStatus - Current status
 * @param {object} entity - Entity document/object
 * @returns {object|null} {targetStatus, reason, variationDays} or null if no auto-transition
 */
export function checkAutoTransition(entityType, currentStatus, entity) {
  const config = WORKFLOW_CONFIG[entityType];
  
  if (!config || !config.autoTransitions) return null;

  const autoTransition = config.autoTransitions[currentStatus];
  
  if (!autoTransition) return null;

  // Check condition if it exists
  if (autoTransition.condition && !autoTransition.condition(entity)) {
    return null;
  }

  // Calculate adjusted days based on variation factors
  let adjustedDays = autoTransition.timeAfterDays;
  
  if (autoTransition.variationFactors) {
    adjustedDays = applyVariationFactors(
      adjustedDays,
      autoTransition.variationFactors,
      entity
    );
  }

  return {
    targetStatus: autoTransition.targetStatus,
    reason: autoTransition.description,
    variationDays: adjustedDays,
    originalDays: autoTransition.timeAfterDays
  };
}

/**
 * Apply variation factors to adjust transition timing
 * @param {number} baseTime - Base days for transition
 * @param {object} factors - Variation factors configuration
 * @param {object} entity - Entity with data to calculate factors
 * @returns {number} Adjusted time in days
 */
function applyVariationFactors(baseTime, factors, entity) {
  let adjustment = 0;

  for (const [factorName, factorConfig] of Object.entries(factors)) {
    if (factorName === 'priority' && entity.priorité) {
      adjustment += (factorConfig[entity.priorité] || 0);
    }
    
    if (factorName === 'amount' && entity.montant) {
      if (entity.montant < 100) adjustment += (factorConfig['low'] || 0);
      else if (entity.montant < 1000) adjustment += (factorConfig['medium'] || 0);
      else adjustment += (factorConfig['high'] || 0);
    }
    
    if (factorName === 'completionRatio' && entity.checklist) {
      const completed = entity.checklist.filter(c => c.complété).length;
      const ratio = entity.checklist.length > 0 ? completed / entity.checklist.length : 0;
      if (ratio >= factorConfig.min / 100) {
        return baseTime;
      }
    }
  }

  return Math.max(0, baseTime + adjustment);
}

/**
 * Get escalation rules for a status if it exceeds time threshold
 * @param {string} entityType - Type of entity
 * @param {string} status - Current status
 * @param {date} statusStartDate - When entity entered this status
 * @returns {object|null} Escalation action or null
 */
export function getEscalationAction(entityType, status, statusStartDate) {
  const config = WORKFLOW_CONFIG[entityType];
  
  if (!config || !config.escalationRules) return null;

  const rule = config.escalationRules[status];
  
  if (!rule) return null;

  const daysSinceStatusChange = Math.floor((new Date() - new Date(statusStartDate)) / (1000 * 60 * 60 * 24));
  
  if (daysSinceStatusChange >= rule.timeoutAfterDays) {
    return {
      action: rule.action,
      reason: rule.description,
      daysSince: daysSinceStatusChange
    };
  }

  return null;
}

export default WORKFLOW_CONFIG;
