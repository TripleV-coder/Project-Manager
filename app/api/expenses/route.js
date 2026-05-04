import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { createExpenseSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Expense from '@/models/Budget';
import Project from '@/models/Project';
import notificationService from '@/lib/services/notificationService';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/expenses
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const projectId = url.searchParams.get('projet_id');
  const filter = {};
  if (projectId) filter.projet_id = projectId;

  const perms = user.role_id?.permissions || {};
  if (!perms.voirTousProjets && !perms.adminConfig) {
    if (projectId) {
      const project = await Project.findById(projectId);
      const isMember = project?.membres?.some((m) => m.user_id?.toString() === user._id.toString());
      const isChef = project?.chef_projet?.toString() === user._id.toString();
      const isCreator = project?.créé_par?.toString() === user._id.toString();
      if (!isMember && !isChef && !isCreator) return APIResponse.forbidden();
    } else {
      const userProjects = await Project.find({
        $or: [{ 'membres.user_id': user._id }, { chef_projet: user._id }, { créé_par: user._id }],
      })
        .select('_id')
        .lean();
      filter.projet_id = { $in: userProjects.map((p) => p._id) };
    }
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('soumis_par', 'nom_complet email avatar')
      .populate('projet_id', 'nom')
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return NextResponse.json({ success: true, data: expenses, total, page, limit });
});

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
