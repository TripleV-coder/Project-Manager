import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Project from '@/models/Project';
import { getCached, invalidateCache, CACHE_KEYS } from '@/lib/cache';
import { verifyToken } from '@/lib/auth';
import { validate, projectValidation } from '@/lib/validators';

// GET - List projects with pagination and caching
export async function GET(req) {
  try {
    await connectDB();

    // Extract token from header
    const authHeader = req.headers.get('authorization');
    let decoded = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        decoded = await verifyToken(token);
      } catch (_error) {
        return NextResponse.json(
          { error: 'Invalid token', message: 'Token verification failed' },
          { status: 401 }
        );
      }
    }

    // Pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20));
    const search = searchParams.get('search') || '';
    const statut = searchParams.get('statut');
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Filter projects based on user role and permissions
    if (decoded) {
      // Normaliser le nom du rôle pour la comparaison
      // Supporte: "Super Administrateur", "Administrateur", "super_admin", "admin", etc.
      const roleNormalized = (decoded.role || '').toLowerCase().replace(/\s+/g, '_');
      const isAdmin = roleNormalized.includes('admin') || roleNormalized.includes('super');

      // Si l'utilisateur n'est pas admin, filtrer pour montrer uniquement
      // les projets où il est membre, chef de projet ou créateur
      if (!isAdmin) {
        query.$or = [
          { 'membres.user_id': decoded.userId },
          { chef_projet: decoded.userId },
          { créé_par: decoded.userId }
        ];
      }
      // Les admins (Super Administrateur, Administrateur) voient tous les projets
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by status - support both lowercase and proper French values
    const validStatuts = ['Planification', 'En cours', 'En pause', 'Terminé', 'Annulé'];
    const statutMapping = {
      'planifie': 'Planification',
      'planification': 'Planification',
      'en_cours': 'En cours',
      'en_pause': 'En pause',
      'termine': 'Terminé',
      'annule': 'Annulé'
    };
    if (statut) {
      const mappedStatut = statutMapping[statut.toLowerCase()] || statut;
      if (validStatuts.includes(mappedStatut)) {
        query.statut = mappedStatut;
      }
    }

    // Unique cache key
    const cacheKey = `${CACHE_KEYS.PROJECTS_USER(decoded?.userId || 'public')}:page:${page}:limit:${limit}:search:${search}:statut:${statut || 'all'}`;

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
          Project.countDocuments(query)
        ]);

        return {
          projects,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        };
      },
      300 // Cache for 5 minutes
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error GET /api/projects:', error);
    return NextResponse.json(
      { error: 'Server error', message: error.message },
      { status: 500 }
    );
  }
}

// POST - Create project with validation
export async function POST(req) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = await verifyToken(token);
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Token verification failed' },
        { status: 401 }
      );
    }

    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Validate data with Joi
    let validatedData;
    try {
      validatedData = validate(projectValidation, body);
    } catch (error) {
      console.error('[API] Validation error:', error.errors);
      return NextResponse.json(
        {
          error: 'Validation échouée',
          message: Object.values(error.errors || {}).join(', ') || 'Données invalides',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    // Create project with correct field mapping
    const project = new Project({
      nom: validatedData.nom,
      description: validatedData.description || '',
      template_id: validatedData.template_id,
      date_début: validatedData.date_début || validatedData.date_debut || null,
      date_fin_prévue: validatedData.date_fin_prévue || validatedData.date_fin || null,
      chef_projet: validatedData.responsable || decoded.userId,
      créé_par: decoded.userId
    });

    await project.save();

    // Invalidate cache
    invalidateCache('projects:*');

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/projects:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: error.message },
      { status: 500 }
    );
  }
}
