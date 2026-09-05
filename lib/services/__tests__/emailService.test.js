import {
  isEmailConfigured,
  initEmailTransporter,
  emailTemplates,
  sendNotificationEmail,
} from '../emailService';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const nodemailer = require('nodemailer');

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isEmailConfigured', () => {
    it('should return true when SMTP credentials are set', () => {
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'password';

      expect(isEmailConfigured()).toBe(true);
    });

    it('should return false when SMTP_USER is missing', () => {
      delete process.env.SMTP_USER;
      process.env.SMTP_PASS = 'password';

      expect(isEmailConfigured()).toBe(false);
    });

    it('should return false when SMTP_PASS is missing', () => {
      process.env.SMTP_USER = 'user@test.com';
      delete process.env.SMTP_PASS;

      expect(isEmailConfigured()).toBe(false);
    });
  });

  describe('initEmailTransporter', () => {
    it('should return null when SMTP credentials are missing', () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const result = initEmailTransporter();

      expect(result).toBeNull();
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('should create transporter when credentials are present', () => {
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'password';
      const mockTransporter = { sendMail: jest.fn() };
      nodemailer.createTransport.mockReturnValue(mockTransporter);

      const result = initEmailTransporter();

      expect(result).toBe(mockTransporter);
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it('should return null when createTransport throws', () => {
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'password';
      nodemailer.createTransport.mockImplementation(() => {
        throw new Error('SMTP connection failed');
      });

      const result = initEmailTransporter();

      expect(result).toBeNull();
    });
  });

  describe('emailTemplates', () => {
    it('taskAssigned should generate subject and html', () => {
      const task = { titre: 'Fix bug', priorité: 'Haute', description: 'A bug' };
      const assignee = { nom_complet: 'John Doe' };
      const project = { nom: 'Project X' };

      const result = emailTemplates.taskAssigned(task, assignee, project);

      expect(result.subject).toContain('Fix bug');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Project X');
      expect(result.text).toContain('Fix bug');
    });

    it('newComment should generate comment notification', () => {
      const comment = { contenu: 'Great work!', created_at: new Date().toISOString() };
      const task = { titre: 'Task 1' };
      const author = { nom_complet: 'Alice' };
      const recipient = { nom_complet: 'Bob' };

      const result = emailTemplates.newComment(comment, task, author, recipient);

      expect(result.subject).toContain('Task 1');
      expect(result.html).toContain('Alice');
      expect(result.html).toContain('Great work!');
    });

    it('sprintStarted should generate sprint notification', () => {
      const sprint = {
        nom: 'Sprint 1',
        objectif: 'Ship feature',
        date_début: '2026-01-01',
        date_fin: '2026-01-14',
      };
      const project = { nom: 'Project X' };
      const recipient = { nom_complet: 'Bob' };

      const result = emailTemplates.sprintStarted(sprint, project, recipient);

      expect(result.subject).toContain('Sprint 1');
      expect(result.html).toContain('Ship feature');
    });

    it('deadlineReminder should include days remaining', () => {
      const task = { titre: 'Task 1', date_échéance: '2026-02-01', statut: 'En Cours' };
      const project = { nom: 'Project X' };
      const recipient = { nom_complet: 'Bob' };

      const result = emailTemplates.deadlineReminder(task, project, recipient, 3);

      expect(result.subject).toContain('3 jours');
      expect(result.html).toContain('3 jour');
    });

    it('budgetAlert should change color based on percentage', () => {
      const project = { nom: 'Project X', budget: { prévisionnel: 1000000 } };
      const recipient = { nom_complet: 'Bob' };

      const under100 = emailTemplates.budgetAlert(project, 80, recipient);
      expect(under100.html).toContain('#f97316');

      const over100 = emailTemplates.budgetAlert(project, 110, recipient);
      expect(over100.html).toContain('#ef4444');
    });
  });

  describe('sendNotificationEmail', () => {
    it('should return error when email is not configured', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const result = await sendNotificationEmail('taskAssigned', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not configured');
    });

    it('should return error for unknown template', async () => {
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'password';

      const result = await sendNotificationEmail('unknownTemplate', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown template');
    });
  });
});
