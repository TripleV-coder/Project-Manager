import { mustChangePassword } from '@/lib/userState';

describe('mustChangePassword', () => {
  test('true when must_change_password is true', () => {
    expect(mustChangePassword({ must_change_password: true })).toBe(true);
  });
  test('true when first_login is true', () => {
    expect(mustChangePassword({ first_login: true })).toBe(true);
  });
  test('false when both flags are false', () => {
    expect(mustChangePassword({ must_change_password: false, first_login: false })).toBe(false);
  });
  test('false for null / undefined', () => {
    expect(mustChangePassword(null)).toBe(false);
    expect(mustChangePassword(undefined)).toBe(false);
  });
  test('false when flags are absent', () => {
    expect(mustChangePassword({ email: 'a@b.c' })).toBe(false);
  });
});
