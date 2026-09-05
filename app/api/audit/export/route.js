import { handleExportAuditLogs } from '@/lib/auditApiHandler';
import { withApiProtection } from '@/lib/withApiProtection';

export const dynamic = 'force-dynamic';

export const GET = withApiProtection(
  async (request, context) => handleExportAuditLogs(request.url, context.user),
  { requiredPermissions: ['voirAudit', 'adminConfig'], rateLimitPreset: 'sensitive' }
);
