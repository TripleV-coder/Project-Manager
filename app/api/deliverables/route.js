import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { createDeliverableSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Deliverable from '@/models/Deliverable';
import Project from '@/models/Project';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  canAccessProjectOrAssignedWork,
  canUseProjectPermission,
  getAccessibleProjectIds,
  getProjectIdsWithAssignedWork,
} from '@/lib/projectAccess';
import { isOnProjectRoster } from '@/lib/projectRoster';

// GET /api/deliverables
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projet_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (projectId) {
    if (!(await canAccessProjectOrAssignedWork(user, projectId))) {
      return APIResponse.forbidden();
    }
    filter.projet_id = projectId;
  } else {
    const projectIds = await getAccessibleProjectIds(user);
    if (projectIds !== null) {
      const assignedIds = await getProjectIdsWithAssignedWork(user);
      filter.projet_id = { $in: [...projectIds, ...assignedIds] };
    }
  }

  const [deliverables, total] = await Promise.all([
    Deliverable.find(filter)
      .sort({ date_échéance: 1 })
      .skip(skip)
      .limit(limit)
      .populate('projet_id', 'nom')
      .populate('responsable_id', 'nom_complet avatar')
      .populate('type_id', 'nom')
      .lean(),
    Deliverable.countDocuments(filter),
  ]);

  return NextResponse.json({ success: true, data: deliverables, total, page, limit });
});

// POST /api/deliverables
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createDeliverableSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    const project = await Project.findById(body.projet_id);
    if (!project)
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });

    if (
      !(await canUseProjectPermission(user, body.projet_id, [
        'modifierCharteProjet',
        'validerLivrable',
      ]))
    ) {
      return APIResponse.forbidden();
    }

    if (body.responsable_id && !isOnProjectRoster(project, body.responsable_id)) {
      return NextResponse.json(
        { success: false, error: 'Le responsable doit être un membre du projet' },
        { status: 422 }
      );
    }

    const deliverable = await Deliverable.create({
      ...body,
      créé_par: user._id,
    });

    await logActivity(user, 'création', 'livrable', deliverable._id, `Livrable ${body.nom} créé`, {
      request,
      httpMethod: 'POST',
      endpoint: '/deliverables',
      httpStatus: 201,
      relatedProjectId: project._id,
    });

    return NextResponse.json({ success: true, data: deliverable }, { status: 201 });
  },
  { requiredPermissions: ['modifierCharteProjet', 'validerLivrable', 'adminConfig'] }
);
