import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { authenticateRequest, serializeAuthenticatedUser } from '@/lib/requestAuth';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  await connectDB();

  const userCount = await User.countDocuments();
  const hasAdmin = userCount > 0;

  let user = null;
  if (hasAdmin) {
    user = await authenticateRequest(request);
  }

  return NextResponse.json({
    hasAdmin,
    needsFirstAdmin: !hasAdmin,
    user: user ? serializeAuthenticatedUser(user) : null,
  });
}
