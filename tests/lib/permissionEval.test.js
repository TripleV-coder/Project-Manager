import { evaluatePermissions } from '@/lib/withApiProtection';

describe('evaluatePermissions — AND/OR matrix', () => {
  const perms = { read: true, write: true, admin: false, audit: true };

  test('empty / undefined expression grants access', () => {
    expect(evaluatePermissions(perms, undefined)).toBe(true);
    expect(evaluatePermissions(perms, [])).toBe(true);
  });

  test('string: single permission required', () => {
    expect(evaluatePermissions(perms, 'read')).toBe(true);
    expect(evaluatePermissions(perms, 'admin')).toBe(false);
  });

  test('array: OR semantics (any match grants)', () => {
    expect(evaluatePermissions(perms, ['admin', 'write'])).toBe(true);
    expect(evaluatePermissions(perms, ['admin', 'unknown'])).toBe(false);
  });

  test('{all}: AND semantics (every must match)', () => {
    expect(evaluatePermissions(perms, { all: ['read', 'write'] })).toBe(true);
    expect(evaluatePermissions(perms, { all: ['read', 'admin'] })).toBe(false);
  });

  test('{any}: OR semantics', () => {
    expect(evaluatePermissions(perms, { any: ['admin', 'audit'] })).toBe(true);
    expect(evaluatePermissions(perms, { any: ['admin', 'unknown'] })).toBe(false);
  });

  test('{all, any}: combined — every all + at least one any', () => {
    expect(evaluatePermissions(perms, { all: ['read', 'write'], any: ['admin', 'audit'] })).toBe(
      true
    );
    // all ok but no any match
    expect(evaluatePermissions(perms, { all: ['read', 'write'], any: ['admin', 'unknown'] })).toBe(
      false
    );
    // any ok but missing one in all
    expect(evaluatePermissions(perms, { all: ['read', 'admin'], any: ['audit'] })).toBe(false);
  });

  test('missing role permissions object → deny', () => {
    expect(evaluatePermissions({}, 'read')).toBe(false);
    expect(evaluatePermissions({}, ['read'])).toBe(false);
    expect(evaluatePermissions({}, { all: ['read'] })).toBe(false);
  });
});
