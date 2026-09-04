import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { expenseStatusSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Expense from '@/models/Budget';
import { withApiProtection } from '@/lib/withApiProtection';
import { canUseProjectPermission } from '@/lib/projectAccess';

export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const validation = await validateBody(request, expenseStatusSchema);
    if (!validation.success) return validation.response;

    const expense = await Expense.findById(params.id);
    if (!expense) {
      return NextResponse.json({ success: false, error: 'Dépense introuvable' }, { status: 404 });
    }

    if (!(await canUseProjectPermission(user, expense.projet_id, 'modifierBudget'))) {
      return APIResponse.forbidden();
    }

    const perms = user.role_id?.permissions || {};
    if (expense.statut === 'validé' && validation.data.statut !== 'payé' && !perms.adminConfig) {
      return NextResponse.json(
        { success: false, error: 'Impossible de modifier une dépense validée' },
        { status: 403 }
      );
    }

    const updated = await Expense.findByIdAndUpdate(
      params.id,
      {
        statut: validation.data.statut,
        validé_par: user._id,
        date_validation: new Date(),
      },
      { new: true, runValidators: true }
    );

    await logActivity(
      user,
      'modification',
      'dépense',
      params.id,
      `Statut dépense → ${validation.data.statut}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/expenses/${params.id}/status`,
        httpStatus: 200,
        relatedProjectId: expense.projet_id,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ['modifierBudget', 'adminConfig'] }
);
