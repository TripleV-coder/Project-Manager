import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import { getVapidPublicKey } from '@/lib/services/pushNotificationService';

export const GET = withApiProtection(
  async () => {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({
      publicKey: publicKey || null,
      configured: Boolean(publicKey),
    });
  },
  { requireAuth: false }
);
