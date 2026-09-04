import sprintService from '../sprintService';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import Project from '@/models/Project';
import connectDB from '@/lib/mongodb';

jest.mock('@/models/Sprint');
jest.mock('@/models/Task');
jest.mock('@/models/Project');
jest.mock('@/lib/mongodb');

describe('SprintService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  describe('getProjectSprints', () => {
    it('should fetch sprints for a project with pagination', async () => {
      const mockSprints = [
        { _id: 's-1', nom: 'Sprint 1', statut: 'Terminé' },
        { _id: 's-2', nom: 'Sprint 2', statut: 'Actif' },
      ];

      Sprint.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSprints),
      });
      Sprint.countDocuments.mockResolvedValue(2);

      const result = await sprintService.getProjectSprints('proj-1');

      expect(result.sprints).toEqual(mockSprints);
      expect(result.total).toBe(2);
      expect(Sprint.find).toHaveBeenCalledWith({ projet_id: 'proj-1' });
    });

    it('should use default pagination values', async () => {
      Sprint.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });
      Sprint.countDocuments.mockResolvedValue(0);

      await sprintService.getProjectSprints('proj-1');

      const findResult = Sprint.find.mock.results[0].value;
      expect(findResult.skip).toHaveBeenCalledWith(0);
      expect(findResult.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('getActiveSprint', () => {
    it('should return the active sprint for a project', async () => {
      const mockSprint = { _id: 's-1', statut: 'Actif' };
      Sprint.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSprint),
      });

      const result = await sprintService.getActiveSprint('proj-1');

      expect(result).toEqual(mockSprint);
      expect(Sprint.findOne).toHaveBeenCalledWith({ projet_id: 'proj-1', statut: 'Actif' });
    });
  });

  describe('getSprintById', () => {
    it('should return sprint with populated project', async () => {
      const mockSprint = { _id: 's-1', projet_id: { nom: 'Project X' } };
      Sprint.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSprint),
      });

      const result = await sprintService.getSprintById('s-1');

      expect(result).toEqual(mockSprint);
    });
  });

  describe('createSprint', () => {
    it('should create a sprint for a valid project', async () => {
      const data = {
        nom: 'Sprint 1',
        objectif: 'Ship feature',
        date_début: '2026-01-01',
        date_fin: '2026-01-14',
        capacité_équipe: 40,
      };

      Project.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'proj-1' }),
      });

      const mockSprintInstance = {
        ...data,
        projet_id: 'proj-1',
        statut: 'Planifié',
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({ _id: 's-1', ...data, statut: 'Planifié' }),
      };
      Sprint.mockImplementation(() => mockSprintInstance);

      const result = await sprintService.createSprint(data, 'proj-1');

      expect(mockSprintInstance.save).toHaveBeenCalled();
      expect(result.statut).toBe('Planifié');
    });

    it('should throw if project not found', async () => {
      Project.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(sprintService.createSprint({}, 'nonexistent')).rejects.toThrow(
        'Projet non trouvé'
      );
    });
  });

  describe('startSprint', () => {
    it('should set sprint status to Actif', async () => {
      const mockSprint = { _id: 's-1', statut: 'Actif' };
      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSprint),
      });

      const result = await sprintService.startSprint('s-1');

      expect(result.statut).toBe('Actif');
      expect(Sprint.findByIdAndUpdate).toHaveBeenCalledWith(
        's-1',
        expect.objectContaining({ statut: 'Actif' }),
        { new: true }
      );
    });
  });

  describe('completeSprint', () => {
    it('should complete sprint and unassign incomplete tasks', async () => {
      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 's-1', statut: 'Terminé' }),
      });
      Task.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const result = await sprintService.completeSprint('s-1');

      expect(result.statut).toBe('Terminé');
      expect(Task.updateMany).toHaveBeenCalledWith(
        { sprint_id: 's-1', statut: { $ne: 'Terminé' } },
        { sprint_id: null }
      );
    });
  });

  describe('deleteSprint', () => {
    it('should delete sprint and unassign all tasks', async () => {
      Sprint.findById.mockResolvedValue({ _id: 's-1' });
      Task.updateMany.mockResolvedValue({ modifiedCount: 3 });
      Sprint.findByIdAndDelete.mockResolvedValue(undefined);

      const result = await sprintService.deleteSprint('s-1');

      expect(result).toBeTruthy();
      expect(Task.updateMany).toHaveBeenCalledWith({ sprint_id: 's-1' }, { sprint_id: null });
      expect(Sprint.findByIdAndDelete).toHaveBeenCalledWith('s-1');
    });

    it('should return null if sprint not found', async () => {
      Sprint.findById.mockResolvedValue(null);

      const result = await sprintService.deleteSprint('nonexistent');

      expect(result).toBeNull();
      expect(Task.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getSprintStats', () => {
    it('should calculate sprint statistics', async () => {
      Sprint.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 's-1' }),
      });

      const mockTasks = [
        { statut: 'Terminé', story_points: 5, estimation_heures: 8, temps_réel: 7 },
        { statut: 'En Cours', story_points: 3, estimation_heures: 4, temps_réel: 2 },
        { statut: 'Terminé', story_points: 2, estimation_heures: 3, temps_réel: 3 },
      ];
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTasks),
      });

      const stats = await sprintService.getSprintStats('s-1');

      expect(stats.total_tasks).toBe(3);
      expect(stats.completed_tasks).toBe(2);
      expect(stats.total_story_points).toBe(10);
      expect(stats.completed_story_points).toBe(7);
      expect(stats.progress_percentage).toBe(67);
    });

    it('should return null if sprint not found', async () => {
      Sprint.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await sprintService.getSprintStats('nonexistent');

      expect(result).toBeNull();
    });

    it('should return 0 progress when no tasks', async () => {
      Sprint.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 's-1' }),
      });
      Task.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const stats = await sprintService.getSprintStats('s-1');

      expect(stats.progress_percentage).toBe(0);
      expect(stats.total_tasks).toBe(0);
    });
  });

  describe('addTaskToSprint', () => {
    it('should assign task to sprint and set status', async () => {
      Task.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 't-1', sprint_id: 's-1', statut: 'À faire' }),
      });

      const result = await sprintService.addTaskToSprint('s-1', 't-1');

      expect(result.sprint_id).toBe('s-1');
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        't-1',
        { sprint_id: 's-1', statut: 'À faire' },
        { new: true }
      );
    });
  });

  describe('updateSprintCapacity', () => {
    it('should update sprint capacity', async () => {
      Sprint.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 's-1', capacité_équipe: 40 }),
      });

      const result = await sprintService.updateSprintCapacity('s-1', 40, [
        { user: 'u-1', capacity: 20 },
      ]);

      expect(result.capacité_équipe).toBe(40);
    });
  });
});
