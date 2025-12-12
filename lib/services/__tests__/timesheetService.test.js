/**
 * Timesheet Service Tests
 * Tests for timesheet entry management and time tracking
 */

import Timesheet from '@/models/Timesheet'
import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

jest.mock('@/models/Timesheet')
jest.mock('@/models/Task')
jest.mock('@/models/Project')
jest.mock('@/lib/mongodb')

// Timesheet service
class TimesheetService {
  async getUserTimesheets(userId, dateStart, dateEnd, limit = 50, skip = 0) {
    await connectDB()

    const query = {
      utilisateur: userId,
      date: { $gte: dateStart, $lte: dateEnd }
    }

    const [timesheets, total] = await Promise.all([
      Timesheet.find(query)
        .populate('utilisateur', 'nom_complet')
        .populate('task_id', 'titre')
        .populate('sprint_id', 'nom')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Timesheet.countDocuments(query)
    ])

    return { timesheets, total }
  }

  async getProjectTimesheets(projectId, dateStart, dateEnd) {
    await connectDB()

    return Timesheet.find({
      projet_id: projectId,
      date: { $gte: dateStart, $lte: dateEnd }
    })
      .populate('utilisateur', 'nom_complet')
      .populate('task_id', 'titre')
      .sort({ date: -1 })
      .lean()
  }

  async createTimesheet(data, userId) {
    await connectDB()

    const project = await Project.findById(data.projet_id).select('_id').lean()
    if (!project) throw new Error('Projet non trouvé')

    const timesheet = new Timesheet({
      utilisateur: userId,
      projet_id: data.projet_id,
      task_id: data.task_id,
      sprint_id: data.sprint_id,
      date: data.date,
      heures: data.heures,
      description: data.description,
      type_saisie: data.type_saisie || 'manuelle',
      statut: 'brouillon'
    })

    await timesheet.save()
    await timesheet.populate('utilisateur', 'nom_complet')
    await timesheet.populate('task_id', 'titre')

    return timesheet.toObject()
  }

  async updateTimesheet(timesheetId, data) {
    await connectDB()

    return Timesheet.findByIdAndUpdate(
      timesheetId,
      { ...data, updated_at: new Date() },
      { new: true, runValidators: true }
    )
      .populate('utilisateur', 'nom_complet')
      .populate('task_id', 'titre')
      .lean()
  }

  async submitTimesheet(timesheetId) {
    await connectDB()

    return Timesheet.findByIdAndUpdate(
      timesheetId,
      { statut: 'soumis' },
      { new: true }
    ).lean()
  }

  async validateTimesheet(timesheetId, validatedBy, approved = true, comment = '') {
    await connectDB()

    const timesheet = await Timesheet.findByIdAndUpdate(
      timesheetId,
      {
        statut: approved ? 'validé' : 'refusé',
        validé_par: validatedBy,
        date_validation: new Date(),
        commentaire_validation: comment
      },
      { new: true }
    ).lean()

    // Update task actual hours if approved
    if (approved && timesheet.task_id) {
      await Task.findByIdAndUpdate(
        timesheet.task_id,
        { $inc: { temps_réel: timesheet.heures } }
      )
    }

    return timesheet
  }

  async getUserTimesheetStats(userId, dateStart, dateEnd) {
    await connectDB()

    const timesheets = await Timesheet.find({
      utilisateur: userId,
      date: { $gte: dateStart, $lte: dateEnd }
    }).lean()

    const validated = timesheets.filter(t => t.statut === 'validé')

    return {
      total_entries: timesheets.length,
      total_hours: timesheets.reduce((sum, t) => sum + (t.heures || 0), 0),
      validated_entries: validated.length,
      validated_hours: validated.reduce((sum, t) => sum + (t.heures || 0), 0),
      pending_entries: timesheets.filter(t => t.statut === 'soumis').length,
      rejected_entries: timesheets.filter(t => t.statut === 'refusé').length
    }
  }

  async getProjectTimesheetStats(projectId, dateStart, dateEnd) {
    await connectDB()

    const timesheets = await Timesheet.find({
      projet_id: projectId,
      date: { $gte: dateStart, $lte: dateEnd }
    }).lean()

    const validated = timesheets.filter(t => t.statut === 'validé')

    return {
      total_hours: timesheets.reduce((sum, t) => sum + (t.heures || 0), 0),
      validated_hours: validated.reduce((sum, t) => sum + (t.heures || 0), 0),
      billable_hours: validated.filter(t => t.facturable).reduce((sum, t) => sum + (t.heures || 0), 0),
      unique_users: new Set(timesheets.map(t => t.utilisateur.toString())).size,
      entries_count: timesheets.length
    }
  }

  async deleteTimesheet(timesheetId) {
    await connectDB()

    const timesheet = await Timesheet.findById(timesheetId)
    if (!timesheet) return null

    // Remove hours from task if it was validated
    if (timesheet.statut === 'validé' && timesheet.task_id) {
      await Task.findByIdAndUpdate(
        timesheet.task_id,
        { $inc: { temps_réel: -timesheet.heures } }
      )
    }

    await Timesheet.findByIdAndDelete(timesheetId)
    return timesheet
  }
}

describe('TimesheetService', () => {
  let timesheetService

  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
    timesheetService = new TimesheetService()
  })

  describe('getUserTimesheets', () => {
    it('should return user timesheets for date range', async () => {
      const userId = 'user-123'
      const dateStart = new Date('2024-01-01')
      const dateEnd = new Date('2024-01-31')

      const mockTimesheets = [
        { _id: 'ts-1', heures: 8, date: new Date('2024-01-15') },
        { _id: 'ts-2', heures: 7, date: new Date('2024-01-14') }
      ]

      Timesheet.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTimesheets)
      })

      Timesheet.countDocuments.mockResolvedValue(2)

      const result = await timesheetService.getUserTimesheets(
        userId,
        dateStart,
        dateEnd
      )

      expect(result.timesheets).toEqual(mockTimesheets)
      expect(result.total).toBe(2)
    })

    it('should apply date range filter', async () => {
      const dateStart = new Date('2024-01-01')
      const dateEnd = new Date('2024-01-31')

      Timesheet.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      })

      Timesheet.countDocuments.mockResolvedValue(0)

      await timesheetService.getUserTimesheets('user-123', dateStart, dateEnd)

      expect(Timesheet.find).toHaveBeenCalledWith(
        expect.objectContaining({
          date: { $gte: dateStart, $lte: dateEnd }
        })
      )
    })
  })

  describe('getProjectTimesheets', () => {
    it('should return project timesheets for date range', async () => {
      const projectId = 'proj-123'
      const mockTimesheets = [
        { _id: 'ts-1', heures: 8 },
        { _id: 'ts-2', heures: 7 }
      ]

      Timesheet.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTimesheets)
      })

      const result = await timesheetService.getProjectTimesheets(
        projectId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result).toEqual(mockTimesheets)
    })
  })

  describe('createTimesheet', () => {
    it('should create timesheet entry', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'

      const data = {
        projet_id: projectId,
        task_id: 'task-789',
        date: new Date('2024-01-15'),
        heures: 8,
        description: 'Worked on feature X'
      }

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: projectId })
      })

      const mockTimesheet = {
        ...data,
        _id: 'ts-123',
        utilisateur: userId,
        statut: 'brouillon',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
          ...data,
          _id: 'ts-123',
          utilisateur: userId,
          statut: 'brouillon'
        })
      }

      Timesheet.mockImplementation(() => mockTimesheet)

      const result = await timesheetService.createTimesheet(data, userId)

      expect(result.heures).toBe(8)
      expect(result.statut).toBe('brouillon')
      expect(mockTimesheet.save).toHaveBeenCalled()
    })

    it('should throw error if project not found', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      })

      const data = { projet_id: 'nonexistent', date: new Date(), heures: 8 }

      await expect(
        timesheetService.createTimesheet(data, 'user-123')
      ).rejects.toThrow('Projet non trouvé')
    })

    it('should set default status to brouillon', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: 'proj-123' })
      })

      const mockTimesheet = {
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({ statut: 'brouillon' })
      }

      Timesheet.mockImplementation(() => mockTimesheet)

      await timesheetService.createTimesheet(
        { projet_id: 'proj-123', date: new Date(), heures: 8 },
        'user-123'
      )

      expect(Timesheet).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'brouillon' })
      )
    })
  })

  describe('submitTimesheet', () => {
    it('should change timesheet status to soumis', async () => {
      const timesheetId = 'ts-123'
      const mockTimesheet = {
        _id: timesheetId,
        statut: 'soumis'
      }

      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheet)
      })

      const result = await timesheetService.submitTimesheet(timesheetId)

      expect(result.statut).toBe('soumis')
    })
  })

  describe('validateTimesheet', () => {
    it('should validate approved timesheet', async () => {
      const timesheetId = 'ts-123'
      const validatorId = 'user-456'

      const mockTimesheet = {
        _id: timesheetId,
        task_id: 'task-789',
        heures: 8,
        statut: 'validé'
      }

      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheet)
      })

      Task.findByIdAndUpdate.mockResolvedValue({})

      const result = await timesheetService.validateTimesheet(
        timesheetId,
        validatorId,
        true
      )

      expect(result.statut).toBe('validé')
      expect(Timesheet.findByIdAndUpdate).toHaveBeenCalledWith(
        timesheetId,
        expect.objectContaining({ statut: 'validé' }),
        expect.any(Object)
      )

      // Should update task hours
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        'task-789',
        { $inc: { temps_réel: 8 } }
      )
    })

    it('should reject timesheet and not update task hours', async () => {
      const timesheetId = 'ts-123'

      const mockTimesheet = {
        _id: timesheetId,
        task_id: 'task-789',
        heures: 8,
        statut: 'refusé'
      }

      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheet)
      })

      await timesheetService.validateTimesheet(timesheetId, 'user-456', false)

      // Should NOT update task hours when rejected
      expect(Task.findByIdAndUpdate).not.toHaveBeenCalled()
    })

    it('should include validation comment', async () => {
      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ statut: 'refusé' })
      })

      const comment = 'Please provide more details'

      await timesheetService.validateTimesheet(
        'ts-123',
        'user-456',
        false,
        comment
      )

      expect(Timesheet.findByIdAndUpdate).toHaveBeenCalledWith(
        'ts-123',
        expect.objectContaining({
          commentaire_validation: comment
        }),
        expect.any(Object)
      )
    })
  })

  describe('getUserTimesheetStats', () => {
    it('should return user timesheet statistics', async () => {
      const mockTimesheets = [
        { _id: 'ts-1', heures: 8, statut: 'validé' },
        { _id: 'ts-2', heures: 7, statut: 'validé' },
        { _id: 'ts-3', heures: 6, statut: 'soumis' },
        { _id: 'ts-4', heures: 4, statut: 'refusé' }
      ]

      Timesheet.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheets)
      })

      const result = await timesheetService.getUserTimesheetStats(
        'user-123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result.total_entries).toBe(4)
      expect(result.total_hours).toBe(25)
      expect(result.validated_entries).toBe(2)
      expect(result.validated_hours).toBe(15)
      expect(result.pending_entries).toBe(1)
      expect(result.rejected_entries).toBe(1)
    })
  })

  describe('getProjectTimesheetStats', () => {
    it('should return project timesheet statistics', async () => {
      const mockTimesheets = [
        { _id: 'ts-1', heures: 8, statut: 'validé', facturable: true, utilisateur: 'user-1' },
        { _id: 'ts-2', heures: 7, statut: 'validé', facturable: true, utilisateur: 'user-1' },
        { _id: 'ts-3', heures: 6, statut: 'validé', facturable: false, utilisateur: 'user-2' },
        { _id: 'ts-4', heures: 4, statut: 'soumis', facturable: true, utilisateur: 'user-3' }
      ]

      Timesheet.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheets)
      })

      const result = await timesheetService.getProjectTimesheetStats(
        'proj-123',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result.total_hours).toBe(25)
      expect(result.validated_hours).toBe(21)
      expect(result.billable_hours).toBe(15) // Only facturable validated entries
      expect(result.entries_count).toBe(4)
      expect(result.unique_users).toBe(3)
    })
  })

  describe('deleteTimesheet', () => {
    it('should delete timesheet and revert task hours if validated', async () => {
      const timesheetId = 'ts-123'
      const mockTimesheet = {
        _id: timesheetId,
        task_id: 'task-789',
        heures: 8,
        statut: 'validé'
      }

      Timesheet.findById.mockResolvedValue(mockTimesheet)
      Timesheet.findByIdAndDelete.mockResolvedValue(mockTimesheet)
      Task.findByIdAndUpdate.mockResolvedValue({})

      const result = await timesheetService.deleteTimesheet(timesheetId)

      expect(result).toEqual(mockTimesheet)
      // Should revert task hours
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        'task-789',
        { $inc: { temps_réel: -8 } }
      )
    })

    it('should not revert task hours if timesheet not validated', async () => {
      const mockTimesheet = {
        _id: 'ts-123',
        task_id: 'task-789',
        heures: 8,
        statut: 'brouillon'
      }

      Timesheet.findById.mockResolvedValue(mockTimesheet)
      Timesheet.findByIdAndDelete.mockResolvedValue(mockTimesheet)

      await timesheetService.deleteTimesheet('ts-123')

      // Should NOT revert if not validated
      expect(Task.findByIdAndUpdate).not.toHaveBeenCalled()
    })

    it('should return null if timesheet not found', async () => {
      Timesheet.findById.mockResolvedValue(null)

      const result = await timesheetService.deleteTimesheet('nonexistent')

      expect(result).toBeNull()
    })
  })
})
