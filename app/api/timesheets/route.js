import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { createTimesheetSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import TimesheetEntry from '@/models/Timesheet';
import Task from '@/models/Task';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  canUseProjectPermission,
  getAccessibleProjectIds,
  getProjectIdsWithAssignedWork,
} from '@/lib/projectAccess';

// GET /api/timesheets
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id') || url.searchParams.get('utilisateur') || user._id;
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  const requestedUserId = String(userId);
  const isOwn = requestedUserId === String(user._id);
  const wantsAll = requestedUserId === 'all';

  const perms = user.role_id?.permissions || {};
  if (!isOwn && !perms.voirTempsPasses && !perms.adminConfig) {
    return APIResponse.forbidden();
  }

  if (!wantsAll) {
    filter.utilisateur = requestedUserId;
  }

  const projectIds = await getAccessibleProjectIds(user);
  if (projectIds !== null) {
    const assignedIds = await getProjectIdsWithAssignedWork(user);
    filter.projet_id = { $in: [...projectIds, ...assignedIds] };
  }

  const start_date = url.searchParams.get('start_date');
  const end_date = url.searchParams.get('end_date');
  if (start_date || end_date) {
    filter.date = {};
    if (start_date) filter.date.$gte = new Date(start_date);
    if (end_date) filter.date.$lte = new Date(end_date);
  }

  const [timesheets, total] = await Promise.all([
    TimesheetEntry.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('utilisateur', 'nom_complet email avatar')
      .populate({
        path: 'task_id',
        select: 'titre projet_id',
        populate: { path: 'projet_id', select: 'nom' },
      })
      .lean(),
    TimesheetEntry.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: timesheets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/timesheets
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createTimesheetSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;
    const taskId = body.task_id || body.tâche_id;
    let projetId = body.projet_id || null;
    let task = null;

    if (taskId) {
      task = await Task.findById(taskId);
      if (!task) {
        return NextResponse.json({ success: false, error: 'Tâche introuvable' }, { status: 404 });
      }

      if (projetId && String(projetId) !== String(task.projet_id)) {
        return NextResponse.json(
          { success: false, error: 'La tâche n’appartient pas à ce projet' },
          { status: 422 }
        );
      }

      projetId = task.projet_id;
    }

    if (!projetId) {
      return NextResponse.json(
        { success: false, error: 'Projet ou tâche requis' },
        { status: 422 }
      );
    }

    if (task) {
      if (!(await canUseProjectPermission(user, task.projet_id, 'saisirTemps'))) {
        return APIResponse.forbidden();
      }
    } else if (!(await canUseProjectPermission(user, projetId, 'saisirTemps'))) {
      return APIResponse.forbidden();
    }

    const timesheet = await TimesheetEntry.create({
      task_id: task?._id || undefined,
      date: body.date,
      heures: body.heures,
      description: body.description,
      facturable: body.facturable,
      utilisateur: user._id,
      projet_id: projetId,
      statut: 'brouillon',
    });

    await logActivity(
      user,
      'création',
      'timesheet',
      timesheet._id,
      `Saisie de ${body.heures}h${task ? ` sur ${task.titre}` : ''}`,
      {
        request,
        httpMethod: 'POST',
        endpoint: '/timesheets',
        httpStatus: 201,
        relatedProjectId: projetId,
      }
    );

    return NextResponse.json({ success: true, data: timesheet }, { status: 201 });
  },
  { requiredPermissions: ['saisirTemps', 'adminConfig'] }
);
