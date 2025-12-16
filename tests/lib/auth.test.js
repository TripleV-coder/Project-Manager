import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth';

describe('Authentication utilities', () => {
  describe('Password hashing and verification', () => {
    test('hashPassword should hash the password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    test('verifyPassword should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    test('verifyPassword should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hashed);

      expect(isValid).toBe(false);
    });
  });

  describe('Password validation', () => {
    test('should accept strong password', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.valid).toBe(true);
    });

    test('should reject password without uppercase', () => {
      const result = validatePassword('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('majuscule');
    });

    test('should reject password without lowercase', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('minuscule');
    });

    test('should reject password without number', () => {
      const result = validatePassword('NoNumberHere!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('chiffre');
    });

    test('should reject password without special character', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('spécial');
    });

    test('should reject password too short', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8');
    });
  });
});
