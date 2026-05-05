import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { handleError } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { loginRequestSchema } from '@/lib/requestValidation';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { createUserAccessToken, issueAuthTokens } from '@/lib/requestAuth';
import { logActivity } from '@/lib/auditService';
import { notifyAboutFailedLogins } from '@/lib/auditNotificationService';
import { getClientIP } from '@/lib/rateLimit';
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
    await connectDB();
    const validation = await validateBody(request, loginRequestSchema);
    if (!validation.success) return validation.response;

    const { email, password } = validation.data;

    const user = await User.findOne({ email: email.toLowerCase() }).populate('role_id');

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
      // Manage failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      const lockoutThresholdReached = user.loginAttempts >= 5;
      if (lockoutThresholdReached) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins
      }
      await user.save();

      // Anomaly alert: at the lockout threshold, fan out a notification to
      // Super Admins so the team can react (account takeover attempt, leaked
      // credential dump replay, etc). Best-effort — failure is swallowed.
      if (lockoutThresholdReached) {
        const ip = getClientIP(request) || 'unknown';
        notifyAboutFailedLogins(user._id, user.loginAttempts, ip).catch(() => {});
      }

      await settleAtLeast(startedAt, MIN_LOGIN_DURATION_MS);
      return NextResponse.json({ success: false, error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Success, reset attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    // Check if password reset is required
    if (user.mustChangePassword) {
      return NextResponse.json({
        success: true,
        requirePasswordChange: true,
        message: 'Vous devez changer votre mot de passe',
      });
    }

    // Check if 2FA is required
    if (user.twoFactorEnabled) {
      return NextResponse.json({
        success: true,
        require2FA: true,
        tempToken: await createUserAccessToken(user, '5m'), // Short lived token just for 2FA
      });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        nom_complet: user.nom_complet,
        email: user.email,
        role: user.role_id,
        avatar: user.avatar,
      },
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
