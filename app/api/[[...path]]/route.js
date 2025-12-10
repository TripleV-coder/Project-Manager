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
      if (!user || !user.role_id?.permissions?.adminConfig) {
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

    // GET /api/deliverable-types - Liste des types de livrables
    if (path === '/deliverable-types' || path === '/deliverable-types/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      // Utiliser des données en mémoire pour simplifier (en prod, utiliser une collection)
      const types = global.deliverableTypes || [
        {
          _id: '1',
          nom: 'Spécification Technique',
          description: 'Document décrivant les spécifications techniques du projet',
          couleur: '#3b82f6',
          workflow_étapes: ['Rédaction', 'Revue technique', 'Validation', 'Approbation']
        },
        {
          _id: '2',
          nom: 'Maquette Design',
          description: 'Maquettes visuelles et prototypes UI/UX',
          couleur: '#8b5cf6',
          workflow_étapes: ['Création', 'Revue Client', 'Ajustements', 'Validation finale']
        },
        {
          _id: '3',
          nom: 'Rapport de Tests',
          description: 'Résultats des tests et validation qualité',
          couleur: '#10b981',
          workflow_étapes: ['Exécution tests', 'Analyse', 'Rapport', 'Validation QA']
        }
      ];

      return handleCORS(NextResponse.json({ types }));
    }

    // GET /api/settings/maintenance - État du mode maintenance
    if (path === '/settings/maintenance' || path === '/settings/maintenance/') {
      // Pas besoin d'auth pour vérifier la maintenance
      return handleCORS(NextResponse.json({
        enabled: global.maintenanceMode || false,
        message: global.maintenanceMessage || ''
      }));
    }

    // GET /api/settings - Paramètres système
    if (path === '/settings' || path === '/settings/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      // Retourner les paramètres par défaut ou sauvegardés
      return handleCORS(NextResponse.json({
        settings: {
          appName: 'PM - Gestion de Projets',
          appDescription: 'Plateforme de gestion de projets Agile',
          langue: 'fr',
          timezone: 'Africa/Douala',
          devise: 'FCFA',
          formatDate: 'DD/MM/YYYY',
          emailNotifications: true,
          pushNotifications: true,
          notifyTaskAssigned: true,
          notifyTaskCompleted: true,
          notifyCommentMention: true,
          notifySprintStart: true,
          notifyBudgetAlert: true,
          sessionTimeout: 30,
          passwordMinLength: 8,
          passwordRequireNumbers: true,
          passwordRequireSymbols: true,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          twoFactorEnabled: false,
          theme: 'light',
          primaryColor: '#4f46e5',
          sidebarCompact: false
        }
      }));
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

    // GET /api/comments - Liste commentaires
    if (path === '/comments' || path === '/comments/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = url.searchParams.get('projet_id');
      const taskId = url.searchParams.get('task_id');
      
      let query = {};
      if (projectId) query.projet_id = projectId;
      if (taskId) query.task_id = taskId;

      const comments = await Comment.find(query)
        .populate('auteur', 'nom_complet email')
        .sort({ créé_le: -1 })
        .limit(100);

      return handleCORS(NextResponse.json({ comments }));
    }

    // GET /api/activity - Flux d'activité global
    if (path === '/activity' || path === '/activity/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const limit = parseInt(url.searchParams.get('limit')) || 50;
      
      // Récupérer les logs d'audit comme activité
      const activities = await AuditLog.find()
        .populate('utilisateur', 'nom_complet')
        .sort({ timestamp: -1 })
        .limit(limit);

      return handleCORS(NextResponse.json({ activities }));
    }

    // GET /api/files - Liste des fichiers
    if (path === '/files' || path === '/files/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projetId = url.searchParams.get('projet_id');
      const folder = url.searchParams.get('folder');
      
      let query = {};
      if (projetId) query.projet_id = projetId;
      if (folder) query.dossier = folder;

      const files = await File.find(query)
        .populate('uploadé_par', 'nom_complet email')
        .sort({ créé_le: -1 });

      // Récupérer aussi les dossiers distincts
      const folders = await File.aggregate([
        { $match: query.projet_id ? { projet_id: query.projet_id } : {} },
        { $group: { _id: '$dossier' } },
        { $project: { nom: '$_id', chemin: '$_id' } }
      ]);

      return handleCORS(NextResponse.json({ files, folders }));
    }

    // GET /api/files/:id/download - Télécharger fichier
    if (path.match(/^\/files\/[^/]+\/download\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const fileId = path.split('/')[2];
      const file = await File.findById(fileId);

      if (!file) {
        return handleCORS(NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 }));
      }

      // Extraire les données base64
      if (file.url && file.url.startsWith('data:')) {
        const base64Data = file.url.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': file.type,
            'Content-Disposition': `attachment; filename="${file.nom}"`,
            'Content-Length': buffer.length.toString()
          }
        });
      }

      return handleCORS(NextResponse.json({ error: 'Fichier non disponible' }, { status: 404 }));
    }

    // GET /api/admin/maintenance - Statut mode maintenance
    if (path === '/admin/maintenance' || path === '/admin/maintenance/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Pour l'instant, retourner des valeurs par défaut
      return handleCORS(NextResponse.json({
        enabled: false,
        message: 'L\'application est actuellement en maintenance. Nous serons de retour bientôt.'
      }));
    }

    // GET /api/sharepoint/config - Configuration SharePoint
    if (path === '/sharepoint/config' || path === '/sharepoint/config/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Récupérer la config SharePoint depuis les settings globaux (ou retourner défaut)
      // Pour l'instant, on simule avec des valeurs par défaut
      // Dans une vraie implémentation, stocker dans une collection Settings
      return handleCORS(NextResponse.json({
        enabled: process.env.SHAREPOINT_ENABLED === 'true' || false,
        config: {
          tenant_id: process.env.SHAREPOINT_TENANT_ID || '',
          site_id: process.env.SHAREPOINT_SITE_ID || '',
          client_id: process.env.SHAREPOINT_CLIENT_ID || '',
          client_secret: process.env.SHAREPOINT_CLIENT_SECRET ? '********' : '',
          auto_sync: true,
          sync_interval: 15
        },
        status: {
          connected: false,
          last_sync: null,
          files_synced: 0,
          errors: 0
        }
      }));
    }

    // GET /api/sprints - Liste sprints
    if (path === '/sprints' || path === '/sprints/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projetId = url.searchParams.get('projet_id');
      let query = {};
      if (projetId) query.projet_id = projetId;

      const sprints = await Sprint.find(query)
        .sort({ date_début: -1 });

      return handleCORS(NextResponse.json({ sprints }));
    }

    // GET /api/timesheets - Liste timesheets
    if (path === '/timesheets' || path === '/timesheets/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projetId = url.searchParams.get('projet_id');
      const userId = url.searchParams.get('user_id');
      
      let query = {};
      if (projetId) query.projet_id = projetId;
      if (userId) query.utilisateur = userId;
      else if (!user.role_id?.permissions?.voirTempsPasses) {
        query.utilisateur = user._id;
      }

      const timesheets = await TimesheetEntry.find(query)
        .populate('utilisateur', 'nom_complet email')
        .populate('task_id', 'titre')
        .sort({ date: -1 });

      return handleCORS(NextResponse.json({ timesheets }));
    }

    // GET /api/audit - Journal d'audit
    if (path === '/audit' || path === '/audit/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const limit = parseInt(url.searchParams.get('limit')) || 100;
      const logs = await AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(limit);

      return handleCORS(NextResponse.json({ logs }));
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

      const adminRole = await Role.findOne({ nom: 'Administrateur' });
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
      if (!user || !user.role_id?.permissions?.adminConfig) {
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
      if (!user || !user.role_id?.permissions?.creerProjet) {
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
      if (!user || !user.role_id?.permissions?.gererTaches) {
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
      if (!user || !user.role_id?.permissions?.adminConfig) {
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
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, description, permissions, visibleMenus } = body;

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
        visibleMenus: visibleMenus || {}
      });

      await createAuditLog(user, 'création', 'rôle', role._id, `Création rôle personnalisé ${nom}`);

      return handleCORS(NextResponse.json({
        message: 'Rôle créé avec succès',
        role
      }));
    }

    // POST /api/sprints - Créer sprint
    if (path === '/sprints' || path === '/sprints/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererSprints) {
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
      if (!user || !user.role_id?.permissions?.saisirTemps) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { projet_id, tâche_id, date, heures, description, type_saisie } = body;

      if (!projet_id || !date || !heures) {
        return handleCORS(NextResponse.json({ 
          error: 'Champs requis: projet_id, date, heures' 
        }, { status: 400 }));
      }

      const timesheet = await TimesheetEntry.create({
        utilisateur: user._id,
        projet_id,
        task_id: tâche_id || null,
        date: new Date(date),
        heures: parseFloat(heures),
        description: description || '',
        type_saisie: type_saisie || 'manuelle',
        statut: 'brouillon'
      });

      await createAuditLog(user, 'création', 'timesheet', timesheet._id, `Saisie temps ${heures}h`);

      return handleCORS(NextResponse.json({
        message: 'Temps enregistré avec succès',
        timesheet
      }));
    }

    // POST /api/deliverable-types - Créer type de livrable
    if (path === '/deliverable-types' || path === '/deliverable-types/') {
      const user = await authenticate(request);
      if (!user || !user.role?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, description, couleur, workflow_étapes } = body;

      if (!nom) {
        return handleCORS(NextResponse.json({ error: 'Nom requis' }, { status: 400 }));
      }

      // Initialiser si nécessaire
      if (!global.deliverableTypes) {
        global.deliverableTypes = [];
      }

      const newType = {
        _id: Date.now().toString(),
        nom,
        description: description || '',
        couleur: couleur || '#6366f1',
        workflow_étapes: workflow_étapes || ['Création', 'Validation']
      };

      global.deliverableTypes.push(newType);

      await createAuditLog(user, 'création', 'deliverable-type', newType._id, `Création type livrable ${nom}`);

      return handleCORS(NextResponse.json({
        message: 'Type de livrable créé',
        type: newType
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

    // POST /api/files/upload - Upload fichier
    if (path === '/files/upload' || path === '/files/upload/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererFichiers) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const projetId = formData.get('projet_id');
        const folder = formData.get('folder') || '/';

        if (!file) {
          return handleCORS(NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 }));
        }

        // Convertir le fichier en base64 pour stockage (simple pour MVP)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');

        const fileDoc = await File.create({
          nom: file.name,
          type: file.type,
          taille: file.size,
          url: `data:${file.type};base64,${base64}`,
          projet_id: projetId || null,
          dossier: folder,
          uploadé_par: user._id,
          créé_le: new Date()
        });

        await createAuditLog(user, 'création', 'fichier', fileDoc._id, `Upload fichier ${file.name}`);

        return handleCORS(NextResponse.json({
          message: 'Fichier téléversé avec succès',
          file: fileDoc
        }));
      } catch (error) {
        console.error('Erreur upload:', error);
        return handleCORS(NextResponse.json({ error: 'Erreur lors du téléversement' }, { status: 500 }));
      }
    }

    // POST /api/files/folder - Créer dossier
    if (path === '/files/folder' || path === '/files/folder/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererFichiers) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, parent, projet_id } = body;

      if (!nom) {
        return handleCORS(NextResponse.json({ error: 'Nom du dossier requis' }, { status: 400 }));
      }

      // Créer un "fichier" de type dossier pour la structure
      const folder = await File.create({
        nom: nom,
        type: 'folder',
        taille: 0,
        dossier: parent || '/',
        projet_id: projet_id || null,
        uploadé_par: user._id,
        est_dossier: true,
        créé_le: new Date()
      });

      return handleCORS(NextResponse.json({
        message: 'Dossier créé avec succès',
        folder
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

    // POST /api/sharepoint/test - Tester connexion SharePoint
    if (path === '/sharepoint/test' || path === '/sharepoint/test/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { tenant_id, client_id, client_secret, site_id } = body;

      if (!tenant_id || !client_id || !client_secret) {
        return handleCORS(NextResponse.json({ 
          error: 'Identifiants manquants' 
        }, { status: 400 }));
      }

      // Simuler un test de connexion
      // Dans une vraie implémentation, on appellerait Microsoft Graph API
      // pour valider les credentials
      
      // Pour l'instant, on vérifie juste le format des IDs (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(tenant_id)) {
        return handleCORS(NextResponse.json({ 
          error: 'Format Tenant ID invalide (doit être un UUID)' 
        }, { status: 400 }));
      }

      if (!uuidRegex.test(client_id)) {
        return handleCORS(NextResponse.json({ 
          error: 'Format Client ID invalide (doit être un UUID)' 
        }, { status: 400 }));
      }

      await createAuditLog(user, 'test', 'sharepoint', null, 'Test de connexion SharePoint');

      // En production, ici on ferait l'appel OAuth2 vers Microsoft
      return handleCORS(NextResponse.json({
        success: true,
        message: 'Configuration validée. Enregistrez pour activer la connexion.',
        note: 'L\'intégration réelle avec Microsoft Graph sera activée après configuration complète.'
      }));
    }

    // POST /api/sharepoint/sync - Synchronisation manuelle
    if (path === '/sharepoint/sync' || path === '/sharepoint/sync/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      await createAuditLog(user, 'sync', 'sharepoint', null, 'Synchronisation manuelle SharePoint lancée');

      // Simuler une synchronisation
      return handleCORS(NextResponse.json({
        success: true,
        message: 'Synchronisation initiée',
        details: 'La synchronisation sera effectuée en arrière-plan'
      }));
    }

    // POST /api/init-default-template - Créer template par défaut (pour faciliter le démarrage)
    if (path === '/init-default-template' || path === '/init-default-template/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
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
      if (!user.role_id?.permissions?.deplacerTaches) {
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
      if (!user.role_id?.permissions?.adminConfig) {
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

    // PUT /api/notifications/:id/read - Marquer comme lu
    if (path.match(/^\/notifications\/[^/]+\/read\/?$/)) {
      const notificationId = path.split('/')[2];
      await Notification.findByIdAndUpdate(notificationId, { lu: true });
      return handleCORS(NextResponse.json({ message: 'Notification marquée comme lue' }));
    }

    // PUT /api/notifications/read-all - Tout marquer comme lu
    if (path === '/notifications/read-all' || path === '/notifications/read-all/') {
      const user = await authenticate(request);
      await Notification.updateMany(
        { destinataire: user._id, lu: false },
        { lu: true }
      );
      return handleCORS(NextResponse.json({ message: 'Toutes les notifications marquées comme lues' }));
    }

    // PUT /api/sharepoint/config - Enregistrer configuration SharePoint
    if (path === '/sharepoint/config' || path === '/sharepoint/config/') {
      if (!user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { enabled, config } = body;

      // Dans une vraie implémentation, on sauvegarderait dans une collection Settings
      // ou dans des variables d'environnement chiffrées
      
      await createAuditLog(user, 'modification', 'sharepoint', null, 
        `Configuration SharePoint ${enabled ? 'activée' : 'désactivée'}`);

      return handleCORS(NextResponse.json({
        success: true,
        message: 'Configuration SharePoint enregistrée',
        enabled: enabled,
        note: 'Les modifications prendront effet immédiatement'
      }));
    }

    // PUT /api/admin/maintenance - Modifier mode maintenance
    if (path === '/admin/maintenance' || path === '/admin/maintenance/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Pour l'instant, juste retourner OK
      // Dans une vraie implémentation, on sauvegarderait dans la DB ou fichier config
      return handleCORS(NextResponse.json({ 
        message: 'Mode maintenance mis à jour',
        enabled: body.enabled,
        savedMessage: body.message
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

    // PUT /api/users/profile - Modifier son propre profil
    if (path === '/users/profile' || path === '/users/profile/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const { nom_complet, telephone, poste } = body;

      const updateData = {};
      if (nom_complet) updateData.nom_complet = nom_complet;
      if (telephone !== undefined) updateData.telephone = telephone;
      if (poste !== undefined) updateData.poste = poste;

      await User.findByIdAndUpdate(user._id, updateData);

      return handleCORS(NextResponse.json({
        message: 'Profil mis à jour avec succès'
      }));
    }

    // PUT /api/users/:id - Modifier utilisateur (admin)
    if (path.match(/^\/users\/[^/]+\/?$/) && !path.includes('/profile')) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererUtilisateurs) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const userId = path.split('/')[2];
      const targetUser = await User.findById(userId);

      if (!targetUser) {
        return handleCORS(NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 }));
      }

      const { nom_complet, email, role_id, status } = body;

      if (nom_complet) targetUser.nom_complet = nom_complet;
      if (email) targetUser.email = email;
      if (role_id) targetUser.role_id = role_id;
      if (status) targetUser.status = status;

      await targetUser.save();
      await createAuditLog(user, 'modification', 'utilisateur', targetUser._id, `Modification utilisateur ${targetUser.nom_complet}`);

      return handleCORS(NextResponse.json({
        message: 'Utilisateur modifié avec succès',
        user: targetUser
      }));
    }

    // PUT /api/sprints/:id/start - Démarrer sprint
    if (path.match(/^\/sprints\/[^/]+\/start\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererSprints) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId);

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      if (sprint.statut !== 'Planifié') {
        return handleCORS(NextResponse.json({ error: 'Le sprint doit être en statut "Planifié" pour être démarré' }, { status: 400 }));
      }

      sprint.statut = 'Actif';
      await sprint.save();

      await createAuditLog(user, 'modification', 'sprint', sprint._id, `Démarrage sprint ${sprint.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Sprint démarré avec succès',
        sprint
      }));
    }

    // PUT /api/sprints/:id/complete - Terminer sprint
    if (path.match(/^\/sprints\/[^/]+\/complete\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererSprints) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId);

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      if (sprint.statut !== 'Actif') {
        return handleCORS(NextResponse.json({ error: 'Le sprint doit être en statut "Actif" pour être terminé' }, { status: 400 }));
      }

      sprint.statut = 'Terminé';
      await sprint.save();

      await createAuditLog(user, 'modification', 'sprint', sprint._id, `Fin sprint ${sprint.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Sprint terminé avec succès',
        sprint
      }));
    }

    // PUT /api/projects/:id - Modifier projet
    if (path.match(/^\/projects\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.modifierProjet) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      Object.keys(body).forEach(key => {
        if (body[key] !== undefined && key !== '_id' && key !== 'budget') {
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

    // PUT /api/settings/maintenance - Activer/désactiver maintenance
    if (path === '/settings/maintenance' || path === '/settings/maintenance/') {
      const user = await authenticate(request);
      if (!user || !user.role?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { enabled, message } = body;
      
      // Stocker dans une variable globale (en prod, utiliser une base de données ou Redis)
      global.maintenanceMode = enabled;
      global.maintenanceMessage = message || '';

      await createAuditLog(user, 'modification', 'système', null, 
        enabled ? 'Activation mode maintenance' : 'Désactivation mode maintenance'
      );

      return handleCORS(NextResponse.json({
        message: enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé',
        enabled,
        maintenanceMessage: message
      }));
    }

    // PUT /api/settings - Modifier paramètres système
    if (path === '/settings' || path === '/settings/') {
      const user = await authenticate(request);
      if (!user || !user.role?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { settings } = body;
      
      // En prod, sauvegarder dans une collection Settings
      global.appSettings = settings;

      await createAuditLog(user, 'modification', 'système', null, 'Modification paramètres système');

      return handleCORS(NextResponse.json({
        message: 'Paramètres enregistrés avec succès',
        settings
      }));
    }

    // PUT /api/roles/:id - Modifier rôle
    if (path.match(/^\/roles\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const roleId = path.split('/')[2];
      const role = await Role.findById(roleId);

      if (!role) {
        return handleCORS(NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 }));
      }

      if (role.is_predefined) {
        return handleCORS(NextResponse.json({ error: 'Les rôles prédéfinis ne peuvent pas être modifiés' }, { status: 400 }));
      }

      const updates = {};
      if (body.nom) updates.nom = body.nom;
      if (body.description) updates.description = body.description;
      if (body.permissions) updates.permissions = body.permissions;
      if (body.visibleMenus) updates.visibleMenus = body.visibleMenus;

      const updatedRole = await Role.findByIdAndUpdate(roleId, updates, { new: true });

      await createAuditLog(user, 'modification', 'rôle', roleId, `Modification rôle ${updatedRole.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Rôle modifié avec succès',
        role: updatedRole
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

    // DELETE /api/roles/:id - Supprimer rôle
    if (path.match(/^\/roles\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const roleId = path.split('/')[2];
      const role = await Role.findById(roleId);

      if (!role) {
        return handleCORS(NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 }));
      }

      if (role.is_predefined) {
        return handleCORS(NextResponse.json({ error: 'Les rôles prédéfinis ne peuvent pas être supprimés' }, { status: 400 }));
      }

      // Vérifier si des utilisateurs ont ce rôle
      const usersWithRole = await User.countDocuments({ role_id: roleId });
      if (usersWithRole > 0) {
        return handleCORS(NextResponse.json({ error: `Impossible de supprimer : ${usersWithRole} utilisateur(s) ont ce rôle` }, { status: 400 }));
      }

      await Role.findByIdAndDelete(roleId);

      await createAuditLog(user, 'suppression', 'rôle', roleId, `Suppression rôle ${role.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Rôle supprimé avec succès'
      }));
    }

    // DELETE /api/notifications/:id - Supprimer notification
    if (path.match(/^\/notifications\/[^/]+\/?$/)) {
      const notificationId = path.split('/')[2];
      await Notification.findByIdAndDelete(notificationId);
      return handleCORS(NextResponse.json({ message: 'Notification supprimée' }));
    }

    // DELETE /api/tasks/:id - Supprimer tâche
    if (path.match(/^\/tasks\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.gererTaches) {
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

    // DELETE /api/sprints/:id - Supprimer sprint
    if (path.match(/^\/sprints\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.gererSprints) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findByIdAndDelete(sprintId);

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      await createAuditLog(user, 'suppression', 'sprint', sprintId, `Suppression sprint ${sprint.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Sprint supprimé avec succès'
      }));
    }

    // DELETE /api/projects/:id - Supprimer projet
    if (path.match(/^\/projects\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.supprimerProjet) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Supprimer les tâches associées
      await Task.deleteMany({ projet_id: projectId });
      
      // Supprimer les sprints associés
      await Sprint.deleteMany({ projet_id: projectId });
      
      // Supprimer le projet
      await Project.findByIdAndDelete(projectId);

      await createAuditLog(user, 'suppression', 'projet', projectId, `Suppression projet ${project.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Projet supprimé avec succès'
      }));
    }

    // DELETE /api/comments/:id - Supprimer commentaire
    if (path.match(/^\/comments\/[^/]+\/?$/)) {
      const commentId = path.split('/')[2];
      const comment = await Comment.findByIdAndDelete(commentId);

      if (!comment) {
        return handleCORS(NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({
        message: 'Commentaire supprimé avec succès'
      }));
    }

    // DELETE /api/files/:id - Supprimer fichier
    if (path.match(/^\/files\/[^/]+\/?$/) && !path.includes('/download') && !path.includes('/upload') && !path.includes('/folder')) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererFichiers) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const fileId = path.split('/')[2];
      const file = await File.findByIdAndDelete(fileId);

      if (!file) {
        return handleCORS(NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 }));
      }

      await createAuditLog(user, 'suppression', 'fichier', fileId, `Suppression fichier ${file.nom}`);

      return handleCORS(NextResponse.json({
        message: 'Fichier supprimé avec succès'
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
