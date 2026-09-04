import Role from '@/models/Role';
import ProjectTemplate from '@/models/ProjectTemplate';
import { ALL_MENUS, ALL_PERMISSIONS } from '@/lib/permissions';

const mapFlags = (allKeys, enabledKeys) => {
  const enabled = new Set(enabledKeys);
  return Object.fromEntries(allKeys.map((key) => [key, enabled.has(key)]));
};

const allPermissions = () => mapFlags(ALL_PERMISSIONS, ALL_PERMISSIONS);
const allMenus = () => mapFlags(ALL_MENUS, ALL_MENUS);

const roles = [
  {
    nom: 'Super Administrateur',
    description: 'Accès total au système',
    permissions: ALL_PERMISSIONS,
    menus: ALL_MENUS,
  },
  {
    nom: 'Administrateur',
    description: 'Accès complet sauf gestion des utilisateurs',
    permissions: ALL_PERMISSIONS.filter((permission) => permission !== 'gererUtilisateurs'),
    menus: ALL_MENUS,
  },
  {
    nom: 'Chef de Projet',
    description: 'Gestion complète de ses projets assignés',
    permissions: [
      'voirSesProjets',
      'creerProjet',
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
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
      'genererRapports',
    ],
    menus: ALL_MENUS.filter((menu) => menu !== 'admin'),
  },
  {
    nom: 'Responsable Équipe',
    description: 'Gestion tâches, sprints et reporting pour son équipe',
    permissions: [
      'voirSesProjets',
      'gererTaches',
      'deplacerTaches',
      'prioriserBacklog',
      'gererSprints',
      'voirBudget',
      'voirTempsPasses',
      'saisirTemps',
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
      'genererRapports',
    ],
    menus: [
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
    ],
  },
  {
    nom: 'Product Owner',
    description: 'Gestion du backlog, priorisation et validation des livrables',
    permissions: [
      'voirSesProjets',
      'gererTaches',
      'deplacerTaches',
      'prioriserBacklog',
      'voirBudget',
      'voirTempsPasses',
      'validerLivrable',
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
      'genererRapports',
    ],
    menus: [
      'projects',
      'kanban',
      'backlog',
      'roadmap',
      'tasks',
      'files',
      'comments',
      'budget',
      'reports',
      'notifications',
    ],
  },
  {
    nom: 'Membre Équipe',
    description: 'Contribution aux tâches et suivi du temps',
    permissions: [
      'voirSesProjets',
      'deplacerTaches',
      'voirTempsPasses',
      'saisirTemps',
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
    ],
    menus: [
      'projects',
      'kanban',
      'roadmap',
      'tasks',
      'files',
      'comments',
      'timesheets',
      'notifications',
    ],
  },
  {
    nom: 'Consultant',
    description: 'Contribution limitée aux projets assignés',
    permissions: [
      'voirSesProjets',
      'deplacerTaches',
      'voirBudget',
      'voirTempsPasses',
      'saisirTemps',
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
    ],
    menus: [
      'projects',
      'kanban',
      'roadmap',
      'tasks',
      'files',
      'comments',
      'timesheets',
      'budget',
      'notifications',
    ],
  },
  {
    nom: 'Partie Prenante',
    description: 'Lecture et commentaires sur les projets partagés',
    permissions: ['voirSesProjets', 'voirBudget', 'commenter', 'recevoirNotifications'],
    menus: ['projects', 'roadmap', 'comments', 'budget', 'notifications'],
  },
  {
    nom: 'Observateur',
    description: 'Lecture seule stricte',
    permissions: ['voirSesProjets', 'voirBudget', 'voirTempsPasses', 'recevoirNotifications'],
    menus: ['projects', 'roadmap', 'budget', 'notifications'],
  },
  {
    nom: 'Invité',
    description: 'Accès temporaire en lecture avec commentaires',
    permissions: ['voirSesProjets', 'commenter', 'recevoirNotifications'],
    menus: ['projects', 'roadmap', 'comments', 'notifications'],
  },
];

export async function ensurePredefinedSystemRoles() {
  for (const role of roles) {
    await Role.findOneAndUpdate(
      { nom: role.nom },
      {
        $set: {
          description: role.description,
          is_custom: false,
          is_predefined: true,
          permissions:
            role.permissions === ALL_PERMISSIONS
              ? allPermissions()
              : mapFlags(ALL_PERMISSIONS, role.permissions),
          visibleMenus: role.menus === ALL_MENUS ? allMenus() : mapFlags(ALL_MENUS, role.menus),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return Role.find({ is_predefined: true }).sort({ nom: 1 }).lean();
}

const defaultTemplates = [
  {
    nom: 'Projet Agile standard',
    description: 'Template de base pour un projet agile avec backlog, sprints et livrables.',
    catégorie: 'Agile',
    tags: ['agile', 'scrum'],
    icône: 'kanban',
    couleur: '#2563eb',
    champs: [],
    config_workflow: {
      étapes_par_défaut: ['Backlog', 'À faire', 'En cours', 'Review', 'Terminé'],
      notifications_auto: true,
    },
  },
  {
    nom: 'Projet gouvernance',
    description: 'Template orienté cadrage, comités, parties prenantes et suivi décisionnel.',
    catégorie: 'Gouvernance',
    tags: ['gouvernance', 'pilotage'],
    icône: 'landmark',
    couleur: '#059669',
    champs: [],
    config_workflow: {
      étapes_par_défaut: ['Cadrage', 'Validation', 'Exécution', 'Clôture'],
      notifications_auto: true,
    },
  },
];

export async function ensureDefaultProjectTemplates(createdBy) {
  if (!createdBy) return [];

  for (const template of defaultTemplates) {
    await ProjectTemplate.findOneAndUpdate(
      { nom: template.nom },
      { $setOnInsert: { ...template, créé_par: createdBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return ProjectTemplate.find({ nom: { $in: defaultTemplates.map((template) => template.nom) } })
    .sort({ nom: 1 })
    .lean();
}
