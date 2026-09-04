import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import File from '@/models/File';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canAccessProjectOrAssignedWork } from '@/lib/projectAccess';

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

export const GET = withApiProtection(async (_request, context) => {
  const { user, params } = context;
  const file = await File.findById(params.id).lean();
  if (!file) {
    return NextResponse.json({ success: false, error: 'Fichier introuvable' }, { status: 404 });
  }

  const projectId = file.projet_id || (file.entity_type === 'projet' ? file.entity_id : null);
  if (!projectId || !(await canAccessProjectOrAssignedWork(user, projectId))) {
    return APIResponse.forbidden();
  }

  const storedPath = resolveStoredPath(file);
  if (!storedPath) {
    return NextResponse.json(
      { success: false, error: 'Fichier physique introuvable' },
      { status: 404 }
    );
  }

  const buffer = await fs.readFile(storedPath);
  await File.findByIdAndUpdate(params.id, {
    $inc: { download_count: 1 },
    last_downloaded: new Date(),
  });

  const filename = encodeURIComponent(file.nom_original || file.nom || 'download');
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.type_mime || file.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
