import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/requestAuth';
import { APIResponse, handleError } from '@/lib/apiResponse';
import {
  assignTemporaryPassword,
  sendTemporaryPasswordEmail,
  revokeUserSessions,
} from '@/lib/userSecurity';
import { logActivity } from '@/lib/auditService';
import User from '@/models/User';

// PUT /api/users/[id]/reset-password
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const user = await authenticateRequest(request);

    // Only admins or those with 'gererUtilisateurs' permission
    if (
      !user ||
      (!user.role_id?.permissions?.gererUtilisateurs && !user.role_id?.permissions?.adminConfig)
    ) {
      return APIResponse.forbidden();
    }

    const targetUserId = params.id;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    // Assign new temporary password
    const tempPassword = await assignTemporaryPassword(targetUser, {
      firstLogin: false,
      mustChangePassword: true,
    });

    await targetUser.save();

    // Revoke existing sessions
    await revokeUserSessions(targetUser._id, 'password_reset');

    // Send temporary password via email (non-blocking)
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
  } catch (error) {
    return handleError(error, 'PUT /api/users/[id]/reset-password');
  }
}
