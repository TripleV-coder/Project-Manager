import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { createDeliverableSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Deliverable from '@/models/Deliverable';
import Project from '@/models/Project';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/deliverables
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projet_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (projectId) filter.projet_id = projectId;

  const perms = user.role_id?.permissions || {};
  if (!perms.voirTousProjets && !perms.adminConfig) {
    if (projectId) {
      const project = await Project.findById(projectId);
      const isMember = project?.membres?.some((m) => m.user_id?.toString() === user._id.toString());
      const isChef = project?.chef_projet?.toString() === user._id.toString();
      const isCreator = project?.créé_par?.toString() === user._id.toString();
      if (!isMember && !isChef && !isCreator) return APIResponse.forbidden();
    } else {
      const userProjects = await Project.find({
        $or: [{ 'membres.user_id': user._id }, { chef_projet: user._id }, { créé_par: user._id }],
      })
        .select('_id')
        .lean();
      filter.projet_id = { $in: userProjects.map((p) => p._id) };
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
  { requiredPermissions: ['gererProjets', 'adminConfig'] }
);
