/**
 * lib/schemas.js
 * Schémas Zod centralisés pour toutes les routes API de l'application.
 * Étend lib/requestValidation.js qui contient les schemas d'authentification.
 */
import { z } from 'zod';

// ==================== PRIMITIVES RÉUTILISABLES ====================

export const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'ID invalide');
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'Format de date invalide (YYYY-MM-DD attendu)');

// ==================== PROJETS ====================

export const createProjectSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(200),
  description: z.string().max(2000).optional(),
  statut: z
    .enum(['Planification', 'En cours', 'En pause', 'Terminé', 'Annulé'])
    .default('Planification'),
  priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
  date_début: isoDate.optional(),
  date_fin: isoDate.optional(),
  date_fin_prévue: isoDate.optional(),
  champs_personnalisés: z.record(z.any()).optional(),
  budget_total: z.number().min(0).optional(),
  chef_projet: objectId.optional(),
  chef_de_projet_id: objectId.optional(),
  product_owner: objectId.optional(),
  template_id: objectId.optional(),
  contexte: z.string().max(5000).optional(),
  objectifs: z.string().max(5000).optional(),
  termes_de_reference: z.string().max(5000).optional(),
  comite_technique: z.array(z.string().max(200)).optional(),
  comite_pilotage: z.array(z.string().max(200)).optional(),
  structures_partenaires: z.array(z.string().max(200)).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ==================== TÂCHES ====================

export const createTaskSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['Épic', 'Story', 'Tâche', 'Bug']).default('Tâche'),
  statut: z.enum(['Backlog', 'À faire', 'En cours', 'Review', 'Terminé']).optional(),
  priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).default('Moyenne'),
  story_points: z.number().int().min(0).max(100).nullable().optional(),
  estimation_heures: z.number().min(0).nullable().optional(),
  assigné_à: objectId.nullable().optional(),
  sprint_id: objectId.nullable().optional(),
  projet_id: objectId,
  parent_id: objectId.nullable().optional(),
  deliverable_id: objectId.nullable().optional(),
  date_début: isoDate.optional(),
  date_échéance: isoDate.optional(),
  date_fin_prévue: isoDate.optional(),
  champs_personnalisés: z.record(z.any()).optional(),
  acceptance_criteria: z.array(z.string().max(500)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ projet_id: true, type: true });

export const moveTaskSchema = z.object({
  statut: z.enum(['Backlog', 'À faire', 'En cours', 'Review', 'Terminé']).optional(),
  nouveau_statut: z.string().max(80).optional(),
  nouvelle_colonne: z.string().max(80).optional(),
  colonne_kanban: z.string().max(80).optional(),
});

// ==================== SPRINTS ====================

export const createSprintSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(200),
  objectif: z.string().max(1000).optional(),
  date_début: isoDate,
  date_fin: isoDate,
  projet_id: objectId,
  story_points_planifiés: z.number().int().min(0).optional(),
  capacité: z.number().int().min(0).optional(),
  capacité_équipe: z.number().int().min(0).optional(),
});

export const updateSprintSchema = createSprintSchema.partial().omit({ projet_id: true });

// ==================== UTILISATEURS ====================

export const createUserSchema = z.object({
  nom_complet: z.string().min(3, 'Nom complet requis (min 3 car.)').max(100),
  email: z.string().email('Email invalide').toLowerCase(),
  role_id: objectId,
  status: z.enum(['Actif', 'Désactivé', 'Suspendu']).default('Actif'),
  poste: z.string().max(100).optional(),
  département: z.string().max(100).optional(),
  téléphone: z.string().max(20).optional(),
  disponibilité_hebdomadaire: z.number().int().min(0).max(168).optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ email: true });

export const updateProfileSchema = z.object({
  nom_complet: z.string().min(3).max(100).optional(),
  poste: z.string().max(100).optional(),
  département: z.string().max(100).optional(),
  téléphone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  disponibilité_hebdomadaire: z.number().int().min(0).max(168).optional(),
  notification_preferences: z
    .object({
      notifyTaskAssigned: z.boolean().optional(),
      notifyTaskCompleted: z.boolean().optional(),
      notifyCommentMention: z.boolean().optional(),
      notifySprintStart: z.boolean().optional(),
      notifyBudgetAlert: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
    })
    .optional(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Mot de passe actuel requis'),
    new_password: z.string().min(8, 'Nouveau mot de passe trop court'),
    new_password_confirm: z.string().min(1),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['new_password_confirm'],
  });

// ==================== RÔLES ====================

export const createRoleSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  description: z.string().max(500).optional(),
  permissions: z.record(z.boolean()).optional(),
  visibleMenus: z.record(z.boolean()).optional(),
  is_system: z.boolean().optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

// ==================== COMMENTAIRES ====================

export const createCommentSchema = z.object({
  entity_type: z.enum([
    'task',
    'project',
    'tâche',
    'tache',
    'projet',
    'deliverable',
    'livrable',
    'sprint',
  ]),
  entity_id: objectId,
  contenu: z.string().min(1, 'Contenu requis').max(5000),
  parent_id: objectId.nullable().optional(),
  mentions: z.array(objectId).max(50).optional(),
});

export const updateCommentSchema = z.object({
  contenu: z.string().min(1).max(5000),
});

// ==================== TIMESHEETS ====================

const optionalTimesheetId = z.preprocess(
  (value) => (value === 'all' || value === '' || value === null ? undefined : value),
  objectId.optional()
);

const timesheetFields = z.object({
  task_id: optionalTimesheetId,
  tâche_id: optionalTimesheetId,
  projet_id: objectId.optional(),
  date: isoDate,
  heures: z.coerce.number().min(0.25, 'Min 0.25h').max(24, 'Max 24h par jour'),
  description: z.string().max(500).optional(),
  facturable: z.boolean().optional(),
});

export const createTimesheetSchema = timesheetFields.refine(
  (data) => Boolean(data.task_id || data.tâche_id || data.projet_id),
  { message: 'Projet ou tâche requis', path: ['projet_id'] }
);

export const updateTimesheetSchema = timesheetFields.partial();

export const timesheetStatusSchema = z.object({
  statut: z.enum(['brouillon', 'soumis', 'validé', 'refusé']),
});

export const expenseStatusSchema = z.object({
  statut: z.enum(['en_attente', 'validé', 'refusé', 'payé']),
});

// ==================== BUDGET / DÉPENSES ====================

export const createExpenseSchema = z.object({
  projet_id: objectId,
  montant: z.number().min(0, 'Montant positif requis'),
  catégorie: z.enum([
    'humanResources',
    'equipment',
    'softwareLicenses',
    'subcontracting',
    'training',
    'travel',
    'infrastructure',
    'marketing',
    'other',
  ]),
  description: z.string().min(1, 'Description requise').max(500),
  date_dépense: isoDate,
  justificatifs: z
    .array(
      z.object({
        nom: z.string(),
        url: z.string().url(),
        taille: z.number().optional(),
        type: z.string().optional(),
      })
    )
    .optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ==================== NOTIFICATIONS ====================

export const markNotificationSchema = z.object({
  ids: z.array(objectId).min(1).max(100).optional(),
});

// ==================== SPRINTS ACTIONS ====================

export const addTaskToSprintSchema = z.object({
  task_ids: z.array(objectId).min(1, 'Au moins une tâche requise').max(200),
});

// ==================== FICHIERS ====================

export const uploadFileSchema = z.object({
  entity_type: z.enum(['project', 'task', 'sprint']),
  entity_id: objectId,
  description: z.string().max(500).optional(),
});

// ==================== LIVRABLES ====================

export const createDeliverableSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(200),
  projet_id: objectId,
  type_id: objectId.optional(),
  description: z.string().max(2000).optional(),
  date_échéance: isoDate.optional(),
  responsable_id: objectId.optional(),
  statut: z
    .enum([
      'À produire',
      'En validation',
      'Validé',
      'Refusé',
      'Archivé',
      'À faire',
      'En cours',
      'Livré',
      'Annulé',
    ])
    .optional(),
  statut_global: z.enum(['À produire', 'En validation', 'Validé', 'Refusé', 'Archivé']).optional(),
});

export const updateDeliverableSchema = createDeliverableSchema.partial().omit({ projet_id: true });

// ==================== PARAMÈTRES ====================

const settingsFieldsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  appDescription: z.string().max(500).optional(),
  langue: z.enum(['fr', 'en']).optional(),
  timezone: z.string().max(50).optional(),
  devise: z.enum(['FCFA', 'EUR', 'USD', 'GBP', 'CAD']).optional(),
  formatDate: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  sessionTimeout: z.number().int().min(5).max(10080).optional(),
  passwordMinLength: z.number().int().min(6).max(32).optional(),
  requireNumbers: z.boolean().optional(),
  requireSymbols: z.boolean().optional(),
  maxLoginAttempts: z.number().int().min(1).max(20).optional(),
  lockoutDuration: z.number().int().min(1).max(1440).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hex invalide')
    .optional(),
  sidebarCompact: z.boolean().optional(),
});

export const updateSettingsSchema = z.preprocess((value) => {
  if (value && typeof value === 'object' && value.settings && typeof value.settings === 'object') {
    return value.settings;
  }
  return value;
}, settingsFieldsSchema);

// ==================== TEMPLATES ====================

export const createTemplateSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(200),
  description: z.string().max(1000).optional(),
  catégorie: z.string().max(100).optional(),
  default_contexte: z.string().max(5000).optional(),
  default_objectifs: z.string().max(5000).optional(),
  default_termes_de_reference: z.string().max(5000).optional(),
  default_comite_technique: z.array(z.string()).optional(),
  default_comite_pilotage: z.array(z.string()).optional(),
  default_structures_partenaires: z.array(z.string()).optional(),
  structure: z
    .object({
      sprints: z.array(z.any()).optional(),
      tâches: z.array(z.any()).optional(),
      rôles: z.array(z.any()).optional(),
    })
    .optional(),
  champs: z.array(z.any()).optional(),
});

// ==================== SHAREPOINT ====================

const sharepointCredentialsSchema = z.object({
  tenant_id: z.string().max(100).optional(),
  site_id: z.string().max(200).optional(),
  client_id: z.string().max(100).optional(),
  client_secret: z.string().max(500).optional(),
  auto_sync: z.boolean().optional(),
  sync_interval: z.number().int().min(5).max(1440).optional(),
  enabled: z.boolean().optional(),
});

export const sharepointConfigSchema = sharepointCredentialsSchema
  .extend({
    enabled: z.boolean().optional(),
    config: sharepointCredentialsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const nested = data.config || {};
    const enabled = data.enabled ?? nested.enabled;
    if (enabled !== true) return;

    const tenant = (nested.tenant_id ?? data.tenant_id ?? '').trim();
    const clientId = (nested.client_id ?? data.client_id ?? '').trim();
    const siteId = (nested.site_id ?? data.site_id ?? '').trim();

    if (!tenant) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tenant ID requis si SharePoint est activé',
        path: ['tenant_id'],
      });
    }
    if (!clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Client ID requis si SharePoint est activé',
        path: ['client_id'],
      });
    }
    if (!siteId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Site ID requis si SharePoint est activé',
        path: ['site_id'],
      });
    }
  });

// ==================== TYPES DE LIVRABLE ====================

export const createDeliverableTypeSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  description: z.string().max(500).optional(),
  extensions_autorisees: z.array(z.string()).optional(),
  taille_max_mo: z.number().int().min(1).max(500).optional(),
});

export const updateDeliverableTypeSchema = createDeliverableTypeSchema.partial();
