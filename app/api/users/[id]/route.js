import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { updateUserSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import { revokeUserSessions } from '@/lib/userSecurity';
import User from '@/models/User';
import Role from '@/models/Role';
import { withApiProtection } from '@/lib/withApiProtection';
import { canActorManageTarget, canActorAssignRole } from '@/lib/userManagement';

// PUT /api/users/[id]
export const PUT = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const targetUserId = params.id;
    const targetUser = await User.findById(targetUserId).populate('role_id');

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    if (!canActorManageTarget(user, targetUser)) {
      return NextResponse.json(
        { success: false, error: 'Action non autorisée sur ce compte' },
        { status: 403 }
      );
    }

    const validation = await validateBody(request, updateUserSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    if (body.role_id) {
      const role = await Role.findById(body.role_id);
      if (!canActorAssignRole(user, role)) {
        return NextResponse.json(
          {
            success: false,
            error: "Seul un administrateur peut attribuer un rôle avec les droits d'administration",
          },
          { status: 403 }
        );
      }
    }

    const oldStatus = targetUser.status;

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { ...body },
      { new: true, runValidators: true }
    ).populate('role_id');

    // If suspended or deactivated, revoke sessions
    if (body.status && body.status !== 'Actif' && oldStatus === 'Actif') {
      await revokeUserSessions(updatedUser._id);
    }

    await logActivity(
      user,
      'modification',
      'utilisateur',
      targetUserId,
      `Modification utilisateur ${updatedUser.nom_complet}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/users/${targetUserId}`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, data: updatedUser });
  },
  { requiredPermissions: ['gererUtilisateurs', 'adminConfig'] }
);

// DELETE /api/users/[id]
export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;

    const targetUserId = params.id;

    // Cannot delete self
    if (targetUserId === user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer son propre compte' },
        { status: 403 }
      );
    }

    const targetUser = await User.findById(targetUserId).populate('role_id');
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    if (!canActorManageTarget(user, targetUser)) {
      return NextResponse.json(
        { success: false, error: 'Action non autorisée sur ce compte' },
        { status: 403 }
      );
    }

    const userName = targetUser.nom_complet;

    // Hard delete or Soft delete depending on your business logic.
    // Usually it is better to soft delete. We'll hard delete here for the example if it was in the monolith.
    await User.findByIdAndDelete(targetUserId);

    await logActivity(
      user,
      'suppression',
      'utilisateur',
      targetUserId,
      `Suppression utilisateur ${userName}`,
      {
        request,
        httpMethod: 'DELETE',
        endpoint: `/users/${targetUserId}`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  },
  { requiredPermissions: ['gererUtilisateurs', 'adminConfig'] }
);
