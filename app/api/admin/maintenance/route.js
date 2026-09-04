import { NextResponse } from 'next/server';
import { z } from 'zod';
import appSettingsService from '@/lib/appSettingsService';
import { logActivity } from '@/lib/auditService';
import { withApiProtection } from '@/lib/withApiProtection';

const DEFAULT_MESSAGE =
  "L'application est actuellement en maintenance. Nous serons de retour bientôt.";

const updateMaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(2000).optional(),
});

async function readMaintenanceState() {
  const [enabled, message] = await Promise.all([
    appSettingsService.getMaintenanceMode(),
    appSettingsService.getSetting('maintenance_message', DEFAULT_MESSAGE),
  ]);

  return {
    enabled: Boolean(enabled),
    message: message || DEFAULT_MESSAGE,
  };
}

export const GET = withApiProtection(
  async (_request, _context) => {
    const state = await readMaintenanceState();
    return NextResponse.json({ success: true, ...state, data: state });
  },
  { requiredPermissions: ['adminConfig'] }
);

export const PUT = withApiProtection(
  async (request, context) => {
    const { user } = context;
    const body = await request.json().catch(() => ({}));
    const parsed = updateMaintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 422 });
    }

    await appSettingsService.setMaintenanceMode(parsed.data.enabled, user._id);
    if (typeof parsed.data.message === 'string') {
      await appSettingsService.setSetting('maintenance_message', parsed.data.message, user._id);
    }

    const state = await readMaintenanceState();

    await logActivity(
      user,
      'modification',
      'paramètres',
      user._id,
      parsed.data.enabled ? 'Activation du mode maintenance' : 'Désactivation du mode maintenance',
      {
        request,
        httpMethod: 'PUT',
        endpoint: '/admin/maintenance',
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, ...state, data: state });
  },
  { requiredPermissions: ['adminConfig'] }
);
