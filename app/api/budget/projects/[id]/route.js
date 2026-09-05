import { NextResponse } from 'next/server';
import Project from '@/models/Project';
import { logActivity } from '@/lib/auditService';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';

export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;
    const projectId = params.id;

    if (!(await canUseProjectPermission(user, projectId, 'modifierBudget'))) {
      return APIResponse.forbidden();
    }

    const body = await request.json();
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    const nextBudget = {
      ...(project.budget?.toObject?.() || project.budget || {}),
      ...(body.budget || {}),
    };

    project.budget = nextBudget;
    await project.save();

    await logActivity(
      user,
      'modification',
      'projet',
      projectId,
      `Mise à jour budget ${project.nom}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/budget/projects/${projectId}`,
        httpStatus: 200,
        relatedProjectId: projectId,
      }
    );

    return NextResponse.json({ success: true, project });
  },
  { requiredPermissions: ['modifierBudget', 'adminConfig'] }
);
