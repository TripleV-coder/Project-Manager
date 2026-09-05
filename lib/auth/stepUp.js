// @ts-check
/**
 * Scoped, short-lived "step-up" tokens.
 *
 * A step-up token proves the user cleared *one* gate (password OK, awaiting
 * 2FA — or password-change required) but has NOT completed authentication.
 * It carries `stepUp: true` and a `scope`, and is only ever accepted by the
 * single endpoint that consumes that scope. `authenticateRequest` rejects it,
 * so it can never be used as a session.
 */
import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is required for step-up tokens');
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/** @type {{ readonly TWO_FACTOR: '2fa', readonly PASSWORD_CHANGE: 'pwd' }} */
export const STEP_UP_SCOPE = Object.freeze({
  TWO_FACTOR: /** @type {'2fa'} */ ('2fa'),
  PASSWORD_CHANGE: /** @type {'pwd'} */ ('pwd'),
});

/**
 * @param {{ _id: unknown, tokenVersion?: number }} user
 * @param {'2fa' | 'pwd'} scope
 * @param {number} ttlMinutes
 * @returns {Promise<string>}
 */
export async function createStepUpToken(user, scope, ttlMinutes) {
  const minutes = Math.max(1, Math.floor(ttlMinutes));
  return new SignJWT({
    userId: String(user._id),
    scope,
    stepUp: true,
    tokenVersion: user.tokenVersion ?? 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(SECRET);
}

/**
 * @param {string} token
 * @param {'2fa' | 'pwd'} expectedScope
 * @returns {Promise<{ userId: string, scope: string, tokenVersion: number } | null>}
 */
export async function verifyStepUpToken(token, expectedScope) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.stepUp !== true) return null;
    if (typeof payload.scope !== 'string') return null;
    if (payload.scope !== expectedScope) return null;
    if (typeof payload.userId !== 'string') return null;
    return {
      userId: payload.userId,
      scope: payload.scope,
      tokenVersion: typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0,
    };
  } catch {
    return null;
  }
}
