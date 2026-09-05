import {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateBackupCodes,
  verifyBackupCode,
} from '../twoFactorAuth';

jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn(() => 'MOCK_SECRET_BASE32'),
    keyuri: jest.fn((email, app, secret) => `otpauth://totp/${app}:${email}?secret=${secret}`),
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockQR')),
}));

const { authenticator } = require('otplib');
const QRCode = require('qrcode');

describe('twoFactorAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTwoFactorSecret', () => {
    it('should generate a secret with QR code', async () => {
      const result = await generateTwoFactorSecret('user@test.com');

      expect(result).toHaveProperty('secret', 'MOCK_SECRET_BASE32');
      expect(result).toHaveProperty('qrCodeUrl', 'data:image/png;base64,mockQR');
      expect(result).toHaveProperty('otpauthUrl');
      expect(authenticator.generateSecret).toHaveBeenCalled();
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    it('should use custom app name', async () => {
      await generateTwoFactorSecret('user@test.com', 'CustomApp');

      expect(authenticator.keyuri).toHaveBeenCalledWith(
        'user@test.com',
        'CustomApp',
        'MOCK_SECRET_BASE32'
      );
    });

    it('should use default app name PM Gestion', async () => {
      await generateTwoFactorSecret('user@test.com');

      expect(authenticator.keyuri).toHaveBeenCalledWith(
        'user@test.com',
        'PM Gestion',
        'MOCK_SECRET_BASE32'
      );
    });
  });

  describe('verifyTwoFactorToken', () => {
    it('should return true for a valid token', () => {
      authenticator.verify.mockReturnValue(true);

      const result = verifyTwoFactorToken('123456', 'MOCK_SECRET');

      expect(result).toBe(true);
      expect(authenticator.verify).toHaveBeenCalledWith({ token: '123456', secret: 'MOCK_SECRET' });
    });

    it('should return false for an invalid token', () => {
      authenticator.verify.mockReturnValue(false);

      const result = verifyTwoFactorToken('000000', 'MOCK_SECRET');

      expect(result).toBe(false);
    });

    it('should return false and log error on exception', () => {
      authenticator.verify.mockImplementation(() => {
        throw new Error('verify error');
      });

      const result = verifyTwoFactorToken('bad', 'MOCK_SECRET');

      expect(result).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 codes by default', () => {
      const codes = generateBackupCodes();

      expect(codes).toHaveLength(10);
    });

    it('should generate custom number of codes', () => {
      const codes = generateBackupCodes(5);

      expect(codes).toHaveLength(5);
    });

    it('should generate 8-character codes', () => {
      const codes = generateBackupCodes();

      codes.forEach((code) => {
        expect(code).toHaveLength(8);
      });
    });

    it('should only use allowed characters (no confusing chars)', () => {
      const codes = generateBackupCodes(20);
      const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

      codes.forEach((code) => {
        for (const char of code) {
          expect(allowedChars).toContain(char);
        }
      });
    });

    it('should not contain confusing characters 0, O, I, l, 1', () => {
      const codes = generateBackupCodes(50);
      const forbidden = ['0', 'O', 'I', 'l', '1'];

      codes.forEach((code) => {
        forbidden.forEach((char) => {
          expect(code).not.toContain(char);
        });
      });
    });
  });

  describe('verifyBackupCode', () => {
    const validCodes = ['ABCD1234', 'EFGH5678', 'JKLM9ABC'];

    it('should return valid=true and remove used code', () => {
      const result = verifyBackupCode('ABCD1234', [...validCodes]);

      expect(result.valid).toBe(true);
      expect(result.remainingCodes).toHaveLength(2);
      expect(result.remainingCodes).not.toContain('ABCD1234');
    });

    it('should return valid=false for unknown code', () => {
      const result = verifyBackupCode('ZZZZZZZZ', [...validCodes]);

      expect(result.valid).toBe(false);
      expect(result.remainingCodes).toHaveLength(3);
    });

    it('should normalize code to uppercase', () => {
      const result = verifyBackupCode('abcd1234', [...validCodes]);

      expect(result.valid).toBe(true);
    });

    it('should strip spaces from code', () => {
      const result = verifyBackupCode('ABCD 1234', [...validCodes]);

      expect(result.valid).toBe(true);
    });

    it('should not mutate the original array', () => {
      const original = [...validCodes];
      verifyBackupCode('ABCD1234', original);

      expect(original).toHaveLength(3);
    });
  });
});
