import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';

// PUT /api/sprints/[id]/start
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const sprint = await Sprint.findById(params.id);
    if (!sprint)
      return NextResponse.json({ success: false, error: 'Sprint introuvable' }, { status: 404 });

    if (!(await canUseProjectPermission(user, sprint.projet_id, 'gererSprints'))) {
      return APIResponse.forbidden();
    }

    if (sprint.statut === 'Actif') {
      return NextResponse.json(
        { success: false, error: 'Ce sprint est déjà actif' },
        { status: 409 }
      );
    }
    if (sprint.statut === 'Terminé') {
      return NextResponse.json(
        { success: false, error: 'Ce sprint est déjà terminé' },
        { status: 409 }
      );
    }

    const activeSprint = await Sprint.findOne({
      projet_id: sprint.projet_id,
      statut: 'Actif',
      _id: { $ne: params.id },
    });

    if (activeSprint) {
      return NextResponse.json(
        {
          success: false,
          error: "Un autre sprint est déjà actif sur ce projet. Terminez-le d'abord.",
        },
        { status: 409 }
      );
    }

    const sprintTasks = await Task.find({ sprint_id: params.id });
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

    const startDate = sprint.date_début ? new Date(sprint.date_début) : new Date();

    const updated = await Sprint.findByIdAndUpdate(
      params.id,
      {
        statut: 'Actif',
        date_début_réel: new Date(),
        story_points_planifiés: totalPoints,
        burndown_data: [
          {
            date: startDate,
            story_points_restants: totalPoints,
            idéal: totalPoints,
          },
        ],
      },
      { new: true }
    );

    await logActivity(user, 'démarrage', 'sprint', sprint._id, `Démarrage sprint ${sprint.nom}`, {
      request,
      httpMethod: 'PUT',
      endpoint: `/sprints/${params.id}/start`,
      httpStatus: 200,
      relatedProjectId: sprint.projet_id,
    });

    emitToProject(sprint.projet_id?.toString(), SOCKET_EVENTS.SPRINT_STARTED, { sprint: updated });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Sprint démarré avec succès',
    });
  },
  { requiredPermissions: ['gererSprints', 'adminConfig'] }
);

export const POST = PUT;
