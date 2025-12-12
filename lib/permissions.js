/**
 * Two-Tier RBAC Permission System
 * Synchronizes System Role + Project Role permissions
 * Uses most restrictive approach: both must allow an action
 */

// All atomic permissions in the system
export const ALL_PERMISSIONS = [
  'voirTousProjets',
  'voirSesProjets',
  'creerProjet',
  'supprimerProjet',
  'modifierCharteProjet',
  'gererMembresProjet',
  'changerRoleMembre',
  'gererTaches',
  'deplacerTaches',
  'prioriserBacklog',
  'gererSprints',
  'modifierBudget',
  'voirBudget',
  'voirTempsPasses',
  'saisirTemps',
  'validerLivrable',
  'gererFichiers',
  'commenter',
  'recevoirNotifications',
  'genererRapports',
  'voirAudit',
  'gererUtilisateurs',
  'adminConfig'
];

// All menu items in the system
export const ALL_MENUS = [
  'portfolio',
  'projects',
  'kanban',
  'backlog',
  'sprints',
  'roadmap',
  'tasks',
  'files',
  'comments',
  'timesheets',
  'budget',
  'reports',
  'notifications',
  'admin'
];

/**
 * Merge two role objects using most restrictive approach
 * (both must allow for final permission to be granted)
 *
 * IMPORTANT: Uses explicit true checks, not implicit false defaults
 * - undefined is treated as false (denied permission)
 * - Only explicit true values grant permissions
 */
export function mergeRolePermissions(systemRole, projectRole) {
  const merged = {
    permissions: {},
    visibleMenus: {}
  };

  // Merge permissions: true only if BOTH are explicitly true
  // If projectRole is undefined/null, use system role permissions as fallback
  ALL_PERMISSIONS.forEach(permission => {
    const systemAllows = systemRole?.permissions?.[permission] === true;

    // If projectRole exists, both must be true (most restrictive)
    // If projectRole doesn't exist, just use system permissions
    let projectAllows = true;
    if (projectRole) {
      projectAllows = projectRole.permissions?.[permission] === true;
    }

    merged.permissions[permission] = systemAllows && projectAllows;
  });

  // Merge menus: true only if BOTH are explicitly true
  ALL_MENUS.forEach(menu => {
    const systemAllows = systemRole?.visibleMenus?.[menu] === true;

    // If projectRole exists, both must be true (most restrictive)
    // If projectRole doesn't exist, just use system menus
    let projectAllows = true;
    if (projectRole) {
      projectAllows = projectRole.visibleMenus?.[menu] === true;
    }

    merged.visibleMenus[menu] = systemAllows && projectAllows;
  });

  return merged;
}

/**
 * Check if user has a specific permission in a project context
 * Combines system role + project role permissions
 *
 * CRITICAL: Uses EXPLICIT TRUE checks (matching mergeRolePermissions behavior)
 * - undefined is treated as false (denied permission)
 * - Only explicit true values grant permissions
 * - Most restrictive: both system AND project must explicitly allow
 */
export function hasPermission(user, permission, projectRole = null) {
  if (!user || !user.role_id) {
    return false;
  }

  const systemRolePerms = user.role_id?.permissions?.[permission];

  // If no project role specified, just check system role
  if (!projectRole) {
    return systemRolePerms === true;
  }

  // With project role: both must be explicitly true (most restrictive)
  // This matches the mergeRolePermissions behavior exactly
  const projectAllows = projectRole?.permissions?.[permission] === true;
  return systemRolePerms === true && projectAllows;
}

/**
 * Get merged permissions for a user in a project
 */
export function getMergedPermissions(user, projectRole) {
  if (!user?.role_id) {
    return { permissions: {}, visibleMenus: {} };
  }

  if (!projectRole) {
    return {
      permissions: user.role_id.permissions || {},
      visibleMenus: user.role_id.visibleMenus || {}
    };
  }

  return mergeRolePermissions(user.role_id, projectRole);
}

/**
 * Get visible menus for a user in a project
 */
export function getVisibleMenus(user, projectRole = null) {
  const merged = getMergedPermissions(user, projectRole);
  return Object.keys(merged.visibleMenus).filter(
    menu => merged.visibleMenus[menu] === true && ALL_MENUS.includes(menu)
  );
}

/**
 * Check if menu should be visible
 */
export function isMenuVisible(user, menuName, projectRole = null) {
  const merged = getMergedPermissions(user, projectRole);
  return merged.visibleMenus[menuName] === true;
}

/**
 * Get all accessible data types for a user in a project
 * Returns object showing what user can see (budget, timesheets, reports, etc.)
 */
export function getAccessibleData(user, projectRole = null) {
  const perms = getMergedPermissions(user, projectRole);

  return {
    canViewBudget: perms.permissions.voirBudget === true,
    canModifyBudget: perms.permissions.modifierBudget === true,
    canViewTimesheets: perms.permissions.voirTempsPasses === true,
    canSubmitTimesheet: perms.permissions.saisirTemps === true,
    canViewReports: perms.permissions.genererRapports === true,
    canViewAudit: perms.permissions.voirAudit === true,
    canManageMembers: perms.permissions.gererMembresProjet === true,
    canChangeRoles: perms.permissions.changerRoleMembre === true,
    canManageTasks: perms.permissions.gererTaches === true,
    canMoveTasks: perms.permissions.deplacerTaches === true,
    canPrioritizeBacklog: perms.permissions.prioriserBacklog === true,
    canManageSprints: perms.permissions.gererSprints === true,
    canValidateDeliverables: perms.permissions.validerLivrable === true,
    canComment: perms.permissions.commenter === true,
    canManageFiles: perms.permissions.gererFichiers === true
  };
}

/**
 * Check if user can access a project resource considering both system and project-level permissions
 * Returns true only if BOTH system role AND project role (if member) allow the action
 */
export function canAccessProjectResource(user, project, permission) {
  if (!user || !user.role_id) {
    return false;
  }

  if (user.role_id?.permissions?.adminConfig) {
    return true;
  }

  const systemAllows = user.role_id?.permissions?.[permission] === true;

  if (!systemAllows) {
    return false;
  }

  const isMember = project.chef_projet.toString() === user._id.toString() ||
    project.product_owner?.toString() === user._id.toString() ||
    project.membres.some(m => m.user_id.toString() === user._id.toString());

  if (!isMember) {
    return false;
  }

  return true;
}
