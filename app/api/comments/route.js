import { NextResponse } from 'next/server';
import { validateBody } from '@/lib/validate';
import { createCommentSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/auditService';
import { sanitizeHtml } from '@/lib/sanitize';
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/comments
export const GET = withApiProtection(async (request, _context) => {
  const url = new URL(request.url);
  const entity_type = url.searchParams.get('entity_type');
  const entity_id = url.searchParams.get('entity_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (entity_type) filter.entity_type = entity_type;
  if (entity_id) filter.entity_id = entity_id;

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('auteur', 'nom_complet email avatar')
      .populate('parent_id')
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return NextResponse.json({ success: true, data: comments, total, page, limit });
});

// POST /api/comments
export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;

    const validation = await validateBody(request, createCommentSchema);
    if (!validation.success) return validation.response;

    const body = validation.data;

    // Sanitize HTML content to prevent XSS attacks
    if (body.contenu_html) {
      body.contenu_html = sanitizeHtml(body.contenu_html);
    }

    const comment = await Comment.create({
      ...body,
      auteur: user._id,
    });

    await comment.populate('auteur', 'nom_complet email avatar');

    // Handle @mentions notifications
    if (body.mentions?.length) {
      const mentionedUsers = await User.find({ _id: { $in: body.mentions } }).select('_id');
      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser._id.toString() !== user._id.toString()) {
          await Notification.create({
            destinataire: mentionedUser._id,
            expéditeur: user._id,
            type: 'mention_commentaire',
            titre: 'Vous avez été mentionné',
            message: `${user.nom_complet} vous a mentionné dans un commentaire`,
            entity_type: body.entity_type,
            entity_id: body.entity_id,
          }).catch(() => {}); // Non-blocking
        }
      }
    }

    await logActivity(
      user,
      'création',
      'commentaire',
      comment._id,
      `Commentaire sur ${body.entity_type}`,
      {
        request,
        httpMethod: 'POST',
        endpoint: '/comments',
        httpStatus: 201,
      }
    );

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  },
  { requiredPermissions: ['commenter', 'adminConfig'] }
);
