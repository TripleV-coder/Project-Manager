import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { hashPassword, verifyPassword, signToken, verifyToken, validatePassword } from '@/lib/auth';
import User from '@/models/User';
import Role from '@/models/Role';
import ProjectTemplate from '@/models/ProjectTemplate';
import Project from '@/models/Project';
import Task from '@/models/Task';
import Sprint from '@/models/Sprint';
import DeliverableType from '@/models/DeliverableType';
import Deliverable from '@/models/Deliverable';
import TimesheetEntry from '@/models/Timesheet';
import Expense from '@/models/Budget';
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import File from '@/models/File';

// ==================== HELPERS ====================

// Helper pour extraire le token JWT et authentifier
async function authenticate(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token);
  
  if (!payload) {
    return null;
  }

  await connectDB();
  const user = await User.findById(payload.userId).populate('role_id');
  return user;
}

// Helper pour créer un log d'audit
async function createAuditLog(utilisateur, action, entity_type, entity_id, description, metadata = {}) {
  try {
    await AuditLog.create({
      utilisateur: utilisateur._id,
      utilisateur_email: utilisateur.email,
      utilisateur_nom: utilisateur.nom_complet,
      action,
      entity_type,
      entity_id,
      description,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erreur création audit log:', error);
  }
}

// Helper pour créer une notification
async function createNotification(destinataire, type, titre, message, entity_type, entity_id, entity_nom, expéditeur = null) {
  try {
    const user = await User.findById(destinataire);
    if (!user) return;

    await Notification.create({
      destinataire,
      type,
      titre,
      message,
      entity_type,
      entity_id,
      entity_nom,
      expéditeur,
      canaux: {
        in_app: user.notifications_préférées?.in_app !== false,
        email: user.notifications_préférées?.email === true,
        push: user.notifications_préférées?.push === true
      }
    });
  } catch (error) {
    console.error('Erreur création notification:', error);
  }
}

// CORS Helper
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

// Initialiser les rôles prédéfinis (8 rôles complets)
async function initializeRoles() {
  const roles = [
    {
      nom: 'Administrateur',
      description: 'Accès complet et configuration système',
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
        adminConfig: true
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
        admin: true
      }
    },
    {
      nom: 'Chef de Projet',
      description: 'Gestion projets assignés, équipes et budget',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: true,
        supprimerProjet: false,
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
        validerLivrable: false,
        gererFichiers: true,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: true,
        voirAudit: false,
        adminConfig: false
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
        admin: false
      }
    },
    {
      nom: 'Responsable Équipe',
      description: 'Gestion équipe et reporting',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: false,
        gererMembresProjet: false,
        changerRoleMembre: false,
        gererTaches: true,
        deplacerTaches: true,
        prioriserBacklog: true,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: true,
        voirTempsPasses: true,
        saisirTemps: true,
        validerLivrable: false,
        gererFichiers: true,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: true,
        voirAudit: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: false,
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
        admin: false
      }
    },
    {
      nom: 'Product Owner',
      description: 'Backlog, prioritisation et validation livrables',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: false,
        gererMembresProjet: false,
        changerRoleMembre: false,
        gererTaches: true,
        deplacerTaches: true,
        prioriserBacklog: true,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: true,
        voirTempsPasses: false,
        saisirTemps: false,
        validerLivrable: true,
        gererFichiers: true,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: false,
        voirAudit: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: false,
        projects: true,
        kanban: true,
        backlog: true,
        sprints: false,
        roadmap: true,
        tasks: true,
        files: true,
        comments: true,
        timesheets: false,
        budget: false,
        reports: false,
        notifications: true,
        admin: false
      }
    },
    {
      nom: 'Membre Équipe',
      description: 'Tâches personnelles et time tracking',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: false,
        gererMembresProjet: false,
        changerRoleMembre: false,
        gererTaches: false,
        deplacerTaches: true,
        prioriserBacklog: false,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: false,
        voirTempsPasses: false,
        saisirTemps: true,
        validerLivrable: false,
        gererFichiers: true,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: false,
        voirAudit: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: false,
        projects: true,
        kanban: true,
        backlog: false,
        sprints: false,
        roadmap: false,
        tasks: true,
        files: true,
        comments: true,
        timesheets: true,
        budget: false,
        reports: false,
        notifications: true,
        admin: false
      }
    },
    {
      nom: 'Partie Prenante',
      description: 'Lecture seule projets partagés et commentaires',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: false,
        gererMembresProjet: false,
        changerRoleMembre: false,
        gererTaches: false,
        deplacerTaches: false,
        prioriserBacklog: false,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: false,
        voirTempsPasses: false,
        saisirTemps: false,
        validerLivrable: false,
        gererFichiers: false,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: false,
        voirAudit: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: false,
        projects: true,
        kanban: true,
        backlog: false,
        sprints: false,
        roadmap: true,
        tasks: false,
        files: true,
        comments: true,
        timesheets: false,
        budget: false,
        reports: false,
        notifications: true,
        admin: false
      }
    },
    {
      nom: 'Observateur',
      description: 'Lecture seule limitée',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: false,
        gererMembresProjet: false,
        changerRoleMembre: false,
        gererTaches: false,
        deplacerTaches: false,
        prioriserBacklog: false,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: false,
        voirTempsPasses: false,
        saisirTemps: false,
        validerLivrable: false,
        gererFichiers: false,
        commenter: false,
        recevoirNotifications: true,
        genererRapports: false,
        voirAudit: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: false,
        projects: true,
        kanban: false,
        backlog: false,
        sprints: false,
        roadmap: false,
        tasks: false,
        files: false,
        comments: false,
        timesheets: false,
        budget: false,
        reports: false,
        notifications: true,
        admin: false
      }
    },
    {
      nom: 'Invité',
      description: 'Accès temporaire par lien',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: false,
        gererMembresProjet: false,
        changerRoleMembre: false,
        gererTaches: false,
        deplacerTaches: false,
        prioriserBacklog: false,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: false,
        voirTempsPasses: false,
        saisirTemps: false,
        validerLivrable: false,
        gererFichiers: false,
        commenter: false,
        recevoirNotifications: false,
        genererRapports: false,
        voirAudit: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: false,
        projects: true,
        kanban: false,
        backlog: false,
        sprints: false,
        roadmap: false,
        tasks: false,
        files: true,
        comments: false,
        timesheets: false,
        budget: false,
        reports: false,
        notifications: false,
        admin: false
      }
    }
  ];

  for (const roleData of roles) {
    const existing = await Role.findOne({ nom: roleData.nom });
    if (!existing) {
      await Role.create(roleData);
      console.log(`✅ Rôle créé: ${roleData.nom}`);
    }
  }
}

// ==================== GET ROUTES ====================

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');

    await connectDB();

    // GET /api ou /api/check - Vérifier si premier admin existe
    if (path === '' || path === '/' || path === '/check' || path === '/check/') {
      const userCount = await User.countDocuments();
      return handleCORS(NextResponse.json({ 
        message: 'PM - Gestion de Projets API',
        hasAdmin: userCount > 0,
        needsFirstAdmin: userCount === 0
      }));
    }

    // GET /api/auth/me - Profil utilisateur courant
    if (path === '/auth/me' || path === '/auth/me/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      return handleCORS(NextResponse.json({
        id: user._id,
        nom_complet: user.nom_complet,
        email: user.email,
        role: user.role_id,
        avatar: user.avatar,
        poste_titre: user.poste_titre,
        département_équipe: user.département_équipe,
        compétences: user.compétences,
        status: user.status,
        first_login: user.first_login
      }));
    }

    // GET /api/users - Liste utilisateurs (admin uniquement)
    if (path === '/users' || path === '/users/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.admin_config) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const users = await User.find({ status: 'Actif' })
        .populate('role_id')
        .select('-password -password_history')
        .sort({ created_at: -1 });

      return handleCORS(NextResponse.json({ users }));
    }

    // GET /api/roles - Liste rôles
    if (path === '/roles' || path === '/roles/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const roles = await Role.find().sort({ is_predefined: -1, nom: 1 });
      return handleCORS(NextResponse.json({ roles }));
    }

    // GET /api/projects - Liste projets
    if (path === '/projects' || path === '/projects/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      let query = { archivé: false };
      
      if (!user.role_id?.permissions?.voir_tous_projets) {
        query.$or = [
          { chef_projet: user._id },
          { product_owner: user._id },
          { 'membres.user_id': user._id }
        ];
      }

      const projects = await Project.find(query)
        .populate('chef_projet', 'nom_complet email avatar')
        .populate('product_owner', 'nom_complet email avatar')
        .populate('template_id', 'nom')
        .sort({ created_at: -1 });

      return handleCORS(NextResponse.json({ projects }));
    }

    // GET /api/projects/:id - Détails projet
    if (path.match(/^\/projects\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId)
        .populate('chef_projet', 'nom_complet email avatar')
        .populate('product_owner', 'nom_complet email avatar')
        .populate('membres.user_id', 'nom_complet email avatar')
        .populate('template_id');

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({ project }));
    }

    // GET /api/project-templates - Liste templates projets
    if (path === '/project-templates' || path === '/project-templates/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const templates = await ProjectTemplate.find()
        .populate('créé_par', 'nom_complet email')
        .sort({ utilisé_count: -1, nom: 1 });

      return handleCORS(NextResponse.json({ templates }));
    }

    // GET /api/tasks - Liste tâches avec filtres
    if (path === '/tasks' || path === '/tasks/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projetId = url.searchParams.get('projet_id');
      const sprintId = url.searchParams.get('sprint_id');
      const assignéÀ = url.searchParams.get('assigné_à');
      const statut = url.searchParams.get('statut');

      let query = {};
      if (projetId) query.projet_id = projetId;
      if (sprintId) query.sprint_id = sprintId;
      if (assignéÀ) query.assigné_à = assignéÀ;
      if (statut) query.statut = statut;

      const tasks = await Task.find(query)
        .populate('assigné_à', 'nom_complet email avatar')
        .populate('créé_par', 'nom_complet email')
        .populate('epic_id', 'titre')
        .sort({ ordre_priorité: 1, created_at: -1 });

      return handleCORS(NextResponse.json({ tasks }));
    }

    // GET /api/notifications - Liste notifications utilisateur
    if (path === '/notifications' || path === '/notifications/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const notifications = await Notification.find({ 
        destinataire: user._id,
        archivé: false
      })
        .populate('expéditeur', 'nom_complet avatar')
        .sort({ created_at: -1 })
        .limit(50);

      const unreadCount = await Notification.countDocuments({
        destinataire: user._id,
        lu: false,
        archivé: false
      });

      return handleCORS(NextResponse.json({ notifications, unreadCount }));
    }

    return handleCORS(NextResponse.json({ 
      message: 'API PM - Gestion de Projets',
      path: path
    }));

  } catch (error) {
    console.error('Erreur API GET:', error);
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}


// ==================== POST ROUTES ====================

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    
    await connectDB();
    
    // Lire le body seulement si nécessaire
    let body = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await request.json();
      }
    } catch (e) {
      // Pas de body, c'est OK pour certaines routes
    }

    // POST /api/auth/first-admin - Création premier administrateur
    if (path === '/auth/first-admin' || path === '/auth/first-admin/') {
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        return handleCORS(NextResponse.json({ 
          error: 'Le premier administrateur a déjà été créé' 
        }, { status: 400 }));
      }

      const { nom_complet, email, password, password_confirm } = body;
      
      if (!nom_complet || !email || !password || !password_confirm) {
        return handleCORS(NextResponse.json({ 
          error: 'Tous les champs sont requis' 
        }, { status: 400 }));
      }

      if (password !== password_confirm) {
        return handleCORS(NextResponse.json({ 
          error: 'Les mots de passe ne correspondent pas' 
        }, { status: 400 }));
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return handleCORS(NextResponse.json({ 
          error: passwordValidation.message 
        }, { status: 400 }));
      }

      await initializeRoles();

      const adminRole = await Role.findOne({ nom: 'Admin' });
      if (!adminRole) {
        return handleCORS(NextResponse.json({ 
          error: 'Erreur d\'initialisation des rôles' 
        }, { status: 500 }));
      }

      const hashedPassword = await hashPassword(password);
      const user = await User.create({
        nom_complet,
        email: email.toLowerCase(),
        password: hashedPassword,
        role_id: adminRole._id,
        status: 'Actif',
        first_login: false,
        must_change_password: false,
        password_history: [{ hash: hashedPassword, date: new Date() }]
      });

      await createAuditLog(user, 'création', 'utilisateur', user._id, 'Création du premier administrateur');

      return handleCORS(NextResponse.json({
        message: 'Premier administrateur créé avec succès',
        success: true
      }));
    }

    // POST /api/auth/login - Connexion
    if (path === '/auth/login' || path === '/auth/login/') {
      const { email, password } = body;

      if (!email || !password) {
        return handleCORS(NextResponse.json({ 
          error: 'Email et mot de passe requis' 
        }, { status: 400 }));
      }

      const user = await User.findOne({ email: email.toLowerCase() }).populate('role_id');
      
      if (!user) {
        return handleCORS(NextResponse.json({ 
          error: 'Email ou mot de passe incorrect' 
        }, { status: 401 }));
      }

      if (user.status !== 'Actif') {
        return handleCORS(NextResponse.json({ 
          error: 'Compte désactivé' 
        }, { status: 403 }));
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return handleCORS(NextResponse.json({ 
          error: 'Email ou mot de passe incorrect' 
        }, { status: 401 }));
      }

      const token = await signToken({ 
        userId: user._id.toString(),
        email: user.email,
        role: user.role_id.nom
      });

      user.dernière_connexion = new Date();
      await user.save();

      await createAuditLog(user, 'connexion', 'utilisateur', user._id, 'Connexion réussie');

      return handleCORS(NextResponse.json({
        token,
        user: {
          id: user._id,
          nom_complet: user.nom_complet,
          email: user.email,
          role: user.role_id,
          avatar: user.avatar,
          first_login: user.first_login,
          must_change_password: user.must_change_password
        }
      }));
    }

    // POST /api/auth/first-login-reset - Reset obligatoire premier login
    if (path === '/auth/first-login-reset' || path === '/auth/first-login-reset/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const { temporary_password, new_password, new_password_confirm } = body;

      if (!temporary_password || !new_password || !new_password_confirm) {
        return handleCORS(NextResponse.json({ 
          error: 'Tous les champs sont requis' 
        }, { status: 400 }));
      }

      const isValidTemp = await verifyPassword(temporary_password, user.password);
      if (!isValidTemp) {
        return handleCORS(NextResponse.json({ 
          error: 'Mot de passe temporaire incorrect' 
        }, { status: 401 }));
      }

      if (new_password !== new_password_confirm) {
        return handleCORS(NextResponse.json({ 
          error: 'Les mots de passe ne correspondent pas' 
        }, { status: 400 }));
      }

      const passwordValidation = validatePassword(new_password);
      if (!passwordValidation.valid) {
        return handleCORS(NextResponse.json({ 
          error: passwordValidation.message 
        }, { status: 400 }));
      }

      if (user.password_history && user.password_history.length > 0) {
        for (const oldHash of user.password_history.slice(0, 5)) {
          const isOldPassword = await verifyPassword(new_password, oldHash.hash);
          if (isOldPassword) {
            return handleCORS(NextResponse.json({ 
              error: 'Ce mot de passe a déjà été utilisé récemment' 
            }, { status: 400 }));
          }
        }
      }

      const hashedPassword = await hashPassword(new_password);
      user.password = hashedPassword;
      user.first_login = false;
      user.must_change_password = false;
      user.password_history = [
        { hash: hashedPassword, date: new Date() },
        ...(user.password_history || []).slice(0, 4)
      ];
      await user.save();

      await createAuditLog(user, 'modification', 'utilisateur', user._id, 'Reset mot de passe premier login');

      return handleCORS(NextResponse.json({
        message: 'Mot de passe modifié avec succès',
        success: true
      }));
    }

    // POST /api/users - Créer utilisateur (admin uniquement)
    if (path === '/users' || path === '/users/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.admin_config) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom_complet, email, role_id, status = 'Actif' } = body;

      if (!nom_complet || !email || !role_id) {
        return handleCORS(NextResponse.json({ 
          error: 'Tous les champs sont requis' 
        }, { status: 400 }));
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return handleCORS(NextResponse.json({ 
          error: 'Un utilisateur avec cet email existe déjà' 
        }, { status: 400 }));
      }

      const defaultPassword = '00000000';
      const hashedPassword = await hashPassword(defaultPassword);
      
      const newUser = await User.create({
        nom_complet,
        email: email.toLowerCase(),
        password: hashedPassword,
        role_id,
        status,
        first_login: true,
        must_change_password: true,
        password_history: [{ hash: hashedPassword, date: new Date() }]
      });

      await createAuditLog(user, 'création', 'utilisateur', newUser._id, `Création utilisateur ${nom_complet}`);

      await createNotification(
        newUser._id,
        'autre',
        'Bienvenue sur PM - Gestion de Projets',
        'Votre compte a été créé. Utilisez le mot de passe temporaire 00000000 pour vous connecter.',
        'utilisateur',
        newUser._id,
        nom_complet,
        user._id
      );

      return handleCORS(NextResponse.json({
        message: 'Utilisateur créé avec succès',
        user: {
          id: newUser._id,
          nom_complet: newUser.nom_complet,
          email: newUser.email,
          role_id: newUser.role_id,
          status: newUser.status
        }
      }));
    }

    // POST /api/projects - Créer projet
    if (path === '/projects' || path === '/projects/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.créer_projet) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { 
        nom, 
        description, 
        template_id, 
        champs_dynamiques = {},
        date_début,
        date_fin_prévue,
        product_owner,
        membres = []
      } = body;

      if (!nom || !template_id) {
        return handleCORS(NextResponse.json({ 
          error: 'Nom et template requis' 
        }, { status: 400 }));
      }

      const project = await Project.create({
        nom,
        description,
        template_id,
        champs_dynamiques,
        chef_projet: user._id,
        product_owner,
        membres: membres.map(m => ({ user_id: m, rôle_projet: 'Membre', date_ajout: new Date() })),
        date_début,
        date_fin_prévue,
        créé_par: user._id,
        colonnes_kanban: [
          { id: 'backlog', nom: 'Backlog', couleur: '#94a3b8', ordre: 0 },
          { id: 'todo', nom: 'À faire', couleur: '#60a5fa', ordre: 1 },
          { id: 'in_progress', nom: 'En cours', couleur: '#f59e0b', ordre: 2 },
          { id: 'review', nom: 'Review', couleur: '#8b5cf6', ordre: 3 },
          { id: 'done', nom: 'Terminé', couleur: '#10b981', ordre: 4 }
        ]
      });

      await ProjectTemplate.findByIdAndUpdate(template_id, {
        $inc: { utilisé_count: 1 }
      });

      await createAuditLog(user, 'création', 'projet', project._id, `Création projet ${nom}`);

      for (const membre of membres) {
        await createNotification(
          membre,
          'ajout_projet',
          'Ajouté à un nouveau projet',
          `Vous avez été ajouté au projet ${nom}`,
          'projet',
          project._id,
          nom,
          user._id
        );
      }

      return handleCORS(NextResponse.json({
        message: 'Projet créé avec succès',
        project
      }));
    }

    // POST /api/tasks - Créer tâche
    if (path === '/tasks' || path === '/tasks/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gérer_tâches) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { 
        projet_id,
        titre,
        description,
        type = 'Tâche',
        parent_id,
        epic_id,
        statut = 'Backlog',
        priorité = 'Moyenne',
        assigné_à,
        story_points,
        estimation_heures,
        sprint_id,
        labels = [],
        tags = [],
        date_échéance
      } = body;

      if (!projet_id || !titre) {
        return handleCORS(NextResponse.json({ 
          error: 'Projet et titre requis' 
        }, { status: 400 }));
      }

      const task = await Task.create({
        projet_id,
        titre,
        description,
        type,
        parent_id,
        epic_id,
        statut,
        colonne_kanban: statut.toLowerCase().replace(' ', '_'),
        priorité,
        assigné_à,
        story_points,
        estimation_heures,
        sprint_id,
        labels,
        tags,
        date_échéance,
        créé_par: user._id
      });

      await Project.findByIdAndUpdate(projet_id, {
        $inc: { 'stats.total_tâches': 1 }
      });

      await createAuditLog(user, 'création', 'tâche', task._id, `Création tâche ${titre}`);

      if (assigné_à && assigné_à.toString() !== user._id.toString()) {
        await createNotification(
          assigné_à,
          'assignation_tâche',
          'Nouvelle tâche assignée',
          `La tâche "${titre}" vous a été assignée`,
          'tâche',
          task._id,
          titre,
          user._id
        );
      }

      return handleCORS(NextResponse.json({
        message: 'Tâche créée avec succès',
        task
      }));
    }

    // POST /api/project-templates - Créer template
    if (path === '/project-templates' || path === '/project-templates/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.admin_config) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, description, catégorie, champs = [] } = body;

      if (!nom) {
        return handleCORS(NextResponse.json({ 
          error: 'Nom requis' 
        }, { status: 400 }));
      }

      const template = await ProjectTemplate.create({
        nom,
        description,
        catégorie,
        champs,
        créé_par: user._id
      });

      await createAuditLog(user, 'création', 'template', template._id, `Création template ${nom}`);

      return handleCORS(NextResponse.json({
        message: 'Template créé avec succès',
        template
      }));
    }

    // POST /api/roles - Créer rôle personnalisé
    if (path === '/roles' || path === '/roles/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.admin_config) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, description, permissions, visible_menus } = body;

      if (!nom) {
        return handleCORS(NextResponse.json({ 
          error: 'Nom requis' 
        }, { status: 400 }));
      }

      // Vérifier si le nom existe déjà
      const existing = await Role.findOne({ nom });
      if (existing) {
        return handleCORS(NextResponse.json({ 
          error: 'Un rôle avec ce nom existe déjà' 
        }, { status: 400 }));
      }

      const role = await Role.create({
        nom,
        description,
        is_custom: true,
        is_predefined: false,
        permissions: permissions || {},
        visible_menus: visible_menus || {}
      });

      await createAuditLog(user, 'création', 'role', role._id, `Création rôle personnalisé ${nom}`);

      return handleCORS(NextResponse.json({
        message: 'Rôle créé avec succès',
        role
      }));
    }

    // POST /api/sprints - Créer sprint
    if (path === '/sprints' || path === '/sprints/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gérer_sprints) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { projet_id, nom, objectif, date_début, date_fin, capacité_équipe } = body;

      if (!projet_id || !nom || !date_début || !date_fin) {
        return handleCORS(NextResponse.json({ 
          error: 'Champs requis manquants' 
        }, { status: 400 }));
      }

      const sprint = await Sprint.create({
        projet_id,
        nom,
        objectif,
        date_début,
        date_fin,
        capacité_équipe: capacité_équipe || 0,
        statut: 'Planifié'
      });

      await createAuditLog(user, 'création', 'sprint', sprint._id, `Création sprint ${nom}`);

      return handleCORS(NextResponse.json({
        message: 'Sprint créé avec succès',
        sprint
      }));
    }

    // POST /api/timesheets - Créer entrée timesheet
    if (path === '/timesheets' || path === '/timesheets/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.saisir_temps) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { projet_id, task_id, date, heures, description, type_saisie } = body;

      if (!projet_id || !date || !heures) {
        return handleCORS(NextResponse.json({ 
          error: 'Champs requis manquants' 
        }, { status: 400 }));
      }

      const timesheet = await TimesheetEntry.create({
        utilisateur: user._id,
        projet_id,
        task_id,
        date,
        heures,
        description,
        type_saisie: type_saisie || 'manuelle',
        statut: 'brouillon'
      });

      await createAuditLog(user, 'création', 'timesheet', timesheet._id, `Saisie temps ${heures}h`);

      return handleCORS(NextResponse.json({
        message: 'Temps enregistré avec succès',
        timesheet
      }));
    }

    // POST /api/expenses - Créer dépense
    if (path === '/expenses' || path === '/expenses/') {
      const user = await authenticate(request);
      
      const { projet_id, catégorie, description, montant, date_dépense, type, fournisseur } = body;

      if (!projet_id || !catégorie || !description || !montant || !date_dépense) {
        return handleCORS(NextResponse.json({ 
          error: 'Champs requis manquants' 
        }, { status: 400 }));
      }

      const expense = await Expense.create({
        projet_id,
        catégorie,
        description,
        montant,
        date_dépense,
        type: type || 'externe',
        fournisseur,
        statut: 'en_attente',
        saisi_par: user._id
      });

      await createAuditLog(user, 'création', 'expense', expense._id, `Création dépense ${montant}€`);

      return handleCORS(NextResponse.json({
        message: 'Dépense créée avec succès',
        expense
      }));
    }

    // POST /api/comments - Créer commentaire
    if (path === '/comments' || path === '/comments/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.commenter) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { entity_type, entity_id, contenu, parent_id, mentions } = body;

      if (!entity_type || !entity_id || !contenu) {
        return handleCORS(NextResponse.json({ 
          error: 'Champs requis manquants' 
        }, { status: 400 }));
      }

      const comment = await Comment.create({
        entity_type,
        entity_id,
        contenu,
        parent_id,
        mentions: mentions || [],
        auteur: user._id,
        niveau: parent_id ? 1 : 0
      });

      // Créer notifications pour les mentions
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await createNotification(
            mentionedUserId,
            'mention',
            'Vous avez été mentionné',
            `${user.nom_complet} vous a mentionné dans un commentaire`,
            entity_type,
            entity_id,
            '',
            user._id
          );
        }
      }

      await createAuditLog(user, 'création', 'comment', comment._id, 'Nouveau commentaire');

      return handleCORS(NextResponse.json({
        message: 'Commentaire créé avec succès',
        comment
      }));
    }

    // POST /api/deliverables - Créer livrable
    if (path === '/deliverables' || path === '/deliverables/') {
      const user = await authenticate(request);
      
      const { projet_id, type_id, nom, description, assigné_à, date_échéance } = body;

      if (!projet_id || !type_id || !nom) {
        return handleCORS(NextResponse.json({ 
          error: 'Champs requis manquants' 
        }, { status: 400 }));
      }

      const deliverable = await Deliverable.create({
        projet_id,
        type_id,
        nom,
        description,
        assigné_à,
        date_échéance,
        statut_global: 'À produire',
        créé_par: user._id
      });

      await createAuditLog(user, 'création', 'deliverable', deliverable._id, `Création livrable ${nom}`);

      return handleCORS(NextResponse.json({
        message: 'Livrable créé avec succès',
        deliverable
      }));
    }

    // POST /api/init-default-template - Créer template par défaut (pour faciliter le démarrage)
    if (path === '/init-default-template' || path === '/init-default-template/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.admin_config) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Vérifier si template existe déjà
      const existing = await ProjectTemplate.findOne({ nom: 'Projet Standard' });
      if (existing) {
        return handleCORS(NextResponse.json({ 
          message: 'Template par défaut existe déjà',
          template: existing
        }));
      }

      // Créer template par défaut
      const template = await ProjectTemplate.create({
        nom: 'Projet Standard',
        description: 'Template de projet standard avec champs de base',
        catégorie: 'Général',
        champs: [
          {
            id: 'client',
            type: 'texte',
            label: 'Nom du client',
            required: false,
            properties: { variant: 'court', longueur_max: 100 }
          },
          {
            id: 'budget',
            type: 'nombre',
            label: 'Budget estimé',
            required: false,
            properties: { format: 'monétaire', unité: '€' }
          },
          {
            id: 'objectifs',
            type: 'texte',
            label: 'Objectifs du projet',
            required: false,
            properties: { variant: 'long' }
          }
        ],
        créé_par: user._id
      });

      await createAuditLog(user, 'création', 'template', template._id, 'Création template par défaut');

      return handleCORS(NextResponse.json({
        message: 'Template par défaut créé avec succès',
        template
      }));
    }

    return handleCORS(NextResponse.json({ 
      message: 'Endpoint POST non trouvé',
      path: path
    }, { status: 404 }));

  } catch (error) {
    console.error('Erreur API POST:', error);
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

// ==================== PUT ROUTES ====================

export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const body = await request.json();

    await connectDB();

    const user = await authenticate(request);
    if (!user) {
      return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
    }

    // PUT /api/tasks/:id/move - Déplacer tâche (Kanban)
    if (path.match(/^\/tasks\/[^/]+\/move\/?$/)) {
      if (!user.role_id?.permissions?.déplacer_tâches) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const taskId = path.split('/')[2];
      const { nouvelle_colonne, nouveau_statut, nouvel_ordre } = body;

      const task = await Task.findById(taskId);
      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 }));
      }

      task.colonne_kanban = nouvelle_colonne;
      if (nouveau_statut) task.statut = nouveau_statut;
      if (nouvel_ordre !== undefined) task.ordre_priorité = nouvel_ordre;
      
      if (nouveau_statut === 'Terminé' && !task.date_complétion) {
        task.date_complétion = new Date();
        await Project.findByIdAndUpdate(task.projet_id, {
          $inc: { 'stats.tâches_terminées': 1 }
        });
      }

      await task.save();

      await createAuditLog(user, 'modification', 'tâche', task._id, `Déplacement tâche vers ${nouveau_statut || nouvelle_colonne}`);

      return handleCORS(NextResponse.json({
        message: 'Tâche déplacée avec succès',
        task
      }));
    }

    // PUT /api/notifications/:id/read - Marquer notification comme lue
    if (path.match(/^\/notifications\/[^/]+\/read\/?$/)) {
      const notificationId = path.split('/')[2];

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, destinataire: user._id },
        { lu: true, date_lecture: new Date() },
        { new: true }
      );

      if (!notification) {
        return handleCORS(NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({
        message: 'Notification marquée comme lue',
        notification
      }));
    }

    // PUT /api/notifications/read-all - Marquer toutes notifications comme lues
    if (path === '/notifications/read-all' || path === '/notifications/read-all/') {
      await Notification.updateMany(
        { destinataire: user._id, lu: false },
        { lu: true, date_lecture: new Date() }
      );

      return handleCORS(NextResponse.json({
        message: 'Toutes les notifications ont été marquées comme lues'
      }));
    }

    // PUT /api/roles/:id - Modifier rôle personnalisé
    if (path.match(/^\/roles\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.admin_config) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const roleId = path.split('/')[2];
      const { nom, description, permissions, visible_menus } = body;

      const role = await Role.findById(roleId);
      if (!role) {
        return handleCORS(NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 }));
      }

      if (role.is_predefined) {
        return handleCORS(NextResponse.json({ 
          error: 'Les rôles prédéfinis ne peuvent pas être modifiés' 
        }, { status: 400 }));
      }

      if (nom) role.nom = nom;
      if (description !== undefined) role.description = description;
      if (permissions) role.permissions = permissions;
      if (visible_menus) role.visible_menus = visible_menus;

      await role.save();

      await createAuditLog(user, 'modification', 'role', role._id, `Modification rôle ${role.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Rôle modifié avec succès',
        role
      }));
    }

    // PUT /api/projects/:id - Modifier projet
    if (path.match(/^\/projects\/[^/]+\/?$/)) {
      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Mise à jour des champs
      Object.keys(body).forEach(key => {
        if (body[key] !== undefined && key !== '_id') {
          project[key] = body[key];
        }
      });

      await project.save();
      await createAuditLog(user, 'modification', 'projet', project._id, `Modification projet ${project.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Projet modifié avec succès',
        project
      }));
    }

    // PUT /api/tasks/:id - Modifier tâche
    if (path.match(/^\/tasks\/[^/]+\/?$/) && !path.includes('/move')) {
      const taskId = path.split('/')[2];
      const task = await Task.findById(taskId);

      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 }));
      }

      Object.keys(body).forEach(key => {
        if (body[key] !== undefined && key !== '_id') {
          task[key] = body[key];
        }
      });

      await task.save();
      await createAuditLog(user, 'modification', 'tâche', task._id, `Modification tâche ${task.titre}`);

      return handleCORS(NextResponse.json({
        message: 'Tâche modifiée avec succès',
        task
      }));
    }

    // PUT /api/sprints/:id - Modifier sprint
    if (path.match(/^\/sprints\/[^/]+\/?$/) && !path.includes('/start') && !path.includes('/complete')) {
      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId);

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      Object.keys(body).forEach(key => {
        if (body[key] !== undefined && key !== '_id') {
          sprint[key] = body[key];
        }
      });

      await sprint.save();
      await createAuditLog(user, 'modification', 'sprint', sprint._id, `Modification sprint ${sprint.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Sprint modifié avec succès',
        sprint
      }));
    }

    // PUT /api/timesheets/:id - Modifier timesheet
    if (path.match(/^\/timesheets\/[^/]+\/?$/) && !path.includes('/submit') && !path.includes('/validate')) {
      const timesheetId = path.split('/')[2];
      const timesheet = await TimesheetEntry.findById(timesheetId);

      if (!timesheet) {
        return handleCORS(NextResponse.json({ error: 'Timesheet non trouvé' }, { status: 404 }));
      }

      Object.keys(body).forEach(key => {
        if (body[key] !== undefined && key !== '_id') {
          timesheet[key] = body[key];
        }
      });

      await timesheet.save();

      return handleCORS(NextResponse.json({
        message: 'Timesheet modifié avec succès',
        timesheet
      }));
    }

    // PUT /api/budget/projects/:id - Modifier budget projet
    if (path.match(/^\/budget\/projects\/[^/]+\/?$/)) {
      const projectId = path.split('/')[3];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      if (body.budget) {
        project.budget = { ...project.budget, ...body.budget };
        await project.save();
      }

      return handleCORS(NextResponse.json({
        message: 'Budget modifié avec succès',
        budget: project.budget
      }));
    }

    return handleCORS(NextResponse.json({ 
      message: 'Endpoint PUT non trouvé',
      path: path
    }, { status: 404 }));

  } catch (error) {
    console.error('Erreur API PUT:', error);
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

// ==================== DELETE ROUTES ====================

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');

    await connectDB();

    const user = await authenticate(request);
    if (!user) {
      return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
    }

    // DELETE /api/tasks/:id - Supprimer tâche
    if (path.match(/^\/tasks\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.gérer_tâches) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const taskId = path.split('/')[2];
      const task = await Task.findByIdAndDelete(taskId);

      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 }));
      }

      await Project.findByIdAndUpdate(task.projet_id, {
        $inc: { 'stats.total_tâches': -1 }
      });

      await createAuditLog(user, 'suppression', 'tâche', task._id, `Suppression tâche ${task.titre}`);

      return handleCORS(NextResponse.json({
        message: 'Tâche supprimée avec succès'
      }));
    }

    return handleCORS(NextResponse.json({ 
      message: 'Endpoint DELETE non trouvé',
      path: path
    }, { status: 404 }));

  } catch (error) {
    console.error('Erreur API DELETE:', error);
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

export const PATCH = PUT;
