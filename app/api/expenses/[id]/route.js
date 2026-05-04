import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateExpenseSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Expense from '@/models/Budget';
import { withApiProtection } from '@/lib/withApiProtection';

// PUT /api/expenses/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const perms = user.role_id?.permissions || {};
    const expenseId = params.id;
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Dépense introuvable' }, { status: 404 });
    }

    if (expense.statut === 'Approuvée' && !perms.adminConfig) {
      return NextResponse.json(
        { success: false, error: 'Impossible de modifier une dépense approuvée' },
        { status: 403 }
      );
    }

    const validation = await validateBody(request, updateExpenseSchema);
    if (!validation.success) return validation.response;

    const updated = await Expense.findByIdAndUpdate(
      expenseId,
      { ...validation.data },
      { new: true, runValidators: true }
    );

    await logActivity(
      user,
      'modification',
      'dépense',
      expenseId,
      `Modification dépense de ${updated.montant}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/expenses/${expenseId}`,
        httpStatus: 200,
        relatedProjectId: updated.projet_id,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ['modifierBudget', 'adminConfig'] }
);

// DELETE /api/expenses/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const perms = user.role_id?.permissions || {};
    const expenseId = params.id;
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Dépense introuvable' }, { status: 404 });
    }

    if (expense.statut === 'Approuvée' && !perms.adminConfig) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer une dépense approuvée' },
        { status: 403 }
      );
    }

    await Expense.findByIdAndDelete(expenseId);

    await logActivity(user, 'suppression', 'dépense', expenseId, `Suppression dépense`, {
      request,
      httpMethod: 'DELETE',
      endpoint: `/expenses/${expenseId}`,
      httpStatus: 200,
      relatedProjectId: expense.projet_id,
    });

    return NextResponse.json({ success: true, message: 'Dépense supprimée' });
  },
  { requiredPermissions: ['modifierBudget', 'adminConfig'] }
);
