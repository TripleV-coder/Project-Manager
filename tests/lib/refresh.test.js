import { generateJti } from '@/lib/auth/refresh';

test('generateJti returns 32 hex chars', () => {
  const a = generateJti();
  const b = generateJti();
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(a).not.toBe(b);
});
