import { authenticateRequest, getTokenFromRequest } from '@/lib/requestAuth';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(),
  signTokenWithMinutes: jest.fn(),
  verifyToken: jest.fn(),
}));
jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

describe('requestAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  test('getTokenFromRequest prefers a valid bearer JWT', () => {
    const request = {
      headers: {
        get: jest.fn((name) => {
          if (name === 'authorization') {
            return 'Bearer one.two.three';
          }

          if (name === 'cookie') {
            return 'auth_token=cookie.token.value';
          }

          return null;
        }),
      },
    };

    expect(getTokenFromRequest(request)).toEqual({
      token: 'one.two.three',
      source: 'authorization',
    });
  });

  test('authenticateRequest rejects revoked tokens when tokenVersion no longer matches', async () => {
    verifyToken.mockResolvedValue({
      userId: 'user-1',
      tokenVersion: 1,
    });

    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'user-1',
        role_id: { nom: 'Admin' },
        status: 'Actif',
        tokenVersion: 2,
      }),
    });

    const request = {
      headers: {
        get: (name) => (name === 'authorization' ? 'Bearer one.two.three' : null),
      },
    };

    const user = await authenticateRequest(request);

    expect(user).toBeNull();
  });

  test('authenticateRequest accepts cookie-backed sessions', async () => {
    verifyToken.mockResolvedValue({
      userId: 'user-1',
      tokenVersion: 0,
    });

    User.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'user-1',
        role_id: { nom: 'Membre' },
        status: 'Actif',
        tokenVersion: 0,
      }),
    });

    const request = {
      headers: {
        get: (name) => (name === 'cookie' ? 'auth_token=one.two.three' : null),
      },
    };

    const user = await authenticateRequest(request);

    expect(user?._id).toBe('user-1');
  });
});
