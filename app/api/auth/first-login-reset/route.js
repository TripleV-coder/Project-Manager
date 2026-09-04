import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { handleError } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { firstLoginResetSchema } from '@/lib/requestValidation';
import { verifyPassword, hashPassword, validatePassword } from '@/lib/auth';
import {
  authenticateRequest,
  issueAuthTokens,
  serializeAuthenticatedUser,
} from '@/lib/requestAuth';
import { revokeUserSessions } from '@/lib/userSecurity';
import { logActivity } from '@/lib/auditService';
import { applyRateLimit, handleRateLimitError } from '@/lib/apiMiddleware';
import { RATE_LIMIT_CONFIG } from '@/lib/rateLimit';
import User from '@/models/User';

export async function POST(request) {
  try {
    const rateLimit = await applyRateLimit(request, null, RATE_LIMIT_CONFIG.auth);
    if (!rateLimit.allowed) {
      return handleRateLimitError(rateLimit);
    }

    await connectDB();

    const validation = await validateBody(request, firstLoginResetSchema);
    if (!validation.success) return validation.response;

    const { temporary_password, new_password } = validation.data;

    const passwordCheck = validatePassword(new_password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ success: false, error: passwordCheck.message }, { status: 422 });
    }

    const sessionUser = await authenticateRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = await User.findById(sessionUser._id).select('+password').populate('role_id');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    const mustChange =
      user.must_change_password === true ||
      user.mustChangePassword === true ||
      user.first_login === true;
    if (!mustChange) {
      return NextResponse.json(
        { success: false, error: 'Changement de mot de passe non requis' },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(temporary_password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe temporaire incorrect' },
        { status: 401 }
      );
    }

    await revokeUserSessions(user._id);

    user.password = await hashPassword(new_password);
    user.must_change_password = false;
    user.first_login = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const response = NextResponse.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
      user: serializeAuthenticatedUser(user),
    });

    await issueAuthTokens(response, user);

    await logActivity(
      user,
      'modification',
      'sécurité',
      user._id,
      'Changement mot de passe temporaire',
      {
        request,
        httpMethod: 'POST',
        endpoint: '/auth/first-login-reset',
        httpStatus: 200,
      }
    );

    return response;
  } catch (error) {
    return handleError(error, 'POST /api/auth/first-login-reset');
  }
}
