import Project from '@/models/Project';
import ProjectRole from '@/models/ProjectRole';
import Task from '@/models/Task';
import Deliverable from '@/models/Deliverable';
import Sprint from '@/models/Sprint';
import Comment from '@/models/Comment';
import { isOnProjectRoster, isSameUser } from '@/lib/projectRoster';

const ENTITY_TYPE_ALIASES = {
  projet: ['projet', 'project'],
  tâche: ['tâche', 'tache', 'task'],
  livrable: ['livrable', 'deliverable'],
  sprint: ['sprint'],
  commentaire: ['commentaire', 'comment'],
};

const toIdString = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const hasSystemPermission = (user, permissions) => {
  const perms = user?.role_id?.permissions || user?.role?.permissions || {};
  const list = Array.isArray(permissions) ? permissions : [permissions];
  return list.some((permission) => perms[permission] === true);
};

export function isGlobalProjectReader(user) {
  const perms = user?.role_id?.permissions || user?.role?.permissions || {};
  return perms.adminConfig === true || perms.voirTousProjets === true;
}

export function isSystemAdmin(user) {
  const perms = user?.role_id?.permissions || user?.role?.permissions || {};
  return perms.adminConfig === true;
}

export function canSeeBudgets(user) {
  return isSystemAdmin(user) || hasSystemPermission(user, 'voirBudget');
}

export function omitProjectBudget(project) {
  if (!project || typeof project !== 'object') return project;
  const { budget: _budget, ...rest } = project;
  return rest;
}

/**
 * Un assigné hors roster peut voir le contexte de travail, pas l'équipe ni la gouvernance.
 */
export function redactProjectForAssignee(project) {
  const source = project?.toObject ? project.toObject() : project;
  if (!source || typeof source !== 'object') return source;

  return {
    _id: source._id,
    nom: source.nom,
    description: source.description,
    statut: source.statut,
    priorité: source.priorité,
    date_début: source.date_début,
    date_fin_prévue: source.date_fin_prévue,
    colonnes_kanban: source.colonnes_kanban,
    stats: source.stats,
    archivé: source.archivé,
    assignee_limited: true,
  };
}

export function isProjectMember(project, userId) {
  const id = toIdString(userId);
  if (!project || !id) return false;

  return (
    toIdString(project.chef_projet) === id ||
    toIdString(project.product_owner) === id ||
    toIdString(project.créé_par) === id ||
    project.membres?.some((member) => toIdString(member.user_id) === id) === true
  );
}

export async function getAccessibleProjectIds(user) {
  if (isGlobalProjectReader(user)) return null;

  const projects = await Project.find({
    archivé: false,
    $or: [
      { chef_projet: user._id },
      { product_owner: user._id },
      { créé_par: user._id },
      { 'membres.user_id': user._id },
    ],
  })
    .select('_id')
    .lean();

  return projects.map((project) => project._id);
}

export async function canAccessProject(user, projectId) {
  if (isGlobalProjectReader(user)) return true;

  const project = await Project.findById(projectId)
    .select('chef_projet product_owner créé_par membres.user_id archivé')
    .lean();
  if (!project || project.archivé) return false;

  return isProjectMember(project, user._id);
}

export async function canAccessProjectOrAssignedWork(user, projectId) {
  if (await canAccessProject(user, projectId)) return true;
  if (!user?._id || !projectId) return false;
  return Boolean(await Task.exists({ projet_id: projectId, assigné_à: user._id }));
}

export async function getProjectIdsWithAssignedWork(user) {
  if (!user?._id) return [];
  const tasks = await Task.find({ assigné_à: user._id }).select('projet_id').lean();
  return tasks.map((task) => task.projet_id).filter(Boolean);
}

export function canViewTask(user, task, project = null) {
  if (isGlobalProjectReader(user)) return true;
  if (isSameUser(task?.assigné_à, user?._id)) return true;
  if (project) return isProjectMember(project, user._id);
  return false;
}

/**
 * Empêche d'assigner une tâche / un sprint / un parent hors du projet.
 * @returns {string|null} message d'erreur ou null si OK
 */
export async function validateTaskCommandChain(fields, project) {
  if (!project) return 'Projet introuvable';
  const projectId = toIdString(project._id || project);

  if (fields.assigné_à && !isOnProjectRoster(project, fields.assigné_à)) {
    return "La tâche ne peut être assignée qu'à un membre, chef de projet ou product owner de ce projet";
  }

  if (fields.sprint_id) {
    const sprint = await Sprint.findById(fields.sprint_id).select('projet_id').lean();
    if (!sprint || toIdString(sprint.projet_id) !== projectId) {
      return 'Le sprint doit appartenir au même projet que la tâche';
    }
  }

  if (fields.parent_id) {
    const parent = await Task.findById(fields.parent_id).select('projet_id').lean();
    if (!parent || toIdString(parent.projet_id) !== projectId) {
      return 'La tâche parente doit appartenir au même projet';
    }
  }

  if (fields.deliverable_id) {
    const deliverable = await Deliverable.findById(fields.deliverable_id)
      .select('projet_id')
      .lean();
    if (!deliverable || toIdString(deliverable.projet_id) !== projectId) {
      return 'Le livrable doit appartenir au même projet';
    }
  }

  return null;
}

export async function canUseProjectPermission(user, projectId, permissions) {
  if (isSystemAdmin(user)) return true;
  if (!hasSystemPermission(user, permissions)) return false;

  const project = await Project.findById(projectId)
    .select('chef_projet product_owner créé_par membres.user_id membres.project_role_id archivé')
    .lean();
  if (!project || project.archivé) return false;

  const userId = toIdString(user._id);
  const isProjectLead =
    toIdString(project.chef_projet) === userId ||
    toIdString(project.product_owner) === userId ||
    toIdString(project.créé_par) === userId;

  if (isProjectLead) return true;

  const member = project.membres?.find((item) => toIdString(item.user_id) === userId);
  if (!member?.project_role_id) return false;

  const projectRole = await ProjectRole.findById(member.project_role_id).lean();
  const list = Array.isArray(permissions) ? permissions : [permissions];

  return list.some(
    (permission) =>
      hasSystemPermission(user, permission) && projectRole?.permissions?.[permission] === true
  );
}

export async function resolveProjectIdForEntity(entityType, entityId) {
  if (!entityType || !entityId) return null;

  if (ENTITY_TYPE_ALIASES.projet.includes(entityType)) {
    const project = await Project.findById(entityId).select('_id').lean();
    return project?._id || null;
  }

  if (ENTITY_TYPE_ALIASES.tâche.includes(entityType)) {
    const task = await Task.findById(entityId).select('projet_id').lean();
    return task?.projet_id || null;
  }

  if (ENTITY_TYPE_ALIASES.livrable.includes(entityType)) {
    const deliverable = await Deliverable.findById(entityId).select('projet_id').lean();
    return deliverable?.projet_id || null;
  }

  if (ENTITY_TYPE_ALIASES.sprint.includes(entityType)) {
    const sprint = await Sprint.findById(entityId).select('projet_id').lean();
    return sprint?.projet_id || null;
  }

  if (ENTITY_TYPE_ALIASES.commentaire.includes(entityType)) {
    const comment = await Comment.findById(entityId).select('entity_type entity_id').lean();
    if (!comment) return null;
    return resolveProjectIdForEntity(comment.entity_type, comment.entity_id);
  }

  return null;
}

export async function buildAccessibleEntityConditions(user, requestedEntityType = null) {
  const projectIds = await getAccessibleProjectIds(user);
  if (projectIds === null) return null;
  if (projectIds.length === 0) return [{ entity_id: { $in: [] } }];

  const [tasks, deliverables, sprints] = await Promise.all([
    Task.find({ projet_id: { $in: projectIds } })
      .select('_id')
      .lean(),
    Deliverable.find({ projet_id: { $in: projectIds } })
      .select('_id')
      .lean(),
    Sprint.find({ projet_id: { $in: projectIds } })
      .select('_id')
      .lean(),
  ]);

  const wants = (canonicalType) =>
    !requestedEntityType || ENTITY_TYPE_ALIASES[canonicalType].includes(requestedEntityType);

  const conditions = [];
  if (wants('projet')) {
    conditions.push({
      entity_type: { $in: ENTITY_TYPE_ALIASES.projet },
      entity_id: { $in: projectIds },
    });
  }
  if (wants('tâche')) {
    conditions.push({
      entity_type: { $in: ENTITY_TYPE_ALIASES.tâche },
      entity_id: { $in: tasks.map((task) => task._id) },
    });
  }
  if (wants('livrable')) {
    conditions.push({
      entity_type: { $in: ENTITY_TYPE_ALIASES.livrable },
      entity_id: { $in: deliverables.map((deliverable) => deliverable._id) },
    });
  }
  if (wants('sprint')) {
    conditions.push({
      entity_type: { $in: ENTITY_TYPE_ALIASES.sprint },
      entity_id: { $in: sprints.map((sprint) => sprint._id) },
    });
  }

  return conditions.length > 0 ? conditions : [{ entity_id: { $in: [] } }];
}

export { ENTITY_TYPE_ALIASES };
