import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import Notification from '@/models/Notification';
import { withApiProtection } from '@/lib/withApiProtection';

// PUT /api/notifications/[id]
export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const notifId = params.id;
  const notification = await Notification.findById(notifId);

  if (!notification) {
    return NextResponse.json(
      { success: false, error: 'Notification introuvable' },
      { status: 404 }
    );
  }

  if (notification.destinataire.toString() !== user._id.toString()) {
    return APIResponse.forbidden();
  }

  const updated = await Notification.findByIdAndUpdate(notifId, { lu: true }, { new: true });

  return NextResponse.json({ success: true, data: updated });
});

// DELETE /api/notifications/[id]
export const DELETE = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const notifId = params.id;
  const notification = await Notification.findById(notifId);

  if (!notification) {
    return NextResponse.json(
      { success: false, error: 'Notification introuvable' },
      { status: 404 }
    );
  }

  if (notification.destinataire.toString() !== user._id.toString()) {
    return APIResponse.forbidden();
  }

  await Notification.findByIdAndDelete(notifId);

  return NextResponse.json({ success: true, message: 'Notification supprimée' });
});
