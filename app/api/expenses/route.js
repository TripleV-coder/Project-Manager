import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { createExpenseSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Expense from '@/models/Budget';
import Project from '@/models/Project';
import notificationService from '@/lib/services/notificationService';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  canUseProjectPermission,
  getAccessibleProjectIds,
  canSeeBudgets,
} from '@/lib/projectAccess';

// GET /api/expenses
export const GET = withApiProtection(
  async (request, context) => {
    const { user } = context;

    if (!canSeeBudgets(user)) {
      return APIResponse.forbidden();
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
    const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
    const skip = (page - 1) * limit;

    const projectId = url.searchParams.get('projet_id') || url.searchParams.get('project_id');
    const filter = {};
    if (projectId) {
      if (!(await canUseProjectPermission(user, projectId, 'voirBudget'))) {
        return APIResponse.forbidden();
      }
      filter.projet_id = projectId;
    } else {
      const projectIds = await getAccessibleProjectIds(user);
      if (projectIds !== null) {
        const allowed = [];
        for (const id of projectIds) {
          if (await canUseProjectPermission(user, id, 'voirBudget')) {
            allowed.push(id);
          }
        }
        filter.projet_id = { $in: allowed };
      }
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date_dépense: -1 })
        .skip(skip)
        .limit(limit)
        .populate('saisi_par', 'nom_complet email avatar')
        .populate('validé_par', 'nom_complet email avatar')
        .populate('projet_id', 'nom')
        .lean(),
      Expense.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data: expenses, expenses, total, page, limit });
  },
  { requiredPermissions: ['voirBudget', 'adminConfig'] }
);

// POST /api/expenses
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createExpenseSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    const project = await Project.findById(body.projet_id);
    if (!project)
      return NextResponse.json({ success: false, error: 'Projet introuvable' }, { status: 404 });

    if (!(await canUseProjectPermission(user, body.projet_id, 'modifierBudget'))) {
      return APIResponse.forbidden();
    }

    const expense = await Expense.create({
      ...body,
      saisi_par: user._id,
      statut: 'en_attente',
    });

    await logActivity(
      user,
      'création',
      'dépense',
      expense._id,
      `Dépense de ${body.montant} ajoutée`,
      {
        request,
        httpMethod: 'POST',
        endpoint: '/expenses',
        httpStatus: 201,
        relatedProjectId: project._id,
      }
    );

    // Vérifier le budget
    if (project.budget?.prévisionnel > 0) {
      const allExpenses = await Expense.find({ projet_id: project._id, statut: { $ne: 'refusé' } });
      const totalConsumed = allExpenses.reduce((sum, e) => sum + e.montant, 0);
      const consumptionPercentage = (totalConsumed / project.budget.prévisionnel) * 100;

      // Alertes à 80% et 100%
      if (consumptionPercentage >= 80) {
        await notificationService.notifyBudgetAlert(project._id, Math.round(consumptionPercentage));
      }
    }

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  },
  { requiredPermissions: ['modifierBudget', 'adminConfig'] }
);
