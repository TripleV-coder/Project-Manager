import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { createRoleSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Role from '@/models/Role';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/roles
export const GET = withApiProtection(
  async (_request, _context) => {
    const roles = await Role.find({}).sort({ is_predefined: -1, nom: 1 }).lean();

    return NextResponse.json({ success: true, data: roles });
  },
  { requiredPermissions: ['adminConfig'] }
);

// POST /api/roles
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createRoleSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    const existing = await Role.findOne({ nom: body.nom });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Un rôle avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    const role = await Role.create({
      ...body,
      is_custom: true,
      is_predefined: false,
    });

    await logActivity(user, 'création', 'rôle', role._id, `Création rôle ${role.nom}`, {
      request,
      httpMethod: 'POST',
      endpoint: '/roles',
      httpStatus: 201,
    });

    return NextResponse.json(
      { success: true, data: role, message: 'Rôle créé avec succès' },
      { status: 201 }
    );
  },
  { requiredPermissions: ['adminConfig'] }
);
