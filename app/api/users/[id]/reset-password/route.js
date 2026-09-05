import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  assignTemporaryPassword,
  sendTemporaryPasswordEmail,
  revokeUserSessions,
} from '@/lib/userSecurity';
import { logActivity } from '@/lib/auditService';
import User from '@/models/User';
import { canActorManageTarget } from '@/lib/userManagement';

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

    const tempPassword = await assignTemporaryPassword(targetUser, {
      firstLogin: false,
      mustChangePassword: true,
    });

    await targetUser.save();
    await revokeUserSessions(targetUser._id, 'password_reset');
    await sendTemporaryPasswordEmail(targetUser, tempPassword);

    await logActivity(
      user,
      'modification',
      'utilisateur',
      targetUserId,
      `Réinitialisation mot de passe pour ${targetUser.nom_complet}`,
      {
        request,
        httpMethod: 'PUT',
        endpoint: `/users/${targetUserId}/reset-password`,
        httpStatus: 200,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        'Mot de passe réinitialisé. Le nouveau mot de passe temporaire a été envoyé par email.',
    });
  },
  { requiredPermissions: ['gererUtilisateurs', 'adminConfig'] }
);
