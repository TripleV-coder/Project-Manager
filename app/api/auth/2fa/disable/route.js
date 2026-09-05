import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { verifyPassword } from '@/lib/auth';
import { verifyTwoFactorToken } from '@/lib/twoFactorAuth';

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;
    const body = await request.json().catch(() => ({}));
    const password = body.password;
    const token = String(body.token || '').replace(/\D/g, '');

    const fresh = await User.findById(user._id).select('+password +twoFactorSecret');
    if (!fresh) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    const passwordOk = await verifyPassword(password, fresh.password);
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    if (token && fresh.twoFactorSecret && !verifyTwoFactorToken(token, fresh.twoFactorSecret)) {
      return NextResponse.json({ success: false, error: 'Code invalide' }, { status: 401 });
    }

    fresh.twoFactorEnabled = false;
    fresh.twoFactorSecret = undefined;
    fresh.twoFactorBackupCodes = [];
    fresh.twoFactorPendingSecret = undefined;
    await fresh.save();

    return NextResponse.json({ success: true });
  },
  { rateLimitPreset: 'auth' }
);
