import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import File from '@/models/File';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  buildAccessibleEntityConditions,
  canAccessProject,
  canAccessProjectOrAssignedWork,
  getAccessibleProjectIds,
  resolveProjectIdForEntity,
} from '@/lib/projectAccess';

const DIRECTORY_MIME = 'application/x-directory';

function buildFolderList(allFiles) {
  const dirs = new Map();
  for (const file of allFiles) {
    if (file.type_mime === DIRECTORY_MIME) {
      const chemin = file.dossier || `/${file.nom}`;
      dirs.set(chemin, {
        _id: file._id,
        nom: file.nom,
        chemin,
        fichiers_count: 0,
      });
    }
  }
  for (const file of allFiles) {
    if (file.type_mime === DIRECTORY_MIME) continue;
    const dossier = file.dossier && file.dossier !== '/' ? file.dossier : null;
    if (!dossier) continue;
    const nom = dossier.split('/').filter(Boolean).pop() || dossier;
    if (!dirs.has(dossier)) {
      dirs.set(dossier, { _id: dossier, nom, chemin: dossier, fichiers_count: 0 });
    }
    dirs.get(dossier).fichiers_count += 1;
  }
  return [...dirs.values()];
}

// GET /api/files
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const entity_type = url.searchParams.get('entity_type');
  const entity_id = url.searchParams.get('entity_id');
  const projet_id = url.searchParams.get('projet_id');
  const folder = url.searchParams.get('folder') || url.searchParams.get('dossier');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (entity_type) filter.entity_type = entity_type;
  if (entity_id) filter.entity_id = entity_id;
  if (projet_id) filter.projet_id = projet_id;
  if (folder) filter.dossier = folder;

  const perms = user.role_id?.permissions || {};
  if (!perms.adminConfig && !perms.voirTousProjets) {
    if (projet_id) {
      if (!(await canAccessProjectOrAssignedWork(user, projet_id))) {
        return APIResponse.forbidden("Vous n'avez pas accès à cette ressource");
      }
    } else if (entity_id) {
      const projectId = await resolveProjectIdForEntity(entity_type, entity_id);
      if (!projectId || !(await canAccessProject(user, projectId))) {
        return APIResponse.forbidden("Vous n'avez pas accès à cette ressource");
      }
    } else {
      const projectIds = await getAccessibleProjectIds(user);
      const accessibleEntityConditions = await buildAccessibleEntityConditions(user, entity_type);
      filter.$or = [{ projet_id: { $in: projectIds } }, ...accessibleEntityConditions];
    }
  }
  const [files, total] = await Promise.all([
    File.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('uploadé_par', 'nom_complet email avatar')
      .lean(),
    File.countDocuments(filter),
  ]);

  const folders = buildFolderList(files);
  const fileItems = files.filter((file) => file.type_mime !== DIRECTORY_MIME);

  return NextResponse.json({
    success: true,
    data: fileItems,
    files: fileItems,
    folders,
    total,
    page,
    limit,
  });
});
