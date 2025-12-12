import Sprint from '@/models/Sprint'
import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

class SprintService {
  async getProjectSprints(projectId, limit = 50, skip = 0) {
    await connectDB()
    const [sprints, total] = await Promise.all([
      Sprint.find({ projet_id: projectId })
        .sort({ date_début: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sprint.countDocuments({ projet_id: projectId })
    ])
    return { sprints, total }
  }

  async getActiveSprint(projectId) {
    await connectDB()
    return Sprint.findOne({ projet_id: projectId, statut: 'Actif' }).lean()
  }

  async getSprintById(sprintId) {
    await connectDB()
    return Sprint.findById(sprintId)
      .populate('projet_id', 'nom')
      .lean()
  }

  async createSprint(data, projectId) {
    await connectDB()
    const project = await Project.findById(projectId).lean()
    if (!project) throw new Error('Projet non trouvé')

    const sprint = new Sprint({
      projet_id: projectId,
      nom: data.nom,
      objectif: data.objectif,
      date_début: data.date_début,
      date_fin: data.date_fin,
      statut: 'Planifié',
      capacité_équipe: data.capacité_équipe || 0
    })

    await sprint.save()
    return sprint.toObject()
  }

  async startSprint(sprintId) {
    await connectDB()
    const sprint = await Sprint.findByIdAndUpdate(
      sprintId,
      { statut: 'Actif', updated_at: new Date() },
      { new: true }
    ).lean()
    return sprint
  }

  async completeSprint(sprintId) {
    await connectDB()
    const sprint = await Sprint.findByIdAndUpdate(
      sprintId,
      { statut: 'Terminé', updated_at: new Date() },
      { new: true }
    ).lean()

    await Task.updateMany(
      { sprint_id: sprintId, statut: { $ne: 'Terminé' } },
      { sprint_id: null }
    )

    return sprint
  }

  async deleteSprint(sprintId) {
    await connectDB()
    const sprint = await Sprint.findById(sprintId)
    if (!sprint) return null

    await Task.updateMany(
      { sprint_id: sprintId },
      { sprint_id: null }
    )

    await Sprint.findByIdAndDelete(sprintId)
    return sprint
  }

  async getSprintStats(sprintId) {
    await connectDB()
    const sprint = await Sprint.findById(sprintId).lean()
    if (!sprint) return null

    const tasks = await Task.find({ sprint_id: sprintId }).lean()

    return {
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.statut === 'Terminé').length,
      total_story_points: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
      completed_story_points: tasks
        .filter(t => t.statut === 'Terminé')
        .reduce((sum, t) => sum + (t.story_points || 0), 0),
      total_estimated_hours: tasks.reduce((sum, t) => sum + (t.estimation_heures || 0), 0),
      total_actual_hours: tasks.reduce((sum, t) => sum + (t.temps_réel || 0), 0),
      progress_percentage: tasks.length > 0
        ? Math.round((tasks.filter(t => t.statut === 'Terminé').length / tasks.length) * 100)
        : 0
    }
  }

  async addTaskToSprint(sprintId, taskId) {
    await connectDB()
    return Task.findByIdAndUpdate(
      taskId,
      { sprint_id: sprintId, statut: 'À faire' },
      { new: true }
    ).lean()
  }

  async updateSprintCapacity(sprintId, capacité_équipe, capacité_par_membre) {
    await connectDB()
    return Sprint.findByIdAndUpdate(
      sprintId,
      { capacité_équipe, capacité_par_membre },
      { new: true }
    ).lean()
  }
}

export default new SprintService()
