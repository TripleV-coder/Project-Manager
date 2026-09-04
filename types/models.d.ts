import { Document, Types, Model } from 'mongoose';

// =============================================================================
// Shared / Reusable Sub-types
// =============================================================================

/** 23 atomic permissions used across Role and ProjectRole */
export interface IPermissions {
  voirTousProjets: boolean;
  voirSesProjets: boolean;
  creerProjet: boolean;
  supprimerProjet: boolean;
  modifierCharteProjet: boolean;
  gererMembresProjet: boolean;
  changerRoleMembre: boolean;
  gererTaches: boolean;
  deplacerTaches: boolean;
  prioriserBacklog: boolean;
  gererSprints: boolean;
  modifierBudget: boolean;
  voirBudget: boolean;
  voirTempsPasses: boolean;
  saisirTemps: boolean;
  validerLivrable: boolean;
  gererFichiers: boolean;
  commenter: boolean;
  recevoirNotifications: boolean;
  genererRapports: boolean;
  voirAudit: boolean;
  gererUtilisateurs: boolean;
  adminConfig: boolean;
}

/** Permission key string literal union */
export type PermissionKey = keyof IPermissions;

/** Menu visibility flags */
export interface IVisibleMenus {
  portfolio: boolean;
  projects: boolean;
  kanban: boolean;
  backlog: boolean;
  sprints: boolean;
  roadmap: boolean;
  tasks: boolean;
  files: boolean;
  comments: boolean;
  timesheets: boolean;
  budget: boolean;
  reports: boolean;
  notifications: boolean;
  admin: boolean;
}

/** Menu key string literal union */
export type MenuKey = keyof IVisibleMenus;

// =============================================================================
// User
// =============================================================================

export interface IPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  device?: string;
  createdAt: Date;
}

export interface IPasswordHistoryEntry {
  hash: string;
  date: Date;
}

export interface INotificationPreferences {
  email: boolean;
  in_app: boolean;
  push: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  nom_complet: string;
  email: string;
  password: string;
  role_id: Types.ObjectId | IRole;
  status: 'Actif' | 'Desactive' | 'Suspendu';
  first_login: boolean;
  must_change_password: boolean;
  tokenVersion: number;

  // User profile
  avatar?: string;
  telephone?: string;
  poste_titre?: string;
  departement_equipe?: string;
  competences: string[];
  disponibilite_hebdo: number;
  taux_journalier?: number;
  fuseau_horaire: string;
  notifications_preferees: INotificationPreferences;
  signature_email?: string;

  // Statistics
  derniere_connexion?: Date;
  projets_assignes: Types.ObjectId[];

  // Password history
  password_history: IPasswordHistoryEntry[];

  // Push Notifications
  pushSubscriptions: IPushSubscription[];

  // Security: Login attempt tracking
  failedLoginAttempts: number;
  lockUntil?: Date | null;

  // Password reset
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;

  // Two-Factor Authentication (2FA)
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  twoFactorPendingSecret?: string;

  // Audit trail
  createdBy?: Types.ObjectId | IUser | null;
  updatedBy?: Types.ObjectId | IUser | null;

  created_at: Date;
  updated_at: Date;

  // Virtuals
  readonly isLocked: boolean;

  // Methods
  incLoginAttempts(maxAttempts?: number, lockoutMinutes?: number): Promise<any>;
  resetLoginAttempts(): Promise<any>;
}

// =============================================================================
// Role
// =============================================================================

export interface IRole extends Document {
  _id: Types.ObjectId;
  nom: string;
  description?: string;
  is_custom: boolean;
  is_predefined: boolean;
  permissions: IPermissions;
  visibleMenus: IVisibleMenus;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// ProjectRole
// =============================================================================

export interface IProjectRole extends Document {
  _id: Types.ObjectId;
  nom: string;
  description?: string;
  project_id: Types.ObjectId | IProject;
  is_custom: boolean;
  is_predefined: boolean;
  permissions: IPermissions;
  visibleMenus: IVisibleMenus;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Project
// =============================================================================

export interface IProjectMember {
  user_id: Types.ObjectId | IUser;
  project_role_id: Types.ObjectId | IProjectRole;
  date_ajout: Date;
}

export interface IBudgetCategory {
  nom?: string;
  montant_prevu?: number;
  montant_depense?: number;
}

export interface IProjectBudget {
  previsionnel: number;
  reel: number;
  devise: string;
  categories: IBudgetCategory[];
}

export interface IKanbanColumn {
  id?: string;
  nom?: string;
  couleur?: string;
  wip_limit?: number;
  ordre?: number;
}

export interface IProjectSharePointConfig {
  enabled: boolean;
  site_id?: string;
  folder_path?: string;
  last_sync?: Date;
}

export interface IProjectStats {
  total_taches: number;
  taches_terminees: number;
  heures_estimees: number;
  heures_reelles: number;
  progression: number;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  nom: string;
  description?: string;
  template_id: Types.ObjectId | IProjectTemplate;

  // Contexte & Objectifs
  contexte?: string;
  objectifs?: string;
  termes_de_reference?: string;

  // Gouvernance & Parties prenantes
  comite_technique: string[];
  comite_pilotage: string[];
  structures_partenaires: string[];

  // Champs dynamiques
  champs_dynamiques: Record<string, any>;

  statut: 'Planification' | 'En cours' | 'En pause' | 'Termine' | 'Annule';
  priorite: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';

  // Dates
  date_debut?: Date;
  date_fin_prevue?: Date;
  date_fin_reelle?: Date;

  // Equipe
  chef_projet: Types.ObjectId | IUser;
  product_owner?: Types.ObjectId | IUser;
  membres: IProjectMember[];

  // Project-level custom roles
  custom_project_roles: Types.ObjectId[];

  // Budget
  budget: IProjectBudget;

  // Kanban
  colonnes_kanban: IKanbanColumn[];

  // SharePoint
  sharepoint_config: IProjectSharePointConfig;

  // Statistiques
  stats: IProjectStats;

  cree_par: Types.ObjectId | IUser;
  archive: boolean;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Task
// =============================================================================

export interface ITaskDependency {
  task_id: Types.ObjectId | ITask;
  type: 'bloque' | 'bloque_par' | 'lie_a';
}

export interface IChecklistItem {
  id?: string;
  texte?: string;
  complete: boolean;
  ordre?: number;
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  projet_id: Types.ObjectId | IProject;
  titre: string;
  description?: string;

  // Hierarchie
  type: 'Epic' | 'Story' | 'Tache' | 'Bug';
  parent_id?: Types.ObjectId | ITask;
  epic_id?: Types.ObjectId | ITask;

  // Statut et workflow
  statut: 'Backlog' | 'A faire' | 'En cours' | 'Review' | 'Termine';
  colonne_kanban?: string;

  // Priorite et estimation
  priorite: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
  ordre_priorite: number;
  story_points?: number;
  estimation_heures?: number;
  temps_reel: number;

  // Assignation
  assigne_a?: Types.ObjectId | IUser;
  cree_par: Types.ObjectId | IUser;

  // Sprint
  sprint_id?: Types.ObjectId | ISprint;

  // Livrables
  deliverable_id?: Types.ObjectId | IDeliverable;

  // Dependances
  dependances: ITaskDependency[];

  // Labels et categories
  labels: string[];
  tags: string[];

  // Checklist
  checklist: IChecklistItem[];

  // Dates
  date_debut?: Date;
  date_echeance?: Date;
  date_completion?: Date;

  // Criteres d'acceptation
  acceptance_criteria: string[];

  // Sous-taches
  has_subtasks: boolean;
  subtasks_count: number;
  subtasks_completed: number;

  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Sprint
// =============================================================================

export interface ISprintCapacityMember {
  user_id: Types.ObjectId | IUser;
  heures_disponibles?: number;
}

export interface IBurndownDataPoint {
  date?: Date;
  story_points_restants?: number;
  heures_restantes?: number;
  ideal?: number;
}

export interface IRetrospectiveAction {
  description?: string;
  responsable?: Types.ObjectId | IUser;
  statut: 'TODO' | 'En cours' | 'Fait';
}

export interface IRetrospective {
  ce_qui_a_bien_marche: string[];
  a_ameliorer: string[];
  actions: IRetrospectiveAction[];
}

export interface ISprint extends Document {
  _id: Types.ObjectId;
  projet_id: Types.ObjectId | IProject;
  nom: string;
  objectif?: string;

  statut: 'Planifie' | 'Actif' | 'Termine';

  // Dates
  date_debut: Date;
  date_fin: Date;

  // Capacity planning
  capacite_equipe: number;
  capacite_par_membre: ISprintCapacityMember[];

  // Metrics
  story_points_planifies: number;
  story_points_completes: number;
  velocity: number;

  // Burndown data
  burndown_data: IBurndownDataPoint[];

  // Retrospective
  retrospective: IRetrospective;

  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Comment
// =============================================================================

export interface ICommentAttachment {
  nom?: string;
  url?: string;
  taille?: number;
  type?: string;
}

export interface ICommentReaction {
  utilisateur: Types.ObjectId | IUser;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  date: Date;
}

export interface IComment extends Document {
  _id: Types.ObjectId;

  // Contexte
  entity_type: 'projet' | 'tache' | 'livrable' | 'sprint';
  entity_id: Types.ObjectId;

  // Contenu
  contenu: string;
  contenu_html?: string;

  // Auteur
  auteur: Types.ObjectId | IUser;

  // Threading
  parent_id?: Types.ObjectId | IComment;
  niveau: number;
  thread_id?: Types.ObjectId | IComment;

  // @mentions
  mentions: Types.ObjectId[];

  // Pieces jointes
  fichiers_joints: ICommentAttachment[];

  // Reactions
  reactions: ICommentReaction[];

  // Statut
  edite: boolean;
  date_edition?: Date;
  supprime: boolean;
  resolu: boolean;

  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Budget (Expense)
// =============================================================================

export interface IExpenseAttachment {
  nom?: string;
  url?: string;
  taille?: number;
  type?: string;
  date_upload: Date;
}

export interface IExpense extends Document {
  _id: Types.ObjectId;
  projet_id: Types.ObjectId | IProject;

  categorie: string;
  description: string;
  montant: number;
  devise: string;

  type: 'interne' | 'externe' | 'materiel' | 'service' | 'autre';

  date_depense: Date;

  // Fournisseur / Preuve
  fournisseur?: string;
  reference_justificatif?: string;

  // Justificatifs
  justificatifs: IExpenseAttachment[];

  // Validation
  statut: 'en_attente' | 'valide' | 'refuse' | 'paye';
  valide_par?: Types.ObjectId | IUser;
  date_validation?: Date;

  saisi_par: Types.ObjectId | IUser;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// File
// =============================================================================

export interface IFile extends Document {
  _id: Types.ObjectId;
  nom: string;
  nom_original: string;
  extension?: string;
  taille: number;
  type_mime?: string;
  type?: string;
  url?: string;

  // Dossier/folder support
  dossier: string;

  // Stockage local
  url_local?: string;
  path_local?: string;

  // SharePoint metadata
  sharepoint_id?: string;
  sharepoint_url?: string;
  sharepoint_synced: boolean;
  last_sync_sharepoint?: Date;

  // Contexte
  entity_type: string;
  entity_id: Types.ObjectId;
  projet_id?: Types.ObjectId | IProject;

  // Utilisateur
  uploade_par: Types.ObjectId | IUser;

  // Versioning
  version: number;
  parent_file_id?: Types.ObjectId | IFile;
  is_latest_version: boolean;

  // Metadonnees
  description?: string;
  tags: string[];

  // Preview
  has_preview: boolean;
  preview_url?: string;
  thumbnail_url?: string;

  // Telechargements
  download_count: number;
  last_downloaded?: Date;

  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Notification
// =============================================================================

export type NotificationType =
  | 'mention'
  | 'assignation_tache'
  | 'commentaire'
  | 'changement_statut'
  | 'nouveau_livrable'
  | 'validation_requise'
  | 'deadline_proche'
  | 'budget_depasse'
  | 'ajout_projet'
  | 'sprint_demarre'
  | 'sprint_termine'
  | 'autre';

export interface INotificationChannels {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  destinataire: Types.ObjectId | IUser;

  type: NotificationType;

  titre: string;
  message: string;

  // Contexte
  entity_type?: string;
  entity_id?: Types.ObjectId;
  entity_nom?: string;

  // Lien action
  lien?: string;

  // Expediteur
  expediteur?: Types.ObjectId | IUser;

  // Statut
  lu: boolean;
  date_lecture?: Date;
  archive: boolean;

  // Canaux de livraison
  canaux: INotificationChannels;

  email_envoye: boolean;
  date_email?: Date;

  created_at: Date;
}

// =============================================================================
// AuditLog
// =============================================================================

export type AuditAction =
  | 'connexion'
  | 'deconnexion'
  | 'creation'
  | 'modification'
  | 'suppression'
  | 'consultation'
  | 'validation'
  | 'refus'
  | 'assignation'
  | 'changement_statut'
  | 'upload_fichier'
  | 'download_fichier'
  | 'export'
  | 'import'
  | 'permission_change'
  | 'role_change'
  | 'password_reset'
  | 'password_change'
  | 'email_change'
  | 'login_failed'
  | 'access_denied'
  | 'bulk_action'
  | 'api_call'
  | 'autre';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AuditResult = 'success' | 'failure' | 'partial';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;

  // User who performed the action
  utilisateur: Types.ObjectId | IUser;
  utilisateur_email?: string;
  utilisateur_nom?: string;

  // Action type
  action: AuditAction;

  // Entity affected
  entity_type: string;
  entity_id?: Types.ObjectId;
  entity_nom?: string;
  entity_properties?: string[];

  // Details of changes
  description?: string;
  old_value?: any;
  new_value?: any;
  changed_fields?: string[];

  // Technical context
  ip_address?: string;
  ip_country?: string;
  ip_city?: string;
  user_agent?: string;
  navigateur?: string;
  navigateur_version?: string;
  os?: string;
  os_version?: string;
  device_type: DeviceType;
  session_id?: string;

  // Request details
  http_method?: HttpMethod;
  endpoint?: string;
  http_status?: number;

  // Result
  result: AuditResult;
  error_message?: string;

  // Security & Severity
  severity: AuditSeverity;
  is_sensitive: boolean;
  is_suspicious: boolean;

  // Metadata
  metadata?: any;
  duration_ms?: number;
  response_size_bytes?: number;

  // Related context
  related_user_ids?: Types.ObjectId[];
  related_project_id?: Types.ObjectId | IProject;

  timestamp: Date;
}

// =============================================================================
// Timesheet (TimesheetEntry)
// =============================================================================

export interface ITimerPause {
  start?: Date;
  end?: Date;
  duree_minutes?: number;
}

export interface ITimesheetEntry extends Document {
  _id: Types.ObjectId;
  utilisateur: Types.ObjectId | IUser;
  projet_id: Types.ObjectId | IProject;
  task_id?: Types.ObjectId | ITask;
  sprint_id?: Types.ObjectId | ISprint;

  // Date tracking
  date: Date;
  date_debut_reel?: Date;
  date_fin_reelle?: Date;
  heures: number;
  description?: string;

  // Type de saisie
  type_saisie: 'manuelle' | 'timer';

  // Timer data
  timer_start?: Date;
  timer_end?: Date;
  timer_pauses: ITimerPause[];

  // Validation workflow
  statut: 'brouillon' | 'soumis' | 'valide' | 'refuse';
  valide_par?: Types.ObjectId | IUser;
  date_validation?: Date;
  commentaire_validation?: string;

  // Facturation
  facturable: boolean;
  taux_horaire?: number;
  montant?: number;
  facture: boolean;

  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// AppSettings
// =============================================================================

export interface IAppSettings extends Document {
  _id: Types.ObjectId;
  key: 'maintenance_mode' | 'app_settings' | 'feature_flags';
  value: any;
  description?: string;
  updated_at: Date;
  updated_by?: Types.ObjectId | IUser;
  created_at: Date;
}

// =============================================================================
// Deliverable
// =============================================================================

export interface IDeliverableWorkflowEntry {
  etape_id?: string;
  etape_nom?: string;
  action: 'valide' | 'refuse' | 'demande_modification';
  commentaire?: string;
  utilisateur?: Types.ObjectId | IUser;
  date: Date;
  fichiers_joints?: string[];
}

export interface IDeliverableSignature {
  utilisateur: Types.ObjectId | IUser;
  date?: Date;
  signature_data?: string;
  ip_address?: string;
}

export interface IDeliverableFile {
  nom?: string;
  url?: string;
  taille?: number;
  type?: string;
  uploade_par?: Types.ObjectId | IUser;
  date_upload: Date;
}

export interface IDeliverable extends Document {
  _id: Types.ObjectId;
  projet_id: Types.ObjectId | IProject;
  type_id: Types.ObjectId | IDeliverableType;

  nom: string;
  description?: string;

  // Metadonnees dynamiques
  metadata: Record<string, any>;

  // Workflow
  statut_global: 'A produire' | 'En validation' | 'Valide' | 'Refuse' | 'Archive';
  etape_actuelle_id?: string;
  etape_actuelle_ordre?: number;

  historique_workflow: IDeliverableWorkflowEntry[];

  // Assignation
  assigne_a?: Types.ObjectId | IUser;

  // Dates
  date_echeance?: Date;
  date_validation?: Date;
  date_archivage?: Date;

  // Signature electronique
  signatures: IDeliverableSignature[];

  // Fichiers
  fichiers: IDeliverableFile[];

  cree_par: Types.ObjectId | IUser;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// DeliverableType
// =============================================================================

export interface IWorkflowStepApprover {
  type: 'role' | 'utilisateur';
  role_id?: Types.ObjectId | IRole;
  user_id?: Types.ObjectId | IUser;
}

export interface IWorkflowStep {
  id?: string;
  nom: string;
  description?: string;
  ordre: number;
  type: 'Creation' | 'Revision' | 'Approbation' | 'Signature' | 'Archivage';
  approbateurs: IWorkflowStepApprover[];
  delai_max_jours?: number;
  conditions?: any;
  routing: 'sequentiel' | 'parallele';
}

export interface IMetadataField {
  id?: string;
  type?: string;
  label?: string;
  required?: boolean;
  properties?: any;
}

export interface IDeliverableType extends Document {
  _id: Types.ObjectId;
  nom: string;
  description?: string;
  icone?: string;
  couleur?: string;

  // Hierarchie
  scope: 'global' | 'template' | 'projet';
  template_id?: Types.ObjectId | IProjectTemplate;
  projet_id?: Types.ObjectId | IProject;

  // Workflow de validation simplifie
  workflow_etapes: string[];

  // Workflow de validation avance
  workflow_enabled: boolean;
  etapes_workflow: IWorkflowStep[];

  // Metadonnees personnalisees
  champs_metadata: IMetadataField[];

  // Dependances
  livrables_prerequis: Types.ObjectId[];

  // Signature electronique
  signature_required: boolean;

  cree_par: Types.ObjectId | IUser;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// ProjectTemplate
// =============================================================================

export type TemplateFieldType =
  | 'texte'
  | 'nombre'
  | 'date'
  | 'selecteur'
  | 'utilisateur'
  | 'fichier'
  | 'budget'
  | 'url';

export interface ITemplateFieldProperties {
  // For texte
  variant?: string;
  longueur_max?: number;
  pattern?: string;
  // For nombre
  min?: number;
  max?: number;
  step?: number;
  unite?: string;
  format?: string;
  // For date
  date_min?: Date;
  date_max?: Date;
  format_date?: string;
  aujourdhui_par_defaut?: boolean;
  // For selecteur
  options?: string[];
  recherchable?: boolean;
  creeable?: boolean;
  multiple?: boolean;
  // For utilisateur
  filtre_role?: string;
  filtre_equipe?: string;
  multiple_users?: boolean;
  // For fichier
  types_autorises?: string[];
  taille_max?: number;
  multiple_files?: boolean;
  max_fichiers?: number;
}

export interface IConditionalLogic {
  enabled: boolean;
  show_if?: any;
  require_if?: any;
}

export interface ITemplateField {
  id?: string;
  type: TemplateFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  default_value?: any;
  properties: ITemplateFieldProperties;
  conditional_logic: IConditionalLogic;
  group?: string;
  order: number;
}

export interface IWorkflowConfig {
  etapes_par_defaut?: string[];
  livrables_auto?: Types.ObjectId[];
  notifications_auto?: boolean;
}

export interface IProjectTemplate extends Document {
  _id: Types.ObjectId;
  nom: string;
  description?: string;
  categorie?: string;
  tags: string[];
  icone?: string;
  couleur?: string;

  // Valeurs par defaut
  default_contexte?: string;
  default_objectifs?: string;
  default_termes_de_reference?: string;
  default_comite_technique: string[];
  default_comite_pilotage: string[];
  default_structures_partenaires: string[];

  // Structure des champs dynamiques
  champs: ITemplateField[];

  // Configuration workflow
  config_workflow: IWorkflowConfig;

  // Statistiques
  utilise_count: number;
  favoris: boolean;

  cree_par: Types.ObjectId | IUser;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// SharePointConfig
// =============================================================================

export interface ISharePointConnectionStatus {
  connected: boolean;
  last_test?: Date;
  last_error?: string;
  site_name?: string;
  site_url?: string;
}

export interface ISyncError {
  date?: Date;
  file_name?: string;
  error?: string;
}

export interface ISyncStats {
  last_sync?: Date;
  files_synced: number;
  files_failed: number;
  total_size: number;
  errors: ISyncError[];
}

export interface ISharePointConfig extends Document {
  _id: string;

  enabled: boolean;

  // Azure AD identifiers
  tenant_id: string;
  client_id: string;
  client_secret: string;
  site_id: string;

  // Sync configuration
  sync_enabled: boolean;
  sync_interval: number;

  // Connection status
  connection_status: ISharePointConnectionStatus;

  // Sync statistics
  sync_stats: ISyncStats;

  // Metadata
  updated_by?: Types.ObjectId | IUser;
  updated_at: Date;
}

export interface ISharePointConfigModel extends Model<ISharePointConfig> {
  getConfig(includeSecret?: boolean): Promise<ISharePointConfig>;
  updateConfig(
    data: Partial<ISharePointConfig>,
    userId: Types.ObjectId
  ): Promise<ISharePointConfig>;
  isConfigured(): Promise<boolean>;
  updateConnectionStatus(status: Partial<ISharePointConnectionStatus>): Promise<ISharePointConfig>;
  updateSyncStats(
    stats: Partial<ISyncStats> & { errors?: Array<{ file_name: string; error: string }> }
  ): Promise<ISharePointConfig>;
}

// =============================================================================
// UserSession
// =============================================================================

export type SessionStatus = 'actif' | 'inactif' | 'expire' | 'revoque';
export type ConnectionType = 'local' | 'oauth' | 'saml' | 'token';

export interface IUserSession extends Document {
  _id: Types.ObjectId;

  // User reference
  utilisateur: Types.ObjectId | IUser;
  utilisateur_email?: string;
  utilisateur_nom?: string;

  // Session info
  session_token: string;

  // Login details
  login_time: Date;
  logout_time?: Date;
  duration_minutes?: number;

  // Device & Location
  ip_address?: string;
  ip_country?: string;
  ip_city?: string;
  ip_latitude?: number;
  ip_longitude?: number;

  user_agent?: string;
  navigateur?: string;
  navigateur_version?: string;
  os?: string;
  os_version?: string;
  device_type: DeviceType;

  // Connection details
  type_connexion: ConnectionType;

  // Status
  statut: SessionStatus;

  // Security
  is_secure: boolean;
  is_suspicious: boolean;
  anomalies: string[];

  // Actions during session
  actions_count: number;
  last_activity?: Date;

  // Metadata
  metadata?: any;

  created_at: Date;
  updated_at: Date;
}
