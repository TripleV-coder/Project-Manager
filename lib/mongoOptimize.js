// Optimisations pour les requêtes MongoDB
// Ajoute .lean() et .select() pour améliorer les performances

// Projections optimisées pour chaque entité
export const PROJECTIONS = {
  user: {
    normal: 'nom_complet email avatar poste_titre département_équipe status created_at',
    minimal: 'nom_complet email avatar',
    full: '-password -password_history'
  },
  project: {
    normal: 'nom description statut priorité date_début date_fin_prévue stats archived created_at updated_at',
    list: 'nom description statut priorité stats created_at',
    minimal: 'nom statut'
  },
  task: {
    normal: 'titre description statut priorité assigné_à projet_id sprint_id date_deadline heures_estimées heures_réelles created_at',
    list: 'titre statut priorité assigné_à projet_id date_deadline created_at',
    minimal: 'titre statut'
  },
  notification: {
    normal: 'type titre message entity_type entity_id lu created_at',
    list: 'type titre entity_type lu created_at',
  },
  file: {
    normal: 'nom type taille entity_type entity_id uploaded_by created_at',
    list: 'nom type entity_type created_at'
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
