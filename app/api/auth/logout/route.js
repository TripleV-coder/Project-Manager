import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { authenticateRequest, clearAuthCookies } from '@/lib/requestAuth';
import User from '@/models/User';

export async function POST(request) {
  try {
    await connectDB();
    const user = await authenticateRequest(request).catch(() => null);
    if (user) {
      await User.findByIdAndUpdate(user._id, { currentRefreshJti: null });
    }
  } catch {
    // best-effort logout invalidation
  }

  const response = NextResponse.json({
    message: 'Déconnexion réussie',
    success: true,
  });

  clearAuthCookies(response);
  return response;
}
