/**
 * Kanban Service Tests
 * Tests for Kanban board operations (task movement, column management)
 */

import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

jest.mock('@/models/Task')
jest.mock('@/models/Project')
jest.mock('@/lib/mongodb')

// Simple Kanban service for testing
class KanbanService {
  async getKanbanBoard(projectId) {
    await connectDB()

    const project = await Project.findById(projectId)
      .select('colonnes_kanban')
      .lean()

    if (!project) return null

    const tasks = await Task.find({ projet_id: projectId, statut: { $ne: 'Backlog' } })
      .select('titre statut colonne_kanban priorité assigné_à story_points estimation_heures')
      .populate('assigné_à', 'nom_complet avatar')
      .lean()

    // Group tasks by column
    const board = {}
    project.colonnes_kanban?.forEach(col => {
      board[col] = tasks.filter(t => t.colonne_kanban === col || t.statut === col)
    })

    return { project, board }
  }

  async moveTask(taskId, newColumn, _position = null) {
    await connectDB()

    const task = await Task.findById(taskId)
    if (!task) throw new Error('Tâche non trouvée')

    // Determine status based on column
    const statusMap = {
      'À faire': 'À faire',
      'En cours': 'En cours',
      'Review': 'Review',
      'Terminé': 'Terminé'
    }

    const newStatus = statusMap[newColumn] || newColumn

    return Task.findByIdAndUpdate(
      taskId,
      {
        colonne_kanban: newColumn,
        statut: newStatus,
        updated_at: new Date()
      },
      { new: true }
    )
      .populate('assigné_à', 'nom_complet')
      .lean()
  }

  async getTasksByColumn(projectId, column) {
    await connectDB()

    return Task.find({
      projet_id: projectId,
      $or: [
        { colonne_kanban: column },
        { statut: column }
      ]
    })
      .populate('assigné_à', 'nom_complet')
      .sort({ ordre_priorité: 1 })
      .lean()
  }

  async reorderTasks(projectId, column, taskIds) {
    await connectDB()

    // Update order_priorité for each task in the column
    const updates = taskIds.map((taskId, index) =>
      Task.findByIdAndUpdate(
        taskId,
        { ordre_priorité: index },
        { new: true }
      )
    )

    return Promise.all(updates)
  }

  async updateTaskPriority(taskId, newPriority) {
    await connectDB()

    return Task.findByIdAndUpdate(
      taskId,
      { priorité: newPriority, updated_at: new Date() },
      { new: true }
    ).lean()
  }

  async assignTaskInKanban(taskId, userId) {
    await connectDB()

    return Task.findByIdAndUpdate(
      taskId,
      { assigné_à: userId, updated_at: new Date() },
      { new: true }
    )
      .populate('assigné_à', 'nom_complet avatar')
      .lean()
  }

  async getColumnStats(projectId, column) {
    await connectDB()

    const tasks = await Task.find({
      projet_id: projectId,
      $or: [
        { colonne_kanban: column },
        { statut: column }
      ]
    }).lean()

    return {
      total_tasks: tasks.length,
      story_points: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
      blocked_tasks: tasks.filter(t => t.labels?.includes('blocked')).length,
      overdue_tasks: tasks.filter(t => {
        const deadline = new Date(t.date_échéance)
        return deadline < new Date() && t.statut !== 'Terminé'
      }).length,
      unassigned_tasks: tasks.filter(t => !t.assigné_à).length
    }
  }
}

describe('KanbanService', () => {
  let kanbanService

  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
    kanbanService = new KanbanService()
  })

  describe('getKanbanBoard', () => {
    it('should return kanban board with tasks grouped by column', async () => {
      const projectId = 'proj-123'
      const mockProject = {
        _id: projectId,
        colonnes_kanban: ['À faire', 'En cours', 'Review', 'Terminé']
      }

      const mockTasks = [
        { _id: 'task-1', titre: 'Task 1', colonne_kanban: 'À faire', statut: 'À faire' },
        { _id: 'task-2', titre: 'Task 2', colonne_kanban: 'En cours', statut: 'En cours' },
        { _id: 'task-3', titre: 'Task 3', colonne_kanban: 'Review', statut: 'Review' }
      ]

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject)
      })

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks)
      })

      const result = await kanbanService.getKanbanBoard(projectId)

      expect(result.project).toEqual(mockProject)
      expect(result.board).toBeDefined()
      expect(Task.find).toHaveBeenCalledWith({
        projet_id: projectId,
        statut: { $ne: 'Backlog' }
      })
    })

    it('should return null if project not found', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      })

      const result = await kanbanService.getKanbanBoard('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle projects without kanban columns', async () => {
      const mockProject = {
        _id: 'proj-123',
        colonnes_kanban: undefined
      }

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject)
      })

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      })

      const result = await kanbanService.getKanbanBoard('proj-123')

      expect(result.project).toEqual(mockProject)
      expect(result.board).toBeDefined()
    })
  })

  describe('moveTask', () => {
    it('should move task to new column and update status', async () => {
      const taskId = 'task-123'
      const newColumn = 'En cours'

      const mockTask = {
        _id: taskId,
        colonne_kanban: newColumn,
        statut: 'En cours'
      }

      Task.findById.mockResolvedValue({
        _id: taskId,
        colonne_kanban: 'À faire',
        statut: 'À faire'
      })

      Task.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask)
      })

      const result = await kanbanService.moveTask(taskId, newColumn)

      expect(result.colonne_kanban).toBe(newColumn)
      expect(result.statut).toBe('En cours')
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          colonne_kanban: newColumn,
          statut: 'En cours'
        }),
        expect.any(Object)
      )
    })

    it('should throw error if task not found', async () => {
      Task.findById.mockResolvedValue(null)

      await expect(
        kanbanService.moveTask('nonexistent', 'En cours')
      ).rejects.toThrow('Tâche non trouvée')
    })

    it('should handle custom column names', async () => {
      Task.findById.mockResolvedValue({ _id: 'task-123' })

      Task.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          colonne_kanban: 'Custom Column',
          statut: 'Custom Column'
        })
      })

      const result = await kanbanService.moveTask('task-123', 'Custom Column')

      expect(result.colonne_kanban).toBe('Custom Column')
    })
  })

  describe('getTasksByColumn', () => {
    it('should return tasks in specific column sorted by priority', async () => {
      const projectId = 'proj-123'
      const column = 'En cours'
      const mockTasks = [
        { _id: 'task-1', ordre_priorité: 0 },
        { _id: 'task-2', ordre_priorité: 1 },
        { _id: 'task-3', ordre_priorité: 2 }
      ]

      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks)
      })

      const result = await kanbanService.getTasksByColumn(projectId, column)

      expect(result).toEqual(mockTasks)
      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          projet_id: projectId
        })
      )
    })

    it('should handle tasks with matching colonne_kanban or statut', async () => {
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      })

      await kanbanService.getTasksByColumn('proj-123', 'En cours')

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { colonne_kanban: 'En cours' },
            { statut: 'En cours' }
          ])
        })
      )
    })
  })

  describe('reorderTasks', () => {
    it('should update order_priorité for tasks in column', async () => {
      const projectId = 'proj-123'
      const column = 'En cours'
      const taskIds = ['task-1', 'task-2', 'task-3']

      Task.findByIdAndUpdate
        .mockReturnValueOnce(Promise.resolve({ _id: 'task-1', ordre_priorité: 0 }))
        .mockReturnValueOnce(Promise.resolve({ _id: 'task-2', ordre_priorité: 1 }))
        .mockReturnValueOnce(Promise.resolve({ _id: 'task-3', ordre_priorité: 2 }))

      const result = await kanbanService.reorderTasks(projectId, column, taskIds)

      expect(result).toHaveLength(3)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledTimes(3)

      // Verify order index is correct
      expect(Task.findByIdAndUpdate.mock.calls[0][1]).toEqual({ ordre_priorité: 0 })
      expect(Task.findByIdAndUpdate.mock.calls[1][1]).toEqual({ ordre_priorité: 1 })
      expect(Task.findByIdAndUpdate.mock.calls[2][1]).toEqual({ ordre_priorité: 2 })
    })
  })

  describe('updateTaskPriority', () => {
    it('should update task priority', async () => {
      const taskId = 'task-123'
      const newPriority = 'Haute'

      const mockTask = {
        _id: taskId,
        priorité: newPriority
      }

      Task.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTask)
      })

      const result = await kanbanService.updateTaskPriority(taskId, newPriority)

      expect(result.priorité).toBe(newPriority)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ priorité: newPriority }),
        expect.any(Object)
      )
    })

    it('should handle all priority levels', async () => {
      const priorities = ['Basse', 'Moyenne', 'Haute', 'Critique']

      for (const priority of priorities) {
        Task.findByIdAndUpdate.mockReturnValue({
          lean: jest.fn().mockResolvedValue({ priorité: priority })
        })

        const result = await kanbanService.updateTaskPriority('task-123', priority)
        expect(result.priorité).toBe(priority)
      }
    })
  })

  describe('assignTaskInKanban', () => {
    it('should assign task to user in kanban', async () => {
      const taskId = 'task-123'
      const userId = 'user-456'

      const mockTask = {
        _id: taskId,
        assigné_à: { _id: userId, nom_complet: 'John Doe' }
      }

      Task.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask)
      })

      const result = await kanbanService.assignTaskInKanban(taskId, userId)

      expect(result.assigné_à._id).toBe(userId)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ assigné_à: userId }),
        expect.any(Object)
      )
    })
  })

  describe('getColumnStats', () => {
    it('should return statistics for column', async () => {
      const projectId = 'proj-123'
      const column = 'En cours'
      const mockTasks = [
        { _id: 'task-1', story_points: 5, labels: ['blocked'], date_échéance: new Date(Date.now() + 86400000) },
        { _id: 'task-2', story_points: 3, labels: [], date_échéance: new Date(Date.now() - 86400000) },
        { _id: 'task-3', story_points: 8, labels: [], assigné_à: 'user-1', statut: 'En cours' }
      ]

      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTasks)
      })

      const result = await kanbanService.getColumnStats(projectId, column)

      expect(result.total_tasks).toBe(3)
      expect(result.story_points).toBe(16)
      expect(result.blocked_tasks).toBe(1)
      expect(result.unassigned_tasks).toBe(2)
    })

    it('should count overdue tasks', async () => {
      const yesterday = new Date(Date.now() - 86400000)
      const mockTasks = [
        { _id: 'task-1', statut: 'En cours', date_échéance: yesterday },
        { _id: 'task-2', statut: 'Terminé', date_échéance: yesterday }, // Should not count - completed
        { _id: 'task-3', statut: 'En cours', date_échéance: new Date(Date.now() + 86400000) }
      ]

      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTasks)
      })

      const result = await kanbanService.getColumnStats('proj-123', 'En cours')

      expect(result.overdue_tasks).toBe(1)
    })
  })
})
