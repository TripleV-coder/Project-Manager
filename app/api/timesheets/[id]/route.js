import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { updateTimesheetSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import TimesheetEntry from '@/models/Timesheet';
import { withApiProtection } from '@/lib/withApiProtection';

// PUT /api/timesheets/[id]
export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const timesheetId = params.id;
  const timesheet = await TimesheetEntry.findById(timesheetId);

  if (!timesheet) {
    return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 });
  }

  const perms = user.role_id?.permissions || {};
  const ownerId = timesheet.utilisateur || timesheet.user_id;
  const isOwner = ownerId?.toString() === user._id.toString();

  if (!isOwner && !perms.adminConfig) {
    return APIResponse.forbidden();
  }

  if (timesheet.statut === 'validé' && !perms.adminConfig) {
    return NextResponse.json(
      { success: false, error: 'Impossible de modifier une entrée approuvée' },
      { status: 403 }
    );
  }

  const validation = await validateBody(request, updateTimesheetSchema);
  if (!validation.success) return validation.response;

  const updated = await TimesheetEntry.findByIdAndUpdate(
    timesheetId,
    { ...validation.data },
    { new: true, runValidators: true }
  );

  await logActivity(user, 'modification', 'timesheet', timesheetId, `Modification temps saisi`, {
    request,
    httpMethod: 'PUT',
    endpoint: `/timesheets/${timesheetId}`,
    httpStatus: 200,
    relatedProjectId: timesheet.projet_id,
  });

  return NextResponse.json({ success: true, data: updated });
});

// DELETE /api/timesheets/[id]
export const DELETE = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const timesheetId = params.id;
  const timesheet = await TimesheetEntry.findById(timesheetId);

  if (!timesheet) {
    return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 });
  }

  const perms = user.role_id?.permissions || {};
  const ownerId = timesheet.utilisateur || timesheet.user_id;
  const isOwner = ownerId?.toString() === user._id.toString();

  if (!isOwner && !perms.adminConfig) {
    return APIResponse.forbidden();
  }

  if (timesheet.statut === 'validé' && !perms.adminConfig) {
    return NextResponse.json(
      { success: false, error: 'Impossible de supprimer une entrée approuvée' },
      { status: 403 }
    );
  }

  await TimesheetEntry.findByIdAndDelete(timesheetId);

  await logActivity(user, 'suppression', 'timesheet', timesheetId, `Suppression temps saisi`, {
    request,
    httpMethod: 'DELETE',
    endpoint: `/timesheets/${timesheetId}`,
    httpStatus: 200,
    relatedProjectId: timesheet.projet_id,
  });

  return NextResponse.json({ success: true, message: 'Entrée supprimée' });
});
