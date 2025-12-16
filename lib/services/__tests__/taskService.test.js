import taskService from '../taskService'
import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

jest.mock('@/models/Task')
jest.mock('@/models/Project')
jest.mock('@/lib/mongodb')

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
  })

  describe('getProjectTasks', () => {
    it('should fetch tasks for a project with pagination', async () => {
      const projectId = 'proj-123'
      const mockTasks = [
        { _id: 'task-1', titre: 'Task 1', statut: 'À faire' },
        { _id: 'task-2', titre: 'Task 2', statut: 'En Cours' },
      ]

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      })

      Task.countDocuments.mockResolvedValue(2)

      const result = await taskService.getProjectTasks(projectId, 50, 0)

      expect(result.tasks).toEqual(mockTasks)
      expect(result.total).toBe(2)
      expect(Task.find).toHaveBeenCalledWith({ projet_id: projectId })
    })

    it('should apply filters to task query', async () => {
      const projectId = 'proj-123'
      // Using correct status value from Task model: 'Terminé' (not 'Terminée')
      const filter = { statut: 'Terminé' }

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      })

      Task.countDocuments.mockResolvedValue(0)

      await taskService.getProjectTasks(projectId, 50, 0, filter)

      expect(Task.find).toHaveBeenCalledWith({
        projet_id: projectId,
        ...filter,
      })
    })

    it('should respect pagination parameters', async () => {
      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      })

      Task.countDocuments.mockResolvedValue(0)

      await taskService.getProjectTasks('proj-123', 25, 100)

      const chain = Task.find().select().populate().sort()
      expect(chain.skip).toHaveBeenCalledWith(100)
      expect(chain.limit).toHaveBeenCalledWith(25)
    })
  })

  describe('getUserTasks', () => {
    it('should fetch tasks assigned to user', async () => {
      const userId = 'user-123'
      const mockTasks = [
        { _id: 'task-1', titre: 'My Task', assigné_à: userId },
      ]

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      })

      Task.countDocuments.mockResolvedValue(1)

      const result = await taskService.getUserTasks(userId)

      expect(result.tasks).toEqual(mockTasks)
      expect(Task.find).toHaveBeenCalledWith({ assigné_à: userId })
    })
  })

  describe('getTaskById', () => {
    it('should fetch full task details', async () => {
      const taskId = 'task-123'
      const mockTask = {
        _id: taskId,
        titre: 'Test Task',
        description: 'Task Description',
        statut: 'En Cours',
      }

      Task.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      })

      const result = await taskService.getTaskById(taskId)

      expect(result).toEqual(mockTask)
      expect(Task.findById).toHaveBeenCalledWith(taskId)
    })
  })

  describe('createTask', () => {
    it('should create a new task', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'
      const taskData = {
        titre: 'New Task',
        description: 'Task Description',
        projet_id: projectId,
        statut: 'À faire',
        priorité: 'Haute',
      }

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: projectId }),
      })

      const mockTask = {
        ...taskData,
        _id: 'task-123',
        créé_par: userId,
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
          ...taskData,
          _id: 'task-123',
          créé_par: userId,
        }),
      }

      Task.mockImplementation(() => mockTask)

      const result = await taskService.createTask(taskData, userId)

      expect(result.titre).toBe(taskData.titre)
      expect(result.créé_par).toBe(userId)
      expect(mockTask.save).toHaveBeenCalled()
    })

    it('should throw error if project does not exist', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      })

      const taskData = {
        titre: 'Task',
        projet_id: 'nonexistent',
      }

      await expect(
        taskService.createTask(taskData, 'user-123')
      ).rejects.toThrow('Projet non trouvé')
    })

    it('should set default values', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: 'proj-456' }),
      })

      const mockTask = {
        titre: 'Task',
        statut: 'À faire',
        priorité: 'Moyenne',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({}),
      }

      Task.mockImplementation(() => mockTask)

      await taskService.createTask(
        { titre: 'Task', projet_id: 'proj-456' },
        'user-123'
      )

      expect(Task).toHaveBeenCalledWith(
        expect.objectContaining({
          statut: 'À faire',
          priorité: 'Moyenne',
        })
      )
    })
  })

  describe('updateTask', () => {
    it('should update task data', async () => {
      const taskId = 'task-123'
      const updateData = {
        titre: 'Updated Task',
        description: 'Updated Description',
      }

      const mockTask = {
        _id: taskId,
        ...updateData,
        projet_id: 'proj-456',
      }

      Task.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      })

      const result = await taskService.updateTask(taskId, updateData)

      expect(result.titre).toBe(updateData.titre)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining(updateData),
        expect.any(Object)
      )
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const taskId = 'task-123'
      // Using correct status value from Task model: 'Terminé' (not 'Terminée')
      const newStatus = 'Terminé'

      const mockTask = {
        _id: taskId,
        statut: newStatus,
        projet_id: 'proj-456',
      }

      Task.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTask)
      })

      const result = await taskService.updateTaskStatus(taskId, newStatus)

      expect(result.statut).toBe(newStatus)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ statut: newStatus }),
        expect.any(Object)
      )
    })
  })

  describe('assignTask', () => {
    it('should assign task to user', async () => {
      const taskId = 'task-123'
      const userId = 'user-456'

      const mockTask = {
        _id: taskId,
        assigné_à: userId,
      }

      Task.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTask),
      })

      const result = await taskService.assignTask(taskId, userId)

      expect(result.assigné_à).toBe(userId)
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ assigné_à: userId }),
        expect.any(Object)
      )
    })
  })

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const taskId = 'task-123'
      const projectId = 'proj-456'

      Task.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: taskId,
          projet_id: projectId,
        }),
      })

      Task.findByIdAndDelete.mockResolvedValue({ _id: taskId })

      const result = await taskService.deleteTask(taskId)

      expect(result.projet_id).toBe(projectId)
      expect(Task.findByIdAndDelete).toHaveBeenCalledWith(taskId)
    })

    it('should return null if task does not exist', async () => {
      Task.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      })

      const result = await taskService.deleteTask('nonexistent')

      expect(result).toBeNull()
      expect(Task.findByIdAndDelete).not.toHaveBeenCalled()
    })
  })

  describe('updateProjectStats', () => {
    it('should calculate correct statistics using aggregation', async () => {
      const projectId = 'proj-123'

      // The updateProjectStats now uses MongoDB aggregation
      // Mock the aggregate method
      Task.aggregate.mockResolvedValue([{
        _id: null,
        total_tâches: 2,
        tâches_terminées: 1,
        heures_estimées: 13,
        heures_réelles: 6
      }])

      Project.findByIdAndUpdate.mockResolvedValue({})

      const result = await taskService.updateProjectStats(projectId)

      expect(result.total_tâches).toBe(2)
      expect(result.tâches_terminées).toBe(1)
      expect(result.heures_estimées).toBe(13)
      expect(result.progression).toBe(50)

      // Verify aggregation was called with correct pipeline
      expect(Task.aggregate).toHaveBeenCalledWith([
        { $match: { projet_id: projectId } },
        expect.objectContaining({
          $group: expect.objectContaining({
            _id: null,
            total_tâches: { $sum: 1 }
          })
        })
      ])
    })

    it('should handle empty task list', async () => {
      // Empty aggregation result
      Task.aggregate.mockResolvedValue([])

      Project.findByIdAndUpdate.mockResolvedValue({})

      const result = await taskService.updateProjectStats('proj-123')

      expect(result.total_tâches).toBe(0)
      expect(result.tâches_terminées).toBe(0)
      expect(result.heures_estimées).toBe(0)
      expect(result.heures_réelles).toBe(0)
      expect(result.progression).toBe(0)
    })
  })

  describe('getTasksByFilter', () => {
    it('should fetch tasks by filter', async () => {
      // Using correct status value from Task model: 'Terminé' (not 'Terminée')
      const filter = { statut: 'Terminé' }
      const mockTasks = [
        { _id: 'task-1', statut: 'Terminé' },
      ]

      Task.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks),
      })

      Task.countDocuments.mockResolvedValue(1)

      const result = await taskService.getTasksByFilter(filter)

      expect(result.tasks).toEqual(mockTasks)
      expect(result.total).toBe(1)
      expect(Task.find).toHaveBeenCalledWith(filter)
    })
  })

  describe('getTaskStats', () => {
    it('should calculate task statistics by status and priority', async () => {
      const projectId = 'proj-123'
      // Using correct status values from Task model enum
      const mockTasks = [
        { _id: 'task-1', statut: 'Terminé', priorité: 'Haute' },
        { _id: 'task-2', statut: 'En cours', priorité: 'Moyenne' },
        { _id: 'task-3', statut: 'À faire', priorité: 'Basse' },
      ]

      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTasks),
      })

      const result = await taskService.getTaskStats(projectId)

      expect(result.total).toBe(3)
      expect(result.byStatus.Terminé).toBe(1)
      expect(result.byStatus['En cours']).toBe(1)
      expect(result.byStatus['À faire']).toBe(1)
      expect(result.byPriority.Haute).toBe(1)
      expect(result.byPriority.Moyenne).toBe(1)
      expect(result.byPriority.Basse).toBe(1)
    })
  })
})
