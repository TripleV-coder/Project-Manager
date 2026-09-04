import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { generateBackupCodes, hashBackupCodes, verifyTwoFactorToken } from '@/lib/twoFactorAuth';

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').replace(/\D/g, '');

    const fresh = await User.findById(user._id).select('+twoFactorPendingSecret');
    if (!fresh?.twoFactorPendingSecret) {
      return NextResponse.json(
        { success: false, error: 'Configuration 2FA non commencée' },
        { status: 400 }
      );
    }

    if (!verifyTwoFactorToken(token, fresh.twoFactorPendingSecret)) {
      return NextResponse.json({ success: false, error: 'Code invalide' }, { status: 401 });
    }

    const backupCodes = generateBackupCodes(10);
    fresh.twoFactorSecret = fresh.twoFactorPendingSecret;
    fresh.twoFactorPendingSecret = undefined;
    fresh.twoFactorEnabled = true;
    fresh.twoFactorBackupCodes = hashBackupCodes(backupCodes);
    await fresh.save();

    return NextResponse.json({
      success: true,
      data: { backupCodes },
    });
  },
  { rateLimitPreset: 'auth' }
);
