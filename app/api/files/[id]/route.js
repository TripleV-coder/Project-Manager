import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import File from '@/models/File';
import { logActivity } from '@/lib/auditService';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');

function resolveStoredPath(file) {
  if (file.path_local) {
    const resolved = path.resolve(file.path_local);
    if (resolved.startsWith(uploadsRoot)) return resolved;
  }
  if (file.url_local?.startsWith('/uploads/')) {
    const resolved = path.resolve(path.join(process.cwd(), 'public', file.url_local));
    if (resolved.startsWith(uploadsRoot)) return resolved;
  }
  return null;
}

export const DELETE = withApiProtection(
  async (request, context) => {
    const { user, params } = context;
    const file = await File.findById(params.id).lean();
    if (!file) {
      return NextResponse.json({ success: false, error: 'Fichier introuvable' }, { status: 404 });
    }

    const projectId = file.projet_id || (file.entity_type === 'projet' ? file.entity_id : null);
    if (!projectId || !(await canUseProjectPermission(user, projectId, 'gererFichiers'))) {
      return APIResponse.forbidden();
    }

    const storedPath = resolveStoredPath(file);
    if (storedPath) {
      await fs.unlink(storedPath).catch(() => {});
    }

    await File.findByIdAndDelete(params.id);

    await logActivity(
      user,
      'suppression',
      'fichier',
      params.id,
      `Suppression fichier ${file.nom}`,
      {
        request,
        httpMethod: 'DELETE',
        endpoint: `/files/${params.id}`,
        httpStatus: 200,
        relatedProjectId: projectId,
      }
    );

    return NextResponse.json({ success: true, message: 'Fichier supprimé' });
  },
  { requiredPermissions: ['gererFichiers', 'adminConfig'] }
);
