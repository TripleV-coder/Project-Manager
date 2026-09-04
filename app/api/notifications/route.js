import { NextResponse } from 'next/server';
import Notification from '@/models/Notification';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/notifications
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 100);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const skip = (page - 1) * limit;

  const filter = { destinataire: user._id };
  if (unreadOnly) {
    filter.lu = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('expéditeur', 'nom_complet avatar')
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ destinataire: user._id, lu: false }),
  ]);

  return NextResponse.json({
    success: true,
    data: notifications,
    total,
    page,
    limit,
    unreadCount,
  });
});
