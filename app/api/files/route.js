import { NextResponse } from 'next/server';
import { APIResponse } from '@/lib/apiResponse';
import File from '@/models/File';
import Project from '@/models/Project';
import { withApiProtection } from '@/lib/withApiProtection';

// GET /api/files
export const GET = withApiProtection(async (request, context) => {
  const { user } = context;

  const url = new URL(request.url);
  const entity_type = url.searchParams.get('entity_type');
  const entity_id = url.searchParams.get('entity_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (entity_type) filter.entity_type = entity_type;
  if (entity_id) filter.entity_id = entity_id;

  // Vérification stricte des permissions (RBAC)
  const perms = user.role_id?.permissions || {};
  if (!perms.adminConfig && !perms.voirTousProjets) {
    // Find projects the user has access to
    const userProjects = await Project.find({
      $or: [{ 'membres.user_id': user._id }, { chef_projet: user._id }, { créé_par: user._id }],
    })
      .select('_id')
      .lean();

    const projectIds = userProjects.map((p) => p._id);

    // If a specific entity/project is requested, ensure the user has access to it
    if (entity_type === 'projet' && entity_id) {
      if (!projectIds.some((id) => id.toString() === entity_id.toString())) {
        return APIResponse.forbidden("Vous n'avez pas accès à ce projet");
      }
    }

    // Enforce project_id filter to only show files from accessible projects
    // This works because the File model has projet_id
    filter.projet_id = { $in: projectIds };
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

  return NextResponse.json({ success: true, data: files, total, page, limit });
});
