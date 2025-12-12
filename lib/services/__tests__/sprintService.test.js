/**
 * Sprint Service Tests
 * Tests for sprint management in Agile workflows
 */

import Sprint from '@/models/Sprint'
import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

jest.mock('@/models/Sprint')
jest.mock('@/models/Task')
jest.mock('@/models/Project')
jest.mock('@/lib/mongodb')

// Simple sprint service for testing
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

    // Move uncompleted tasks to next sprint or backlog
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

    // Move tasks to backlog
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

describe('SprintService', () => {
  let sprintService

  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
    sprintService = new SprintService()
  })

  describe('getProjectSprints', () => {
    it('should return all sprints for project with pagination', async () => {
      const projectId = 'proj-123'
      const mockSprints = [
        { _id: 'sprint-1', nom: 'Sprint 1', statut: 'Terminé' },
        { _id: 'sprint-2', nom: 'Sprint 2', statut: 'Planifié' }
      ]

      Sprint.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSprints)
      })

      Sprint.countDocuments.mockResolvedValue(2)

      const result = await sprintService.getProjectSprints(projectId, 50, 0)

      expect(result.sprints).toEqual(mockSprints)
      expect(result.total).toBe(2)
      expect(Sprint.find).toHaveBeenCalledWith({ projet_id: projectId })
    })

    it('should sort by date_début descending', async () => {
      Sprint.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      })

      Sprint.countDocuments.mockResolvedValue(0)

      await sprintService.getProjectSprints('proj-123')

      const chain = Sprint.find()
      expect(chain.sort).toHaveBeenCalledWith({ date_début: -1 })
    })
  })

  describe('getActiveSprint', () => {
    it('should return active sprint for project', async () => {
      const projectId = 'proj-123'
      const mockSprint = {
        _id: 'sprint-123',
        nom: 'Sprint Actif',
        statut: 'Actif'
      }

      Sprint.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSprint)
      })

      const result = await sprintService.getActiveSprint(projectId)

      expect(result).toEqual(mockSprint)
      expect(Sprint.findOne).toHaveBeenCalledWith({
        projet_id: projectId,
        statut: 'Actif'
      })
    })

    it('should return null if no active sprint', async () => {
      Sprint.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      })

      const result = await sprintService.getActiveSprint('proj-123')

      expect(result).toBeNull()
    })
  })

  describe('getSprintById', () => {
    it('should fetch sprint with project details', async () => {
      const sprintId = 'sprint-123'
      const mockSprint = {
        _id: sprintId,
        nom: 'Sprint 1',
        projet_id: { nom: 'My Project' }
      }

      Sprint.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSprint)
      })

      const result = await sprintService.getSprintById(sprintId)

      expect(result).toEqual(mockSprint)
      expect(Sprint.findById).toHaveBeenCalledWith(sprintId)
    })
  })

  describe('createSprint', () => {
    it('should create sprint with valid data', async () => {
      const projectId = 'proj-123'
      const sprintData = {
        nom: 'Sprint Q1',
        objectif: 'Deliver features',
        date_début: new Date('2024-01-01'),
        date_fin: new Date('2024-01-14'),
        capacité_équipe: 120
      }

      Project.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: projectId })
      })

      const mockSprint = {
        ...sprintData,
        _id: 'sprint-123',
        statut: 'Planifié',
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          ...sprintData,
          _id: 'sprint-123',
          statut: 'Planifié'
        })
      }

      Sprint.mockImplementation(() => mockSprint)

      const result = await sprintService.createSprint(sprintData, projectId)

      expect(result.nom).toBe(sprintData.nom)
      expect(result.statut).toBe('Planifié')
      expect(mockSprint.save).toHaveBeenCalled()
    })

    it('should throw error if project not found', async () => {
      Project.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      })

      const sprintData = {
        nom: 'Sprint',
        date_début: new Date(),
        date_fin: new Date()
      }

      await expect(
        sprintService.createSprint(sprintData, 'nonexistent')
      ).rejects.toThrow('Projet non trouvé')
    })

    it('should set default capacity if not provided', async () => {
      Project.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'proj-123' })
      })

      const sprintData = {
        nom: 'Sprint',
        date_début: new Date(),
        date_fin: new Date()
      }

      const mockSprint = {
        ...sprintData,
        capacité_équipe: 0,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({})
      }

      Sprint.mockImplementation(() => mockSprint)

      await sprintService.createSprint(sprintData, 'proj-123')

      expect(Sprint).toHaveBeenCalledWith(
        expect.objectContaining({
          capacité_équipe: 0
        })
      )
    })
  })

  describe('startSprint', () => {
    it('should change sprint status to Actif', async () => {
      const sprintId = 'sprint-123'
      const mockSprint = {
        _id: sprintId,
        statut: 'Actif'
      }

      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSprint)
      })

      const result = await sprintService.startSprint(sprintId)

      expect(result.statut).toBe('Actif')
      expect(Sprint.findByIdAndUpdate).toHaveBeenCalledWith(
        sprintId,
        expect.objectContaining({ statut: 'Actif' }),
        expect.any(Object)
      )
    })
  })

  describe('completeSprint', () => {
    it('should change sprint status to Terminé', async () => {
      const sprintId = 'sprint-123'
      const mockSprint = {
        _id: sprintId,
        statut: 'Terminé'
      }

      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSprint)
      })

      Task.updateMany.mockResolvedValue({})

      const result = await sprintService.completeSprint(sprintId)

      expect(result.statut).toBe('Terminé')
    })

    it('should move uncompleted tasks to backlog', async () => {
      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'sprint-123' })
      })

      Task.updateMany.mockResolvedValue({ modifiedCount: 3 })

      await sprintService.completeSprint('sprint-123')

      expect(Task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          sprint_id: 'sprint-123',
          statut: { $ne: 'Terminé' }
        }),
        { sprint_id: null }
      )
    })
  })

  describe('deleteSprint', () => {
    it('should delete sprint and move tasks to backlog', async () => {
      const sprintId = 'sprint-123'

      Sprint.findById.mockResolvedValue({
        _id: sprintId,
        nom: 'Sprint'
      })

      Task.updateMany.mockResolvedValue({ modifiedCount: 5 })
      Sprint.findByIdAndDelete.mockResolvedValue({ _id: sprintId })

      const result = await sprintService.deleteSprint(sprintId)

      expect(result._id).toBe(sprintId)
      expect(Task.updateMany).toHaveBeenCalledWith(
        { sprint_id: sprintId },
        { sprint_id: null }
      )
      expect(Sprint.findByIdAndDelete).toHaveBeenCalledWith(sprintId)
    })

    it('should return null if sprint not found', async () => {
      Sprint.findById.mockResolvedValue(null)

      const result = await sprintService.deleteSprint('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getSprintStats', () => {
    it('should calculate sprint statistics correctly', async () => {
      const sprintId = 'sprint-123'
      const mockTasks = [
        {
          _id: 'task-1',
          statut: 'Terminé',
          story_points: 5,
          estimation_heures: 8,
          temps_réel: 7
        },
        {
          _id: 'task-2',
          statut: 'En cours',
          story_points: 3,
          estimation_heures: 5,
          temps_réel: 3
        },
        {
          _id: 'task-3',
          statut: 'À faire',
          story_points: 8,
          estimation_heures: 13,
          temps_réel: 0
        }
      ]

      Sprint.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: sprintId })
      })
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTasks)
      })

      const result = await sprintService.getSprintStats(sprintId)

      expect(result.total_tasks).toBe(3)
      expect(result.completed_tasks).toBe(1)
      expect(result.total_story_points).toBe(16)
      expect(result.completed_story_points).toBe(5)
      expect(result.total_estimated_hours).toBe(26)
      expect(result.total_actual_hours).toBe(10)
      expect(result.progress_percentage).toBe(33)
    })

    it('should return 0 progress if no tasks', async () => {
      Sprint.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'sprint-123' })
      })
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })

      const result = await sprintService.getSprintStats('sprint-123')

      expect(result.total_tasks).toBe(0)
      expect(result.progress_percentage).toBe(0)
    })
  })

  describe('addTaskToSprint', () => {
    it('should add task to sprint', async () => {
      const sprintId = 'sprint-123'
      const taskId = 'task-456'

      const mockTask = {
        _id: taskId,
        sprint_id: sprintId,
        statut: 'À faire'
      }

      Task.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTask)
      })

      const result = await sprintService.addTaskToSprint(sprintId, taskId)

      expect(result.sprint_id).toBe(sprintId)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          sprint_id: sprintId,
          statut: 'À faire'
        }),
        expect.any(Object)
      )
    })
  })

  describe('updateSprintCapacity', () => {
    it('should update sprint team capacity', async () => {
      const sprintId = 'sprint-123'
      const capacité_équipe = 150
      const capacité_par_membre = [
        { user_id: 'user-1', heures_disponibles: 40 },
        { user_id: 'user-2', heures_disponibles: 32 }
      ]

      const mockSprint = {
        _id: sprintId,
        capacité_équipe,
        capacité_par_membre
      }

      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSprint)
      })

      const result = await sprintService.updateSprintCapacity(
        sprintId,
        capacité_équipe,
        capacité_par_membre
      )

      expect(result.capacité_équipe).toBe(capacité_équipe)
      expect(result.capacité_par_membre).toEqual(capacité_par_membre)
    })
  })
})
