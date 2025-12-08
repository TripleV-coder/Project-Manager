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

// Initialiser les rôles prédéfinis
async function initializeRoles() {
  const roles = [
    {
      nom: 'Admin',
      description: 'Accès complet + configuration système',
      is_predefined: true,
      permissions: {
        voir_tous_projets: true,
        voir_ses_projets: true,
        créer_projet: true,
        supprimer_projet: true,
        modifier_charte_projet: true,
        gérer_membres_projet: true,
        changer_rôle_membre: true,
        gérer_tâches: true,
        déplacer_tâches: true,
        prioriser_backlog: true,
        gérer_sprints: true,
        modifier_budget: true,
        voir_budget: true,
        voir_temps_passés: true,
        saisir_temps: true,
        valider_livrable: true,
        gérer_fichiers: true,
        commenter: true,
        recevoir_notifications: true,
        générer_rapports: true,
        voir_audit: true,
        admin_config: true
      },
      visible_menus: {
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
      nom: 'Project_Manager',
      description: 'Gestion projets assignés + équipes + budget',
      is_predefined: true,
      permissions: {
        voir_tous_projets: false,
        voir_ses_projets: true,
        créer_projet: true,
        supprimer_projet: false,
        modifier_charte_projet: true,
        gérer_membres_projet: true,
        changer_rôle_membre: true,
        gérer_tâches: true,
        déplacer_tâches: true,
        prioriser_backlog: true,
        gérer_sprints: true,
        modifier_budget: true,
        voir_budget: true,
        voir_temps_passés: true,
        saisir_temps: true,
        valider_livrable: false,
        gérer_fichiers: true,
        commenter: true,
        recevoir_notifications: true,
        générer_rapports: true,
        voir_audit: false,
        admin_config: false
      },
      visible_menus: {
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
      nom: 'Team_Member',
      description: 'Tâches personnelles + time tracking',
      is_predefined: true,
      permissions: {
        voir_tous_projets: false,
        voir_ses_projets: true,
        créer_projet: false,
        supprimer_projet: false,
        modifier_charte_projet: false,
        gérer_membres_projet: false,
        changer_rôle_membre: false,
        gérer_tâches: false,
        déplacer_tâches: true,
        prioriser_backlog: false,
        gérer_sprints: false,
        modifier_budget: false,
        voir_budget: false,
        voir_temps_passés: false,
        saisir_temps: true,
        valider_livrable: false,
        gérer_fichiers: true,
        commenter: true,
        recevoir_notifications: true,
        générer_rapports: false,
        voir_audit: false,
        admin_config: false
      },
      visible_menus: {
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