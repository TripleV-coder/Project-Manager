import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { handleError } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { loginRequestSchema } from '@/lib/requestValidation';
import { verifyPassword } from '@/lib/auth';
import { createUserAccessToken, issueAuthTokens } from '@/lib/requestAuth';
import { logActivity } from '@/lib/auditService';
import User from '@/models/User';

// POST /api/auth/login
export async function POST(request) {
  try {
    await connectDB();
    const validation = await validateBody(request, loginRequestSchema);
    if (!validation.success) return validation.response;

    const { email, password } = validation.data;

    // Protection par lockout
    const user = await User.findOne({ email: email.toLowerCase() }).populate('role_id');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    if (user.status !== 'Actif') {
      return NextResponse.json(
        { success: false, error: 'Ce compte est inactif ou suspendu' },
        { status: 403 }
      );
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: `Compte temporairement bloqué. Réessayez dans ${Math.ceil((user.lockUntil - Date.now()) / 60000)} minutes.`,
        },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      // Manage failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins
      }
      await user.save();

      return NextResponse.json(
        { success: false, error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    // Success, reset attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    // Check if password reset is required
    if (user.mustChangePassword) {
      return NextResponse.json({
        success: true,
        requirePasswordChange: true,
        message: 'Vous devez changer votre mot de passe',
      });
    }

    // Check if 2FA is required
    if (user.twoFactorEnabled) {
      return NextResponse.json({
        success: true,
        require2FA: true,
        tempToken: await createUserAccessToken(user, '5m'), // Short lived token just for 2FA
      });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        nom_complet: user.nom_complet,
        email: user.email,
        role: user.role_id,
        avatar: user.avatar,
      },
    });

    await issueAuthTokens(response, user);

    await logActivity(user, 'connexion', 'système', user._id, `Connexion réussie`, {
      request,
      httpMethod: 'POST',
      endpoint: '/auth/login',
      httpStatus: 200,
    });

    return response;
  } catch (error) {
    return handleError(error, 'POST /api/auth/login');
  }
}
