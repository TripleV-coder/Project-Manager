import { useCallback } from 'react';
import { getMergedPermissions, isMenuVisible, getAccessibleData, hasPermission as checkPermission } from '@/lib/permissions';

/**
 * Custom hook for checking RBAC permissions in component context
 * Combines system role + project role permissions
 *
 * IMPORTANT: Handles both frontend user shape (user.role) and backend shape (user.role_id)
 * Frontend receives user.role from GET /api/auth/me
 * Backend functions expect user.role_id
 * This hook normalizes the shape automatically
 */
export function useRBACPermissions(user, projectRole = null) {
  // Normalize user shape: if user has .role but not .role_id, convert it
  const normalizedUser = useCallback(() => {
    if (!user) return null;
    // If user has user.role_id already, return as-is (backend shape)
    if (user.role_id) return user;
    // If user has user.role (frontend shape), convert to user.role_id for consistency with lib/permissions
    if (user.role) {
      return { ...user, role_id: user.role };
    }
    return user;
  }, [user]);

  const hasPermission = useCallback((permission) => {
    const normalized = normalizedUser();
    return checkPermission(normalized, permission, projectRole);
  }, [normalizedUser, projectRole]);

  const canAccessMenus = useCallback(() => {
    const normalized = normalizedUser();
    return {
      portfolio: isMenuVisible(normalized, 'portfolio', projectRole),
      projects: isMenuVisible(normalized, 'projects', projectRole),
      kanban: isMenuVisible(normalized, 'kanban', projectRole),
      backlog: isMenuVisible(normalized, 'backlog', projectRole),
      sprints: isMenuVisible(normalized, 'sprints', projectRole),
      roadmap: isMenuVisible(normalized, 'roadmap', projectRole),
      tasks: isMenuVisible(normalized, 'tasks', projectRole),
      files: isMenuVisible(normalized, 'files', projectRole),
      comments: isMenuVisible(normalized, 'comments', projectRole),
      timesheets: isMenuVisible(normalized, 'timesheets', projectRole),
      budget: isMenuVisible(normalized, 'budget', projectRole),
      reports: isMenuVisible(normalized, 'reports', projectRole),
      notifications: isMenuVisible(normalized, 'notifications', projectRole),
      admin: isMenuVisible(normalized, 'admin', projectRole)
    };
  }, [normalizedUser, projectRole]);

  const accessibleData = useCallback(() => {
    const normalized = normalizedUser();
    return getAccessibleData(normalized, projectRole);
  }, [normalizedUser, projectRole]);

  const normalized = normalizedUser();
  const mergedPerms = getMergedPermissions(normalized, projectRole);

  return {
    mergedPermissions: mergedPerms,
    hasPermission,
    canAccessMenus: canAccessMenus(),
    accessibleData: accessibleData(),
    // Specific permission checkers
    canViewBudget: hasPermission('voirBudget'),
    canModifyBudget: hasPermission('modifierBudget'),
    canViewTimesheets: hasPermission('voirTempsPasses'),
    canSubmitTimesheet: hasPermission('saisirTemps'),
    canViewReports: hasPermission('genererRapports'),
    canViewAudit: hasPermission('voirAudit'),
    canManageMembers: hasPermission('gererMembresProjet'),
    canChangeRoles: hasPermission('changerRoleMembre'),
    canManageTasks: hasPermission('gererTaches'),
    canMoveTasks: hasPermission('deplacerTaches'),
    canPrioritizeBacklog: hasPermission('prioriserBacklog'),
    canManageSprints: hasPermission('gererSprints'),
    canValidateDeliverables: hasPermission('validerLivrable'),
    canComment: hasPermission('commenter'),
    canManageFiles: hasPermission('gererFichiers'),
    canEditProject: hasPermission('modifierCharteProjet'),
    canCreateProject: hasPermission('creerProjet'),
    canDeleteProject: hasPermission('supprimerProjet'),
    canViewAllProjects: hasPermission('voirTousProjets')
  };
}
