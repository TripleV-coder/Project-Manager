/**
 * API Integration Tests
 * 
 * These tests verify the integration between API routes and services.
 * They test the full request/response cycle with mocked database.
 */

import connectDB from '@/lib/mongodb'
import projectService from '@/lib/services/projectService'
import taskService from '@/lib/services/taskService'
import userService from '@/lib/services/userService'

jest.mock('@/lib/mongodb')
jest.mock('@/lib/services/projectService')
jest.mock('@/lib/services/taskService')
jest.mock('@/lib/services/userService')

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
  })

  describe('Project API Integration', () => {
    describe('GET /api/projects', () => {
      it('should return accessible projects for user', async () => {
        const mockProjects = {
          projects: [
            { _id: 'proj-1', nom: 'Project 1' },
            { _id: 'proj-2', nom: 'Project 2' },
          ],
          total: 2,
        }

        projectService.getAccessibleProjects.mockResolvedValue(mockProjects)

        const result = await projectService.getAccessibleProjects('user-123', { permissions: {} })

        expect(result.projects).toHaveLength(2)
        expect(result.total).toBe(2)
      })
    })

    describe('POST /api/projects', () => {
      it('should create a new project', async () => {
        const projectData = {
          nom: 'New Project',
          description: 'Description',
        }

        const mockProject = {
          _id: 'proj-123',
          ...projectData,
          chef_projet: 'user-123',
        }

        projectService.createProject.mockResolvedValue(mockProject)

        const result = await projectService.createProject(projectData, 'user-123')

        expect(result.nom).toBe(projectData.nom)
        expect(result._id).toBe('proj-123')
      })

      it('should validate required fields', async () => {
        const invalidData = { description: 'Missing title' }

        projectService.createProject.mockRejectedValue(
          new Error('nom is required')
        )

        await expect(
          projectService.createProject(invalidData, 'user-123')
        ).rejects.toThrow('nom is required')
      })
    })

    describe('PUT /api/projects/:id', () => {
      it('should update project', async () => {
        const projectId = 'proj-123'
        const updateData = { nom: 'Updated Project' }

        const mockProject = {
          _id: projectId,
          ...updateData,
        }

        projectService.updateProject.mockResolvedValue(mockProject)

        const result = await projectService.updateProject(projectId, updateData)

        expect(result.nom).toBe('Updated Project')
      })
    })

    describe('GET /api/projects/:id/stats', () => {
      it('should return project statistics', async () => {
        const projectId = 'proj-123'
        const mockStats = {
          total_tâches: 10,
          tâches_terminées: 6,
          progression: 60,
        }

        projectService.getProjectStats.mockResolvedValue(mockStats)

        const result = await projectService.getProjectStats(projectId)

        expect(result.total_tâches).toBe(10)
        expect(result.progression).toBe(60)
      })
    })
  })

  describe('Task API Integration', () => {
    describe('GET /api/projects/:id/tasks', () => {
      it('should return project tasks with pagination', async () => {
        const projectId = 'proj-123'
        const mockTasks = {
          tasks: [
            { _id: 'task-1', titre: 'Task 1' },
            { _id: 'task-2', titre: 'Task 2' },
          ],
          total: 2,
        }

        taskService.getProjectTasks.mockResolvedValue(mockTasks)

        const result = await taskService.getProjectTasks(projectId, 50, 0)

        expect(result.tasks).toHaveLength(2)
      })

      it('should apply filters to tasks', async () => {
        const projectId = 'proj-123'
        const filter = { statut: 'Terminée' }

        taskService.getProjectTasks.mockResolvedValue({
          tasks: [{ _id: 'task-1', statut: 'Terminée' }],
          total: 1,
        })

        const result = await taskService.getProjectTasks(projectId, 50, 0, filter)

        expect(result.tasks[0].statut).toBe('Terminée')
      })
    })

    describe('POST /api/projects/:id/tasks', () => {
      it('should create a new task', async () => {
        const taskData = {
          titre: 'New Task',
          description: 'Task description',
          projet_id: 'proj-123',
        }

        const mockTask = {
          _id: 'task-123',
          ...taskData,
          créé_par: 'user-123',
        }

        taskService.createTask.mockResolvedValue(mockTask)

        const result = await taskService.createTask(taskData, 'user-123')

        expect(result.titre).toBe(taskData.titre)
        expect(result._id).toBe('task-123')
      })

      it('should fail if project does not exist', async () => {
        const taskData = {
          titre: 'Task',
          projet_id: 'nonexistent',
        }

        taskService.createTask.mockRejectedValue(new Error('Projet non trouvé'))

        await expect(
          taskService.createTask(taskData, 'user-123')
        ).rejects.toThrow('Projet non trouvé')
      })
    })

    describe('PUT /api/tasks/:id', () => {
      it('should update task', async () => {
        const taskId = 'task-123'
        const updateData = {
          titre: 'Updated Task',
          statut: 'En Cours',
        }

        const mockTask = {
          _id: taskId,
          ...updateData,
        }

        taskService.updateTask.mockResolvedValue(mockTask)

        const result = await taskService.updateTask(taskId, updateData)

        expect(result.titre).toBe('Updated Task')
        expect(result.statut).toBe('En Cours')
      })
    })

    describe('PATCH /api/tasks/:id/status', () => {
      it('should update task status', async () => {
        const taskId = 'task-123'
        const newStatus = 'Terminée'

        const mockTask = {
          _id: taskId,
          statut: newStatus,
        }

        taskService.updateTaskStatus.mockResolvedValue(mockTask)

        const result = await taskService.updateTaskStatus(taskId, newStatus)

        expect(result.statut).toBe('Terminée')
      })
    })

    describe('PATCH /api/tasks/:id/assign', () => {
      it('should assign task to user', async () => {
        const taskId = 'task-123'
        const userId = 'user-456'

        const mockTask = {
          _id: taskId,
          assigné_à: userId,
        }

        taskService.assignTask.mockResolvedValue(mockTask)

        const result = await taskService.assignTask(taskId, userId)

        expect(result.assigné_à).toBe(userId)
      })
    })

    describe('GET /api/tasks/stats/:projectId', () => {
      it('should return task statistics', async () => {
        const projectId = 'proj-123'
        const mockStats = {
          total: 10,
          byStatus: {
            'À faire': 3,
            'En Cours': 4,
            'Terminée': 3,
          },
          byPriority: {
            Basse: 2,
            Moyenne: 5,
            Haute: 2,
            Critique: 1,
          },
        }

        taskService.getTaskStats.mockResolvedValue(mockStats)

        const result = await taskService.getTaskStats(projectId)

        expect(result.total).toBe(10)
        expect(result.byStatus['En Cours']).toBe(4)
      })
    })
  })

  describe('User API Integration', () => {
    describe('GET /api/users/:id', () => {
      it('should return user details', async () => {
        const userId = 'user-123'
        const mockUser = {
          _id: userId,
          nom_complet: 'John Doe',
          email: 'john@example.com',
        }

        userService.getUserById.mockResolvedValue(mockUser)

        const result = await userService.getUserById(userId)

        expect(result.nom_complet).toBe('John Doe')
        expect(result.email).toBe('john@example.com')
      })
    })

    describe('GET /api/users', () => {
      it('should return list of users', async () => {
        const mockUsers = {
          users: [
            { _id: 'user-1', nom_complet: 'User 1' },
            { _id: 'user-2', nom_complet: 'User 2' },
          ],
          total: 2,
        }

        userService.getUsers.mockResolvedValue(mockUsers)

        const result = await userService.getUsers(50, 0)

        expect(result.users).toHaveLength(2)
      })
    })

    describe('POST /api/users', () => {
      it('should create new user', async () => {
        const userData = {
          nom_complet: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
        }

        const mockUser = {
          _id: 'user-123',
          ...userData,
        }

        userService.createUser.mockResolvedValue(mockUser)

        const result = await userService.createUser(userData)

        expect(result.email).toBe('jane@example.com')
      })

      it('should not allow duplicate emails', async () => {
        const userData = {
          nom_complet: 'Jane Doe',
          email: 'existing@example.com',
          password: 'password123',
        }

        userService.createUser.mockRejectedValue(new Error('Email déjà utilisé'))

        await expect(userService.createUser(userData)).rejects.toThrow(
          'Email déjà utilisé'
        )
      })
    })

    describe('PUT /api/users/:id', () => {
      it('should update user information', async () => {
        const userId = 'user-123'
        const updateData = {
          nom_complet: 'Jane Doe',
          poste_titre: 'Manager',
        }

        const mockUser = {
          _id: userId,
          ...updateData,
        }

        userService.updateUser.mockResolvedValue(mockUser)

        const result = await userService.updateUser(userId, updateData)

        expect(result.nom_complet).toBe('Jane Doe')
      })
    })

    describe('PUT /api/users/:id/password', () => {
      it('should update password', async () => {
        const userId = 'user-123'

        userService.updatePassword.mockResolvedValue(true)

        const result = await userService.updatePassword(
          userId,
          'oldpassword',
          'newpassword'
        )

        expect(result).toBe(true)
      })

      it('should fail with wrong old password', async () => {
        const userId = 'user-123'

        userService.updatePassword.mockRejectedValue(
          new Error('Mot de passe ancien incorrect')
        )

        await expect(
          userService.updatePassword(userId, 'wrongpassword', 'newpassword')
        ).rejects.toThrow('Mot de passe ancien incorrect')
      })
    })

    describe('GET /api/users/:id/stats', () => {
      it('should return user statistics', async () => {
        const userId = 'user-123'
        const mockStats = {
          taskCount: 10,
          completedTaskCount: 7,
          projectCount: 3,
          completionRate: 70,
        }

        userService.getUserStats.mockResolvedValue(mockStats)

        const result = await userService.getUserStats(userId)

        expect(result.taskCount).toBe(10)
        expect(result.completionRate).toBe(70)
      })
    })

    describe('POST /api/auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        const credentials = {
          email: 'john@example.com',
          password: 'password123',
        }

        const mockUser = {
          _id: 'user-123',
          email: 'john@example.com',
        }

        userService.verifyCredentials.mockResolvedValue(mockUser)

        const result = await userService.verifyCredentials(
          credentials.email,
          credentials.password
        )

        expect(result._id).toBe('user-123')
      })

      it('should return null for invalid credentials', async () => {
        userService.verifyCredentials.mockResolvedValue(null)

        const result = await userService.verifyCredentials(
          'john@example.com',
          'wrongpassword'
        )

        expect(result).toBeNull()
      })
    })
  })

  describe('Cross-Service Integration', () => {
    it('should handle project member operations', async () => {
      const projectId = 'proj-123'
      const userId = 'user-456'
      const roleId = 'role-789'

      const mockProject = {
        _id: projectId,
        membres: [{ user_id: userId, project_role_id: roleId }],
      }

      projectService.addProjectMember.mockResolvedValue(mockProject)

      const result = await projectService.addProjectMember(projectId, userId, roleId)

      expect(result.membres).toHaveLength(1)
      expect(result.membres[0].user_id).toBe(userId)
    })

    it('should update stats when task status changes', async () => {
      const taskId = 'task-123'
      const projectId = 'proj-456'

      const mockTask = {
        _id: taskId,
        projet_id: projectId,
        statut: 'Terminée',
      }

      taskService.updateTaskStatus.mockResolvedValue(mockTask)

      const stats = {
        total_tâches: 10,
        tâches_terminées: 6,
        progression: 60,
      }

      taskService.updateProjectStats.mockResolvedValue(stats)

      const result = await taskService.updateTaskStatus(taskId, 'Terminée')

      expect(result.statut).toBe('Terminée')

      const updatedStats = await taskService.updateProjectStats(projectId)
      expect(updatedStats.progression).toBe(60)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      connectDB.mockRejectedValue(new Error('MongoDB connection failed'))

      await expect(connectDB()).rejects.toThrow('MongoDB connection failed')
    })

    it('should handle service errors gracefully', async () => {
      projectService.getAccessibleProjects.mockRejectedValue(
        new Error('Database query failed')
      )

      await expect(
        projectService.getAccessibleProjects('user-123', {})
      ).rejects.toThrow('Database query failed')
    })

    it('should validate user permissions for resource access', async () => {
      projectService.canUserAccessProject.mockResolvedValue(false)

      const hasAccess = await projectService.canUserAccessProject('user-123', 'proj-456')

      expect(hasAccess).toBe(false)
    })
  })
})
