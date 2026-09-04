import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { timesheetStatusSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import TimesheetEntry from '@/models/Timesheet';
import { withApiProtection } from '@/lib/withApiProtection';
import { canUseProjectPermission } from '@/lib/projectAccess';

export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const validation = await validateBody(request, timesheetStatusSchema);
  if (!validation.success) return validation.response;

  const timesheet = await TimesheetEntry.findById(params.id);
  if (!timesheet) {
    return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 });
  }

  const perms = user.role_id?.permissions || {};
  const ownerId = timesheet.utilisateur || timesheet.user_id;
  const isOwner = ownerId?.toString() === user._id.toString();
  const canApprove =
    perms.adminConfig === true ||
    (await canUseProjectPermission(user, timesheet.projet_id, 'voirTempsPasses'));

  if (timesheet.statut === 'validé' && !perms.adminConfig) {
    return NextResponse.json(
      { success: false, error: 'Impossible de modifier une entrée validée' },
      { status: 403 }
    );
  }

  const nextStatus = validation.data.statut;
  const isApproval = nextStatus === 'validé' || nextStatus === 'refusé';
  if (isApproval && !canApprove) {
    return APIResponse.forbidden();
  }
  if (!isOwner && !canApprove) {
    return APIResponse.forbidden();
  }

  const updated = await TimesheetEntry.findByIdAndUpdate(
    params.id,
    {
      statut: nextStatus,
      ...(isApproval ? { validé_par: user._id, date_validation: new Date() } : {}),
    },
    { new: true, runValidators: true }
  );

  await logActivity(
    user,
    'modification',
    'timesheet',
    params.id,
    `Statut timesheet → ${nextStatus}`,
    {
      request,
      httpMethod: 'PUT',
      endpoint: `/timesheets/${params.id}/status`,
      httpStatus: 200,
      relatedProjectId: timesheet.projet_id,
    }
  );

  return NextResponse.json({ success: true, data: updated });
});
