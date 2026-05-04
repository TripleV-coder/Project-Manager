import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateDeliverableTypeSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import DeliverableType from '@/models/DeliverableType';
import { withApiProtection } from '@/lib/withApiProtection';

// PUT /api/deliverable-types/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const typeId = params.id;

    const validation = await validateBody(request, updateDeliverableTypeSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    const type = await DeliverableType.findByIdAndUpdate(
      typeId,
      { ...body },
      { new: true, runValidators: true }
    );

    if (!type) {
      return NextResponse.json({ success: false, error: 'Type introuvable' }, { status: 404 });
    }

    await logActivity(
      user,
      'modification',
      'type_livrable',
      typeId,
      `Modification type livrable ${type.nom}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/deliverable-types/${typeId}`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, data: type });
  },
  { requiredPermissions: ['adminConfig'] }
);

// DELETE /api/deliverable-types/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const typeId = params.id;
    const type = await DeliverableType.findById(typeId);

    if (!type) {
      return NextResponse.json({ success: false, error: 'Type introuvable' }, { status: 404 });
    }

    await DeliverableType.findByIdAndDelete(typeId);

    await logActivity(user, 'suppression', 'type_livrable', typeId, `Suppression type livrable`, {
      request,
      httpMethod: 'DELETE',
      endpoint: `/deliverable-types/${typeId}`,
      httpStatus: 200,
    });

    return NextResponse.json({ success: true, message: 'Type supprimé' });
  },
  { requiredPermissions: ['adminConfig'] }
);
