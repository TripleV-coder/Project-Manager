import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import { handleError } from '@/lib/apiResponse';
import { validateBody } from '@/lib/validate';
import { firstAdminSchema } from '@/lib/requestValidation';
import { hashPassword } from '@/lib/auth';
import { issueAuthTokens } from '@/lib/requestAuth';
import User from '@/models/User';
import Role from '@/models/Role';
import { ensureDefaultProjectTemplates, ensurePredefinedSystemRoles } from '@/lib/systemSeed';

async function claimFirstAdminSlot() {
  try {
    await mongoose.connection.collection('bootstrap_locks').insertOne({
      _id: 'first-admin',
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

async function releaseFirstAdminSlot() {
  await mongoose.connection
    .collection('bootstrap_locks')
    .deleteOne({ _id: 'first-admin' })
    .catch(() => {});
}

// POST /api/auth/first-admin
export async function POST(request) {
  try {
    await connectDB();

    // Check if this is truly the first admin
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Un administrateur existe déjà' },
        { status: 403 }
      );
    }

    const claimed = await claimFirstAdminSlot();
    if (!claimed) {
      return NextResponse.json(
        { success: false, error: 'Un administrateur existe déjà' },
        { status: 403 }
      );
    }

    const validation = await validateBody(request, firstAdminSchema);
    if (!validation.success) {
      await releaseFirstAdminSlot();
      return validation.response;
    }

    const { nom_complet, email, password } = validation.data;

    await ensurePredefinedSystemRoles();

    // Get Super Admin role
    let superAdminRole = await Role.findOne({ nom: 'Super Administrateur' });
    if (!superAdminRole) {
      // Safety net if roles weren't initialized. Full 23/23 permission set so the
      // first admin is never crippled by a partial fallback role.
      superAdminRole = await Role.create({
        nom: 'Super Administrateur',
        description: 'Accès total au système',
        is_predefined: true,
        permissions: {
          voirTousProjets: true,
          voirSesProjets: true,
          creerProjet: true,
          supprimerProjet: true,
          modifierCharteProjet: true,
          gererMembresProjet: true,
          changerRoleMembre: true,
          gererTaches: true,
          deplacerTaches: true,
          prioriserBacklog: true,
          gererSprints: true,
          modifierBudget: true,
          voirBudget: true,
          voirTempsPasses: true,
          saisirTemps: true,
          validerLivrable: true,
          gererFichiers: true,
          commenter: true,
          recevoirNotifications: true,
          genererRapports: true,
          voirAudit: true,
          gererUtilisateurs: true,
          adminConfig: true,
        },
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          backlog: true,
          sprints: true,
          roadmap: true,
          tasks: true,
          files: true,
          comments: true,
          timesheets: true,
          budget: true,
          reports: true,
          notifications: true,
          admin: true,
        },
      });
    }

    const hashedPassword = await hashPassword(password);

    const adminUser = await User.create({
      nom_complet,
      email: email.toLowerCase(),
      password: hashedPassword,
      role_id: superAdminRole._id,
      status: 'Actif',
      must_change_password: false,
      first_login: false,
      tokenVersion: 0,
    });

    await ensureDefaultProjectTemplates(adminUser._id);

    const response = NextResponse.json(
      {
        success: true,
        message: 'Administrateur créé avec succès',
      },
      { status: 201 }
    );

    await issueAuthTokens(response, adminUser);

    return response;
  } catch (error) {
    const existing = await User.countDocuments().catch(() => 1);
    if (existing === 0) {
      await releaseFirstAdminSlot();
    }
    return handleError(error, 'POST /api/auth/first-admin');
  }
}
