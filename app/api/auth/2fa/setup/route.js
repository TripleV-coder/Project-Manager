import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { generateTwoFactorSecret } from '@/lib/twoFactorAuth';

export const POST = withApiProtection(
  async (_request, context) => {
    const { user } = context;
    if (user.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: '2FA déjà activé' }, { status: 409 });
    }

    const { secret, qrCodeUrl } = await generateTwoFactorSecret(user.email);
    await User.findByIdAndUpdate(user._id, { twoFactorPendingSecret: secret });

    return NextResponse.json({
      success: true,
      data: { secret, qrCodeUrl },
    });
  },
  { rateLimitPreset: 'auth' }
);
