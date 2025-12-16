// Optimisations pour les requêtes MongoDB
// Ajoute .lean() et .select() pour améliorer les performances

// Projections optimisées pour chaque entité
export const PROJECTIONS = {
  user: {
    normal: 'nom_complet email avatar poste_titre département_équipe status role_id dernière_connexion created_at updated_at',
    minimal: 'nom_complet email avatar',
    list: 'nom_complet email avatar poste_titre status role_id dernière_connexion created_at',
    full: '-password -password_history -resetPasswordToken -resetPasswordExpires'
  },
  project: {
    normal: 'nom description statut priorité date_début date_fin_prévue date_fin_réelle stats archivé chef_projet product_owner membres template_id created_at updated_at',
    list: 'nom description statut priorité date_début date_fin_prévue stats chef_projet product_owner membres created_at',
    minimal: 'nom statut priorité',
    kanban: 'nom colonnes_kanban membres chef_projet product_owner'
  },
  task: {
    normal: 'titre description statut priorité type assigné_à projet_id sprint_id deliverable_id date_échéance date_début estimation_heures temps_réel story_points ordre_priorité colonne_kanban labels tags checklist créé_par created_at updated_at',
    list: 'titre description statut priorité type assigné_à projet_id sprint_id date_échéance date_début story_points ordre_priorité colonne_kanban labels created_at',
    minimal: 'titre statut priorité type',
    kanban: 'titre description statut priorité type assigné_à ordre_priorité colonne_kanban story_points labels'
  },
  sprint: {
    normal: 'nom objectif statut projet_id date_début date_fin capacité_équipe story_points_planifiés story_points_complétés velocity created_at',
    list: 'nom statut projet_id date_début date_fin story_points_planifiés story_points_complétés',
    minimal: 'nom statut date_début date_fin'
  },
  notification: {
    normal: 'type titre message entity_type entity_id entity_nom lu archivé expéditeur created_at',
    list: 'type titre entity_type entity_id lu created_at',
    minimal: 'type titre lu'
  },
  file: {
    normal: 'nom type_mime taille dossier projet_id entity_type entity_id uploadé_par tags description created_at',
    list: 'nom type_mime taille dossier projet_id uploadé_par created_at',
    minimal: 'nom type_mime taille'
  },
  comment: {
    normal: 'contenu contenu_html entity_type entity_id auteur parent_id niveau thread_id mentions fichiers_joints reactions édité résolu created_at updated_at',
    list: 'contenu entity_type entity_id auteur parent_id created_at',
    minimal: 'contenu auteur created_at'
  },
  timesheet: {
    normal: 'utilisateur projet_id task_id sprint_id date heures description type_saisie statut facturable taux_horaire montant created_at',
    list: 'utilisateur projet_id task_id date heures statut facturable created_at',
    minimal: 'date heures statut'
  },
  role: {
    normal: 'nom description is_custom is_predefined permissions visibleMenus created_at',
    list: 'nom description is_predefined is_custom',
    minimal: 'nom permissions visibleMenus'
  }
};

// Builder pour requêtes optimisées
export class OptimizedQuery {
  constructor(model, entityType = null) {
    this.query = model;
    this.entityType = entityType;
    this.projectionType = 'normal';
    this.shouldLean = true;
  }

  select(fields) {
    this.query = this.query.select(fields);
    return this;
  }

  populate(path, select = null) {
    const populateObj = typeof path === 'string' ? { path, select } : path;
    this.query = this.query.populate(populateObj);
    return this;
  }

  lean(shouldLean = true) {
    this.shouldLean = shouldLean;
    return this;
  }

  async exec() {
    if (this.shouldLean) {
      return this.query.lean();
    }
    return this.query;
  }

  sort(sortObj) {
    this.query = this.query.sort(sortObj);
    return this;
  }

  skip(n) {
    this.query = this.query.skip(n);
    return this;
  }

  limit(n) {
    this.query = this.query.limit(n);
    return this;
  }

  // Méthode pour appliquer la projection optimale
  withProjection(type = 'normal') {
    const projection = PROJECTIONS[this.entityType]?.[type];
    if (projection) {
      this.query = this.query.select(projection);
    }
    return this;
  }
}

// Helpers rapides pour les requêtes courantes
export async function findUserLean(id, selectFields = PROJECTIONS.user.normal) {
  const User = require('@/models/User').default;
  return User.findById(id).select(selectFields).lean();
}

export async function findProjectLean(id, selectFields = PROJECTIONS.project.normal) {
  const Project = require('@/models/Project').default;
  return Project.findById(id)
    .select(selectFields)
    .populate('chef_projet', PROJECTIONS.user.minimal)
    .populate('product_owner', PROJECTIONS.user.minimal)
    .populate('template_id', 'nom')
    .lean();
}

export async function findProjectsLean(query = {}, limit = 50, skip = 0) {
  const Project = require('@/models/Project').default;
  return Project.find(query)
    .select(PROJECTIONS.project.list)
    .populate('chef_projet', PROJECTIONS.user.minimal)
    .populate('product_owner', PROJECTIONS.user.minimal)
    .populate('template_id', 'nom')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

export async function findTasksLean(query = {}, limit = 50, skip = 0) {
  const Task = require('@/models/Task').default;
  return Task.find(query)
    .select(PROJECTIONS.task.list)
    .populate('assigné_à', PROJECTIONS.user.minimal)
    .populate('créé_par', PROJECTIONS.user.minimal)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

export async function findUsersLean(query = {}, limit = 50, skip = 0) {
  const User = require('@/models/User').default;
  return User.find(query)
    .select(PROJECTIONS.user.normal)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

// Helper pour compter les documents
export async function countDocuments(Model, query = {}) {
  return Model.countDocuments(query);
}

// Helper pour les requêtes avec populate complet (quand on a besoin de la structure complète)
export async function findProjectFull(id) {
  const Project = require('@/models/Project').default;
  return Project.findById(id)
    .populate('chef_projet', PROJECTIONS.user.minimal)
    .populate('product_owner', PROJECTIONS.user.minimal)
    .populate('membres.user_id', PROJECTIONS.user.minimal)
    .populate('membres.project_role_id', 'nom description permissions visibleMenus')
    .populate('template_id')
    .populate('créé_par', PROJECTIONS.user.minimal)
    .lean();
}

// ===== HELPERS POUR COMPARAISON D'OBJECTID =====

/**
 * Compare deux ObjectId de manière sécurisée
 * Gère les cas où l'un ou les deux peuvent être null/undefined/string
 * @param {ObjectId|string|null} id1
 * @param {ObjectId|string|null} id2
 * @returns {boolean}
 */
export function compareObjectIds(id1, id2) {
  if (!id1 || !id2) return false;

  // Convertir en string pour comparaison sécurisée
  const str1 = id1.toString ? id1.toString() : String(id1);
  const str2 = id2.toString ? id2.toString() : String(id2);

  return str1 === str2;
}

/**
 * Vérifie si un userId est membre d'un projet
 * @param {Object} project - Le projet avec ses membres
 * @param {ObjectId|string} userId - L'ID de l'utilisateur à vérifier
 * @returns {boolean}
 */
export function isUserProjectMember(project, userId) {
  if (!project || !userId) return false;

  // Vérifier chef de projet
  if (project.chef_projet && compareObjectIds(project.chef_projet, userId)) {
    return true;
  }

  // Vérifier product owner
  if (project.product_owner && compareObjectIds(project.product_owner, userId)) {
    return true;
  }

  // Vérifier membres
  if (project.membres && Array.isArray(project.membres)) {
    return project.membres.some(m => {
      const memberId = m.user_id || m;
      return compareObjectIds(memberId, userId);
    });
  }

  return false;
}

/**
 * Trouve un membre dans un projet par userId
 * @param {Object} project - Le projet
 * @param {ObjectId|string} userId - L'ID utilisateur
 * @returns {Object|null} - Les données du membre ou null
 */
export function findProjectMember(project, userId) {
  if (!project?.membres || !userId) return null;

  return project.membres.find(m => {
    const memberId = m.user_id || m;
    return compareObjectIds(memberId, userId);
  }) || null;
}

/**
 * Détermine le rôle d'un utilisateur dans un projet
 * @param {Object} project - Le projet
 * @param {ObjectId|string} userId - L'ID utilisateur
 * @returns {string|null} - 'chef_projet' | 'product_owner' | 'membre' | null
 */
export function getUserProjectRole(project, userId) {
  if (!project || !userId) return null;

  if (project.chef_projet && compareObjectIds(project.chef_projet, userId)) {
    return 'chef_projet';
  }

  if (project.product_owner && compareObjectIds(project.product_owner, userId)) {
    return 'product_owner';
  }

  if (isUserProjectMember(project, userId)) {
    return 'membre';
  }

  return null;
}
