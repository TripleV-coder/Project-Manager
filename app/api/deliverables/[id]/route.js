import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateDeliverableSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Deliverable from '@/models/Deliverable';
import { withApiProtection } from '@/lib/withApiProtection';

// PUT /api/deliverables/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const deliverableId = params.id;
    const deliverable = await Deliverable.findById(deliverableId);

    if (!deliverable) {
      return NextResponse.json({ success: false, error: 'Livrable introuvable' }, { status: 404 });
    }

    const validation = await validateBody(request, updateDeliverableSchema);
    if (!validation.success) return validation.response;

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
  { requiredPermissions: ['gererProjets', 'validerLivrable', 'adminConfig'] }
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
  { requiredPermissions: ['gererProjets', 'adminConfig'] }
);
