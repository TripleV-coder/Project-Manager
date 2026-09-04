import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';

export const POST = withApiProtection(async (request, context) => {
  const { user } = context;
  const { endpoint } = await request.json();

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint manquant' }, { status: 400 });
  }

  await User.findByIdAndUpdate(user._id, {
    $pull: {
      pushSubscriptions: { endpoint },
    },
  });

  return NextResponse.json({ success: true });
});
