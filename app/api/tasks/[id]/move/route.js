import { NextResponse } from 'next/server';
import Task from '@/models/Task';
import Sprint from '@/models/Sprint';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';
import { isSameUser } from '@/lib/projectRoster';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import { logActivity } from '@/lib/auditService';

const STATUT_ALIASES = {
  backlog: 'Backlog',
  Backlog: 'Backlog',
  todo: 'À faire',
  'À faire': 'À faire',
  'A faire': 'À faire',
  in_progress: 'En cours',
  'En cours': 'En cours',
  review: 'Review',
  Review: 'Review',
  'En révision': 'Review',
  done: 'Terminé',
  Terminé: 'Terminé',
  Terminee: 'Terminé',
};

function resolveStatut(payload = {}) {
  const raw = payload.nouveau_statut || payload.statut || payload.nouvelle_colonne || '';
  return STATUT_ALIASES[raw] || STATUT_ALIASES[String(raw)] || null;
}

export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;
  const body = await request.json().catch(() => ({}));

  const task = await Task.findById(params.id);
  if (!task) {
    return NextResponse.json({ success: false, error: 'Tâche introuvable' }, { status: 404 });
  }

  const projectId = task.projet_id;
  const canManage = await canUseProjectPermission(user, projectId, [
    'gererTaches',
    'deplacerTaches',
  ]);
  const isAssignee = isSameUser(task.assigné_à, user._id);

  if (!canManage && !isAssignee) {
    return APIResponse.forbidden();
  }

  const statut = resolveStatut(body);
  const colonne = body.nouvelle_colonne || body.colonne_kanban || task.colonne_kanban;
  const update = { updated_at: new Date(), colonne_kanban: colonne };
  if (statut) update.statut = statut;

  const updated = await Task.findByIdAndUpdate(params.id, update, {
    new: true,
    runValidators: true,
  }).populate('assigné_à', 'nom_complet email avatar');

  if (statut && statut !== task.statut && updated.sprint_id) {
    try {
      const sprint = await Sprint.findById(updated.sprint_id);
      if (sprint && sprint.statut === 'Actif') {
        const sprintTasks = await Task.find({ sprint_id: sprint._id });
        const completedPoints = sprintTasks
          .filter((item) => item.statut === 'Terminé')
          .reduce((sum, item) => sum + (item.story_points || 0), 0);
        await Sprint.findByIdAndUpdate(sprint._id, { story_points_complétés: completedPoints });
      }
    } catch {
      /* non-blocking */
    }
  }

  await logActivity(user, 'modification', 'tâche', task._id, `Déplacement tâche ${task.titre}`, {
    request,
    httpMethod: 'PUT',
    endpoint: `/tasks/${params.id}/move`,
    httpStatus: 200,
    relatedProjectId: projectId,
  });

  emitToProject(projectId?.toString(), SOCKET_EVENTS.TASK_UPDATED, { task: updated });

  return NextResponse.json({ success: true, data: updated });
});
