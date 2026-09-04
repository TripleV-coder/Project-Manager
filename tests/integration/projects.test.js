import { POST } from '@/app/api/projects/route';

import { authenticateRequest } from '@/lib/requestAuth';

jest.mock('@/lib/requestAuth', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  getCached: jest.fn((key, cb) => cb()),
  invalidateCache: jest.fn(),
  CACHE_KEYS: {
    PROJECTS_USER: (id) => `projects_user_${id}`,
  },
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

describe('Integration POST /api/projects', () => {
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

  it("devrait retourner 403 si l'utilisateur n'a pas creerProjet", async () => {
    authenticateRequest.mockResolvedValue({
      _id: 'user123',
      role_id: { nom: 'Membre', permissions: { creerProjet: false, adminConfig: false } },
    });
    const req = createMockRequest({ nom: 'Projet interdit' });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('devrait retourner 422 avec un payload invalide (Validation Zod)', async () => {
    authenticateRequest.mockResolvedValue({
      _id: 'user123',
      role_id: {
        nom: 'Chef de projet',
        permissions: { creerProjet: true },
      },
    });

    // Projet sans nom
    const req = createMockRequest({ description: 'Test sans nom' });
    const res = await POST(req);

    // Zod validator middleware throws 422 on bad format
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('devrait créer le projet avec des données valides', async () => {
    authenticateRequest.mockResolvedValue({
      _id: 'user123',
      role_id: {
        nom: 'Chef de projet',
        permissions: { creerProjet: true },
      },
    });

    // Pas besoin de mocker Project, on utilise l'in-memory mongoDB

    const validPayload = {
      nom: 'Projet Apollo',
      description: 'Lancement spatial',
      statut: 'Planification',
      budget_total: 100000,
    };

    const req = createMockRequest(validPayload);
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.nom).toBe('Projet Apollo');
  });
});
