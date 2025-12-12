import Project from '@/models/Project';
import ProjectRole from '@/models/ProjectRole';
import User from '@/models/User';
import Task from '@/models/Task';
import connectDB from '@/lib/mongodb';
import { PROJECTIONS, findProjectsLean, findProjectFull } from '@/lib/mongoOptimize';

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
   * Récupérer les détails complets d'un projet
   */
  async getProjectById(projectId) {
    await connectDB();
    return findProjectFull(projectId);
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

    return project;
  }

  /**
   * Supprimer un membre du projet
   */
  async removeProjectMember(projectId, userId) {
    await connectDB();

    return Project.findByIdAndUpdate(
      projectId,
      {
        $pull: {
          membres: { user_id: userId }
        }
      },
      { new: true }
    );
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
    
    const stats = {
      total_tâches: tasks.length,
      tâches_terminées: tasks.filter(t => t.statut === 'Terminée').length,
      heures_estimées: tasks.reduce((sum, t) => sum + (t.heures_estimées || 0), 0),
      heures_réelles: tasks.reduce((sum, t) => sum + (t.heures_réelles || 0), 0),
      progression: tasks.length > 0
        ? Math.round((tasks.filter(t => t.statut === 'Terminée').length / tasks.length) * 100)
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
