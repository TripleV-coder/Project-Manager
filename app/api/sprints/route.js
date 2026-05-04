import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { createSprintSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/sprints
export const GET = withApiProtection(async (request, _context) => {
  const url = new URL(request.url);
  const projet_id = url.searchParams.get('projet_id');
  const statut = url.searchParams.get('statut');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (projet_id) filter.projet_id = projet_id;
  if (statut) filter.statut = statut;

  const [sprints, total] = await Promise.all([
    Sprint.find(filter)
      .sort({ date_début: -1 })
      .skip(skip)
      .limit(limit)
      .populate('projet_id', 'nom')
      .lean(),
    Sprint.countDocuments(filter),
  ]);

  // Attach task counts per sprint
  const sprintIds = sprints.map((s) => s._id);
  const taskCounts = await Task.aggregate([
    { $match: { sprint_id: { $in: sprintIds } } },
    {
      $group: {
        _id: '$sprint_id',
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$statut', 'Terminé'] }, 1, 0] } },
      },
    },
  ]);
  const countMap = {};
  taskCounts.forEach((tc) => {
    countMap[tc._id.toString()] = tc;
  });

  const enriched = sprints.map((s) => ({
    ...s,
    stats: countMap[s._id.toString()] || { count: 0, completed: 0 },
  }));

  return NextResponse.json({
    success: true,
    data: enriched,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/sprints
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createSprintSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    // Validate dates
    if (new Date(body.date_fin) <= new Date(body.date_début)) {
      return NextResponse.json(
        {
          success: false,
          error: 'La date de fin doit être postérieure à la date de début',
        },
        { status: 422 }
      );
    }

    // Only one active sprint per project
    if (body.statut === 'Actif') {
      const activeSprint = await Sprint.findOne({ projet_id: body.projet_id, statut: 'Actif' });
      if (activeSprint) {
        return NextResponse.json(
          {
            success: false,
            error: 'Un sprint actif existe déjà pour ce projet',
          },
          { status: 409 }
        );
      }
    }

    const sprint = await Sprint.create({ ...body, créé_par: user._id });

    await logActivity(user, 'création', 'sprint', sprint._id, `Création sprint ${body.nom}`, {
      request,
      httpMethod: 'POST',
      endpoint: '/sprints',
      httpStatus: 201,
      relatedProjectId: body.projet_id,
    });

    emitToProject(body.projet_id, SOCKET_EVENTS.SPRINT_CREATED, { sprint });

    return NextResponse.json({ success: true, data: sprint }, { status: 201 });
  },
  { requiredPermissions: ['gererSprints', 'adminConfig'] }
);
