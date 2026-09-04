require('dotenv').config();
const { MongoClient, ObjectId: _ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const PASSWORD = process.env.E2E_PASSWORD || 'E2eLocal123!';

const ACCOUNTS = {
  admin: { email: 'admin@test.pm', nom_complet: 'Super Admin Test', role: 'Super Administrateur' },
  chef: { email: 'chef@test.pm', nom_complet: 'Chef de Projet E2E', role: 'Chef de Projet' },
  membre: { email: 'membre@test.pm', nom_complet: 'Membre Test', role: 'Membre Équipe' },
  recrue: { email: 'recrue@test.pm', nom_complet: 'Recrue E2E', role: 'Membre Équipe' },
};

const PROJECT_NAME = 'Projet E2E Chef';
const TASK_TITLE = 'Tâche E2E assignée au membre';
const CREATED_TASK_TITLE = 'Tâche E2E créée par le chef';
const SPRINT_NAME = 'Sprint E2E Chef';

const ALL_PERMISSIONS = [
  'voirTousProjets',
  'voirSesProjets',
  'creerProjet',
  'supprimerProjet',
  'modifierCharteProjet',
  'gererMembresProjet',
  'changerRoleMembre',
  'gererTaches',
  'deplacerTaches',
  'prioriserBacklog',
  'gererSprints',
  'modifierBudget',
  'voirBudget',
  'voirTempsPasses',
  'saisirTemps',
  'validerLivrable',
  'gererFichiers',
  'commenter',
  'recevoirNotifications',
  'genererRapports',
  'voirAudit',
  'gererUtilisateurs',
  'adminConfig',
];

const ALL_MENUS = [
  'portfolio',
  'projects',
  'kanban',
  'backlog',
  'sprints',
  'roadmap',
  'tasks',
  'files',
  'comments',
  'timesheets',
  'budget',
  'reports',
  'notifications',
  'admin',
];

const flags = (keys, enabled) =>
  Object.fromEntries(keys.map((key) => [key, enabled.includes(key)]));

const SYSTEM_ROLES = {
  'Super Administrateur': {
    description: 'Accès total au système',
    permissions: flags(ALL_PERMISSIONS, ALL_PERMISSIONS),
    visibleMenus: flags(ALL_MENUS, ALL_MENUS),
  },
  'Chef de Projet': {
    description: 'Gestion complète de ses projets assignés',
    permissions: flags(ALL_PERMISSIONS, [
      'voirSesProjets',
      'creerProjet',
      'modifierCharteProjet',
      'gererMembresProjet',
      'changerRoleMembre',
      'gererTaches',
      'deplacerTaches',
      'prioriserBacklog',
      'gererSprints',
      'modifierBudget',
      'voirBudget',
      'voirTempsPasses',
      'saisirTemps',
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
      'genererRapports',
    ]),
    visibleMenus: flags(
      ALL_MENUS,
      ALL_MENUS.filter((menu) => menu !== 'admin')
    ),
  },
  'Membre Équipe': {
    description: 'Contribution aux tâches et suivi du temps',
    permissions: flags(ALL_PERMISSIONS, [
      'voirSesProjets',
      'deplacerTaches',
      'voirTempsPasses',
      'saisirTemps',
      'gererFichiers',
      'commenter',
      'recevoirNotifications',
    ]),
    visibleMenus: flags(ALL_MENUS, [
      'projects',
      'kanban',
      'backlog',
      'sprints',
      'roadmap',
      'tasks',
      'files',
      'comments',
      'timesheets',
      'notifications',
    ]),
  },
};

async function upsertRole(db, nom, spec) {
  const now = new Date();
  await db.collection('roles').updateOne(
    { nom },
    {
      $set: {
        nom,
        description: spec.description,
        is_custom: false,
        is_predefined: true,
        permissions: spec.permissions,
        visibleMenus: spec.visibleMenus,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  );
  return db.collection('roles').findOne({ nom });
}

async function upsertUser(db, account, roleId, passwordHash) {
  const now = new Date();
  await db.collection('users').updateOne(
    { email: account.email },
    {
      $set: {
        nom_complet: account.nom_complet,
        email: account.email,
        password: passwordHash,
        role_id: roleId,
        status: 'Actif',
        first_login: false,
        must_change_password: false,
        failedLoginAttempts: 0,
        loginAttempts: 0,
        lockUntil: null,
        twoFactorEnabled: false,
        tokenVersion: 0,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  );
  return db.collection('users').findOne({ email: account.email });
}

async function main() {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017/pm_gestion';
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const roleDocs = {};
  for (const [nom, spec] of Object.entries(SYSTEM_ROLES)) {
    roleDocs[nom] = await upsertRole(db, nom, spec);
  }

  const admin = await upsertUser(
    db,
    ACCOUNTS.admin,
    roleDocs['Super Administrateur']._id,
    passwordHash
  );
  const chef = await upsertUser(db, ACCOUNTS.chef, roleDocs['Chef de Projet']._id, passwordHash);
  const membre = await upsertUser(db, ACCOUNTS.membre, roleDocs['Membre Équipe']._id, passwordHash);
  const _recrue = await upsertUser(
    db,
    ACCOUNTS.recrue,
    roleDocs['Membre Équipe']._id,
    passwordHash
  );

  const now = new Date();
  await db.collection('projects').updateOne(
    { nom: PROJECT_NAME },
    {
      $set: {
        nom: PROJECT_NAME,
        description: 'Projet local pour le smoke Playwright chef → membre → tâche',
        statut: 'En cours',
        priorité: 'Haute',
        chef_projet: chef._id,
        créé_par: admin._id,
        archivé: false,
        updated_at: now,
      },
      $setOnInsert: { created_at: now, membres: [] },
    },
    { upsert: true }
  );
  const project = await db.collection('projects').findOne({ nom: PROJECT_NAME });

  await db.collection('projectroles').updateOne(
    { project_id: project._id, nom: 'Membre Équipe' },
    {
      $set: {
        nom: 'Membre Équipe',
        description: 'Tâches personnelles, time tracking et commentaires',
        project_id: project._id,
        is_predefined: true,
        is_custom: false,
        permissions: SYSTEM_ROLES['Membre Équipe'].permissions,
        visibleMenus: SYSTEM_ROLES['Membre Équipe'].visibleMenus,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  );
  const memberProjectRole = await db.collection('projectroles').findOne({
    project_id: project._id,
    nom: 'Membre Équipe',
  });

  await db.collection('projects').updateOne(
    { _id: project._id },
    {
      $set: {
        membres: [
          {
            user_id: membre._id,
            project_role_id: memberProjectRole._id,
            date_ajout: now,
          },
        ],
      },
    }
  );

  await db.collection('tasks').updateOne(
    { titre: TASK_TITLE, projet_id: project._id },
    {
      $set: {
        titre: TASK_TITLE,
        description: 'Vérifie que le membre voit une tâche qui lui est assignée',
        type: 'Tâche',
        statut: 'À faire',
        priorité: 'Haute',
        projet_id: project._id,
        assigné_à: membre._id,
        créé_par: chef._id,
        colonne_kanban: 'todo',
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true }
  );

  await db.collection('tasks').deleteMany({ titre: CREATED_TASK_TITLE, projet_id: project._id });
  await db.collection('sprints').deleteMany({ nom: SPRINT_NAME, projet_id: project._id });
  await db
    .collection('sprints')
    .updateMany(
      { projet_id: project._id, statut: 'Actif' },
      { $set: { statut: 'Planifié', updated_at: now } }
    );

  await client.close();

  console.log('Comptes E2E locaux prêts (mot de passe: ' + PASSWORD + ')');
  console.log('  admin  ' + ACCOUNTS.admin.email);
  console.log('  chef   ' + ACCOUNTS.chef.email);
  console.log('  membre ' + ACCOUNTS.membre.email);
  console.log('  recrue ' + ACCOUNTS.recrue.email + ' (hors projet, à recruter)');
  console.log('Projet: ' + PROJECT_NAME);
  console.log('Tâche : ' + TASK_TITLE);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
