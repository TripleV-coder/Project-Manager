import userService from '../userService'
import User from '@/models/User'
import Role from '@/models/Role'
import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'
import { hashPassword, verifyPassword } from '@/lib/auth'

jest.mock('@/models/User')
jest.mock('@/models/Role')
jest.mock('@/models/Task')
jest.mock('@/models/Project')
jest.mock('@/lib/mongodb')
jest.mock('@/lib/auth')

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
  })

  describe('getUserById', () => {
    it('should fetch user by ID with role', async () => {
      const userId = 'user-123'
      const mockUser = {
        _id: userId,
        nom_complet: 'John Doe',
        email: 'john@example.com',
        role_id: { nom: 'Admin' },
      }

      User.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      })

      const result = await userService.getUserById(userId)

      expect(result).toEqual(mockUser)
      expect(User.findById).toHaveBeenCalledWith(userId)
    })
  })

  describe('getUserByEmail', () => {
    it('should fetch user by email', async () => {
      const email = 'john@example.com'
      const mockUser = {
        _id: 'user-123',
        nom_complet: 'John Doe',
        email,
      }

      User.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      })

      const result = await userService.getUserByEmail(email)

      expect(result).toEqual(mockUser)
      expect(User.findOne).toHaveBeenCalledWith({ email })
    })

    it('should return null if user not found', async () => {
      User.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      })

      const result = await userService.getUserByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('getUsers', () => {
    it('should fetch users with pagination', async () => {
      const mockUsers = [
        { _id: 'user-1', nom_complet: 'User 1' },
        { _id: 'user-2', nom_complet: 'User 2' },
      ]

      User.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      })

      User.countDocuments.mockResolvedValue(2)

      const result = await userService.getUsers(50, 0)

      expect(result.users).toEqual(mockUsers)
      expect(result.total).toBe(2)
    })

    it('should apply filters', async () => {
      const filter = { status: 'actif' }

      User.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      })

      User.countDocuments.mockResolvedValue(0)

      await userService.getUsers(50, 0, filter)

      expect(User.find).toHaveBeenCalledWith(filter)
    })
  })

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        nom_complet: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        poste_titre: 'Developer',
        département_équipe: 'IT',
        role_id: 'role-123',
      }

      hashPassword.mockResolvedValue('hashed_password')

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      })

      const mockUser = {
        ...userData,
        _id: 'user-123',
        password: 'hashed_password',
        status: 'actif',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
          ...userData,
          password: 'hashed_password',
        }),
      }

      User.mockImplementation(() => mockUser)

      const result = await userService.createUser(userData)

      expect(hashPassword).toHaveBeenCalledWith(userData.password)
      expect(mockUser.save).toHaveBeenCalled()
      expect(result.email).toBe(userData.email)
    })

    it('should throw error if email already exists', async () => {
      const userData = {
        nom_complet: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      }

      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'existing-user' })
      })

      await expect(userService.createUser(userData)).rejects.toThrow(
        'Email déjà utilisé'
      )
    })
  })

  describe('updateUser', () => {
    it('should update user data', async () => {
      const userId = 'user-123'
      const updateData = {
        nom_complet: 'Jane Doe',
        poste_titre: 'Manager',
      }

      const mockUser = {
        _id: userId,
        ...updateData,
      }

      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      })

      const result = await userService.updateUser(userId, updateData)

      expect(result.nom_complet).toBe(updateData.nom_complet)
    })

    it('should not update password field', async () => {
      const userId = 'user-123'
      const updateData = {
        nom_complet: 'Jane Doe',
        password: 'newpassword123',
      }

      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: userId }),
      })

      await userService.updateUser(userId, updateData)

      const callArgs = User.findByIdAndUpdate.mock.calls[0][1]
      expect(callArgs.password).toBeUndefined()
      expect(callArgs.nom_complet).toBe('Jane Doe')
    })
  })

  describe('updatePassword', () => {
    it('should update password if old password is correct', async () => {
      const userId = 'user-123'
      const oldPassword = 'oldpassword'
      const newPassword = 'newpassword'
      const originalHash = 'hashed_old_password'

      const mockUser = {
        _id: userId,
        password: originalHash,
        save: jest.fn().mockResolvedValue(undefined),
      }

      User.findById.mockResolvedValue(mockUser)
      verifyPassword.mockResolvedValue(true)
      hashPassword.mockResolvedValue('hashed_new_password')

      const result = await userService.updatePassword(userId, oldPassword, newPassword)

      expect(verifyPassword).toHaveBeenCalledWith(oldPassword, originalHash)
      expect(hashPassword).toHaveBeenCalledWith(newPassword)
      expect(mockUser.save).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should throw error if old password is incorrect', async () => {
      const userId = 'user-123'
      const mockUser = {
        _id: userId,
        password: 'hashed_old_password',
      }

      User.findById.mockResolvedValue(mockUser)
      verifyPassword.mockResolvedValue(false)

      await expect(
        userService.updatePassword(userId, 'wrongpassword', 'newpassword')
      ).rejects.toThrow('Mot de passe ancien incorrect')
    })

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null)

      await expect(
        userService.updatePassword('nonexistent', 'old', 'new')
      ).rejects.toThrow('Utilisateur non trouvé')
    })
  })

  describe('forceChangePassword', () => {
    it('should change password and set first_login to false', async () => {
      const userId = 'user-123'
      const newPassword = 'newpassword'

      const mockUser = {
        _id: userId,
        password: 'old_password',
        first_login: true,
        save: jest.fn().mockResolvedValue(undefined),
      }

      User.findById.mockResolvedValue(mockUser)
      hashPassword.mockResolvedValue('hashed_new_password')

      const result = await userService.forceChangePassword(userId, newPassword)

      expect(hashPassword).toHaveBeenCalledWith(newPassword)
      expect(mockUser.first_login).toBe(false)
      expect(mockUser.save).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('verifyCredentials', () => {
    it('should return user if credentials are correct', async () => {
      const email = 'john@example.com'
      const password = 'password123'

      const mockUser = {
        _id: 'user-123',
        email,
        password: 'hashed_password',
        toObject: jest.fn().mockReturnValue({ _id: 'user-123', email }),
      }

      User.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
      })

      User.findOne().populate.mockResolvedValue(mockUser)
      verifyPassword.mockResolvedValue(true)

      const result = await userService.verifyCredentials(email, password)

      expect(verifyPassword).toHaveBeenCalledWith(password, mockUser.password)
      expect(result).toEqual({ _id: 'user-123', email })
    })

    it('should return null if user not found', async () => {
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      })

      const result = await userService.verifyCredentials('unknown@example.com', 'password')

      expect(result).toBeNull()
    })

    it('should return null if password is incorrect', async () => {
      const mockUser = {
        password: 'hashed_password',
      }

      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      })

      verifyPassword.mockResolvedValue(false)

      const result = await userService.verifyCredentials('john@example.com', 'wrongpassword')

      expect(result).toBeNull()
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = 'user-123'

      User.findByIdAndDelete.mockResolvedValue({ _id: userId })

      const result = await userService.deleteUser(userId)

      expect(result._id).toBe(userId)
      expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId)
    })
  })

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userId = 'user-123'
      const now = new Date()

      User.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: userId,
          dernière_connexion: now,
        }),
      })

      const result = await userService.updateLastLogin(userId)

      expect(result.dernière_connexion).toEqual(now)
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          dernière_connexion: expect.any(Date),
        }),
        expect.any(Object)
      )
    })
  })

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const userId = 'user-123'
      const roleId = 'role-456'

      Role.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: roleId, nom: 'Admin' }),
      })

      User.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: userId,
          role_id: roleId,
        }),
      })

      const result = await userService.updateUserRole(userId, roleId)

      expect(result.role_id).toBe(roleId)
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { role_id: roleId },
        expect.any(Object)
      )
    })

    it('should throw error if role does not exist', async () => {
      Role.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      })

      await expect(
        userService.updateUserRole('user-123', 'nonexistent')
      ).rejects.toThrow('Rôle non trouvé')
    })
  })

  describe('getUserStats', () => {
    it('should calculate user statistics correctly', async () => {
      const userId = 'user-123'

      Task.countDocuments = jest.fn()
        .mockResolvedValueOnce(10) // total tasks
        .mockResolvedValueOnce(7) // completed tasks

      Project.countDocuments.mockResolvedValue(3)

      const result = await userService.getUserStats(userId)

      expect(result.taskCount).toBe(10)
      expect(result.completedTaskCount).toBe(7)
      expect(result.projectCount).toBe(3)
      expect(result.completionRate).toBe(70)
    })

    it('should return 0 completion rate if no tasks', async () => {
      const userId = 'user-123'

      Task.countDocuments = jest.fn().mockResolvedValue(0)
      Project.countDocuments.mockResolvedValue(0)

      const result = await userService.getUserStats(userId)

      expect(result.completionRate).toBe(0)
    })
  })
})
