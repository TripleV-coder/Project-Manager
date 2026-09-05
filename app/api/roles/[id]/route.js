import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateRoleSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import Role from '@/models/Role';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';

// PUT /api/roles/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const roleId = params.id;
    const role = await Role.findById(roleId);

    if (!role) {
      return NextResponse.json({ success: false, error: 'Rôle introuvable' }, { status: 404 });
    }

    if (role.is_system || role.nom === 'Super Administrateur') {
      return NextResponse.json(
        { success: false, error: 'Ce rôle système ne peut pas être modifié' },
        { status: 403 }
      );
    }

    const validation = await validateBody(request, updateRoleSchema);
    if (!validation.success) return validation.response;

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { ...validation.data },
      { new: true, runValidators: true }
    );

    await logActivity(
      user,
      'modification',
      'rôle',
      roleId,
      `Modification rôle ${updatedRole.nom}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/roles/${roleId}`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, data: updatedRole });
  },
  { requiredPermissions: ['adminConfig'] }
);

// DELETE /api/roles/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const roleId = params.id;
    const role = await Role.findById(roleId);

    if (!role) {
      return NextResponse.json({ success: false, error: 'Rôle introuvable' }, { status: 404 });
    }

    if (role.is_predefined || role.is_system) {
      return NextResponse.json(
        { success: false, error: 'Les rôles prédéfinis ne peuvent pas être supprimés' },
        { status: 403 }
      );
    }

    // Check if role is used
    const userCount = await User.countDocuments({ role_id: roleId });
    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Ce rôle est utilisé par ${userCount} utilisateur(s). Réassignez-les d'abord.`,
        },
        { status: 409 }
      );
    }

    const roleName = role.nom;
    await Role.findByIdAndDelete(roleId);

    await logActivity(user, 'suppression', 'rôle', roleId, `Suppression rôle ${roleName}`, {
      request,
      httpMethod: 'DELETE',
      endpoint: `/roles/${roleId}`,
      httpStatus: 200,
    });

    return NextResponse.json({ success: true, message: 'Rôle supprimé avec succès' });
  },
  { requiredPermissions: ['adminConfig'] }
);
