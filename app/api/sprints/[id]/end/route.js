import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';

// PUT /api/sprints/[id]/end
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const sprint = await Sprint.findById(params.id);
    if (!sprint)
      return NextResponse.json({ success: false, error: 'Sprint introuvable' }, { status: 404 });

    if (!(await canUseProjectPermission(user, sprint.projet_id, 'gererSprints'))) {
      return APIResponse.forbidden();
    }

    if (sprint.statut !== 'Actif') {
      return NextResponse.json(
        { success: false, error: "Ce sprint n'est pas actif" },
        { status: 409 }
      );
    }

    const sprintTasks = await Task.find({ sprint_id: params.id });
    const completedPoints = sprintTasks
      .filter((t) => t.statut === 'Terminé')
      .reduce((sum, t) => sum + (t.story_points || 0), 0);

    const incompleteTasks = sprintTasks.filter((t) => t.statut !== 'Terminé');

    const updated = await Sprint.findByIdAndUpdate(
      params.id,
      {
        statut: 'Terminé',
        date_fin_réel: new Date(),
        story_points_complétés: completedPoints,
        vélocité: completedPoints,
      },
      { new: true }
    );

    if (incompleteTasks.length > 0) {
      await Task.updateMany(
        { sprint_id: params.id, statut: { $ne: 'Terminé' } },
        { $unset: { sprint_id: '' } }
      );
    }

    await logActivity(user, 'clôture', 'sprint', sprint._id, `Clôture sprint ${sprint.nom}`, {
      request,
      httpMethod: 'PUT',
      endpoint: `/sprints/${params.id}/end`,
      httpStatus: 200,
      relatedProjectId: sprint.projet_id,
    });

    emitToProject(sprint.projet_id?.toString(), SOCKET_EVENTS.SPRINT_ENDED, { sprint: updated });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Sprint terminé avec succès',
      stats: {
        completedPoints,
        incompleteTasksMoved: incompleteTasks.length,
      },
    });
  },
  { requiredPermissions: ['gererSprints', 'adminConfig'] }
);

export const POST = PUT;
