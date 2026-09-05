import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';

export const POST = withApiProtection(async (request, context) => {
  const { user } = context;
  const body = await request.json();
  const subscription = body.subscription || body;
  const device = body.device || 'Unknown Device';

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 });
  }

  const userDoc = await User.findById(user._id);
  if (!userDoc) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  const exists = (userDoc.pushSubscriptions || []).some(
    (sub) => sub.endpoint === subscription.endpoint
  );

  if (!exists) {
    userDoc.pushSubscriptions = userDoc.pushSubscriptions || [];
    userDoc.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      device: device || 'Unknown Device',
    });
    await userDoc.save();
  }

  return NextResponse.json({ success: true });
});
