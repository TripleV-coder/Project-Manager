import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateSprintSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/sprints/[id]
export const GET = withApiProtection(async (request, context) => {
  const { params } = context;

  const sprint = await Sprint.findById(params.id).populate('projet_id', 'nom');
  if (!sprint)
    return NextResponse.json({ success: false, error: 'Sprint introuvable' }, { status: 404 });

  // Attach tasks
  const tasks = await Task.find({ sprint_id: params.id })
    .populate('assigné_à', 'nom_complet email avatar')
    .lean();

  return NextResponse.json({ success: true, data: { ...sprint.toObject(), tasks } });
});

// PUT /api/sprints/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const validation = await validateBody(request, updateSprintSchema);
    if (!validation.success) return validation.response;

    const sprint = await Sprint.findById(params.id);
    if (!sprint)
      return NextResponse.json({ success: false, error: 'Sprint introuvable' }, { status: 404 });

    const updated = await Sprint.findByIdAndUpdate(
      params.id,
      { ...validation.data, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    await logActivity(
      user,
      'modification',
      'sprint',
      sprint._id,
      `Modification sprint ${sprint.nom}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/sprints/${params.id}`,
        httpStatus: 200,
        relatedProjectId: sprint.projet_id,
      }
    );

    emitToProject(sprint.projet_id?.toString(), SOCKET_EVENTS.SPRINT_UPDATED, {
      sprint: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ['gererSprints', 'adminConfig'] }
);

// DELETE /api/sprints/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const sprint = await Sprint.findById(params.id);
    if (!sprint)
      return NextResponse.json({ success: false, error: 'Sprint introuvable' }, { status: 404 });

    if (sprint.statut === 'Actif') {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de supprimer un sprint actif. Terminez-le d'abord.",
        },
        { status: 409 }
      );
    }

    // Move tasks back to backlog
    await Task.updateMany({ sprint_id: params.id }, { $unset: { sprint_id: '' } });
    await Sprint.findByIdAndDelete(params.id);

    await logActivity(
      user,
      'suppression',
      'sprint',
      params.id,
      `Suppression sprint ${sprint.nom}`,
      {
        request,
        httpMethod: 'DELETE',
        endpoint: `/sprints/${params.id}`,
        httpStatus: 200,
        relatedProjectId: sprint.projet_id,
      }
    );

    emitToProject(sprint.projet_id?.toString(), SOCKET_EVENTS.SPRINT_DELETED, {
      sprintId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Sprint supprimé' });
  },
  { requiredPermissions: ['gererSprints', 'adminConfig'] }
);
