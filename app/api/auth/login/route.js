import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { handleError } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { loginRequestSchema } from '@/lib/requestValidation';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { issueAuthTokens, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { mustChangePassword } from '@/lib/userState';
import { logActivity } from '@/lib/auditService';
import { notifyAboutFailedLogins } from '@/lib/auditNotificationService';
import { getClientIP } from '@/lib/rateLimit';
import { applyRateLimit, handleRateLimitError } from '@/lib/apiMiddleware';
import { RATE_LIMIT_CONFIG } from '@/lib/rateLimit';
import User from '@/models/User';

// Dummy bcrypt hash used to equalize timing when the email is unknown.
// Computed once on first call (lazy) to avoid blocking module load.
let DUMMY_HASH = null;
async function getDummyHash() {
  if (!DUMMY_HASH) DUMMY_HASH = await hashPassword('not-a-real-password-anti-enum-' + Date.now());
  return DUMMY_HASH;
}

// Floor the total request duration to mitigate timing side-channels.
// Real bcrypt(12) ≈ 150-300 ms; we ensure the no-user / lockout / inactive
// branches all take at least this long.
const MIN_LOGIN_DURATION_MS = 350;
async function settleAtLeast(startedAt, ms) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < ms) await new Promise((r) => setTimeout(r, ms - elapsed));
}

const GENERIC_AUTH_ERROR = 'Identifiants invalides';

// POST /api/auth/login
export async function POST(request) {
  const startedAt = Date.now();
  try {
    const rateLimit = await applyRateLimit(request, null, RATE_LIMIT_CONFIG.login);
    if (!rateLimit.allowed) {
      return handleRateLimitError(rateLimit);
    }

    await connectDB();
    const validation = await validateBody(request, loginRequestSchema);
    if (!validation.success) return validation.response;

    const { email, password } = validation.data;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('role_id');

    // No-user / inactive / locked branches all return the same generic
    // message + status so an attacker can't enumerate accounts. We still
    // run the bcrypt compare on these branches to equalize timing.
    if (!user) {
      await verifyPassword(password, await getDummyHash()).catch(() => false);
      await settleAtLeast(startedAt, MIN_LOGIN_DURATION_MS);
      return NextResponse.json({ success: false, error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    if (user.status !== 'Actif') {
      await verifyPassword(password, user.password).catch(() => false);
      await settleAtLeast(startedAt, MIN_LOGIN_DURATION_MS);
      return NextResponse.json({ success: false, error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      await verifyPassword(password, user.password).catch(() => false);
      await settleAtLeast(startedAt, MIN_LOGIN_DURATION_MS);
      return NextResponse.json({ success: false, error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      await user.incLoginAttempts();

      // Anomaly alert: at the lockout threshold, fan out a notification to
      // Super Admins so the team can react (account takeover attempt, leaked
      // credential dump replay, etc). Best-effort — failure is swallowed.
      //
      // Note: incLoginAttempts() issues an atomic updateOne and does NOT
      // mutate this in-memory document, so user.failedLoginAttempts here is
      // still the pre-increment value — we add 1 to approximate the
      // post-increment count for this notification only.
      const willLock = (user.failedLoginAttempts || 0) + 1 >= 5;
      if (willLock) {
        const ip = getClientIP(request) || 'unknown';
        notifyAboutFailedLogins(user._id, (user.failedLoginAttempts || 0) + 1, ip).catch(() => {});
      }

      await settleAtLeast(startedAt, MIN_LOGIN_DURATION_MS);
      return NextResponse.json({ success: false, error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Success — reset failed-attempt state.
    await user.resetLoginAttempts();

    // 2FA gate takes precedence over must-change: a 2FA user always proves
    // their second factor before anything else.
    if (user.twoFactorEnabled) {
      return NextResponse.json({
        success: true,
        requires2FA: true,
        require2FA: true,
        email: user.email,
        tempToken: await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 5),
      });
    }

    // Must-change-password: hand back a pwd-scoped step-up token, NOT a session.
    if (mustChangePassword(user)) {
      return NextResponse.json({
        success: true,
        requirePasswordChange: true,
        tempToken: await createStepUpToken(user, STEP_UP_SCOPE.PASSWORD_CHANGE, 15),
        user: serializeAuthenticatedUser(user),
      });
    }

    const response = NextResponse.json({
      success: true,
      requirePasswordChange: false,
      user: serializeAuthenticatedUser(user),
    });

    await issueAuthTokens(response, user);

    await logActivity(user, 'connexion', 'système', user._id, `Connexion réussie`, {
      request,
      httpMethod: 'POST',
      endpoint: '/auth/login',
      httpStatus: 200,
    });

    return response;
  } catch (error) {
    return handleError(error, 'POST /api/auth/login');
  }
}
