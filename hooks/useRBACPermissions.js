import { useCallback, useMemo } from 'react';
import { getMergedPermissions, isMenuVisible, getAccessibleData, hasPermission as checkPermission } from '@/lib/permissions';

/**
 * Custom hook for checking RBAC permissions in component context
 * Combines system role + project role permissions
 *
 * IMPORTANT: Handles both frontend user shape (user.role) and backend shape (user.role_id)
 * Frontend receives user.role from GET /api/auth/me
 * Backend functions expect user.role_id
 * This hook normalizes the shape automatically
 *
 * OPTIMIZED: Uses useMemo for expensive computations to prevent re-renders
 */
export function useRBACPermissions(user, projectRole = null) {
  // Normalize user shape: if user has .role but not .role_id, convert it
  // OPTIMIZED: Use useMemo instead of useCallback for value computation
  const normalizedUser = useMemo(() => {
    if (!user) return null;
    // If user has user.role_id already, return as-is (backend shape)
    if (user.role_id) return user;
    // If user has user.role (frontend shape), convert to user.role_id for consistency with lib/permissions
    if (user.role) {
      return { ...user, role_id: user.role };
    }
    return user;
  }, [user]);

  // OPTIMIZED: hasPermission avec useCallback stable
  const hasPermission = useCallback((permission) => {
    return checkPermission(normalizedUser, permission, projectRole);
  }, [normalizedUser, projectRole]);

  // OPTIMIZED: Calcul des menus accessibles avec useMemo
  const canAccessMenus = useMemo(() => {
    if (!normalizedUser) {
      return {
        portfolio: false,
        projects: false,
        kanban: false,
        backlog: false,
        sprints: false,
        roadmap: false,
        tasks: false,
        files: false,
        comments: false,
        timesheets: false,
        budget: false,
        reports: false,
        notifications: false,
        admin: false
      };
    }
    return {
      portfolio: isMenuVisible(normalizedUser, 'portfolio', projectRole),
      projects: isMenuVisible(normalizedUser, 'projects', projectRole),
      kanban: isMenuVisible(normalizedUser, 'kanban', projectRole),
      backlog: isMenuVisible(normalizedUser, 'backlog', projectRole),
      sprints: isMenuVisible(normalizedUser, 'sprints', projectRole),
      roadmap: isMenuVisible(normalizedUser, 'roadmap', projectRole),
      tasks: isMenuVisible(normalizedUser, 'tasks', projectRole),
      files: isMenuVisible(normalizedUser, 'files', projectRole),
      comments: isMenuVisible(normalizedUser, 'comments', projectRole),
      timesheets: isMenuVisible(normalizedUser, 'timesheets', projectRole),
      budget: isMenuVisible(normalizedUser, 'budget', projectRole),
      reports: isMenuVisible(normalizedUser, 'reports', projectRole),
      notifications: isMenuVisible(normalizedUser, 'notifications', projectRole),
      admin: isMenuVisible(normalizedUser, 'admin', projectRole)
    };
  }, [normalizedUser, projectRole]);

  // OPTIMIZED: Calcul des données accessibles avec useMemo
  const accessibleData = useMemo(() => {
    if (!normalizedUser) {
      return {
        canViewBudget: false,
        canModifyBudget: false,
        canViewTimesheets: false,
        canSubmitTimesheet: false,
        canViewReports: false,
        canViewAudit: false,
        canManageMembers: false,
        canChangeRoles: false,
        canManageTasks: false,
        canMoveTasks: false,
        canPrioritizeBacklog: false,
        canManageSprints: false,
        canValidateDeliverables: false,
        canComment: false,
        canManageFiles: false
      };
    }
    return getAccessibleData(normalizedUser, projectRole);
  }, [normalizedUser, projectRole]);

  // OPTIMIZED: Calcul des permissions fusionnées avec useMemo
  const mergedPerms = useMemo(() => {
    return normalizedUser ? getMergedPermissions(normalizedUser, projectRole) : { permissions: {}, visibleMenus: {} };
  }, [normalizedUser, projectRole]);

  // OPTIMIZED: Calcul de toutes les permissions spécifiques avec useMemo
  const specificPermissions = useMemo(() => {
    if (!normalizedUser) {
      return {
        canViewBudget: false,
        canModifyBudget: false,
        canViewTimesheets: false,
        canSubmitTimesheet: false,
        canViewReports: false,
        canViewAudit: false,
        canManageMembers: false,
        canChangeRoles: false,
        canManageTasks: false,
        canMoveTasks: false,
        canPrioritizeBacklog: false,
        canManageSprints: false,
        canValidateDeliverables: false,
        canComment: false,
        canManageFiles: false,
        canEditProject: false,
        canCreateProject: false,
        canDeleteProject: false,
        canViewAllProjects: false
      };
    }
    return {
      canViewBudget: checkPermission(normalizedUser, 'voirBudget', projectRole),
      canModifyBudget: checkPermission(normalizedUser, 'modifierBudget', projectRole),
      canViewTimesheets: checkPermission(normalizedUser, 'voirTempsPasses', projectRole),
      canSubmitTimesheet: checkPermission(normalizedUser, 'saisirTemps', projectRole),
      canViewReports: checkPermission(normalizedUser, 'genererRapports', projectRole),
      canViewAudit: checkPermission(normalizedUser, 'voirAudit', projectRole),
      canManageMembers: checkPermission(normalizedUser, 'gererMembresProjet', projectRole),
      canChangeRoles: checkPermission(normalizedUser, 'changerRoleMembre', projectRole),
      canManageTasks: checkPermission(normalizedUser, 'gererTaches', projectRole),
      canMoveTasks: checkPermission(normalizedUser, 'deplacerTaches', projectRole),
      canPrioritizeBacklog: checkPermission(normalizedUser, 'prioriserBacklog', projectRole),
      canManageSprints: checkPermission(normalizedUser, 'gererSprints', projectRole),
      canValidateDeliverables: checkPermission(normalizedUser, 'validerLivrable', projectRole),
      canComment: checkPermission(normalizedUser, 'commenter', projectRole),
      canManageFiles: checkPermission(normalizedUser, 'gererFichiers', projectRole),
      canEditProject: checkPermission(normalizedUser, 'modifierCharteProjet', projectRole),
      canCreateProject: checkPermission(normalizedUser, 'creerProjet', projectRole),
      canDeleteProject: checkPermission(normalizedUser, 'supprimerProjet', projectRole),
      canViewAllProjects: checkPermission(normalizedUser, 'voirTousProjets', projectRole)
    };
  }, [normalizedUser, projectRole]);

  return {
    mergedPermissions: mergedPerms,
    hasPermission,
    canAccessMenus,
    accessibleData,
    // Spread all specific permissions
    ...specificPermissions
  };
}
