import { NextResponse } from 'next/server';
import ProjectRole from '@/models/ProjectRole';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canAccessProject } from '@/lib/projectAccess';
import { initializeProjectRoles } from '@/lib/projectRoleInit';

export const GET = withApiProtection(async (_request, context) => {
  const { user, params } = context;
  const projectId = params.id;

  if (!(await canAccessProject(user, projectId))) {
    return APIResponse.forbidden();
  }

  await initializeProjectRoles(projectId);
  const roles = await ProjectRole.find({ project_id: projectId }).sort({ nom: 1 }).lean();

  return NextResponse.json({ success: true, data: roles });
});
