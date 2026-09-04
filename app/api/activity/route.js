import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canAccessProject } from '@/lib/projectAccess';
import AuditLog from '@/models/AuditLog';

export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
  const projectId = url.searchParams.get('projet_id');

  const perms = user.role_id?.permissions || {};

  let query = {};
  if (!perms.voirAudit && !perms.adminConfig) {
    if (!projectId) {
      return APIResponse.forbidden();
    }
    if (!(await canAccessProject(user, projectId))) {
      return APIResponse.forbidden();
    }
    query = { relatedProjectId: projectId };
  } else if (projectId) {
    query = { relatedProjectId: projectId };
  }

  const activities = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('utilisateur', 'nom_complet avatar')
    .lean();

  return NextResponse.json({ success: true, activities });
});
