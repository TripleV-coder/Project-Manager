import notificationService from '../notificationService';
import Notification from '@/models/Notification';
import Project from '@/models/Project';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

jest.mock('@/models/Notification');
jest.mock('@/models/Project');
jest.mock('@/models/User');
jest.mock('@/lib/mongodb');
jest.mock('../pushNotificationService', () => ({
  createNotificationPayload: jest.fn(() => ({ title: 'Test', body: 'Test body' })),
  sendPushNotification: jest.fn(() => Promise.resolve({ success: true })),
}));

const pushNotificationService = require('../pushNotificationService');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  describe('createNotification', () => {
    const baseParams = {
      destinataire: 'user-123',
      type: 'tâche_assignée',
      titre: 'New Task',
      message: 'You have a new task',
      entity_type: 'tâche',
      entity_id: 'task-456',
      entity_nom: 'Fix bug',
      lien: '/dashboard/tasks',
      expéditeur: 'admin-789',
    };

    it('should create a notification in database', async () => {
      const mockNotification = { _id: 'notif-1', ...baseParams };
      Notification.create.mockResolvedValue(mockNotification);
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ push_subscriptions: [] }),
      });

      const result = await notificationService.createNotification(baseParams);

      expect(result).toEqual(mockNotification);
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          destinataire: 'user-123',
          type: 'tâche_assignée',
          lu: false,
        })
      );
    });

    it('should send push notification when user has subscriptions', async () => {
      const mockSub = { endpoint: 'https://push.example.com', keys: {} };
      Notification.create.mockResolvedValue({ _id: 'notif-1' });
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ push_subscriptions: [mockSub] }),
      });

      await notificationService.createNotification(baseParams);

      expect(pushNotificationService.createNotificationPayload).toHaveBeenCalled();
      expect(pushNotificationService.sendPushNotification).toHaveBeenCalledWith(
        mockSub,
        expect.any(Object)
      );
    });

    it('should not send push when canaux.push is false', async () => {
      Notification.create.mockResolvedValue({ _id: 'notif-1' });

      await notificationService.createNotification({
        ...baseParams,
        canaux: { in_app: true, push: false, email: false },
      });

      expect(pushNotificationService.sendPushNotification).not.toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      Notification.create.mockRejectedValue(new Error('DB error'));

      const result = await notificationService.createNotification(baseParams);

      expect(result).toBeNull();
    });
  });

  describe('notifyGovernanceChange', () => {
    it('should notify all project members except modifier', async () => {
      const mockProject = {
        _id: 'proj-1',
        nom: 'Project X',
        chef_projet: { _id: 'chef-1' },
        membres: [{ user_id: { _id: 'member-1' } }, { user_id: { _id: 'member-2' } }],
      };

      Project.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ nom_complet: 'Admin User' }),
      });

      Notification.create.mockResolvedValue({ _id: 'notif-1' });
      // Mock for push subscription check inside createNotification
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ push_subscriptions: [], nom_complet: 'Admin User' }),
      });

      await notificationService.notifyGovernanceChange('proj-1', 'chef-1');

      expect(Project.findById).toHaveBeenCalledWith('proj-1');
    });

    it('should return early if project not found', async () => {
      Project.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await notificationService.notifyGovernanceChange('nonexistent', 'user-1');

      expect(Notification.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyBudgetAlert', () => {
    it('should notify project manager about budget consumption', async () => {
      const mockProject = {
        _id: 'proj-1',
        nom: 'Project X',
        chef_projet: { _id: 'chef-1' },
      };

      Project.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });

      Notification.create.mockResolvedValue({ _id: 'notif-1' });
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ push_subscriptions: [] }),
      });

      await notificationService.notifyBudgetAlert('proj-1', 85);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          destinataire: 'chef-1',
          type: 'budget_dépassé',
          priority: 'warning',
        })
      );
    });

    it('should set critical priority when over 100%', async () => {
      const mockProject = {
        _id: 'proj-1',
        nom: 'Project X',
        chef_projet: { _id: 'chef-1' },
      };

      Project.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });

      Notification.create.mockResolvedValue({ _id: 'notif-1' });
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ push_subscriptions: [] }),
      });

      await notificationService.notifyBudgetAlert('proj-1', 120);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'critical',
        })
      );
    });

    it('should return early if no project or chef_projet', async () => {
      Project.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await notificationService.notifyBudgetAlert('proj-1', 85);

      expect(Notification.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyDeliverableUploaded', () => {
    it('should notify project manager about deliverable upload', async () => {
      const mockProject = {
        _id: 'proj-1',
        nom: 'Project X',
        chef_projet: { _id: 'chef-1' },
      };

      Project.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ nom_complet: 'Uploader', push_subscriptions: [] }),
      });

      Notification.create.mockResolvedValue({ _id: 'notif-1' });

      await notificationService.notifyDeliverableUploaded('proj-1', 'Report.pdf', 'uploader-1');

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          destinataire: 'chef-1',
          entity_type: 'projet',
        })
      );
    });
  });

  describe('_getProjectRecipients', () => {
    it('should return unique member IDs excluding the specified user', () => {
      const project = {
        chef_projet: { _id: 'chef-1' },
        membres: [
          { user_id: { _id: 'member-1' } },
          { user_id: { _id: 'member-2' } },
          { user_id: { _id: 'chef-1' } },
        ],
      };

      const result = notificationService._getProjectRecipients(project, 'chef-1');

      expect(result).toContain('member-1');
      expect(result).toContain('member-2');
      expect(result).not.toContain('chef-1');
    });

    it('should handle members without nested _id', () => {
      const project = {
        chef_projet: { _id: 'chef-1' },
        membres: [{ user_id: 'member-1' }],
      };

      const result = notificationService._getProjectRecipients(project, 'chef-1');

      expect(result).toContain('member-1');
    });
  });
});
