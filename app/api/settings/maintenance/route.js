import { NextResponse } from 'next/server';
import appSettingsService from '@/lib/appSettingsService';
import { withApiProtection } from '@/lib/withApiProtection';

const DEFAULT_MESSAGE =
  "L'application est actuellement en maintenance. Nous serons de retour bientôt.";

export const GET = withApiProtection(
  async (_request, _context) => {
    const [enabled, message] = await Promise.all([
      appSettingsService.getMaintenanceMode(),
      appSettingsService.getSetting('maintenance_message', DEFAULT_MESSAGE),
    ]);

    return NextResponse.json({
      success: true,
      enabled: Boolean(enabled),
      message: message || DEFAULT_MESSAGE,
      data: {
        enabled: Boolean(enabled),
        message: message || DEFAULT_MESSAGE,
      },
    });
  },
  { requireAuth: false }
);
