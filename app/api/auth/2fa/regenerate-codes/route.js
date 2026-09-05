import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { verifyPassword } from '@/lib/auth';
import { generateBackupCodes, hashBackupCodes } from '@/lib/twoFactorAuth';

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;
    const body = await request.json().catch(() => ({}));

    const fresh = await User.findById(user._id).select('+password');
    if (!fresh?.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: '2FA non activé' }, { status: 400 });
    }

    const passwordOk = await verifyPassword(body.password, fresh.password);
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    const backupCodes = generateBackupCodes(10);
    fresh.twoFactorBackupCodes = hashBackupCodes(backupCodes);
    await fresh.save();

    return NextResponse.json({ success: true, data: { backupCodes } });
  },
  { rateLimitPreset: 'auth' }
);
