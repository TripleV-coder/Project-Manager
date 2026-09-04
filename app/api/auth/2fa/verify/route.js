import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { verifyBackupCode, verifyTwoFactorToken } from '@/lib/twoFactorAuth';
import { issueAuthTokens, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { logActivity } from '@/lib/auditService';

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').replace(/\s/g, '');
    const isBackupCode = Boolean(body.isBackupCode);

    const fresh = await User.findById(user._id)
      .select('+twoFactorSecret +twoFactorBackupCodes')
      .populate('role_id');

    if (!fresh?.twoFactorEnabled) {
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

    const response = NextResponse.json({
      success: true,
      user: serializeAuthenticatedUser(fresh),
      data: {
        user: serializeAuthenticatedUser(fresh),
        backupCodesRemaining,
      },
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
  { rateLimitPreset: 'auth' }
);
