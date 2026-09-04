import { NextResponse } from 'next/server';
import UserSession from '@/models/UserSession';
import AuditLog from '@/models/AuditLog';
import { withApiProtection } from '@/lib/withApiProtection';

export const GET = withApiProtection(
  async (request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const hoursWindow = Math.min(parseInt(url.searchParams.get('hoursWindow')) || 72, 720);
    const since = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

    const sessionFilter = { is_suspicious: true, login_time: { $gte: since } };
    const logFilter = {
      timestamp: { $gte: since },
      $or: [{ result: 'failure' }, { severity: 'critical' }, { is_suspicious: true }],
    };
    if (userId) {
      sessionFilter.utilisateur = userId;
      logFilter.utilisateur = userId;
    }

    const [sessions, logs] = await Promise.all([
      UserSession.find(sessionFilter)
        .sort({ login_time: -1 })
        .limit(50)
        .select('-session_token')
        .lean(),
      AuditLog.find(logFilter).sort({ timestamp: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      success: true,
      anomalies: [...sessions, ...logs],
      sessions,
      logs,
    });
  },
  { requiredPermissions: ['voirAudit', 'adminConfig'], rateLimitPreset: 'sensitive' }
);
