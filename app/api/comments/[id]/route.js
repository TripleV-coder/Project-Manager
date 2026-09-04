import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { updateCommentSchema } from '@/lib/schemas';
import Comment from '@/models/Comment';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  canAccessProject,
  canUseProjectPermission,
  resolveProjectIdForEntity,
} from '@/lib/projectAccess';

// PUT /api/comments/[id]
export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const comment = await Comment.findById(params.id);
  if (!comment)
    return NextResponse.json({ success: false, error: 'Commentaire introuvable' }, { status: 404 });

  const perms = user.role_id?.permissions || {};
  const isAuthor = comment.auteur?.toString() === user._id.toString();
  const projectId = await resolveProjectIdForEntity(comment.entity_type, comment.entity_id);
  if (!projectId || !(await canAccessProject(user, projectId))) return APIResponse.forbidden();
  if (!isAuthor && !perms.adminConfig) return APIResponse.forbidden();
  if (!perms.adminConfig && !(await canUseProjectPermission(user, projectId, 'commenter'))) {
    return APIResponse.forbidden();
  }

  const validation = await validateBody(request, updateCommentSchema);
  if (!validation.success) return validation.response;

  const updated = await Comment.findByIdAndUpdate(
    params.id,
    { contenu: validation.data.contenu, edited_at: new Date() },
    { new: true }
  ).populate('auteur', 'nom_complet email avatar');

  return NextResponse.json({ success: true, data: updated });
});

// DELETE /api/comments/[id]
export const DELETE = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const comment = await Comment.findById(params.id);
  if (!comment)
    return NextResponse.json({ success: false, error: 'Commentaire introuvable' }, { status: 404 });

  const perms = user.role_id?.permissions || {};
  const isAuthor = comment.auteur?.toString() === user._id.toString();
  const projectId = await resolveProjectIdForEntity(comment.entity_type, comment.entity_id);
  if (!projectId || !(await canAccessProject(user, projectId))) return APIResponse.forbidden();
  if (!isAuthor && !perms.adminConfig) return APIResponse.forbidden();
  if (!perms.adminConfig && !(await canUseProjectPermission(user, projectId, 'commenter'))) {
    return APIResponse.forbidden();
  }

  await Comment.findByIdAndDelete(params.id);
  // Also delete replies
  await Comment.deleteMany({ parent_id: params.id });

  return NextResponse.json({ success: true, message: 'Commentaire supprimé' });
});
