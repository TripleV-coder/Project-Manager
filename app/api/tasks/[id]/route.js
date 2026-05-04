import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { updateTaskSchema } from '@/lib/schemas';
import { getMergedPermissions } from '@/lib/permissions';
import { logActivity } from '@/lib/auditService';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import Task from '@/models/Task';
import Project from '@/models/Project';
import Sprint from '@/models/Sprint';
import { withApiProtection } from '@/lib/withApiProtection';

async function getTaskWithAccess(taskId, user) {
  const task = await Task.findById(taskId)
    .populate('assigné_à', 'nom_complet email avatar')
    .populate('projet_id', 'nom membres chef_projet créé_par')
    .populate('sprint_id', 'nom statut')
    .populate('deliverable_id', 'nom');

  if (!task) return { error: 'Tâche introuvable', status: 404 };

  const perms = user.role_id?.permissions || {};
  if (!perms.voirTousProjets && !perms.adminConfig) {
    const project = task.projet_id;
    const isMember = project?.membres?.some((m) => m.user_id?.toString() === user._id.toString());
    const isChef = project?.chef_projet?.toString() === user._id.toString();
    const isCreator = project?.créé_par?.toString() === user._id.toString();
    if (!isMember && !isChef && !isCreator) return { error: 'Accès refusé', status: 403 };
  }

  return { task };
}

// GET /api/tasks/[id]
export const GET = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const { task, error, status } = await getTaskWithAccess(params.id, user);
  if (error) return NextResponse.json({ success: false, error }, { status });

  return NextResponse.json({ success: true, data: task });
});

// PUT /api/tasks/[id]
export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const validation = await validateBody(request, updateTaskSchema);
  if (!validation.success) return validation.response;

  const body = validation.data;
  const task = await Task.findById(params.id).populate('projet_id');
  if (!task)
    return NextResponse.json({ success: false, error: 'Tâche introuvable' }, { status: 404 });

  // Permission check via merged system + project roles
  const project = await Project.findById(task.projet_id._id || task.projet_id).populate({
    path: 'membres.project_role_id',
  });
  const memberData = project?.membres?.find((m) => m.user_id?.toString() === user._id.toString());
  const merged = getMergedPermissions(user, memberData?.project_role_id);

  if (!merged.permissions.gererTaches && !merged.permissions.deplacerTaches) {
    return APIResponse.forbidden();
  }

  const oldStatut = task.statut;
  const updatedTask = await Task.findByIdAndUpdate(
    params.id,
    { ...body, updated_at: new Date() },
    { new: true, runValidators: true }
  )
    .populate('assigné_à', 'nom_complet email avatar')
    .populate('sprint_id', 'nom statut');

  // Update sprint burndown if statut changed
  if (body.statut && body.statut !== oldStatut && updatedTask.sprint_id) {
    try {
      const sprint = await Sprint.findById(updatedTask.sprint_id);
      if (sprint && sprint.statut === 'Actif') {
        const sprintTasks = await Task.find({ sprint_id: sprint._id });
        const completedPoints = sprintTasks
          .filter((t) => t.statut === 'Terminé')
          .reduce((s, t) => s + (t.story_points || 0), 0);
        await Sprint.findByIdAndUpdate(sprint._id, { story_points_complétés: completedPoints });
      }
    } catch {
      /* non-blocking */
    }
  }

  const projetId = (task.projet_id._id || task.projet_id).toString();
  await logActivity(user, 'modification', 'tâche', task._id, `Modification tâche ${task.titre}`, {
    request,
    httpMethod: 'PUT',
    endpoint: `/tasks/${params.id}`,
    httpStatus: 200,
    relatedProjectId: projetId,
  });

  emitToProject(projetId, SOCKET_EVENTS.TASK_UPDATED, { task: updatedTask });

  return NextResponse.json({ success: true, data: updatedTask });
});

// DELETE /api/tasks/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const task = await Task.findById(params.id);
    if (!task)
      return NextResponse.json({ success: false, error: 'Tâche introuvable' }, { status: 404 });

    const projetId = task.projet_id?.toString();
    const titre = task.titre;

    await Task.findByIdAndDelete(params.id);
    // Also delete children
    await Task.deleteMany({ parent_id: params.id });

    await logActivity(user, 'suppression', 'tâche', params.id, `Suppression tâche ${titre}`, {
      request,
      httpMethod: 'DELETE',
      endpoint: `/tasks/${params.id}`,
      httpStatus: 200,
      relatedProjectId: projetId,
    });

    emitToProject(projetId, SOCKET_EVENTS.TASK_DELETED, { taskId: params.id });

    return NextResponse.json({ success: true, message: 'Tâche supprimée' });
  },
  { requiredPermissions: ['gererTaches', 'adminConfig'] }
);
