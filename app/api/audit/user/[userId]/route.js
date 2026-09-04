import { handleGetUserActivity } from '@/lib/auditApiHandler';
import { withApiProtection } from '@/lib/withApiProtection';

export const dynamic = 'force-dynamic';

export const GET = withApiProtection(
  async (request, context) =>
    handleGetUserActivity(context.params.userId, request.url, context.user),
  { requiredPermissions: ['voirAudit', 'adminConfig'], rateLimitPreset: 'sensitive' }
);
