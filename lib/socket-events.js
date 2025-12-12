/**
 * Central registry of all Socket.io events
 * Ensures consistency across server and client
 */

// Project events
export const SOCKET_EVENTS = {
  // Projects
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  PROJECT_MEMBERS_CHANGED: 'project:members_changed',

  // Tasks
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_MOVED: 'task:moved', // Kanban drag & drop
  TASK_ASSIGNED: 'task:assigned',
  TASK_COMMENTED: 'task:commented',

  // Sprints
  SPRINT_CREATED: 'sprint:created',
  SPRINT_UPDATED: 'sprint:updated',
  SPRINT_STARTED: 'sprint:started',
  SPRINT_COMPLETED: 'sprint:completed',

  // Comments
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',

  // Notifications
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',

  // Timesheets
  TIMESHEET_CREATED: 'timesheet:created',
  TIMESHEET_UPDATED: 'timesheet:updated',

  // Budget
  BUDGET_UPDATED: 'budget:updated',

  // Deliverables
  DELIVERABLE_CREATED: 'deliverable:created',
  DELIVERABLE_UPDATED: 'deliverable:updated',
  DELIVERABLE_VALIDATED: 'deliverable:validated',

  // Files
  FILE_UPLOADED: 'file:uploaded',
  FILE_DELETED: 'file:deleted',

  // User presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_VIEWING: 'user:viewing', // When user is viewing a specific page

  // Errors
  ERROR: 'error'
};

/**
 * Map events to required permissions
 * If no permission specified, event is public within project scope
 */
export const EVENT_PERMISSIONS = {
  'project:created': 'creerProjet',
  'project:updated': 'modifierCharteProjet',
  'project:deleted': 'supprimerProjet',
  'project:members_changed': 'gererMembresProjet',

  'task:created': 'gererTaches',
  'task:updated': 'gererTaches',
  'task:deleted': 'gererTaches',
  'task:moved': 'deplacerTaches',
  'task:assigned': 'gererTaches',
  'task:commented': 'commenter',

  'sprint:created': 'gererSprints',
  'sprint:updated': 'gererSprints',
  'sprint:started': 'gererSprints',
  'sprint:completed': 'gererSprints',

  'comment:created': 'commenter',
  'comment:updated': 'commenter',
  'comment:deleted': 'commenter',

  'notification:created': null,
  'notification:read': null,

  'timesheet:created': 'saisirTemps',
  'timesheet:updated': 'saisirTemps',

  'budget:updated': 'modifierBudget',

  'deliverable:created': 'gererTaches',
  'deliverable:updated': 'gererTaches',
  'deliverable:validated': 'validerLivrable',

  'file:uploaded': 'gererFichiers',
  'file:deleted': 'gererFichiers',

  'user:online': null,
  'user:offline': null,
  'user:viewing': null
};
