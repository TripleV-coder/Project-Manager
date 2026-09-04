import { NextResponse } from 'next/server';
import UserSession from '@/models/UserSession';
import { withApiProtection } from '@/lib/withApiProtection';

export const GET = withApiProtection(
  async (request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);

    const filter = {};
    if (userId) filter.utilisateur = userId;

    const sessions = await UserSession.find(filter)
      .sort({ login_time: -1 })
      .limit(limit)
      .select('-session_token')
      .lean();

    return NextResponse.json({ success: true, sessions, data: sessions });
  },
  { requiredPermissions: ['voirAudit', 'adminConfig'], rateLimitPreset: 'sensitive' }
);
