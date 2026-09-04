import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { logActivity } from '@/lib/auditService';

export const PUT = withApiProtection(async (request, context) => {
  const { user } = context;
  const body = await request.json();

  const update = {};
  if (typeof body.nom_complet === 'string') update.nom_complet = body.nom_complet.trim();
  if (typeof body.telephone === 'string' || typeof body.téléphone === 'string') {
    update.telephone = body.telephone || body.téléphone;
  }
  if (typeof body.poste_titre === 'string' || typeof body.poste === 'string') {
    update.poste_titre = body.poste_titre || body.poste;
  }
  if (typeof body.département_équipe === 'string' || typeof body.département === 'string') {
    update.département_équipe = body.département_équipe || body.département;
  }
  if (body.disponibilité_hebdo != null || body.disponibilité_hebdomadaire != null) {
    update.disponibilité_hebdo = Number(
      body.disponibilité_hebdo ?? body.disponibilité_hebdomadaire
    );
  }
  if (typeof body.fuseau_horaire === 'string') update.fuseau_horaire = body.fuseau_horaire;

  if (update.nom_complet !== undefined && update.nom_complet.length < 3) {
    return NextResponse.json({ success: false, error: 'Nom trop court' }, { status: 422 });
  }

  const updated = await User.findByIdAndUpdate(user._id, update, {
    new: true,
    runValidators: true,
  })
    .select('-password')
    .populate('role_id')
    .lean();

  await logActivity(user, 'modification', 'utilisateur', user._id, 'Mise à jour du profil', {
    request,
    httpMethod: 'PUT',
    endpoint: '/users/profile',
    httpStatus: 200,
  });

  return NextResponse.json({ success: true, data: updated });
});
