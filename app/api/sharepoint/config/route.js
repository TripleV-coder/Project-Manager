import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import { validateBody } from '@/lib/validate';
import { sharepointConfigSchema } from '@/lib/schemas';
import SharePointConfig from '@/models/SharePointConfig';
import { invalidateConfigCache } from '@/lib/services/sharepointService';
import { logActivity } from '@/lib/auditService';

function toClientConfig(config) {
  const source = config || {};
  const connection = source.connection_status || {};
  const stats = source.sync_stats || {};
  return {
    success: true,
    enabled: Boolean(source.enabled),
    configured: Boolean(source.enabled && source.tenant_id && source.client_id && source.site_id),
    config: {
      tenant_id: source.tenant_id || '',
      site_id: source.site_id || '',
      client_id: source.client_id || '',
      client_secret: '',
      auto_sync: Boolean(source.sync_enabled),
      sync_interval: source.sync_interval || 60,
    },
    status: {
      connected: Boolean(connection.connected),
      last_sync: stats.last_sync || null,
      last_test: connection.last_test || null,
      files_synced: stats.files_synced || 0,
      errors: stats.files_failed || 0,
      site_name: connection.site_name || '',
    },
  };
}

export const GET = withApiProtection(
  async () => {
    const config = await SharePointConfig.getConfig(true);
    return NextResponse.json({
      ...toClientConfig(config),
      has_secret: Boolean(config?.client_secret),
    });
  },
  { requiredPermissions: ['adminConfig'] }
);

async function saveConfig(request, context) {
  const { user } = context;
  const validation = await validateBody(request, sharepointConfigSchema);
  if (!validation.success) return validation.response;

  const body = validation.data;
  const nested = body.config || {};
  const existing = (await SharePointConfig.getConfig(true)) || {};

  const update = {
    enabled: body.enabled ?? nested.enabled ?? existing.enabled,
    tenant_id: nested.tenant_id ?? body.tenant_id ?? existing.tenant_id,
    site_id: nested.site_id ?? body.site_id ?? existing.site_id,
    client_id: nested.client_id ?? body.client_id ?? existing.client_id,
    sync_enabled: nested.auto_sync ?? body.auto_sync ?? existing.sync_enabled,
    sync_interval: nested.sync_interval ?? body.sync_interval ?? existing.sync_interval,
  };

  const secret = nested.client_secret ?? body.client_secret;
  if (typeof secret === 'string' && secret.trim()) {
    update.client_secret = secret.trim();
  }

  const saved = await SharePointConfig.updateConfig(update, user._id);
  invalidateConfigCache();

  await logActivity(
    user,
    'modification',
    'settings',
    'sharepoint_config',
    'Mise à jour SharePoint',
    {
      request,
      httpMethod: request.method,
      endpoint: '/sharepoint/config',
      httpStatus: 200,
    }
  );

  return NextResponse.json({
    ...toClientConfig(saved),
    has_secret: Boolean(update.client_secret) || Boolean(existing?.client_secret),
    message: 'Configuration SharePoint enregistrée',
  });
}

export const POST = withApiProtection(saveConfig, { requiredPermissions: ['adminConfig'] });
export const PUT = POST;
