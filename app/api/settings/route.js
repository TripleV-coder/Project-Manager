import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateSettingsSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import appSettingsService from '@/lib/appSettingsService';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/settings - public settings, no auth required
export const GET = withApiProtection(
  async (_request, _context) => {
    const settings = await appSettingsService.getSettings();

    // We only return safe settings publicly
    const publicSettings = {
      appName: settings.appName,
      appDescription: settings.appDescription,
      langue: settings.langue,
      timezone: settings.timezone,
      devise: settings.devise,
      formatDate: settings.formatDate,
      primaryColor: settings.primaryColor,
      sidebarCompact: settings.sidebarCompact,
    };

    return NextResponse.json({ success: true, settings: publicSettings });
  },
  { requireAuth: false }
);

// PUT /api/settings
export const PUT = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, updateSettingsSchema);
    if (!validation.success) return validation.response;

    const updated = await appSettingsService.updateSettings(validation.data, user._id);

    await logActivity(
      user,
      'modification',
      'paramètres',
      updated._id,
      'Mise à jour des paramètres système',
      {
        request,
        httpMethod: 'PUT',
        endpoint: '/settings',
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, settings: updated });
  },
  { requiredPermissions: ['adminConfig'] }
);
