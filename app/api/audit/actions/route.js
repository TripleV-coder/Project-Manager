import { handleGetAvailableActions } from '@/lib/auditApiHandler';
import { withApiProtection } from '@/lib/withApiProtection';

export const dynamic = 'force-dynamic';

export const GET = withApiProtection(
  async (_request, context) => handleGetAvailableActions(context.user),
  { requiredPermissions: ['voirAudit', 'adminConfig'], rateLimitPreset: 'sensitive' }
);
