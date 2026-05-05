import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { handleError } from '@/lib/apiResponse';
import { getRefreshTokenFromRequest, verifyRefreshToken } from '@/lib/auth/refresh';
import { issueAuthTokens, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { applyRateLimit, handleRateLimitError } from '@/lib/apiMiddleware';
import { RATE_LIMIT_CONFIG } from '@/lib/rateLimit';
import User from '@/models/User';

// POST /api/auth/refresh — rotate access + refresh tokens
export async function POST(request) {
  try {
    await connectDB();

    const rl = applyRateLimit(request, null, RATE_LIMIT_CONFIG.auth);
    if (!rl.allowed) return handleRateLimitError(rl);

    const refreshToken = getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token manquant' },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: 'Refresh token invalide' },
        { status: 401 }
      );
    }

    const user = await User.findById(payload.userId)
      .select('+currentRefreshJti')
      .populate('role_id');

    if (!user || user.status !== 'Actif') {
      return NextResponse.json({ success: false, error: 'Utilisateur invalide' }, { status: 401 });
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return NextResponse.json({ success: false, error: 'Token révoqué' }, { status: 401 });
    }

    if (!user.currentRefreshJti || user.currentRefreshJti !== payload.jti) {
      // Reuse detection: invalidate everything as a safety measure.
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      user.currentRefreshJti = null;
      await user.save();
      return NextResponse.json(
        { success: false, error: 'Refresh token déjà consommé' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: serializeAuthenticatedUser(user),
    });

    await issueAuthTokens(response, user);
    return response;
  } catch (error) {
    return handleError(error, 'POST /api/auth/refresh');
  }
}
