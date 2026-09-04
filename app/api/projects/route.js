import { NextResponse } from 'next/server';
import Project from '@/models/Project';
import { getCached, invalidateCache, CACHE_KEYS } from '@/lib/cache';
import { validateBody } from '@/lib/validate';
import { createProjectSchema } from '@/lib/schemas';
import { withApiProtection } from '@/lib/withApiProtection';
import {
  isGlobalProjectReader,
  getProjectIdsWithAssignedWork,
  canSeeBudgets,
  omitProjectBudget,
} from '@/lib/projectAccess';
import { initializeProjectRoles } from '@/lib/projectRoleInit';

// GET - List projects with pagination and caching
export const GET = withApiProtection(async (req, context) => {
  const { user } = context;

  // Pagination params
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20));
  const search = searchParams.get('search') || '';
  const statut = searchParams.get('statut');
  const skip = (page - 1) * limit;

  // Build query
  const query = {};

  // Filter projects based on explicit permissions, not role names
  if (user && !isGlobalProjectReader(user)) {
    const assignedIds = await getProjectIdsWithAssignedWork(user);
    query.$or = [
      { 'membres.user_id': user._id },
      { chef_projet: user._id },
      { product_owner: user._id },
      { créé_par: user._id },
      ...(assignedIds.length ? [{ _id: { $in: assignedIds } }] : []),
    ];
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Filter by status - support both lowercase and proper French values
  const validStatuts = ['Planification', 'En cours', 'En pause', 'Terminé', 'Annulé'];
  const statutMapping = {
    planifie: 'Planification',
    planification: 'Planification',
    en_cours: 'En cours',
    en_pause: 'En pause',
    termine: 'Terminé',
    annule: 'Annulé',
  };
  if (statut) {
    const mappedStatut = statutMapping[statut.toLowerCase()] || statut;
    if (validStatuts.includes(mappedStatut)) {
      query.statut = mappedStatut;
    }
  }

  // Unique cache key
  const cacheKey = `${CACHE_KEYS.PROJECTS_USER(user._id.toString())}:page:${page}:limit:${limit}:search:${search}:statut:${statut || 'all'}`;

  // Get from cache or database
  const result = await getCached(
    cacheKey,
    async () => {
      const [projects, total] = await Promise.all([
        Project.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .populate('chef_projet', 'nom_complet email avatar')
          .populate('membres.user_id', 'nom_complet email avatar')
          .lean(), // Important: use lean() for better performance
        Project.countDocuments(query),
      ]);

      return {
        projects,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      };
    },
    300 // Cache for 5 minutes
  );

  const hideBudgets = !canSeeBudgets(user);
  const projects = hideBudgets
    ? (result.projects || []).map((project) => omitProjectBudget(project))
    : result.projects;

  return NextResponse.json({
    success: true,
    ...result,
    projects,
    data: projects,
  });
});

// POST - Create project with validation
export const POST = withApiProtection(
  async (req, context) => {
    const { user } = context;

    // Validate request body
    const validation = await validateBody(req, createProjectSchema);
    if (!validation.success) return validation.response;

    const validatedData = validation.data;

    // Create project with correct field mapping
    const project = new Project({
      nom: validatedData.nom,
      description: validatedData.description || '',
      template_id: validatedData.template_id,
      priorité: validatedData.priorité,
      statut: validatedData.statut,
      date_début: validatedData.date_début || validatedData.date_debut || null,
      date_fin_prévue: validatedData.date_fin_prévue || validatedData.date_fin || null,
      chef_projet:
        validatedData.chef_de_projet_id ||
        validatedData.chef_projet ||
        validatedData.responsable ||
        user._id,
      product_owner: validatedData.product_owner || null,
      créé_par: user._id,
      contexte: validatedData.contexte,
      objectifs: validatedData.objectifs,
      termes_de_reference: validatedData.termes_de_reference,
      comite_technique: validatedData.comite_technique,
      comite_pilotage: validatedData.comite_pilotage,
      structures_partenaires: validatedData.structures_partenaires,
      champs_dynamiques: validatedData.champs_personnalisés || {},
    });

    await project.save();
    await initializeProjectRoles(project._id);

    // Invalidate cache
    invalidateCache('projects:*');

    return NextResponse.json(project, { status: 201 });
  },
  { requiredPermissions: ['creerProjet', 'adminConfig'] }
);
