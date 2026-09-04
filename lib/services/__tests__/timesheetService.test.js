import timesheetService from '../timesheetService';
import Timesheet from '@/models/Timesheet';
import Task from '@/models/Task';
import Project from '@/models/Project';
import connectDB from '@/lib/mongodb';

jest.mock('@/models/Timesheet');
jest.mock('@/models/Task');
jest.mock('@/models/Project');
jest.mock('@/lib/mongodb');
jest.mock('../projectService', () => ({
  invalidateCache: jest.fn(),
}));

describe('TimesheetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  describe('getUserTimesheets', () => {
    it('should fetch user timesheets with date range and pagination', async () => {
      const mockTimesheets = [
        { _id: 'ts-1', heures: 4, date: '2026-01-15' },
        { _id: 'ts-2', heures: 8, date: '2026-01-14' },
      ];

      Timesheet.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTimesheets),
      });
      Timesheet.countDocuments.mockResolvedValue(2);

      const result = await timesheetService.getUserTimesheets('user-1', '2026-01-01', '2026-01-31');

      expect(result.timesheets).toEqual(mockTimesheets);
      expect(result.total).toBe(2);
    });
  });

  describe('getProjectTimesheets', () => {
    it('should fetch project timesheets', async () => {
      Timesheet.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'ts-1' }]),
      });

      const result = await timesheetService.getProjectTimesheets(
        'proj-1',
        '2026-01-01',
        '2026-01-31'
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('createTimesheet', () => {
    it('should create a timesheet entry for a valid project', async () => {
      const data = {
        projet_id: 'proj-1',
        task_id: 'task-1',
        date: '2026-01-15',
        heures: 4,
        description: 'Worked on feature',
      };

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: 'proj-1' }),
      });

      const mockTimesheetInstance = {
        ...data,
        utilisateur: 'user-1',
        statut: 'brouillon',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({ _id: 'ts-1', ...data, statut: 'brouillon' }),
      };
      Timesheet.mockImplementation(() => mockTimesheetInstance);

      const result = await timesheetService.createTimesheet(data, 'user-1');

      expect(mockTimesheetInstance.save).toHaveBeenCalled();
      expect(result.statut).toBe('brouillon');
    });

    it('should throw if project not found', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        timesheetService.createTimesheet({ projet_id: 'fake' }, 'user-1')
      ).rejects.toThrow('Projet non trouvé');
    });
  });

  describe('updateTimesheet', () => {
    it('should update a timesheet entry', async () => {
      const updated = { _id: 'ts-1', heures: 6 };
      Timesheet.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(updated),
      });

      const result = await timesheetService.updateTimesheet('ts-1', { heures: 6 });

      expect(result.heures).toBe(6);
    });
  });

  describe('submitTimesheet', () => {
    it('should change status to soumis', async () => {
      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'ts-1', statut: 'soumis' }),
      });

      const result = await timesheetService.submitTimesheet('ts-1');

      expect(result.statut).toBe('soumis');
    });
  });

  describe('validateTimesheet', () => {
    it('should approve timesheet and update task hours', async () => {
      const mockTimesheet = {
        _id: 'ts-1',
        statut: 'validé',
        task_id: 'task-1',
        heures: 4,
        projet_id: 'proj-1',
      };

      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheet),
      });
      Task.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await timesheetService.validateTimesheet(
        'ts-1',
        'validator-1',
        true,
        'Looks good'
      );

      expect(result.statut).toBe('validé');
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('task-1', { $inc: { temps_réel: 4 } });
    });

    it('should reject timesheet without updating task hours', async () => {
      const mockTimesheet = {
        _id: 'ts-1',
        statut: 'refusé',
        task_id: 'task-1',
        heures: 4,
      };

      Timesheet.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheet),
      });

      const result = await timesheetService.validateTimesheet(
        'ts-1',
        'validator-1',
        false,
        'Wrong hours'
      );

      expect(result.statut).toBe('refusé');
      expect(Task.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getUserTimesheetStats', () => {
    it('should calculate user timesheet statistics', async () => {
      const mockTimesheets = [
        { heures: 4, statut: 'validé' },
        { heures: 8, statut: 'validé' },
        { heures: 2, statut: 'soumis' },
        { heures: 3, statut: 'refusé' },
      ];

      Timesheet.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheets),
      });

      const stats = await timesheetService.getUserTimesheetStats(
        'user-1',
        '2026-01-01',
        '2026-01-31'
      );

      expect(stats.total_entries).toBe(4);
      expect(stats.total_hours).toBe(17);
      expect(stats.validated_entries).toBe(2);
      expect(stats.validated_hours).toBe(12);
      expect(stats.pending_entries).toBe(1);
      expect(stats.rejected_entries).toBe(1);
    });
  });

  describe('getProjectTimesheetStats', () => {
    it('should calculate project timesheet statistics', async () => {
      const mockTimesheets = [
        { heures: 8, statut: 'validé', facturable: true, utilisateur: 'u-1' },
        { heures: 4, statut: 'validé', facturable: false, utilisateur: 'u-2' },
        { heures: 2, statut: 'soumis', facturable: true, utilisateur: 'u-1' },
      ];

      Timesheet.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTimesheets),
      });

      const stats = await timesheetService.getProjectTimesheetStats(
        'proj-1',
        '2026-01-01',
        '2026-01-31'
      );

      expect(stats.total_hours).toBe(14);
      expect(stats.validated_hours).toBe(12);
      expect(stats.billable_hours).toBe(8);
      expect(stats.unique_users).toBe(2);
      expect(stats.entries_count).toBe(3);
    });
  });

  describe('deleteTimesheet', () => {
    it('should delete timesheet and reverse task hours if validated', async () => {
      const mockTimesheet = {
        _id: 'ts-1',
        statut: 'validé',
        task_id: 'task-1',
        heures: 4,
      };

      Timesheet.findById.mockResolvedValue(mockTimesheet);
      Timesheet.findByIdAndDelete.mockResolvedValue(undefined);
      Task.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await timesheetService.deleteTimesheet('ts-1');

      expect(result).toEqual(mockTimesheet);
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('task-1', { $inc: { temps_réel: -4 } });
    });

    it('should delete timesheet without reversing hours if not validated', async () => {
      const mockTimesheet = {
        _id: 'ts-1',
        statut: 'brouillon',
        task_id: 'task-1',
        heures: 4,
      };

      Timesheet.findById.mockResolvedValue(mockTimesheet);
      Timesheet.findByIdAndDelete.mockResolvedValue(undefined);

      await timesheetService.deleteTimesheet('ts-1');

      expect(Task.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return null if timesheet not found', async () => {
      Timesheet.findById.mockResolvedValue(null);

      const result = await timesheetService.deleteTimesheet('nonexistent');

      expect(result).toBeNull();
    });
  });
});
