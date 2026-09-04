import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { getBearerToken, issueAuthTokens, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { verifyStepUpToken, createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { mustChangePassword } from '@/lib/userState';
import { verifyBackupCode, verifyTwoFactorToken } from '@/lib/twoFactorAuth';
import { logActivity } from '@/lib/auditService';

const CHALLENGE_ERROR = 'Session 2FA invalide ou expirée';

export const POST = withApiProtection(
  async (request) => {
    const bearer = getBearerToken(request);
    const challenge = bearer ? await verifyStepUpToken(bearer, STEP_UP_SCOPE.TWO_FACTOR) : null;
    if (!challenge) {
      return NextResponse.json({ success: false, error: CHALLENGE_ERROR }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').replace(/\s/g, '');
    const isBackupCode = Boolean(body.isBackupCode);

    const fresh = await User.findById(challenge.userId)
      .select('+twoFactorSecret +twoFactorBackupCodes')
      .populate('role_id');

    if (
      !fresh ||
      fresh.status !== 'Actif' ||
      (challenge.tokenVersion ?? 0) !== (fresh.tokenVersion ?? 0)
    ) {
      return NextResponse.json({ success: false, error: CHALLENGE_ERROR }, { status: 401 });
    }

    if (!fresh.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: '2FA non activé' }, { status: 400 });
    }

    let backupCodesRemaining;
    if (isBackupCode) {
      const result = verifyBackupCode(token, fresh.twoFactorBackupCodes || []);
      if (!result.valid) {
        return NextResponse.json({ success: false, error: 'Code invalide' }, { status: 401 });
      }
      fresh.twoFactorBackupCodes = result.remainingCodes;
      await fresh.save();
      backupCodesRemaining = result.remainingCodes.length;
    } else if (!verifyTwoFactorToken(token.replace(/\D/g, ''), fresh.twoFactorSecret)) {
      return NextResponse.json({ success: false, error: 'Code invalide' }, { status: 401 });
    }

    // Second factor cleared. If a password change is still owed, hand back a
    // pwd-scoped step-up token instead of a session.
    if (mustChangePassword(fresh)) {
      return NextResponse.json({
        success: true,
        requirePasswordChange: true,
        tempToken: await createStepUpToken(fresh, STEP_UP_SCOPE.PASSWORD_CHANGE, 15),
        user: serializeAuthenticatedUser(fresh),
      });
    }

    const response = NextResponse.json({
      success: true,
      user: serializeAuthenticatedUser(fresh),
      data: { user: serializeAuthenticatedUser(fresh), backupCodesRemaining },
    });

    await issueAuthTokens(response, fresh);

    await logActivity(fresh, 'connexion', 'système', fresh._id, 'Connexion 2FA réussie', {
      request,
      httpMethod: 'POST',
      endpoint: '/auth/2fa/verify',
      httpStatus: 200,
    });

    return response;
  },
  { requireAuth: false, rateLimitPreset: 'auth' }
);
