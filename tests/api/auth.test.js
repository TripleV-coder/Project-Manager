import { POST } from '@/app/api/auth/login/route';

import User from '@/models/User';
import { verifyPassword } from '@/lib/auth';
import { issueAuthTokens, createUserAccessToken } from '@/lib/requestAuth';
import { notifyAboutFailedLogins } from '@/lib/auditNotificationService';

jest.mock('@/lib/auth', () => ({
  verifyPassword: jest.fn().mockResolvedValue(false),
  hashPassword: jest.fn().mockResolvedValue('$2b$12$dummyhashfordeterministictests'),
}));

jest.mock('@/lib/requestAuth', () => ({
  createUserAccessToken: jest.fn(),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((user) => ({
    _id: user._id,
    nom_complet: user.nom_complet,
    email: user.email,
  })),
}));

// Mock auditService
jest.mock('@/lib/auditService', () => ({
  logActivity: jest.fn(),
}));

jest.mock('@/lib/auditNotificationService', () => ({
  notifyAboutFailedLogins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true })),
  handleRateLimitError: jest.fn((_result) => ({
    body: { error: 'Too many requests' },
    status: 429,
  })),
}));

// Mock NextResponse
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn().mockImplementation((body, init) => {
        return { body, status: init?.status || 200 };
      }),
    },
  };
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
  });

  it('devrait rejeter une requête sans identifiants valides', async () => {
    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("devrait rejeter une requête si l'utilisateur n'existe pas", async () => {
    User.findOne.mockImplementation(() => {
      const chain = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.populate = jest.fn().mockResolvedValue(null);
      return chain;
    });

    const req = createMockRequest({ email: 'test@example.com', password: 'Password123!' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants invalides');
  });

  it('devrait rejeter un utilisateur inactif avec un message générique (anti-énumération)', async () => {
    User.findOne.mockImplementation(() => {
      const chain = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.populate = jest.fn().mockResolvedValue({
        email: 'test@example.com',
        status: 'Inactif',
        password: 'hashedpassword',
      });
      return chain;
    });

    const req = createMockRequest({ email: 'test@example.com', password: 'Password123!' });
    const res = await POST(req);

    // anti-enum: status & message identical to "wrong password"
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants invalides');
  });

  it('devrait connecter avec succès un utilisateur valide', async () => {
    const mockUser = {
      _id: 'userId123',
      nom_complet: 'Test User',
      email: 'test@example.com',
      status: 'Actif',
      password: 'hashedpassword',
      save: jest.fn().mockResolvedValue(true),
      resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockImplementation(() => {
      const chain = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.populate = jest.fn().mockResolvedValue(mockUser);
      return chain;
    });

    verifyPassword.mockResolvedValue(true);
    createUserAccessToken.mockResolvedValue('mock-jwt-token');
    issueAuthTokens.mockResolvedValue({
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    });

    const req = createMockRequest({ email: 'test@example.com', password: 'Password123!' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('test@example.com');
    expect(issueAuthTokens).toHaveBeenCalledWith(res, mockUser);
  });

  it('devrait gérer le lockout après 5 tentatives échouées', async () => {
    // incLoginAttempts() is a Mongoose instance method backed by an atomic
    // updateOne — it does NOT mutate the in-memory doc's fields. The route
    // only ever delegates to it and reads the stale in-memory
    // failedLoginAttempts (+1) to decide whether to fire the admin alert.
    const incLoginAttempts = jest.fn().mockResolvedValue(undefined);
    const mockUser = {
      _id: 'userId123',
      email: 'test@example.com',
      status: 'Actif',
      password: 'hashedpassword',
      failedLoginAttempts: 4,
      incLoginAttempts,
    };

    User.findOne.mockImplementation(() => {
      const chain = {};
      chain.select = jest.fn().mockReturnValue(chain);
      chain.populate = jest.fn().mockResolvedValue(mockUser);
      return chain;
    });

    verifyPassword.mockResolvedValue(false);

    const req = createMockRequest({ email: 'test@example.com', password: 'WrongPassword!' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(incLoginAttempts).toHaveBeenCalled();
    expect(notifyAboutFailedLogins).toHaveBeenCalledWith('userId123', 5, expect.any(String));
  });
});
