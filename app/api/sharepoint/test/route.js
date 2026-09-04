import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import SharePointConfig from '@/models/SharePointConfig';
import { testConnectionWithConfig } from '@/lib/services/sharepointService';

export const POST = withApiProtection(
  async (request) => {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const stored = await SharePointConfig.getConfig(true);
    const tenant_id = body.tenant_id || stored?.tenant_id;
    const client_id = body.client_id || stored?.client_id;
    const site_id = body.site_id || stored?.site_id;
    const client_secret =
      (typeof body.client_secret === 'string' && body.client_secret.trim()) ||
      stored?.client_secret;

    if (!tenant_id || !client_id || !site_id || !client_secret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration SharePoint incomplète (tenant, client, secret, site).',
        },
        { status: 422 }
      );
    }

    const result = await testConnectionWithConfig({
      tenant_id,
      client_id,
      client_secret,
      site_id,
    });

    await SharePointConfig.updateConnectionStatus({
      connected: Boolean(result.success),
      last_error: result.success ? '' : result.error,
      site_name: result.site?.name || '',
      site_url: result.site?.webUrl || '',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      site: result.site,
      message: 'Connexion SharePoint réussie',
    });
  },
  { requiredPermissions: ['adminConfig'] }
);
