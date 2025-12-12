import Task from '@/models/Task';
import Project from '@/models/Project';
import connectDB from '@/lib/mongodb';
import { PROJECTIONS } from '@/lib/mongoOptimize';

class TaskService {
  /**
   * Récupérer les tâches d'un projet (paginées)
   */
  async getProjectTasks(projectId, limit = 50, skip = 0, filter = {}) {
    await connectDB();

    const query = { projet_id: projectId, ...filter };

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .select(PROJECTIONS.task.list)
        .populate('assigné_à', PROJECTIONS.user.minimal)
        .populate('créé_par', PROJECTIONS.user.minimal)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query)
    ]);

    return { tasks, total };
  }

  /**
   * Récupérer les tâches assignées à un utilisateur
   */
  async getUserTasks(userId, limit = 50, skip = 0, filter = {}) {
    await connectDB();

    const query = { assigné_à: userId, ...filter };

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .select(PROJECTIONS.task.list)
        .populate('projet_id', 'nom')
        .populate('créé_par', PROJECTIONS.user.minimal)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query)
    ]);

    return { tasks, total };
  }

  /**
   * Récupérer une tâche par ID
   */
  async getTaskById(taskId) {
    await connectDB();

    return Task.findById(taskId)
      .select(PROJECTIONS.task.normal)
      .populate('assigné_à', PROJECTIONS.user.minimal)
      .populate('créé_par', PROJECTIONS.user.minimal)
      .populate('projet_id', 'nom')
      .lean();
  }

  /**
   * Créer une nouvelle tâche
   */
  async createTask(data, userId) {
    await connectDB();

    // Vérifier que le projet existe
    const project = await Project.findById(data.projet_id).select('_id').lean();
    if (!project) {
      throw new Error('Projet non trouvé');
    }

    const task = new Task({
      titre: data.titre,
      description: data.description,
      projet_id: data.projet_id,
      statut: data.statut || 'À faire',
      priorité: data.priorité || 'Moyenne',
      assigné_à: data.assigné_à,
      sprint_id: data.sprint_id,
      date_deadline: data.date_deadline,
      heures_estimées: data.heures_estimées,
      créé_par: userId
    });

    await task.save();

    // Mettre à jour les statistiques du projet
    await this.updateProjectStats(data.projet_id);

    await task.populate('assigné_à', PROJECTIONS.user.minimal);
    await task.populate('créé_par', PROJECTIONS.user.minimal);

    return task.toObject();
  }

  /**
   * Mettre à jour une tâche
   */
  async updateTask(taskId, data) {
    await connectDB();

    const task = await Task.findByIdAndUpdate(
      taskId,
      { ...data, updated_at: new Date() },
      { new: true, runValidators: true }
    )
      .select(PROJECTIONS.task.normal)
      .populate('assigné_à', PROJECTIONS.user.minimal)
      .populate('créé_par', PROJECTIONS.user.minimal)
      .lean();

    if (task && data.statut) {
      await this.updateProjectStats(task.projet_id);
    }

    return task;
  }

  /**
   * Mettre à jour le statut d'une tâche
   */
  async updateTaskStatus(taskId, statut) {
    await connectDB();

    const task = await Task.findByIdAndUpdate(
      taskId,
      { statut, updated_at: new Date() },
      { new: true }
    ).lean();

    if (task) {
      await this.updateProjectStats(task.projet_id);
    }

    return task;
  }

  /**
   * Assigner une tâche à un utilisateur
   */
  async assignTask(taskId, userId) {
    await connectDB();

    const task = await Task.findByIdAndUpdate(
      taskId,
      { assigné_à: userId, updated_at: new Date() },
      { new: true }
    )
      .populate('assigné_à', PROJECTIONS.user.minimal)
      .lean();

    return task;
  }

  /**
   * Supprimer une tâche
   */
  async deleteTask(taskId) {
    await connectDB();

    const task = await Task.findById(taskId).select('projet_id').lean();
    if (!task) return null;

    await Task.findByIdAndDelete(taskId);

    // Mettre à jour les stats du projet
    await this.updateProjectStats(task.projet_id);

    return task;
  }

  /**
   * Recalculer et mettre à jour les statistiques du projet
   */
  async updateProjectStats(projectId) {
    await connectDB();

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

    await Project.findByIdAndUpdate(
      projectId,
      { stats }
    );

    return stats;
  }

  /**
   * Récupérer les tâches par filtre (pour le dashboard)
   */
  async getTasksByFilter(filter = {}, limit = 50, skip = 0) {
    await connectDB();

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .select(PROJECTIONS.task.list)
        .populate('assigné_à', PROJECTIONS.user.minimal)
        .populate('projet_id', 'nom')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter)
    ]);

    return { tasks, total };
  }

  /**
   * Obtenir les statistiques des tâches
   */
  async getTaskStats(projectId) {
    await connectDB();

    const tasks = await Task.find({ projet_id: projectId }).lean();

    const statuses = {};
    tasks.forEach(task => {
      statuses[task.statut] = (statuses[task.statut] || 0) + 1;
    });

    return {
      total: tasks.length,
      byStatus: statuses,
      byPriority: {
        Basse: tasks.filter(t => t.priorité === 'Basse').length,
        Moyenne: tasks.filter(t => t.priorité === 'Moyenne').length,
        Haute: tasks.filter(t => t.priorité === 'Haute').length,
        Critique: tasks.filter(t => t.priorité === 'Critique').length
      }
    };
  }
}

export default new TaskService();
