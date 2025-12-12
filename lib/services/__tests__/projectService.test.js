import projectService from '../projectService'
import Project from '@/models/Project'
import Task from '@/models/Task'
import ProjectRole from '@/models/ProjectRole'
import User from '@/models/User'
import connectDB from '@/lib/mongodb'

jest.mock('@/models/Project')
jest.mock('@/models/Task')
jest.mock('@/models/ProjectRole')
jest.mock('@/models/User')
jest.mock('@/lib/mongodb')

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
  })

  describe('getAccessibleProjects', () => {
    it('should return all projects if user is admin', async () => {
      const userId = 'user-123'
      const mockProjects = [
        { _id: 'proj-1', nom: 'Project 1' },
        { _id: 'proj-2', nom: 'Project 2' },
      ]

      Project.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProjects),
      })

      Project.countDocuments.mockResolvedValue(2)

      const result = await projectService.getAccessibleProjects(
        userId,
        { permissions: { voirTousProjets: true } }
      )

      expect(result.projects).toEqual(mockProjects)
      expect(result.total).toBe(2)
      expect(Project.find).toHaveBeenCalledWith({ archivé: false })
    })

    it('should filter projects by user access if not admin', async () => {
      const userId = 'user-123'
      const mockProjects = [{ _id: 'proj-1', nom: 'My Project' }]

      Project.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProjects),
      })

      Project.countDocuments.mockResolvedValue(1)

      const result = await projectService.getAccessibleProjects(
        userId,
        { permissions: {} },
        50,
        0
      )

      expect(result.projects).toEqual(mockProjects)
      expect(Project.find).toHaveBeenCalledWith(
        expect.objectContaining({
          archivé: false,
          $or: expect.any(Array),
        })
      )
    })

    it('should respect pagination parameters', async () => {
      Project.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      })

      Project.countDocuments.mockResolvedValue(0)

      await projectService.getAccessibleProjects(
        'user-123',
        { permissions: { voirTousProjets: true } },
        25,
        50
      )

      const chain = Project.find().select().populate().sort()
      expect(chain.skip).toHaveBeenCalledWith(50)
      expect(chain.limit).toHaveBeenCalledWith(25)
    })
  })

  describe('getProjectById', () => {
    it('should fetch and return project with full details', async () => {
      const projectId = 'proj-123'
      const mockProject = {
        _id: projectId,
        nom: 'Test Project',
        chef_projet: 'user-1',
      }

      jest.mock('@/lib/mongoOptimize', () => ({
        findProjectFull: jest.fn().mockResolvedValue(mockProject),
      }))

      const result = await projectService.getProjectById(projectId)

      expect(connectDB).toHaveBeenCalled()
    })
  })

  describe('canUserAccessProject', () => {
    it('should return true if user is project manager', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          chef_projet: userId,
          product_owner: 'other-user',
          membres: [],
        }),
      })

      const result = await projectService.canUserAccessProject(userId, projectId)

      expect(result).toBe(true)
      expect(Project.findById).toHaveBeenCalledWith(projectId)
    })

    it('should return true if user is product owner', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          chef_projet: 'other-user',
          product_owner: userId,
          membres: [],
        }),
      })

      const result = await projectService.canUserAccessProject(userId, projectId)

      expect(result).toBe(true)
    })

    it('should return true if user is project member', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          chef_projet: 'other-user-1',
          product_owner: 'other-user-2',
          membres: [
            { user_id: userId, project_role_id: 'role-1' },
          ],
        }),
      })

      const result = await projectService.canUserAccessProject(userId, projectId)

      expect(result).toBe(true)
    })

    it('should return false if user has no access', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          chef_projet: 'other-user-1',
          product_owner: 'other-user-2',
          membres: [],
        }),
      })

      const result = await projectService.canUserAccessProject(userId, projectId)

      expect(result).toBe(false)
    })

    it('should return false if project does not exist', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      })

      const result = await projectService.canUserAccessProject('user-123', 'nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('getProjectRoles', () => {
    it('should fetch project roles', async () => {
      const projectId = 'proj-123'
      const mockRoles = [
        { _id: 'role-1', nom: 'Chef de Projet', project_id: projectId },
        { _id: 'role-2', nom: 'Développeur', project_id: projectId },
      ]

      ProjectRole.find.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockRoles),
      })

      const result = await projectService.getProjectRoles(projectId)

      expect(result).toEqual(mockRoles)
      expect(ProjectRole.find).toHaveBeenCalledWith({ project_id: projectId })
    })
  })

  describe('createProject', () => {
    it('should create a new project', async () => {
      const userId = 'user-123'
      const projectData = {
        nom: 'New Project',
        description: 'Project Description',
        priorité: 'Haute',
        date_début: new Date('2024-01-01'),
        date_fin_prévue: new Date('2024-12-31'),
      }

      const mockProject = {
        ...projectData,
        _id: 'proj-123',
        chef_projet: userId,
        créé_par: userId,
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
          ...projectData,
          _id: 'proj-123',
          chef_projet: userId,
          créé_par: userId,
        }),
      }

      Project.mockImplementation(() => mockProject)

      const result = await projectService.createProject(projectData, userId)

      expect(result.nom).toBe(projectData.nom)
      expect(result.chef_projet).toBe(userId)
      expect(mockProject.save).toHaveBeenCalled()
    })

    it('should set default status if not provided', async () => {
      const projectData = {
        nom: 'Project without priority',
      }

      const mockProject = {
        ...projectData,
        priorité: 'Moyenne',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({}),
      }

      Project.mockImplementation(() => mockProject)

      await projectService.createProject(projectData, 'user-123')

      expect(mockProject.populate).toHaveBeenCalled()
    })
  })

  describe('updateProject', () => {
    it('should update project data', async () => {
      const projectId = 'proj-123'
      const updateData = {
        nom: 'Updated Project',
        description: 'Updated Description',
      }

      const mockProject = {
        ...updateData,
        _id: projectId,
        updated_at: new Date(),
      }

      Project.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject),
      })

      const result = await projectService.updateProject(projectId, updateData)

      expect(result.nom).toBe(updateData.nom)
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining(updateData),
        expect.any(Object)
      )
    })
  })

  describe('getProjectStats', () => {
    it('should calculate project statistics correctly', async () => {
      const projectId = 'proj-123'
      const mockTasks = [
        { _id: 'task-1', statut: 'Terminée', heures_estimées: 5, heures_réelles: 6 },
        { _id: 'task-2', statut: 'En Cours', heures_estimées: 8, heures_réelles: 0 },
        { _id: 'task-3', statut: 'À faire', heures_estimées: 3, heures_réelles: 0 },
      ]

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: projectId }),
      })

      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTasks),
      })

      const result = await projectService.getProjectStats(projectId)

      expect(result.total_tâches).toBe(3)
      expect(result.tâches_terminées).toBe(1)
      expect(result.heures_estimées).toBe(16)
      expect(result.heures_réelles).toBe(6)
      expect(result.progression).toBe(33)
    })

    it('should return 0 progression if no tasks', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: 'proj-123' }),
      })

      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      })

      const result = await projectService.getProjectStats('proj-123')

      expect(result.progression).toBe(0)
    })
  })

  describe('addProjectMember', () => {
    it('should add member to project', async () => {
      const projectId = 'proj-123'
      const userId = 'user-456'
      const roleId = 'role-789'

      const mockProject = {
        _id: projectId,
        membres: [{ user_id: userId, project_role_id: roleId }],
      }

      Project.findByIdAndUpdate.mockResolvedValue(mockProject)

      const result = await projectService.addProjectMember(projectId, userId, roleId)

      expect(result).toEqual(mockProject)
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          $addToSet: expect.objectContaining({
            membres: expect.any(Object),
          }),
        }),
        expect.any(Object)
      )
    })
  })

  describe('removeProjectMember', () => {
    it('should remove member from project', async () => {
      const projectId = 'proj-123'
      const userId = 'user-456'

      const mockProject = {
        _id: projectId,
        membres: [],
      }

      Project.findByIdAndUpdate.mockResolvedValue(mockProject)

      const result = await projectService.removeProjectMember(projectId, userId)

      expect(result).toEqual(mockProject)
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          $pull: { membres: { user_id: userId } },
        }),
        expect.any(Object)
      )
    })
  })

  describe('toggleArchiveProject', () => {
    it('should archive project', async () => {
      const projectId = 'proj-123'
      const mockProject = { _id: projectId, archivé: true }

      Project.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      })

      const result = await projectService.toggleArchiveProject(projectId, true)

      expect(result.archivé).toBe(true)
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({ archivé: true }),
        expect.any(Object)
      )
    })

    it('should unarchive project', async () => {
      const projectId = 'proj-123'
      const mockProject = { _id: projectId, archivé: false }

      Project.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      })

      const result = await projectService.toggleArchiveProject(projectId, false)

      expect(result.archivé).toBe(false)
    })
  })
})
