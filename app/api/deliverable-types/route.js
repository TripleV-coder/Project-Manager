import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { createDeliverableTypeSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import DeliverableType from '@/models/DeliverableType';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/deliverable-types
export const GET = withApiProtection(async (_request, _context) => {
  const types = await DeliverableType.find({}).sort({ nom: 1 }).lean();

  return NextResponse.json({ success: true, data: types });
});

// POST /api/deliverable-types
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createDeliverableTypeSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    const type = await DeliverableType.create({
      ...body,
      créé_par: user._id,
    });

    await logActivity(
      user,
      'création',
      'type_livrable',
      type._id,
      `Création type livrable ${type.nom}`,
      {
        request,
        httpMethod: 'POST',
        endpoint: '/deliverable-types',
        httpStatus: 201,
      }
    );

    return NextResponse.json({ success: true, data: type }, { status: 201 });
  },
  { requiredPermissions: ['adminConfig'] }
);
