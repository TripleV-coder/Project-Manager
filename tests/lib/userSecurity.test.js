import { revokeUserSessions, generateTemporaryPassword } from '@/lib/userSecurity';
import User from '@/models/User';
import UserSession from '@/models/UserSession';

jest.mock('@/lib/socket-emitter', () => ({
  disconnectUserSockets: jest.fn(),
}));

describe('User Security', () => {
  describe('generateTemporaryPassword', () => {
    it('devrait générer un mot de passe de la bonne longueur', () => {
      const password = generateTemporaryPassword(16);
      expect(password.length).toBe(16);
    });

    it('devrait contenir au moins une majuscule, minuscule, chiffre et caractère spécial', () => {
      const password = generateTemporaryPassword(14);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*_\-+=]/);
    });
  });

  describe('revokeUserSessions', () => {
    it('devrait incrémenter tokenVersion et révoquer les sessions actives', async () => {
      const mockUser = { _id: 'user123', tokenVersion: 2 };

      User.findByIdAndUpdate.mockImplementation(() => {
        return {
          exec: jest.fn().mockResolvedValue(mockUser),
          then: jest.fn((cb) => cb(mockUser)),
        };
      });

      UserSession.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

      const result = await revokeUserSessions('user123');

      expect(result).toEqual(mockUser);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { $inc: { tokenVersion: 1 } },
        { new: true }
      );
      expect(UserSession.updateMany).toHaveBeenCalled();
    });

    it("devrait retourner null si l'utilisateur n'existe pas", async () => {
      User.findByIdAndUpdate.mockImplementation(() => {
        return {
          exec: jest.fn().mockResolvedValue(null),
          then: jest.fn((cb) => cb(null)),
        };
      });

      UserSession.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });

      const result = await revokeUserSessions('nonexistent');

      expect(result).toBeNull();
    });
  });
});
