import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/requestAuth';
import { APIResponse, handleError } from '@/lib/apiResponse';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';

// PUT /api/sprints/[id]/start
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const user = await authenticateRequest(request);
    if (!user) return APIResponse.unauthorized();

    const perms = user.role_id?.permissions || {};
    if (!perms.gererSprints && !perms.adminConfig) return APIResponse.forbidden();

    const sprint = await Sprint.findById(params.id);
    if (!sprint)
      return NextResponse.json({ success: false, error: 'Sprint introuvable' }, { status: 404 });

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

    // Check no other active sprint for this project
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

    // Initialize burndown data
    const sprintTasks = await Task.find({ sprint_id: params.id });
    const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

    const startDate = sprint.date_début ? new Date(sprint.date_début) : new Date();
    const _endDate = sprint.date_fin
      ? new Date(sprint.date_fin)
      : new Date(Date.now() + 14 * 24 * 3600 * 1000);

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
  } catch (error) {
    return handleError(error, 'PUT /api/sprints/[id]/start');
  }
}
