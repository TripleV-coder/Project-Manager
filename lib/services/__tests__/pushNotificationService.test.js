const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn();

jest.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

describe('PushNotificationService', () => {
  const originalEnv = process.env;
  let pushService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    mockSendNotification.mockResolvedValue({ statusCode: 201 });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const loadService = () => {
    return require('../pushNotificationService');
  };

  describe('isPushConfigured', () => {
    it('should return false when VAPID keys are missing', () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      pushService = loadService();

      expect(pushService.isPushConfigured()).toBe(false);
    });

    it('should return true when VAPID keys are set', () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
      process.env.VAPID_PRIVATE_KEY = 'private-key';
      pushService = loadService();

      expect(pushService.isPushConfigured()).toBe(true);
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return the public VAPID key', () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'my-public-key';
      pushService = loadService();

      expect(pushService.getVapidPublicKey()).toBe('my-public-key');
    });
  });

  describe('urlBase64ToUint8Array', () => {
    it('should convert base64 string to Uint8Array', () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'key';
      process.env.VAPID_PRIVATE_KEY = 'key';
      pushService = loadService();

      const result = pushService.urlBase64ToUint8Array('SGVsbG8');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('sendPushNotification', () => {
    it('should return error when push is not configured', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      pushService = loadService();

      const result = await pushService.sendPushNotification({}, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push not configured');
    });

    it('should send notification via web-push when configured', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
      process.env.VAPID_PRIVATE_KEY = 'private-key';
      pushService = loadService();

      const sub = { endpoint: 'https://push.example.com', keys: {} };
      const payload = { title: 'Test' };

      const result = await pushService.sendPushNotification(sub, payload);

      expect(result.success).toBe(true);
      expect(mockSetVapidDetails).toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalledWith(sub, JSON.stringify(payload));
    });

    it('should return shouldRemove for expired subscriptions (410)', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
      process.env.VAPID_PRIVATE_KEY = 'private-key';

      const error = new Error('Gone');
      error.statusCode = 410;
      mockSendNotification.mockRejectedValue(error);

      pushService = loadService();

      const result = await pushService.sendPushNotification({}, {});

      expect(result.success).toBe(false);
      expect(result.shouldRemove).toBe(true);
      expect(result.error).toBe('subscription_expired');
    });

    it('should return shouldRemove for invalid subscriptions (404)', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
      process.env.VAPID_PRIVATE_KEY = 'private-key';

      const error = new Error('Not Found');
      error.statusCode = 404;
      mockSendNotification.mockRejectedValue(error);

      pushService = loadService();

      const result = await pushService.sendPushNotification({}, {});

      expect(result.success).toBe(false);
      expect(result.shouldRemove).toBe(true);
    });

    it('should return generic error for other failures', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key';
      process.env.VAPID_PRIVATE_KEY = 'private-key';

      const error = new Error('Network error');
      error.statusCode = 500;
      mockSendNotification.mockRejectedValue(error);

      pushService = loadService();

      const result = await pushService.sendPushNotification({}, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.shouldRemove).toBeUndefined();
    });
  });

  describe('createNotificationPayload', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'key';
      process.env.VAPID_PRIVATE_KEY = 'key';
      pushService = loadService();
    });

    it('should create TASK_ASSIGNED payload', () => {
      const result = pushService.createNotificationPayload(
        pushService.pushNotificationTypes.TASK_ASSIGNED,
        { taskTitle: 'Fix bug', projectName: 'Project X', taskId: 't-1' }
      );

      expect(result.title).toBe('Nouvelle tâche assignée');
      expect(result.body).toContain('Fix bug');
      expect(result.tag).toBe('task-t-1');
    });

    it('should create COMMENT_ADDED payload', () => {
      const result = pushService.createNotificationPayload(
        pushService.pushNotificationTypes.COMMENT_ADDED,
        { authorName: 'Alice', preview: 'Great work', commentId: 'c-1' }
      );

      expect(result.body).toContain('Alice');
      expect(result.tag).toBe('comment-c-1');
    });

    it('should create MENTION payload', () => {
      const result = pushService.createNotificationPayload(
        pushService.pushNotificationTypes.MENTION,
        { authorName: 'Bob', context: 'a task', id: 'm-1', url: '/dashboard' }
      );

      expect(result.body).toContain('Bob');
      expect(result.requireInteraction).toBe(true);
    });

    it('should create SPRINT_STARTED payload', () => {
      const result = pushService.createNotificationPayload(
        pushService.pushNotificationTypes.SPRINT_STARTED,
        { sprintName: 'Sprint 1', projectName: 'Project X', sprintId: 's-1' }
      );

      expect(result.body).toContain('Sprint 1');
    });

    it('should create DEADLINE_REMINDER payload', () => {
      const result = pushService.createNotificationPayload(
        pushService.pushNotificationTypes.DEADLINE_REMINDER,
        { taskTitle: 'Task 1', daysRemaining: 2, taskId: 't-1' }
      );

      expect(result.body).toContain('2 jour');
      expect(result.requireInteraction).toBe(true);
    });

    it('should create BUDGET_ALERT payload', () => {
      const result = pushService.createNotificationPayload(
        pushService.pushNotificationTypes.BUDGET_ALERT,
        { percentage: 85, projectName: 'Project X', projectId: 'p-1' }
      );

      expect(result.body).toContain('85%');
      expect(result.tag).toBe('budget-p-1');
    });

    it('should create default payload for unknown types', () => {
      const result = pushService.createNotificationPayload('unknown_type', {
        title: 'Custom',
        body: 'Custom body',
      });

      expect(result.title).toBe('Custom');
      expect(result.body).toBe('Custom body');
    });
  });
});
