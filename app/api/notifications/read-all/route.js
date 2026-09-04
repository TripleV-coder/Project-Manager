import { NextResponse } from 'next/server';
import { withApiProtection } from '@/lib/withApiProtection';
import Notification from '@/models/Notification';

export const PUT = withApiProtection(async (_request, context) => {
  const { user } = context;

  await Notification.updateMany({ destinataire: user._id, lu: false }, { lu: true });

  return NextResponse.json({
    success: true,
    message: 'Toutes les notifications ont été marquées comme lues',
  });
});
