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
 */
export const MAIN_MENU_ITEMS = [
  {
    icon: Home,
    label: 'Dashboard',
    href: '/dashboard',
    menuKey: 'portfolio',
    permissionKey: 'voirSesProjets',
    description: 'Tableau de bord principal'
  },
  {
    icon: FolderKanban,
    label: 'Projets',
    href: '/dashboard/projects',
    menuKey: 'projects',
    permissionKey: 'voirSesProjets',
    description: 'Liste et gestion des projets'
  },
  {
    icon: Layers,
    label: 'Kanban',
    href: '/dashboard/kanban',
    menuKey: 'kanban',
    permissionKey: 'deplacerTaches',
    description: 'Vue Kanban des tâches'
  },
  {
    icon: ListTodo,
    label: 'Backlog',
    href: '/dashboard/backlog',
    menuKey: 'backlog',
    permissionKey: 'prioriserBacklog',
    description: 'Gestion du backlog produit'
  },
  {
    icon: Calendar,
    label: 'Sprints',
    href: '/dashboard/sprints',
    menuKey: 'sprints',
    permissionKey: 'gererSprints',
    description: 'Gestion des sprints'
  },
  {
    icon: TrendingUp,
    label: 'Roadmap',
    href: '/dashboard/roadmap',
    menuKey: 'roadmap',
    permissionKey: 'voirSesProjets',
    description: 'Roadmap des projets'
  },
  {
    icon: CheckCircle2,
    label: 'Tâches',
    href: '/dashboard/tasks',
    menuKey: 'tasks',
    permissionKey: 'gererTaches',
    description: 'Gestion des tâches'
  },
  {
    icon: Files,
    label: 'Fichiers',
    href: '/dashboard/files',
    menuKey: 'files',
    permissionKey: 'gererFichiers',
    description: 'Gestion des fichiers'
  },
  {
    icon: MessageSquare,
    label: 'Commentaires',
    href: '/dashboard/comments',
    menuKey: 'comments',
    permissionKey: 'commenter',
    description: 'Commentaires et discussions'
  },
  {
    icon: Clock,
    label: 'Timesheets',
    href: '/dashboard/timesheets',
    menuKey: 'timesheets',
    permissionKey: 'saisirTemps',
    description: 'Suivi du temps'
  },
  {
    icon: Wallet,
    label: 'Budget',
    href: '/dashboard/budget',
    menuKey: 'budget',
    permissionKey: 'voirBudget',
    description: 'Gestion budgétaire'
  },
  {
    icon: BarChart3,
    label: 'Rapports',
    href: '/dashboard/reports',
    menuKey: 'reports',
    permissionKey: 'genererRapports',
    description: 'Rapports et analytics'
  },
];

/**
 * Menu items d'administration
 * Seuls les admins et super-admins peuvent les voir
 */
export const ADMIN_MENU_ITEMS = [
  {
    icon: Shield,
    label: 'Rôles & Permissions',
    href: '/dashboard/admin/roles',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
    description: 'Gestion des rôles et permissions'
  },
  {
    icon: Users,
    label: 'Utilisateurs',
    href: '/dashboard/users',
    permissionKey: 'gererUtilisateurs',
    menuKey: 'admin',
    description: 'Gestion des utilisateurs'
  },
  {
    icon: FileText,
    label: 'Templates Projets',
    href: '/dashboard/admin/templates',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
    description: 'Templates de projets'
  },
  {
    icon: Layers,
    label: 'Types Livrables',
    href: '/dashboard/admin/deliverable-types',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
    description: 'Types de livrables'
  },
  {
    icon: Cloud,
    label: 'SharePoint',
    href: '/dashboard/admin/sharepoint',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
    description: 'Configuration SharePoint'
  },
  {
    icon: ClipboardList,
    label: 'Audit & Logs',
    href: '/dashboard/admin/audit',
    permissionKey: 'voirAudit',
    menuKey: 'admin',
    description: 'Historique des actions'
  },
  {
    icon: Settings,
    label: 'Paramètres',
    href: '/dashboard/settings',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
    description: 'Paramètres système'
  },
  {
    icon: Wrench,
    label: 'Maintenance',
    href: '/dashboard/maintenance',
    permissionKey: 'adminConfig',
    menuKey: 'admin',
    description: 'Mode maintenance'
  },
];

/**
 * Menu des notifications
 */
export const NOTIFICATIONS_MENU = {
  icon: Bell,
  label: 'Notifications',
  href: '/dashboard/notifications',
  permissionKey: 'recevoirNotifications',
  menuKey: 'notifications',
  description: 'Notifications'
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
