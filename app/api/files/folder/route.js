import { NextResponse } from 'next/server';
import File from '@/models/File';
import { logActivity } from '@/lib/auditService';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import { canUseProjectPermission } from '@/lib/projectAccess';

function sanitizeFolderName(name) {
  return String(name || '')
    .replace(/[\\/]/g, '')
    .replace(/\.\./g, '')
    .trim();
}

export const POST = withApiProtection(
  async (request, context) => {
    const { user } = context;
    const body = await request.json();
    const nom = sanitizeFolderName(body.nom);
    const parent = body.parent || '/';
    const projet_id = body.projet_id;

    if (!nom) {
      return NextResponse.json({ success: false, error: 'Nom du dossier requis' }, { status: 400 });
    }
    if (!projet_id) {
      return NextResponse.json({ success: false, error: 'Projet requis' }, { status: 400 });
    }
    if (!(await canUseProjectPermission(user, projet_id, 'gererFichiers'))) {
      return APIResponse.forbidden();
    }

    const dossier = parent === '/' ? `/${nom}` : `${String(parent).replace(/\/$/, '')}/${nom}`;

    const folder = await File.create({
      nom,
      nom_original: nom,
      taille: 0,
      type_mime: 'application/x-directory',
      type: 'application/x-directory',
      entity_type: 'projet',
      entity_id: projet_id,
      projet_id,
      dossier,
      uploadé_par: user._id,
    });

    await logActivity(user, 'création', 'fichier', folder._id, `Création dossier ${nom}`, {
      request,
      httpMethod: 'POST',
      endpoint: '/files/folder',
      httpStatus: 201,
      relatedProjectId: projet_id,
    });

    return NextResponse.json(
      { success: true, data: { _id: folder._id, nom, chemin: dossier } },
      { status: 201 }
    );
  },
  { requiredPermissions: ['gererFichiers', 'adminConfig'] }
);
