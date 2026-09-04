import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import SharePointConfig from '@/models/SharePointConfig';
import { isSharePointConfigured, syncAllProjects } from '@/lib/services/sharepointService';
import { logActivity } from '@/lib/auditService';

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    if (!(await isSharePointConfigured())) {
      return NextResponse.json(
        {
          success: false,
          error: "SharePoint n'est pas configuré ou n'est pas activé.",
        },
        { status: 422 }
      );
    }

    const results = await syncAllProjects();

    await SharePointConfig.updateSyncStats({
      files_synced: results.files_synced,
      files_failed: results.files_failed,
      errors: results.errors || [],
    });

    await logActivity(
      user,
      'modification',
      'fichier',
      'sharepoint-sync',
      'Synchronisation SharePoint',
      {
        request,
        httpMethod: 'POST',
        endpoint: '/sharepoint/sync',
        httpStatus: results.error ? 502 : 200,
      }
    );

    if (results.error) {
      return NextResponse.json(
        { success: false, error: results.error, ...results },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Synchronisation SharePoint terminée',
      ...results,
    });
  },
  { requiredPermissions: ['adminConfig'] }
);
