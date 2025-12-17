/**
 * Configuration des menus avec leurs permissions associées
 * Permet de gérer dynamiquement l'affichage des menus selon le rôle utilisateur
 */

import {
  Home,
  FolderKanban,
  Layers,
  ListTodo,
  Calendar,
  Users,
  Clock,
  Wallet,
  MessageSquare,
  Bell,
  Settings,
  TrendingUp,
  CheckCircle2,
  Shield,
  Cloud,
  BarChart3,
  Files,
  FileText,
  ClipboardList,
  Wrench,
} from 'lucide-react';

/**
 * Menu items principaux avec leurs clés et permissions requises
 * labelKey est utilisé pour la traduction via t(labelKey)
 */
export const MAIN_MENU_ITEMS = [
  {
    icon: Home,
    labelKey: 'dashboard',
    href: '/dashboard',
    menuKey: 'portfolio',
    permissionKey: 'voirSesProjets',
  },
  {
    icon: FolderKanban,
    labelKey: 'projects',
    href: '/dashboard/projects',
    menuKey: 'projects',
    permissionKey: 'voirSesProjets',
  },
  {
    icon: Layers,
    labelKey: 'kanban',
    href: '/dashboard/kanban',
    menuKey: 'kanban',
    permissionKey: 'deplacerTaches',
  },
  {
    icon: ListTodo,
    labelKey: 'backlog',
    href: '/dashboard/backlog',
    menuKey: 'backlog',
    permissionKey: 'prioriserBacklog',
  },
  {
    icon: Calendar,
    labelKey: 'sprints',
    href: '/dashboard/sprints',
    menuKey: 'sprints',
    permissionKey: 'gererSprints',
  },
  {
    icon: TrendingUp,
    labelKey: 'roadmap',
    href: '/dashboard/roadmap',
    menuKey: 'roadmap',
    permissionKey: 'voirSesProjets',
  },
  {
    icon: CheckCircle2,
    labelKey: 'tasks',
    href: '/dashboard/tasks',
    menuKey: 'tasks',
    permissionKey: 'gererTaches',
  },
  {
    icon: Files,
    labelKey: 'files',
    href: '/dashboard/files',
    menuKey: 'files',
    permissionKey: 'gererFichiers',
  },
  {
    icon: MessageSquare,
    labelKey: 'comments',
    href: '/dashboard/comments',
    menuKey: 'comments',
    permissionKey: 'commenter',
  },
  {
    icon: Clock,
    labelKey: 'timesheets',
    href: '/dashboard/timesheets',
    menuKey: 'timesheets',
    permissionKey: 'saisirTemps',
  },
  {
    icon: Wallet,
    labelKey: 'budget',
    href: '/dashboard/budget',
    menuKey: 'budget',
    permissionKey: 'voirBudget',
  },
  {
    icon: BarChart3,
    labelKey: 'reports',
    href: '/dashboard/reports',
    menuKey: 'reports',
    permissionKey: 'genererRapports',
  },
];

/**
 * Menu items d'administration
 * Seuls les admins et super-admins peuvent les voir
 */
export const ADMIN_MENU_ITEMS = [
  {
    icon: Shield,
    labelKey: 'rolesPermissions',
    href: '/dashboard/admin/roles',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
  },
  {
    icon: Users,
    labelKey: 'users',
    href: '/dashboard/users',
    permissionKey: 'gererUtilisateurs',
    menuKey: 'admin',
  },
  {
    icon: FileText,
    labelKey: 'projectTemplates',
    href: '/dashboard/admin/templates',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
  },
  {
    icon: Layers,
    labelKey: 'deliverableTypes',
    href: '/dashboard/admin/deliverable-types',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
  },
  {
    icon: Cloud,
    labelKey: 'sharepoint',
    href: '/dashboard/admin/sharepoint',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
  },
  {
    icon: ClipboardList,
    labelKey: 'auditLogs',
    href: '/dashboard/admin/audit',
    permissionKey: 'voirAudit',
    menuKey: 'admin',
  },
  {
    icon: Settings,
    labelKey: 'settings',
    href: '/dashboard/settings',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
  },
  {
    icon: Wrench,
    labelKey: 'maintenance',
    href: '/dashboard/maintenance',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
  },
];

/**
 * Menu des notifications
 */
export const NOTIFICATIONS_MENU = {
  icon: Bell,
  labelKey: 'notifications',
  href: '/dashboard/notifications',
  permissionKey: 'recevoirNotifications',
  menuKey: 'notifications',
};

/**
 * Filtrer les menus selon les permissions de l'utilisateur
 * @param {Array} menuItems - Liste des items de menu
 * @param {Object} user - Objet utilisateur avec role et permissions
 * @returns {Array} - Items de menu filtrés
 */
export function filterMenuItemsByPermissions(menuItems, user) {
  if (!user || !user.role) {
    return [];
  }

  return menuItems.filter(item => {
    // Vérifier la permission requise
    const hasPermission = user.role.permissions?.[item.permissionKey] === true;
    if (!hasPermission) {
      return false;
    }

    // Vérifier la visibilité du menu
    const isMenuVisible = user.role.visibleMenus?.[item.menuKey] === true;
    if (!isMenuVisible) {
      return false;
    }

    return true;
  });
}

/**
 * Obtenir tous les menus disponibles pour un utilisateur
 * @param {Object} user - Objet utilisateur avec role et permissions
 * @returns {Object} - Objet avec mainMenuItems, adminMenuItems, et notificationsMenu
 */
export function getAvailableMenus(user) {
  // Filtrer les notifications avec la même logique que les autres menus
  const notificationsFiltered = filterMenuItemsByPermissions([NOTIFICATIONS_MENU], user);

  return {
    mainMenuItems: filterMenuItemsByPermissions(MAIN_MENU_ITEMS, user),
    adminMenuItems: filterMenuItemsByPermissions(ADMIN_MENU_ITEMS, user),
    notificationsMenu: notificationsFiltered.length > 0 ? NOTIFICATIONS_MENU : null
  };
}

/**
 * Vérifier si un utilisateur a accès à une route spécifique
 * @param {String} href - Le chemin de la route
 * @param {Object} user - Objet utilisateur
 * @returns {Boolean} - true si l'utilisateur a accès
 */
export function canAccessMenuItem(href, user) {
  const allItems = [...MAIN_MENU_ITEMS, ...ADMIN_MENU_ITEMS, NOTIFICATIONS_MENU].filter(Boolean);
  const item = allItems.find(i => i.href === href);

  if (!item) {
    return false;
  }

  return (
    user?.role?.permissions?.[item.permissionKey] === true &&
    user?.role?.visibleMenus?.[item.menuKey] === true
  );
}

/**
 * Obtenir les statistiques de menu accessibles
 * @param {Object} user - Objet utilisateur
 * @returns {Object} - Statistiques
 */
export function getMenuStats(user) {
  const menus = getAvailableMenus(user);

  return {
    totalMainMenuItems: menus.mainMenuItems.length,
    totalAdminMenuItems: menus.adminMenuItems.length,
    hasNotifications: menus.notificationsMenu !== null,
    hasAdminAccess: menus.adminMenuItems.length > 0,
    totalMenuItems: menus.mainMenuItems.length + menus.adminMenuItems.length + (menus.notificationsMenu ? 1 : 0)
  };
}
