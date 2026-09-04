import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateDeliverableSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Deliverable from '@/models/Deliverable';
import Project from '@/models/Project';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';
import { isOnProjectRoster } from '@/lib/projectRoster';

// PUT /api/deliverables/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const deliverableId = params.id;
    const deliverable = await Deliverable.findById(deliverableId);

    if (!deliverable) {
      return NextResponse.json({ success: false, error: 'Livrable introuvable' }, { status: 404 });
    }

    if (
      !(await canUseProjectPermission(user, deliverable.projet_id, [
        'modifierCharteProjet',
        'validerLivrable',
      ]))
    ) {
      return APIResponse.forbidden();
    }

    const validation = await validateBody(request, updateDeliverableSchema);
    if (!validation.success) return validation.response;

    if (validation.data.responsable_id) {
      const project = await Project.findById(deliverable.projet_id).lean();
      if (!project || !isOnProjectRoster(project, validation.data.responsable_id)) {
        return NextResponse.json(
          { success: false, error: 'Le responsable doit être un membre du projet' },
          { status: 422 }
        );
      }
    }

    const updated = await Deliverable.findByIdAndUpdate(
      deliverableId,
      { ...validation.data },
      { new: true, runValidators: true }
    );

    await logActivity(
      user,
      'modification',
      'livrable',
      deliverableId,
      `Modification livrable ${updated.nom}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/deliverables/${deliverableId}`,
        httpStatus: 200,
        relatedProjectId: updated.projet_id,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  },
  { requiredPermissions: ['modifierCharteProjet', 'validerLivrable', 'adminConfig'] }
);

// DELETE /api/deliverables/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const deliverableId = params.id;
    const deliverable = await Deliverable.findById(deliverableId);

    if (!deliverable) {
      return NextResponse.json({ success: false, error: 'Livrable introuvable' }, { status: 404 });
    }

    if (!(await canUseProjectPermission(user, deliverable.projet_id, 'modifierCharteProjet'))) {
      return APIResponse.forbidden();
    }

    await Deliverable.findByIdAndDelete(deliverableId);

    await logActivity(user, 'suppression', 'livrable', deliverableId, `Suppression livrable`, {
      request,
      httpMethod: 'DELETE',
      endpoint: `/deliverables/${deliverableId}`,
      httpStatus: 200,
      relatedProjectId: deliverable.projet_id,
    });

    return NextResponse.json({ success: true, message: 'Livrable supprimé' });
  },
  { requiredPermissions: ['modifierCharteProjet', 'adminConfig'] }
);
