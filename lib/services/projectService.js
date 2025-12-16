import Project from '@/models/Project';
import ProjectRole from '@/models/ProjectRole';
import Task from '@/models/Task';
import connectDB from '@/lib/mongodb';
import { PROJECTIONS, findProjectFull } from '@/lib/mongoOptimize';

// Cache pour les projets fréquemment accédés
const projectCache = new Map();
const PROJECT_CACHE_TTL = 30000; // 30 secondes

const getCachedProject = (key) => {
  const cached = projectCache.get(key);
  if (cached && Date.now() - cached.timestamp < PROJECT_CACHE_TTL) {
    return cached.data;
  }
  projectCache.delete(key);
  return null;
};

const setCachedProject = (key, data) => {
  if (projectCache.size > 50) {
    const firstKey = projectCache.keys().next().value;
    projectCache.delete(firstKey);
  }
  projectCache.set(key, { data, timestamp: Date.now() });
};

const invalidateProjectCache = (projectId) => {
  projectCache.delete(`project_${projectId}`);
  projectCache.delete(`project_full_${projectId}`);
  // Invalider aussi les listes de projets
  for (const key of projectCache.keys()) {
    if (key.startsWith('projects_list_')) {
      projectCache.delete(key);
    }
  }
};

class ProjectService {
  /**
   * Récupérer les projets accessibles par l'utilisateur
   */
  async getAccessibleProjects(userId, userRole, limit = 50, skip = 0) {
    await connectDB();

    const query = { archivé: false };

    // Si l'utilisateur n'est pas admin, filtrer par accès
    if (!userRole?.permissions?.voirTousProjets) {
      query.$or = [
        { chef_projet: userId },
        { product_owner: userId },
        { 'membres.user_id': userId }
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .select(PROJECTIONS.project.list)
        .populate('chef_projet', PROJECTIONS.user.minimal)
        .populate('product_owner', PROJECTIONS.user.minimal)
        .populate('template_id', 'nom')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query)
    ]);

    return { projects, total };
  }

  /**
   * Récupérer les détails complets d'un projet (avec cache)
   */
  async getProjectById(projectId, useCache = true) {
    // Vérifier le cache
    if (useCache) {
      const cached = getCachedProject(`project_full_${projectId}`);
      if (cached) return cached;
    }

    await connectDB();
    const project = await findProjectFull(projectId);

    if (project && useCache) {
      setCachedProject(`project_full_${projectId}`, project);
    }

    return project;
  }

  /**
   * Vérifier si un utilisateur a accès à un projet
   */
  async canUserAccessProject(userId, projectId) {
    await connectDB();

    const project = await Project.findById(projectId)
      .select('chef_projet product_owner membres.user_id')
      .lean();

    if (!project) return false;

    return (
      project.chef_projet.toString() === userId.toString() ||
      project.product_owner?.toString() === userId.toString() ||
      project.membres.some(m => m.user_id.toString() === userId.toString())
    );
  }

  /**
   * Récupérer les rôles d'un projet
   */
  async getProjectRoles(projectId) {
    await connectDB();
    return ProjectRole.find({ project_id: projectId }).lean().sort({ nom: 1 });
  }

  /**
   * Récupérer le rôle de projet d'un utilisateur
   */
  async getUserProjectRole(userId, projectId) {
    await connectDB();

    const project = await Project.findById(projectId)
      .select('membres.user_id membres.project_role_id')
      .lean();

    if (!project) return null;

    const member = project.membres.find(m => m.user_id.toString() === userId.toString());
    if (!member) return null;

    return ProjectRole.findById(member.project_role_id).lean();
  }

  /**
   * Créer un nouveau projet
   */
  async createProject(data, userId) {
    await connectDB();

    const project = new Project({
      nom: data.nom,
      description: data.description,
      template_id: data.template_id,
      priorité: data.priorité || 'Moyenne',
      date_début: data.date_début,
      date_fin_prévue: data.date_fin_prévue,
      chef_projet: userId,
      créé_par: userId,
      champs_dynamiques: data.champs_dynamiques || {}
    });

    await project.save();

    // Charger les relations pour la réponse
    await project.populate('chef_projet', PROJECTIONS.user.minimal);
    await project.populate('template_id', 'nom');

    return project.toObject();
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(projectId, data) {
    await connectDB();

    const project = await Project.findByIdAndUpdate(
      projectId,
      { ...data, updated_at: new Date() },
      { new: true, runValidators: true }
    )
      .populate('chef_projet', PROJECTIONS.user.minimal)
      .populate('product_owner', PROJECTIONS.user.minimal)
      .populate('template_id', 'nom')
      .lean();

    // Invalider le cache après mise à jour
    invalidateProjectCache(projectId);

    return project;
  }

  /**
   * Ajouter un membre au projet
   */
  async addProjectMember(projectId, userId, projectRoleId) {
    await connectDB();

    const project = await Project.findByIdAndUpdate(
      projectId,
      {
        $addToSet: {
          membres: {
            user_id: userId,
            project_role_id: projectRoleId,
            date_ajout: new Date()
          }
        }
      },
      { new: true }
    );

    // Invalider le cache
    invalidateProjectCache(projectId);

    return project;
  }

  /**
   * Supprimer un membre du projet
   */
  async removeProjectMember(projectId, userId) {
    await connectDB();

    const result = await Project.findByIdAndUpdate(
      projectId,
      {
        $pull: {
          membres: { user_id: userId }
        }
      },
      { new: true }
    );

    // Invalider le cache
    invalidateProjectCache(projectId);

    return result;
  }

  /**
   * Récupérer les statistiques du projet
   */
  async getProjectStats(projectId) {
    await connectDB();

    const project = await Project.findById(projectId)
      .select('stats')
      .lean();

    if (!project) return null;

    // Recalculer les stats pour s'assurer qu'elles sont à jour
    const tasks = await Task.find({ projet_id: projectId }).lean();

    // Field names aligned with Task model schema:
    // - statut 'Terminé' (not 'Terminée')
    // - estimation_heures (not heures_estimées)
    // - temps_réel (not heures_réelles)
    const stats = {
      total_tâches: tasks.length,
      tâches_terminées: tasks.filter(t => t.statut === 'Terminé').length,
      heures_estimées: tasks.reduce((sum, t) => sum + (t.estimation_heures || 0), 0),
      heures_réelles: tasks.reduce((sum, t) => sum + (t.temps_réel || 0), 0),
      progression: tasks.length > 0
        ? Math.round((tasks.filter(t => t.statut === 'Terminé').length / tasks.length) * 100)
        : 0
    };

    return stats;
  }

  /**
   * Archiver/désarchiver un projet
   */
  async toggleArchiveProject(projectId, archived) {
    await connectDB();

    return Project.findByIdAndUpdate(
      projectId,
      { archivé: archived, updated_at: new Date() },
      { new: true }
    ).lean();
  }
}

export default new ProjectService();
