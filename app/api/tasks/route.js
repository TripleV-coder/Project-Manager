import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { createTaskSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Task from '@/models/Task';
import Project from '@/models/Project';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/tasks
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 500);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  const projet_id = url.searchParams.get('projet_id');
  const sprint_id = url.searchParams.get('sprint_id');
  const statut = url.searchParams.get('statut');
  const type = url.searchParams.get('type');
  const assigné_à = url.searchParams.get('assigné_à');

  if (projet_id) filter.projet_id = projet_id;
  if (sprint_id) filter.sprint_id = sprint_id;
  if (statut) filter.statut = statut;
  if (type) filter.type = type;
  if (assigné_à) filter.assigné_à = assigné_à;

  // Non-admins see only tasks from their projects
  const perms = user.role_id?.permissions || {};
  if (!perms.voirTousProjets && !perms.adminConfig) {
    const userProjects = await Project.find({
      $or: [{ 'membres.user_id': user._id }, { chef_projet: user._id }, { créé_par: user._id }],
    })
      .select('_id')
      .lean();
    const projectIds = userProjects.map((p) => p._id);
    filter.projet_id = { ...filter.projet_id, $in: projectIds };
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assigné_à', 'nom_complet email avatar')
      .populate('projet_id', 'nom')
      .populate('sprint_id', 'nom statut')
      .populate('deliverable_id', 'nom')
      .lean(),
    Task.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: tasks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/tasks
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createTaskSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    // Verify project access
    const project = await Project.findById(body.projet_id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });
    }

    const task = await Task.create({
      ...body,
      créé_par: user._id,
    });

    await task.populate('assigné_à', 'nom_complet email');

    // Audit + socket
    await logActivity(user._id, 'création', 'tâche', task._id, task.titre, body.projet_id);
    emitToProject(body.projet_id, SOCKET_EVENTS.TASK_CREATED, { task });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  },
  { requiredPermissions: ['gererTaches', 'adminConfig'] }
);
