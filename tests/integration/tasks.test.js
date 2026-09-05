import { POST } from '@/app/api/tasks/route';

import Task from '@/models/Task';
import Project from '@/models/Project';
import { authenticateRequest } from '@/lib/requestAuth';

jest.mock('@/lib/requestAuth', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/socket-emitter', () => ({
  emitToProject: jest.fn(),
}));

jest.mock('@/lib/auditService', () => ({
  logActivity: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      body,
      status: init?.status || 200,
    })),
  },
}));

describe('Integration POST /api/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
  });

  it('devrait retourner 401 si non authentifié', async () => {
    authenticateRequest.mockResolvedValue(null);
    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("devrait rejeter (403) si l'utilisateur n'a pas la permission gererTaches", async () => {
    authenticateRequest.mockResolvedValue({
      _id: 'user123',
      role_id: { permissions: { gererTaches: false, adminConfig: false } },
    });

    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('devrait rejeter (422) si la validation Zod échoue', async () => {
    authenticateRequest.mockResolvedValue({
      _id: 'user123',
      role_id: { permissions: { gererTaches: true } },
    });

    // Tâche sans projet_id, sans titre
    const req = createMockRequest({ description: 'Tâche incomplète' });
    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('devrait créer la tâche avec succès', async () => {
    authenticateRequest.mockResolvedValue({
      _id: 'user123',
      role_id: { permissions: { gererTaches: true } },
    });

    const projectDoc = {
      _id: 'project123',
      archivé: false,
      chef_projet: 'user123',
      product_owner: null,
      créé_par: 'user123',
      membres: [],
    };
    Project.findById.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(projectDoc),
      then: (resolve, reject) => Promise.resolve(projectDoc).then(resolve, reject),
    }));
    Task.create = jest.fn().mockResolvedValue({
      _id: 'task123',
      titre: 'Mettre en place Jest',
      projet_id: 'project123',
      populate: jest.fn().mockResolvedValue(true),
    });

    const validPayload = {
      titre: 'Mettre en place Jest',
      projet_id: '65f8a00b9d9c2e001c8e1a1b', // MongoDB ObjectId format required by Zod
      type: 'Tâche',
    };

    const req = createMockRequest(validPayload);
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.titre).toBe('Mettre en place Jest');
  });
});
