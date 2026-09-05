import { createStepUpToken, verifyStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const user = { _id: 'u1', tokenVersion: 3 };

describe('lib/auth/stepUp', () => {
  test('createStepUpToken embeds scope, stepUp flag, userId and tokenVersion', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 5);
    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.stepUp).toBe(true);
    expect(payload.scope).toBe('2fa');
    expect(payload.userId).toBe('u1');
    expect(payload.tokenVersion).toBe(3);
    expect(payload.exp - payload.iat).toBe(5 * 60);
  });

  test('verifyStepUpToken accepts a matching scope', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.PASSWORD_CHANGE, 10);
    const result = await verifyStepUpToken(token, STEP_UP_SCOPE.PASSWORD_CHANGE);
    expect(result).toEqual({ userId: 'u1', scope: 'pwd', tokenVersion: 3 });
  });

  test('verifyStepUpToken rejects a scope mismatch', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 5);
    expect(await verifyStepUpToken(token, STEP_UP_SCOPE.PASSWORD_CHANGE)).toBeNull();
  });

  test('verifyStepUpToken rejects a plain access token (no stepUp claim)', async () => {
    const { SignJWT } = await import('jose');
    const plain = await new SignJWT({ userId: 'u1', scope: '2fa' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(SECRET);
    expect(await verifyStepUpToken(plain, STEP_UP_SCOPE.TWO_FACTOR)).toBeNull();
  });

  test('verifyStepUpToken rejects a garbage / expired token', async () => {
    expect(await verifyStepUpToken('not.a.jwt', STEP_UP_SCOPE.TWO_FACTOR)).toBeNull();
  });

  test('ttl below 1 minute is floored to 1 minute', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 0);
    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.exp - payload.iat).toBe(60);
  });
});
