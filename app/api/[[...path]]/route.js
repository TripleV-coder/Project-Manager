import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { hashPassword, verifyPassword, signToken, verifyToken, validatePassword } from '@/lib/auth';
import { initializeProjectRoles } from '@/lib/projectRoleInit';
import { getMergedPermissions } from '@/lib/permissions';
import { emitToProject } from '@/lib/socket-emitter';
import { SOCKET_EVENTS } from '@/lib/socket-events';
import { logActivity } from '@/lib/auditService';
import { handleGetAuditLogs, handleGetUserActivity, handleGetAuditStatistics, handleExportAuditLogs, handleGetAvailableActions } from '@/lib/auditApiHandler';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMIT_CONFIG } from '@/lib/rateLimit';
import { createAuthCookieHeader } from '@/lib/authCookie';
import { APIResponse, handleError } from '@/lib/apiResponse';
import appSettingsService from '@/lib/appSettingsService';
import { generateTwoFactorSecret, verifyTwoFactorToken, generateBackupCodes, verifyBackupCode } from '@/lib/twoFactorAuth';
import projectService from '@/lib/services/projectService';
import userService from '@/lib/services/userService';
import taskService from '@/lib/services/taskService';
import User from '@/models/User';
import Role from '@/models/Role';
import ProjectRole from '@/models/ProjectRole';
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

  try {
    await connectDB();
    const user = await User.findById(payload.userId).select('+password').populate('role_id');
    if (!user) {
      return null;
    }
    // Ensure role_id is loaded, if not return null
    if (!user.role_id) {
      console.warn('[Auth] User found but role_id not populated for userId:', payload.userId);
      return null;
    }
    return user;
  } catch (error) {
    console.error('[Auth] Error authenticating user:', error);
    return null;
  }
}

// Helper pour générer un mot de passe temporaire sécurisé
function generateSecureTemporaryPassword() {
  // Generate a 12-character random password with uppercase, lowercase, numbers, and special chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one char from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest with random characters
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper pour créer une réponse d'erreur sécurisée (ne divulgue pas les détails en production)
function createSecureErrorResponse(error, statusCode = 500) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log full error server-side (with stack trace in dev only)
  if (isProduction) {
    console.error('API Error:', error.message);
  } else {
    console.error('API Error:', error.message, error.stack);
  }

  // Return generic error to client in production, detailed in development
  const errorMessage = isProduction
    ? 'Une erreur s\'est produite. Veuillez réessayer plus tard.'
    : error.message;

  return {
    statusCode,
    message: errorMessage
  };
}

// Helper pour mettre à jour le burndown d'un sprint actif quand une tâche change
async function updateSprintBurndown(sprintId) {
  try {
    if (!sprintId) return;

    const sprint = await Sprint.findById(sprintId);
    if (!sprint || sprint.statut !== 'Actif') return;

    // Get all tasks for this sprint
    const sprintTasks = await Task.find({ sprint_id: sprintId });
    const totalStoryPoints = sprint.story_points_planifiés || sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

    // Calculate current remaining points
    const completedTasks = sprintTasks.filter(t => t.statut === 'Terminé');
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    const remainingPoints = totalStoryPoints - completedPoints;

    // Get today's date (normalized to start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or add today's burndown entry
    let burndownData = sprint.burndown_data || [];
    const todayStr = today.toDateString();
    const existingEntryIndex = burndownData.findIndex(entry =>
      new Date(entry.date).toDateString() === todayStr
    );

    if (existingEntryIndex >= 0) {
      // Update existing entry for today
      burndownData[existingEntryIndex].story_points_restants = remainingPoints;
    } else {
      // Check if today is within sprint period
      const startDate = new Date(sprint.date_début);
      const endDate = new Date(sprint.date_fin);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (today >= startDate && today <= endDate) {
        // Calculate ideal for today
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const dayIndex = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const idealRemaining = Math.max(0, totalStoryPoints - (totalStoryPoints / Math.max(1, totalDays - 1)) * dayIndex);

        burndownData.push({
          date: today,
          story_points_restants: remainingPoints,
          heures_restantes: null,
          idéal: Math.round(idealRemaining * 10) / 10
        });

        // Sort by date
        burndownData.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
    }

    // Update sprint
    sprint.story_points_complétés = completedPoints;
    sprint.burndown_data = burndownData;
    await sprint.save();

    return sprint;
  } catch (error) {
    console.error('Error updating sprint burndown:', error);
  }
}

// Helper pour créer une notification
// Vérifie les paramètres globaux ET les préférences utilisateur
async function createNotification(destinataire, type, titre, message, entity_type, entity_id, entity_nom, expéditeur = null) {
  try {
    const user = await User.findById(destinataire);
    if (!user) return;

    // Vérifier les paramètres globaux de notification
    let globalSettings;
    try {
      globalSettings = await appSettingsService.getNotificationSettings();
    } catch (e) {
      globalSettings = { pushNotifications: true }; // Fallback
    }

    // Si les notifications push sont désactivées globalement, ne pas créer
    if (globalSettings.pushNotifications === false) {
      return;
    }

    // Vérifier les types d'événements configurés globalement
    const typeMapping = {
      'assignation_tâche': 'notifyTaskAssigned',
      'tâche_terminée': 'notifyTaskCompleted',
      'mention': 'notifyCommentMention',
      'sprint_démarré': 'notifySprintStart',
      'alerte_budget': 'notifyBudgetAlert'
    };

    const globalSettingKey = typeMapping[type];
    if (globalSettingKey && globalSettings[globalSettingKey] === false) {
      return; // Ce type de notification est désactivé globalement
    }

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
        email: user.notifications_préférées?.email === true && globalSettings.emailNotifications !== false,
        push: user.notifications_préférées?.push === true && globalSettings.pushNotifications !== false
      }
    });
  } catch (error) {
    console.error('Erreur création notification:', error);
  }
}

// Helper pour créer plusieurs notifications en batch (optimisé pour éviter N+1)
// Vérifie les paramètres globaux ET les préférences utilisateur
async function createNotificationsBatch(destinataires, type, titre, message, entity_type, entity_id, entity_nom, expéditeur = null) {
  try {
    if (!destinataires || destinataires.length === 0) return;

    // Vérifier les paramètres globaux de notification
    let globalSettings;
    try {
      globalSettings = await appSettingsService.getNotificationSettings();
    } catch (e) {
      globalSettings = { pushNotifications: true }; // Fallback
    }

    // Si les notifications push sont désactivées globalement, ne pas créer
    if (globalSettings.pushNotifications === false) {
      return;
    }

    // Vérifier les types d'événements configurés globalement
    const typeMapping = {
      'assignation_tâche': 'notifyTaskAssigned',
      'tâche_terminée': 'notifyTaskCompleted',
      'mention': 'notifyCommentMention',
      'sprint_démarré': 'notifySprintStart',
      'alerte_budget': 'notifyBudgetAlert'
    };

    const globalSettingKey = typeMapping[type];
    if (globalSettingKey && globalSettings[globalSettingKey] === false) {
      return; // Ce type de notification est désactivé globalement
    }

    // Charger tous les utilisateurs en une seule requête
    const users = await User.find({ _id: { $in: destinataires } });
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Créer tous les documents de notification en une seule requête
    const notificationsToCreate = destinataires
      .map(destinataireId => {
        const user = userMap.get(destinataireId.toString());
        if (!user) return null;

        return {
          destinataire: destinataireId,
          type,
          titre,
          message,
          entity_type,
          entity_id,
          entity_nom,
          expéditeur,
          canaux: {
            in_app: user.notifications_préférées?.in_app !== false,
            email: user.notifications_préférées?.email === true && globalSettings.emailNotifications !== false,
            push: user.notifications_préférées?.push === true && globalSettings.pushNotifications !== false
          }
        };
      })
      .filter(notif => notif !== null);

    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
    }
  } catch (error) {
    console.error('Erreur création notifications batch:', error);
  }
}

// Helper pour mapper le statut français vers l'ID de colonne Kanban anglais
function getKanbanColumnId(statut) {
  const statusToColumnMap = {
    'Backlog': 'backlog',
    'À faire': 'todo',
    'En cours': 'in_progress',
    'Review': 'review',
    'Terminé': 'done'
  };
  return statusToColumnMap[statut] || 'backlog';
}

// CORS Helper
function handleCORS(response, allowedOrigins = null) {
  // Parse allowed origins from environment or use safe default
  const corsOrigins = allowedOrigins || (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000']);

  // For credentials mode (cookies), we cannot use wildcard
  // Instead, we validate against allowed list
  // In production, frontend and backend should be same origin or configured explicitly
  const origin = corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins.join(',');

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '3600');
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
      description: 'Gestion utilisateurs et projets système (sans config système)',
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
      nom: 'Super Administrateur',
      description: 'Accès complet système - Configuration, rôles et admin',
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
      description: 'Gestion équipe, tâches et reporting - Vue ses projets',
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
        gererSprints: true,
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
        portfolio: true,
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
        portfolio: true,
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
        portfolio: true,
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
        portfolio: true,
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
        portfolio: true,
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
      console.log(`[OK] Rôle créé: ${roleData.nom}`);
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

    // GET /api/init - Combined init endpoint to reduce API calls
    if (path === '/init' || path === '/init/') {
      const userCount = await User.countDocuments();
      const hasAdmin = userCount > 0;

      let user = null;
      const token = request.headers.get('authorization')?.split(' ')[1];

      if (token && hasAdmin) {
        user = await authenticate(request);
      }

      return handleCORS(NextResponse.json({
        hasAdmin,
        needsFirstAdmin: !hasAdmin,
        user: user ? {
          id: user._id,
          nom_complet: user.nom_complet,
          email: user.email,
          role: {
            id: user.role_id._id,
            nom: user.role_id.nom,
            description: user.role_id.description,
            permissions: user.role_id.permissions,
            visibleMenus: user.role_id.visibleMenus
          },
          avatar: user.avatar,
          poste_titre: user.poste_titre,
          département_équipe: user.département_équipe,
          compétences: user.compétences,
          status: user.status,
          first_login: user.first_login,
          must_change_password: user.must_change_password,
          projets_assignés: user.projets_assignés
        } : null
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
        role: {
          id: user.role_id._id,
          nom: user.role_id.nom,
          description: user.role_id.description,
          permissions: user.role_id.permissions,
          visibleMenus: user.role_id.visibleMenus
        },
        avatar: user.avatar,
        poste_titre: user.poste_titre,
        département_équipe: user.département_équipe,
        compétences: user.compétences,
        status: user.status,
        first_login: user.first_login,
        projets_assignés: user.projets_assignés,
        twoFactorEnabled: user.twoFactorEnabled || false
      }));
    }

    // GET /api/auth/2fa/status - Get 2FA status for current user
    if (path === '/auth/2fa/status' || path === '/auth/2fa/status/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        return handleCORS(APIResponse.success({
          enabled: user.twoFactorEnabled || false
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /auth/2fa/status'));
      }
    }

    // GET /api/users - Liste utilisateurs (admin uniquement, OPTIMIZED)
    if (path === '/users' || path === '/users/') {
      try {
        const user = await authenticate(request);
        if (!user || (!user.role_id?.permissions?.gererUtilisateurs && !user.role_id?.permissions?.adminConfig)) {
          return handleCORS(APIResponse.forbidden());
        }

        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
        const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
        const skip = (page - 1) * limit;

        const { users, total } = await userService.getUsers(limit, skip);

        return handleCORS(APIResponse.success(users, null, 200, {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /users'));
      }
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

    // GET /api/projects - Liste projets (OPTIMIZED)
    if (path === '/projects' || path === '/projects/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
        const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
        const skip = (page - 1) * limit;

        const { projects, total } = await projectService.getAccessibleProjects(
          user._id,
          user.role_id,
          limit,
          skip
        );

        return handleCORS(APIResponse.success(projects, null, 200, {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /projects'));
      }
    }

    // GET /api/projects/:id - Détails projet (OPTIMIZED)
    if (path.match(/^\/projects\/[^/]+\/?$/)) {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        const projectId = path.split('/')[2];
        const project = await projectService.getProjectById(projectId);

        if (!project) {
          return handleCORS(APIResponse.notFound('Projet non trouvé'));
        }

        // Vérifier l'accès
        const canView = user.role_id?.permissions?.voirTousProjets ||
          projectService.canUserAccessProject(user._id, projectId);

        if (!canView) {
          return handleCORS(APIResponse.forbidden());
        }

        return handleCORS(APIResponse.success(project));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /projects/:id'));
      }
    }

    // GET /api/projects/:id/roles - Rôles du projet
    if (path.match(/^\/projects\/[^/]+\/roles\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier l'accès au projet
      const canView = user.role_id?.permissions?.voirTousProjets ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString() ||
        project.membres.some(m => m.user_id.toString() === user._id.toString());

      if (!canView) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Charger tous les rôles du projet (prédéfinis + custom)
      const roles = await ProjectRole.find({ project_id: projectId }).sort({ nom: 1 });

      return handleCORS(NextResponse.json({ roles }));
    }

    // GET /api/projects/:id/permissions - Permissions synchronisées (système + projet)
    if (path.match(/^\/projects\/[^/]+\/permissions\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier l'accès au projet
      const isMember = project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString() ||
        project.membres.some(m => m.user_id.toString() === user._id.toString());

      const canView = user.role_id?.permissions?.voirTousProjets || isMember;

      if (!canView) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Trouver le rôle de projet de l'utilisateur
      let projectRole = null;
      if (isMember) {
        const member = project.membres.find(m => m.user_id.toString() === user._id.toString());
        if (member && member.project_role_id) {
          projectRole = await ProjectRole.findById(member.project_role_id);
        }
      }

      // Récupérer les permissions de base du système
      const systemPermissions = user.role_id?.permissions || {};
      const systemMenus = user.role_id?.visibleMenus || {};

      // Fusionner avec les permissions du projet (plus restrictif)
      const merged = {
        permissions: {},
        visibleMenus: {}
      };

      const ALL_PERMISSIONS = [
        'voirTousProjets', 'voirSesProjets', 'creerProjet', 'supprimerProjet', 'modifierCharteProjet',
        'gererMembresProjet', 'changerRoleMembre', 'gererTaches', 'deplacerTaches', 'prioriserBacklog',
        'gererSprints', 'modifierBudget', 'voirBudget', 'voirTempsPasses', 'saisirTemps',
        'validerLivrable', 'gererFichiers', 'commenter', 'recevoirNotifications', 'genererRapports',
        'voirAudit', 'gererUtilisateurs', 'adminConfig'
      ];

      ALL_PERMISSIONS.forEach(permission => {
        const sysAllows = systemPermissions[permission] === true;
        // Use explicit true checks: if projectRole exists, BOTH must be true
        let projAllows = true;
        if (projectRole) {
          projAllows = projectRole.permissions?.[permission] === true;
        }
        merged.permissions[permission] = sysAllows && projAllows;
      });

      const ALL_MENUS = [
        'portfolio', 'projects', 'kanban', 'backlog', 'sprints', 'roadmap', 'tasks', 'files',
        'comments', 'timesheets', 'budget', 'reports', 'notifications', 'admin'
      ];

      ALL_MENUS.forEach(menu => {
        const sysAllows = systemMenus[menu] === true;
        // Use explicit true checks: if projectRole exists, BOTH must be true
        let projAllows = true;
        if (projectRole) {
          projAllows = projectRole.visibleMenus?.[menu] === true;
        }
        merged.visibleMenus[menu] = sysAllows && projAllows;
      });

      return handleCORS(NextResponse.json({
        permissions: merged.permissions,
        visibleMenus: merged.visibleMenus,
        projectRole: projectRole ? {
          id: projectRole._id,
          nom: projectRole.nom,
          description: projectRole.description
        } : null,
        systemRole: {
          id: user.role_id._id,
          nom: user.role_id.nom,
          description: user.role_id.description
        }
      }));
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

      const types = await DeliverableType.find({}).sort({ created_at: -1 });

      return handleCORS(NextResponse.json({ types }));
    }

    // GET /api/deliverables - Liste des livrables avec filtres
    if (path === '/deliverables' || path === '/deliverables/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const url = new URL(request.url);
      const projet_id = url.searchParams.get('projet_id');
      const statut = url.searchParams.get('statut');
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const skip = (page - 1) * limit;

      const query = {};

      if (projet_id) {
        // Vérifier l'accès au projet spécifié
        if (!user.role_id?.permissions?.voirTousProjets && !user.role_id?.permissions?.adminConfig) {
          const hasAccess = await projectService.canUserAccessProject(user._id, projet_id);
          if (!hasAccess) {
            return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
          }
        }
        query.projet_id = projet_id;
      } else {
        // Filtrer par projets accessibles si l'utilisateur n'est pas admin
        const accessibleProjectIds = await projectService.getAccessibleProjectIds(user._id, user.role_id);
        if (accessibleProjectIds !== null) {
          if (accessibleProjectIds.length === 0) {
            return handleCORS(NextResponse.json({ deliverables: [], total: 0, page, limit, totalPages: 0 }));
          }
          query.projet_id = { $in: accessibleProjectIds };
        }
      }

      if (statut) query.statut_global = statut;

      const [deliverables, total] = await Promise.all([
        Deliverable.find(query)
          .populate('projet_id', 'nom')
          .populate('type_id', 'nom')
          .populate('assigné_à', 'nom_complet email avatar')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Deliverable.countDocuments(query)
      ]);

      return handleCORS(NextResponse.json({
        deliverables,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }));
    }

    // GET /api/settings/maintenance - État du mode maintenance
    if (path === '/settings/maintenance' || path === '/settings/maintenance/') {
      try {
        const enabled = await appSettingsService.getMaintenanceMode();
        return handleCORS(APIResponse.success({
          enabled,
          message: ''
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /settings/maintenance'));
      }
    }

    // GET /api/settings - Paramètres système
    if (path === '/settings' || path === '/settings/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        // Récupérer les paramètres sauvegardés ou les defaults
        const appSettings = await appSettingsService.getAppSettings();

        const defaultSettings = {
          appName: 'PM - Gestion de Projets',
          appDescription: 'Plateforme de gestion de projets Agile',
          langue: 'fr',
          timezone: 'Africa/Porto-Novo',
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
        };

        return handleCORS(APIResponse.success({
          settings: { ...defaultSettings, ...appSettings }
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /settings'));
      }
    }

    // GET /api/tasks - Liste tâches avec filtres (OPTIMIZED)
    if (path === '/tasks' || path === '/tasks/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        const projetId = url.searchParams.get('projet_id');
        const sprintId = url.searchParams.get('sprint_id');
        const assignéÀ = url.searchParams.get('assigné_à');
        const statut = url.searchParams.get('statut');
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
        const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
        const skip = (page - 1) * limit;

        const query = {};

        // Handle filtering based on permissions
        if (projetId) {
          query.projet_id = projetId;

          // Check if user has access to this project
          if (!user.role_id?.permissions?.voirTousProjets && !user.role_id?.permissions?.adminConfig) {
            const hasAccess = await projectService.canUserAccessProject(user._id, projetId);
            if (!hasAccess) {
              return handleCORS(APIResponse.forbidden('Accès refusé au projet'));
            }
          }
        } else {
          // Filtrer par projets accessibles si l'utilisateur n'est pas admin
          const accessibleProjectIds = await projectService.getAccessibleProjectIds(user._id, user.role_id);
          if (accessibleProjectIds !== null) {
            if (accessibleProjectIds.length === 0) {
              return handleCORS(APIResponse.success([], null, 200, { page, limit, total: 0, pages: 0 }));
            }
            query.projet_id = { $in: accessibleProjectIds };
          }
        }

        // Apply other filters if provided
        if (sprintId) query.sprint_id = sprintId;
        if (assignéÀ) query.assigné_à = assignéÀ;
        if (statut) query.statut = statut;

        const { tasks, total } = await taskService.getTasksByFilter(query, limit, skip);

        return handleCORS(APIResponse.success(tasks, null, 200, {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /tasks'));
      }
    }

    // GET /api/expenses - Liste dépenses avec filtres (OPTIMIZED with pagination)
    if (path === '/expenses' || path === '/expenses/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = url.searchParams.get('projet_id');
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
      const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
      const skip = (page - 1) * limit;
      const query = {};

      if (projectId) {
        query.projet_id = projectId;
        const project = await Project.findById(projectId)
          .select('chef_projet product_owner membres.user_id')
          .lean();

        if (!project) {
          return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
        }

        const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
          user.role_id?.permissions?.adminConfig;

        const isMember = project.chef_projet?.toString() === user._id.toString() ||
          project.product_owner?.toString() === user._id.toString() ||
          project.membres?.some(m => m.user_id?.toString() === user._id.toString());

        if (!hasSystemAccess && !isMember && !user.role_id?.permissions?.voirBudget) {
          return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
        }
      } else {
        if (!user.role_id?.permissions?.voirBudget && !user.role_id?.permissions?.adminConfig) {
          return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
        }
      }

      const [expenses, total] = await Promise.all([
        Expense.find(query)
          .populate('saisi_par', 'nom_complet email')
          .populate('validé_par', 'nom_complet email')
          .populate('projet_id', 'nom')
          .sort({ date_dépense: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Expense.countDocuments(query)
      ]);

      return handleCORS(NextResponse.json({
        expenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }));
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

    // GET /api/comments - Liste commentaires (OPTIMIZED with pagination)
    if (path === '/comments' || path === '/comments/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const entityType = url.searchParams.get('entity_type');
      const entityId = url.searchParams.get('entity_id');
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
      const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
      const skip = (page - 1) * limit;

      const query = { supprimé: { $ne: true } }; // Exclure les commentaires supprimés
      if (entityType) query.entity_type = entityType;
      if (entityId) query.entity_id = entityId;

      // SECURITY: Filtrer les commentaires par projets accessibles
      // Si un entityId est spécifié et c'est un projet, vérifier l'accès
      if (entityType === 'projet' && entityId) {
        if (!user.role_id?.permissions?.voirTousProjets && !user.role_id?.permissions?.adminConfig) {
          const hasAccess = await projectService.canUserAccessProject(user._id, entityId);
          if (!hasAccess) {
            return handleCORS(NextResponse.json({ comments: [], pagination: { page: 1, limit, total: 0, pages: 0 } }));
          }
        }
      } else if (!entityId) {
        // Si pas d'entityId spécifié, filtrer par projets accessibles
        const accessibleProjectIds = await projectService.getAccessibleProjectIds(user._id, user.role_id);
        if (accessibleProjectIds !== null) {
          if (accessibleProjectIds.length === 0) {
            return handleCORS(NextResponse.json({ comments: [], pagination: { page: 1, limit, total: 0, pages: 0 } }));
          }
          // Filtrer les commentaires liés aux projets accessibles
          query.$or = [
            { entity_type: 'projet', entity_id: { $in: accessibleProjectIds.map(id => id.toString()) } },
            { entity_type: 'task', entity_id: { $in: await Task.find({ projet_id: { $in: accessibleProjectIds } }).distinct('_id') } }
          ];
        }
      }

      const [comments, total] = await Promise.all([
        Comment.find(query)
          .populate('auteur', 'nom_complet email avatar')
          .populate('mentions', 'nom_complet')
          .populate('parent_id')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Comment.countDocuments(query)
      ]);

      return handleCORS(NextResponse.json({
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }));
    }

    // GET /api/activity - Flux d'activité global
    if (path === '/activity' || path === '/activity/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      // SECURITY FIX: Require voirAudit permission to view activity
      if (!user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas la permission de consulter l\'historique d\'activité' }, { status: 403 }));
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

      // User must have gererFichiers permission to access files
      if (!user.role_id?.permissions?.gererFichiers) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé - permission gererFichiers requise' }, { status: 403 }));
      }

      const projetId = url.searchParams.get('projet_id');
      const folder = url.searchParams.get('folder');

      const query = {};
      if (projetId) query.projet_id = projetId;
      if (folder) query.dossier = folder;

      const files = await File.find(query)
        .populate('uploadé_par', 'nom_complet email')
        .sort({ created_at: -1 })
        .limit(200); // Add pagination limit for performance

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

      // User must have gererFichiers permission to download files
      if (!user.role_id?.permissions?.gererFichiers) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé - permission gererFichiers requise' }, { status: 403 }));
      }

      const fileId = path.split('/')[2];
      const file = await File.findById(fileId);

      if (!file) {
        return handleCORS(NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 }));
      }

      // Verify user is member of the project that owns this file
      if (file.projet_id) {
        const project = await Project.findById(file.projet_id);
        if (!project) {
          return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
        }

        const isMember = project.chef_projet.toString() === user._id.toString() ||
          project.product_owner?.toString() === user._id.toString() ||
          project.membres.some(m => m.user_id.toString() === user._id.toString());

        if (!isMember && !user.role_id?.permissions?.adminConfig) {
          return handleCORS(NextResponse.json({ error: 'Vous n\'êtes pas membre de ce projet' }, { status: 403 }));
        }
      }

      // Extraire les données base64
      if (file.url && file.url.startsWith('data:')) {
        const base64Data = file.url.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Log file download activity
        await logActivity(user, 'download_fichier', 'fichier', file._id, `Téléchargement du fichier: ${file.nom}`, {
          request,
          severity: 'info',
          relatedProjectId: file.projet_id || null,
          metadata: {
            fileName: file.nom,
            fileSize: buffer.length,
            mimeType: file.type_mime || file.type,
            dossier: file.dossier
          }
        });

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': file.type_mime || file.type || 'application/octet-stream',
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

      try {
        const enabled = await appSettingsService.getMaintenanceMode();
        return handleCORS(NextResponse.json({
          enabled,
          message: enabled ? 'L\'application est actuellement en maintenance.' : ''
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /admin/maintenance'));
      }
    }

    // GET /api/sharepoint/config - Configuration SharePoint
    if (path === '/sharepoint/config' || path === '/sharepoint/config/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      try {
        const SharePointConfig = (await import('@/models/SharePointConfig')).default;
        const config = await SharePointConfig.getConfig();

        return handleCORS(NextResponse.json({
          enabled: config.enabled || false,
          config: {
            tenant_id: config.tenant_id || '',
            site_id: config.site_id || '',
            client_id: config.client_id || '',
            client_secret: config.client_secret ? '********' : '',
            auto_sync: config.sync_enabled || false,
            sync_interval: config.sync_interval || 60
          },
          status: {
            connected: config.connection_status?.connected || false,
            last_test: config.connection_status?.last_test || null,
            site_name: config.connection_status?.site_name || null,
            site_url: config.connection_status?.site_url || null,
            last_error: config.connection_status?.last_error || null
          },
          sync_stats: {
            last_sync: config.sync_stats?.last_sync || null,
            files_synced: config.sync_stats?.files_synced || 0,
            files_failed: config.sync_stats?.files_failed || 0,
            errors: config.sync_stats?.errors?.slice(0, 10) || []
          }
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'GET /sharepoint/config'));
      }
    }

    // GET /api/sprints - Liste sprints
    if (path === '/sprints' || path === '/sprints/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projetId = url.searchParams.get('projet_id');
      const query = {};

      if (projetId) {
        // Vérifier l'accès au projet spécifié
        if (!user.role_id?.permissions?.voirTousProjets && !user.role_id?.permissions?.adminConfig) {
          const hasAccess = await projectService.canUserAccessProject(user._id, projetId);
          if (!hasAccess) {
            return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
          }
        }
        query.projet_id = projetId;
      } else {
        // Filtrer par projets accessibles si l'utilisateur n'est pas admin
        const accessibleProjectIds = await projectService.getAccessibleProjectIds(user._id, user.role_id);
        if (accessibleProjectIds !== null) {
          if (accessibleProjectIds.length === 0) {
            return handleCORS(NextResponse.json({ sprints: [] }));
          }
          query.projet_id = { $in: accessibleProjectIds };
        }
      }

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
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 100, 500);
      const page = Math.max(parseInt(url.searchParams.get('page')) || 1, 1);
      const skip = (page - 1) * limit;

      const query = {};
      if (projetId) query.projet_id = projetId;
      if (userId) query.utilisateur = userId;
      else if (!user.role_id?.permissions?.voirTempsPasses) {
        query.utilisateur = user._id;
      }

      const timesheets = await TimesheetEntry.find(query)
        .populate('utilisateur', 'nom_complet email')
        .populate('task_id', 'titre')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);

      const total = await TimesheetEntry.countDocuments(query);

      return handleCORS(NextResponse.json({
        timesheets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }));
    }

    // GET /api/audit - Journal d'audit
    if (path === '/audit' || path === '/audit/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }
      return handleCORS(await handleGetAuditLogs(request.url, user));
    }

    // GET /api/audit/user/:userId - Activity for specific user
    if (path.match(/^\/audit\/user\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }
      const userId = path.split('/')[3];
      return handleCORS(await handleGetUserActivity(userId, request.url, user));
    }

    // GET /api/audit/stats - Statistics
    if (path === '/audit/stats' || path === '/audit/stats/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }
      return handleCORS(await handleGetAuditStatistics(request.url, user));
    }

    // GET /api/audit/export - Export audit logs
    if (path === '/audit/export' || path === '/audit/export/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }
      return handleCORS(await handleExportAuditLogs(request.url, user));
    }

    // GET /api/audit/actions - Get available actions and entity types for filters
    if (path === '/audit/actions' || path === '/audit/actions/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }
      return handleCORS(handleGetAvailableActions(user));
    }

    // GET /api/audit/summary - Quick audit summary
    if (path === '/audit/summary' || path === '/audit/summary/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }
      const searchParams = new URL(request.url).searchParams;
      const hoursWindow = parseInt(searchParams.get('hours')) || 24;

      try {
        const now = new Date();
        const startDate = new Date(now.getTime() - hoursWindow * 60 * 60 * 1000);

        const [totalLogs, activitiesByAction, activitiesByUser] = await Promise.all([
          AuditLog.countDocuments({ timestamp: { $gte: startDate } }),
          AuditLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]),
          AuditLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            { $group: { _id: '$utilisateur_nom', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ])
        ]);

        return handleCORS(NextResponse.json({
          summary: {
            hoursWindow,
            totalActivities: totalLogs,
            activitiesByAction,
            topUsers: activitiesByUser,
            periodStart: startDate.toISOString(),
            periodEnd: now.toISOString()
          }
        }));
      } catch (error) {
        const safeError = createSecureErrorResponse(error, 500);
        return handleCORS(NextResponse.json({ error: safeError.message }, { status: safeError.statusCode }));
      }
    }

    // GET /api/audit/entity/:entityType/:entityId - Activities for specific entity
    if (path.match(/^\/audit\/entity\/[^/]+\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.voirAudit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const parts = path.split('/');
      const entityType = parts[3];
      const entityId = parts[4];
      const searchParams = new URL(request.url).searchParams;
      const limit = parseInt(searchParams.get('limit')) || 100;

      try {
        const logs = await AuditLog.find({
          entity_type: entityType,
          entity_id: entityId
        })
          .populate('utilisateur', 'nom_complet email')
          .sort({ timestamp: -1 })
          .limit(limit);

        return handleCORS(NextResponse.json({
          entityType,
          entityId,
          activities: logs,
          total: logs.length
        }));
      } catch (error) {
        const safeError = createSecureErrorResponse(error, 500);
        return handleCORS(NextResponse.json({ error: safeError.message }, { status: safeError.statusCode }));
      }
    }

    return handleCORS(NextResponse.json({ 
      message: 'API PM - Gestion de Projets',
      path: path
    }));

  } catch (error) {
    const safeError = createSecureErrorResponse(error, 500);
    return handleCORS(NextResponse.json({ error: safeError.message }, { status: safeError.statusCode }));
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
    } catch (_e) {
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

      // Charger les paramètres de sécurité pour la validation du mot de passe
      let securitySettings = {};
      try {
        securitySettings = await appSettingsService.getSecuritySettings();
      } catch (_e) {
        // Utiliser les valeurs par défaut en cas d'erreur
      }

      const passwordValidation = validatePassword(password, securitySettings);
      if (!passwordValidation.valid) {
        return handleCORS(NextResponse.json({
          error: passwordValidation.message
        }, { status: 400 }));
      }

      await initializeRoles();

      const adminRole = await Role.findOne({ nom: 'Super Administrateur' });
      if (!adminRole) {
        return handleCORS(NextResponse.json({
          error: 'Erreur d\'initialisation des rôles'
        }, { status: 500 }));
      }

      const hashedPassword = await hashPassword(password);
      console.log('[FirstAdmin] Creating admin with email:', email.toLowerCase());
      console.log('[FirstAdmin] Password hashed successfully');
      console.log('[FirstAdmin] Role ID:', adminRole._id);

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

      console.log('[FirstAdmin] User created successfully:', user._id);
      console.log('[FirstAdmin] User email:', user.email);
      console.log('[FirstAdmin] User password stored:', !!user.password);

      await logActivity(user, 'création', 'utilisateur', user._id, 'Création du premier administrateur', { request, httpMethod: 'POST', endpoint: '/auth/first-admin', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Premier administrateur créé avec succès',
        success: true
      }));
    }

    // POST /api/auth/login - Connexion
    if (path === '/auth/login' || path === '/auth/login/') {
      // Charger les paramètres de sécurité
      let securitySettings;
      try {
        securitySettings = await appSettingsService.getSecuritySettings();
      } catch (e) {
        // En cas d'erreur, utiliser les valeurs par défaut
        securitySettings = { maxLoginAttempts: 5, lockoutDuration: 15, sessionTimeout: 30 };
      }

      // Rate limiting: attempts per IP
      const clientIP = getClientIP(request);
      const loginLimit = checkRateLimit(clientIP, RATE_LIMIT_CONFIG.login);

      if (!loginLimit.allowed) {
        const response = NextResponse.json({
          error: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
          retryAfter: loginLimit.resetTime
        }, { status: 429 });
        response.headers.set('Retry-After', loginLimit.resetTime.toString());
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      const { email, password } = body;

      if (!email || !password) {
        const response = NextResponse.json({
          error: 'Email et mot de passe requis'
        }, { status: 400 });
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      console.log('[Login] Attempting login for email:', email.toLowerCase());

      let user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('role_id');

      if (!user) {
        console.log('[Login] User not found for email:', email.toLowerCase());
        const response = NextResponse.json({
          error: 'Email ou mot de passe incorrect'
        }, { status: 401 });
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      console.log('[Login] User found:', user.nom_complet, '| Status:', user.status, '| Has password:', !!user.password);

      if (user.status !== 'Actif') {
        console.log('[Login] User account not active:', user.status);
        const response = NextResponse.json({
          error: 'Compte désactivé'
        }, { status: 403 });
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      // Check if account is locked due to failed login attempts
      if (user.lockUntil && user.lockUntil > new Date()) {
        const minutesRemaining = Math.ceil((user.lockUntil - new Date()) / 60000);
        console.log('[Login] Account locked for user:', email.toLowerCase(), 'Minutes remaining:', minutesRemaining);
        await logActivity(user, 'login_failed', 'utilisateur', user._id, `Tentative de connexion - Compte verrouillé (${minutesRemaining} min restantes)`, { request, httpMethod: 'POST', endpoint: '/auth/login', httpStatus: 423 });
        const response = NextResponse.json({
          error: `Compte temporairement verrouillé après trop de tentatives. Veuillez réessayer dans ${minutesRemaining} minute(s).`
        }, { status: 423 });
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      const isValidPassword = await verifyPassword(password, user.password);
      console.log('[Login] Password valid:', isValidPassword);
      if (!isValidPassword) {
        console.log('[Login] Invalid password for user:', email.toLowerCase());
        // Increment failed login attempts avec paramètres configurables
        const { maxLoginAttempts, lockoutDuration } = securitySettings;
        await user.incLoginAttempts(maxLoginAttempts, lockoutDuration);
        // Reload user to get updated lockUntil if account got locked
        user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('role_id');
        const failedAttempts = user.failedLoginAttempts;
        const isNowLocked = user.lockUntil && user.lockUntil > new Date();

        let errorMessage = 'Email ou mot de passe incorrect';
        if (isNowLocked) {
          const minutesRemaining = Math.ceil((user.lockUntil - new Date()) / 60000);
          errorMessage = `Trop de tentatives échouées. Compte verrouillé pour ${minutesRemaining} minute(s).`;
        } else {
          const remainingAttempts = Math.max(0, maxLoginAttempts - failedAttempts);
          if (remainingAttempts > 0 && remainingAttempts < 3) {
            errorMessage = `Email ou mot de passe incorrect. ${remainingAttempts} tentative(s) restante(s) avant verrouillage.`;
          }
        }

        await logActivity(user, 'login_failed', 'utilisateur', user._id, 'Mot de passe incorrect', { request, httpMethod: 'POST', endpoint: '/auth/login', httpStatus: 401 });

        const response = NextResponse.json({
          error: errorMessage
        }, { status: 401 });
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      // Check if 2FA is enabled for this user
      if (user.twoFactorEnabled) {
        console.log('[Login] 2FA enabled for user:', email.toLowerCase());
        // Don't generate token yet - require 2FA verification
        const response = NextResponse.json({
          requires2FA: true,
          email: user.email,
          message: 'Authentification à deux facteurs requise'
        }, { status: 200 });
        Object.entries(getRateLimitHeaders(loginLimit)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return handleCORS(response);
      }

      const token = await signToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role_id?.nom || 'user'
      });

      // Reset failed login attempts on successful login
      await user.resetLoginAttempts();

      await logActivity(user, 'connexion', 'utilisateur', user._id, 'Connexion réussie', { request, httpMethod: 'POST', endpoint: '/auth/login', httpStatus: 200 });

      const response = NextResponse.json({
        token,
        user: {
          id: user._id,
          nom_complet: user.nom_complet,
          email: user.email,
          role: {
            id: user.role_id._id,
            nom: user.role_id.nom,
            description: user.role_id.description,
            permissions: user.role_id.permissions,
            visibleMenus: user.role_id.visibleMenus
          },
          avatar: user.avatar,
          first_login: user.first_login,
          must_change_password: user.must_change_password
        }
      });

      // Set HttpOnly cookie for secure token storage
      response.headers.set('Set-Cookie', createAuthCookieHeader(token));

      return handleCORS(response);
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

      // Charger les paramètres de sécurité pour la validation du mot de passe
      let securitySettings = {};
      try {
        securitySettings = await appSettingsService.getSecuritySettings();
      } catch (_e) {
        // Utiliser les valeurs par défaut en cas d'erreur
      }

      const passwordValidation = validatePassword(new_password, securitySettings);
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

      await logActivity(user, 'modification', 'utilisateur', user._id, 'Reset mot de passe premier login', { request, httpMethod: 'POST', endpoint: '/auth/reset-password', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Mot de passe modifié avec succès',
        success: true
      }));
    }

    // POST /api/auth/2fa/setup - Initialize 2FA setup (get QR code)
    if (path === '/auth/2fa/setup' || path === '/auth/2fa/setup/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        // Get app name from settings
        const appSettings = await appSettingsService.getAppSettings();
        const appName = appSettings.appName || 'PM Gestion';

        // Generate new secret
        const { secret, qrCodeUrl, otpauthUrl } = await generateTwoFactorSecret(user.email, appName);

        // Store pending secret (not yet verified)
        await User.findByIdAndUpdate(user._id, {
          twoFactorPendingSecret: secret
        });

        return handleCORS(APIResponse.success({
          qrCodeUrl,
          secret, // Manual entry backup
          message: 'Scannez le QR code avec votre application d\'authentification'
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'POST /auth/2fa/setup'));
      }
    }

    // POST /api/auth/2fa/verify-setup - Verify and activate 2FA
    if (path === '/auth/2fa/verify-setup' || path === '/auth/2fa/verify-setup/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        const { token } = body;
        if (!token) {
          return handleCORS(APIResponse.badRequest('Code de vérification requis'));
        }

        // Get pending secret
        const userWithSecret = await User.findById(user._id).select('+twoFactorPendingSecret');
        if (!userWithSecret.twoFactorPendingSecret) {
          return handleCORS(APIResponse.badRequest('Veuillez d\'abord initialiser la configuration 2FA'));
        }

        // Verify token
        const isValid = verifyTwoFactorToken(token, userWithSecret.twoFactorPendingSecret);
        if (!isValid) {
          return handleCORS(APIResponse.badRequest('Code invalide. Veuillez réessayer.'));
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);

        // Activate 2FA
        await User.findByIdAndUpdate(user._id, {
          twoFactorEnabled: true,
          twoFactorSecret: userWithSecret.twoFactorPendingSecret,
          twoFactorBackupCodes: backupCodes,
          $unset: { twoFactorPendingSecret: 1 }
        });

        await logActivity(user, 'modification', 'utilisateur', user._id, 'Activation 2FA', { request, httpMethod: 'POST', endpoint: '/auth/2fa/verify-setup', httpStatus: 200 });

        return handleCORS(APIResponse.success({
          message: 'Authentification à deux facteurs activée',
          backupCodes, // Show once to user
          warning: 'Conservez ces codes de récupération en lieu sûr. Ils ne seront plus affichés.'
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'POST /auth/2fa/verify-setup'));
      }
    }

    // POST /api/auth/2fa/verify - Verify 2FA token during login
    if (path === '/auth/2fa/verify' || path === '/auth/2fa/verify/') {
      try {
        const { email, token, isBackupCode } = body;

        if (!email || !token) {
          return handleCORS(APIResponse.badRequest('Email et code requis'));
        }

        await connectDB();
        const user = await User.findOne({ email: email.toLowerCase() })
          .select('+twoFactorSecret +twoFactorBackupCodes +password')
          .populate('role_id');

        if (!user || !user.twoFactorEnabled) {
          return handleCORS(APIResponse.badRequest('2FA non configuré pour cet utilisateur'));
        }

        let isValid = false;
        let newBackupCodes = user.twoFactorBackupCodes;

        if (isBackupCode) {
          // Verify backup code
          const result = verifyBackupCode(token, user.twoFactorBackupCodes || []);
          isValid = result.valid;
          newBackupCodes = result.remainingCodes;

          if (isValid) {
            // Update remaining backup codes
            await User.findByIdAndUpdate(user._id, {
              twoFactorBackupCodes: newBackupCodes
            });
          }
        } else {
          // Verify TOTP token
          isValid = verifyTwoFactorToken(token, user.twoFactorSecret);
        }

        if (!isValid) {
          return handleCORS(APIResponse.badRequest('Code invalide'));
        }

        // Load security settings for token expiration
        let securitySettings;
        try {
          securitySettings = await appSettingsService.getSecuritySettings();
        } catch (e) {
          securitySettings = { sessionTimeout: 30 };
        }

        // Generate JWT token (same as normal login)
        const jwtToken = await signToken({
          userId: user._id.toString(),
          email: user.email,
          role: user.role_id?.nom
        }, Math.ceil(securitySettings.sessionTimeout / (60 * 24)) || 7);

        // Reset login attempts
        await user.resetLoginAttempts();

        await logActivity(user, 'connexion', 'utilisateur', user._id, 'Connexion réussie avec 2FA', { request, httpMethod: 'POST', endpoint: '/auth/2fa/verify', httpStatus: 200 });

        const response = APIResponse.success({
          message: 'Connexion réussie',
          token: jwtToken,
          user: {
            id: user._id,
            nom_complet: user.nom_complet,
            email: user.email,
            role: user.role_id,
            first_login: user.first_login,
            must_change_password: user.must_change_password
          },
          backupCodesRemaining: isBackupCode ? newBackupCodes.length : undefined
        });

        response.headers.set('Set-Cookie', createAuthCookieHeader(jwtToken));
        return handleCORS(response);
      } catch (error) {
        return handleCORS(handleError(error, 'POST /auth/2fa/verify'));
      }
    }

    // POST /api/auth/2fa/disable - Disable 2FA
    if (path === '/auth/2fa/disable' || path === '/auth/2fa/disable/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        const { password, token } = body;
        if (!password) {
          return handleCORS(APIResponse.badRequest('Mot de passe requis'));
        }

        // Verify password
        const userWithPassword = await User.findById(user._id).select('+password +twoFactorSecret');
        const isPasswordValid = await verifyPassword(password, userWithPassword.password);
        if (!isPasswordValid) {
          return handleCORS(APIResponse.badRequest('Mot de passe incorrect'));
        }

        // If 2FA is enabled, require current 2FA token
        if (userWithPassword.twoFactorSecret && token) {
          const isValid = verifyTwoFactorToken(token, userWithPassword.twoFactorSecret);
          if (!isValid) {
            return handleCORS(APIResponse.badRequest('Code 2FA invalide'));
          }
        }

        // Disable 2FA
        await User.findByIdAndUpdate(user._id, {
          twoFactorEnabled: false,
          $unset: {
            twoFactorSecret: 1,
            twoFactorBackupCodes: 1,
            twoFactorPendingSecret: 1
          }
        });

        await logActivity(user, 'modification', 'utilisateur', user._id, 'Désactivation 2FA', { request, httpMethod: 'POST', endpoint: '/auth/2fa/disable', httpStatus: 200 });

        return handleCORS(APIResponse.success({
          message: 'Authentification à deux facteurs désactivée'
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'POST /auth/2fa/disable'));
      }
    }

    // POST /api/auth/2fa/regenerate-codes - Regenerate backup codes
    if (path === '/auth/2fa/regenerate-codes' || path === '/auth/2fa/regenerate-codes/') {
      try {
        const user = await authenticate(request);
        if (!user) {
          return handleCORS(APIResponse.unauthorized());
        }

        const { password } = body;
        if (!password) {
          return handleCORS(APIResponse.badRequest('Mot de passe requis'));
        }

        // Verify password
        const userWithPassword = await User.findById(user._id).select('+password');
        const isPasswordValid = await verifyPassword(password, userWithPassword.password);
        if (!isPasswordValid) {
          return handleCORS(APIResponse.badRequest('Mot de passe incorrect'));
        }

        // Check if 2FA is enabled
        const userWith2FA = await User.findById(user._id);
        if (!userWith2FA.twoFactorEnabled) {
          return handleCORS(APIResponse.badRequest('2FA n\'est pas activé'));
        }

        // Generate new backup codes
        const backupCodes = generateBackupCodes(10);
        await User.findByIdAndUpdate(user._id, {
          twoFactorBackupCodes: backupCodes
        });

        await logActivity(user, 'modification', 'utilisateur', user._id, 'Régénération codes de récupération 2FA', { request, httpMethod: 'POST', endpoint: '/auth/2fa/regenerate-codes', httpStatus: 200 });

        return handleCORS(APIResponse.success({
          message: 'Nouveaux codes de récupération générés',
          backupCodes,
          warning: 'Les anciens codes ont été invalidés. Conservez ces nouveaux codes en lieu sûr.'
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'POST /auth/2fa/regenerate-codes'));
      }
    }

    // POST /api/users - Créer utilisateur (admin ou super-admin)
    if (path === '/users' || path === '/users/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.gererUtilisateurs) {
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

      // Populate role for response
      await newUser.populate('role_id');

      await logActivity(user, 'création', 'utilisateur', newUser._id, `Création utilisateur ${nom_complet}`, { request, httpMethod: 'POST', endpoint: '/users', httpStatus: 201 });

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
          role: newUser.role_id ? {
            id: newUser.role_id._id,
            nom: newUser.role_id.nom,
            description: newUser.role_id.description,
            permissions: newUser.role_id.permissions,
            visibleMenus: newUser.role_id.visibleMenus
          } : null,
          status: newUser.status
        }
      }));
    }

    // POST /api/users/:userId/unlock - Débloquer compte utilisateur (admin)
    if (path.match(/^\/users\/[^/]+\/unlock\/?$/)) {
      const user = await authenticate(request);
      if (!user || (!user.role_id?.permissions?.gererUtilisateurs && !user.role_id?.permissions?.adminConfig)) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const userId = path.split('/')[2];
      const targetUser = await User.findById(userId);

      if (!targetUser) {
        return handleCORS(NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 }));
      }

      // Reset failed login attempts and remove lock
      await targetUser.updateOne({
        $set: { failedLoginAttempts: 0 },
        $unset: { lockUntil: 1 }
      });

      await logActivity(user, 'déblocage', 'utilisateur', targetUser._id, `Compte de ${targetUser.nom_complet} débloqué par administrateur`, { request, httpMethod: 'POST', endpoint: `/users/${userId}/unlock`, httpStatus: 200 });

      await createNotification(
        targetUser._id,
        'sécurité',
        'Compte débloqué',
        'Votre compte a été débloqué par un administrateur. Vous pouvez maintenant vous connecter.',
        'utilisateur',
        targetUser._id,
        targetUser.nom_complet,
        user._id
      );

      return handleCORS(NextResponse.json({
        message: `Compte de ${targetUser.nom_complet} débloqué avec succès`,
        user: {
          id: targetUser._id,
          nom_complet: targetUser.nom_complet,
          email: targetUser.email,
          failedLoginAttempts: 0,
          isLocked: false
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
        membres: [],
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

      // Initialize 8 predefined project roles for the new project
      const projectRoleIds = await initializeProjectRoles(project._id);
      const memberRole = projectRoleIds[3]; // "Membre Équipe" is the 4th role (index 3)

      // Add initial members with proper project roles
      if (membres.length > 0) {
        project.membres = membres.map(m => ({
          user_id: m,
          project_role_id: memberRole,
          date_ajout: new Date()
        }));
        await project.save();
      }

      await ProjectTemplate.findByIdAndUpdate(template_id, {
        $inc: { utilisé_count: 1 }
      });

      await logActivity(user, 'création', 'projet', project._id, `Création projet ${nom}`, { request, httpMethod: 'POST', endpoint: '/projects', httpStatus: 201, relatedProjectId: project._id });

      if (membres.length > 0) {
        await createNotificationsBatch(
          membres,
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

    // POST /api/projects/:id/members - Ajouter membre au projet
    if (path.match(/^\/projects\/[^/]+\/members\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier les permissions
      const canManage = user.role_id?.permissions?.adminConfig ||
        user.role_id?.permissions?.gererMembresProjet ||
        project.chef_projet.toString() === user._id.toString();

      if (!canManage) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { user_id, project_role_id } = body;

      if (!user_id || !project_role_id) {
        return handleCORS(NextResponse.json({
          error: 'user_id et project_role_id requis'
        }, { status: 400 }));
      }

      // Vérifier si c'est un rôle système ou un rôle de projet
      let projectRole = await ProjectRole.findById(project_role_id);

      if (!projectRole || projectRole.project_id.toString() !== projectId) {
        // Essayer de le résoudre comme rôle système
        const systemRole = await Role.findById(project_role_id);

        if (!systemRole) {
          return handleCORS(NextResponse.json({
            error: 'Rôle invalide'
          }, { status: 400 }));
        }

        // Chercher un ProjectRole avec le même nom dans ce projet
        projectRole = await ProjectRole.findOne({
          project_id: projectId,
          nom: systemRole.nom
        });

        // Si pas de ProjectRole correspondant, en créer un basé sur le rôle système
        if (!projectRole) {
          projectRole = await ProjectRole.create({
            project_id: projectId,
            nom: systemRole.nom,
            description: systemRole.description,
            is_predefined: systemRole.is_predefined,
            permissions: systemRole.permissions,
            visibleMenus: systemRole.visibleMenus
          });
        }
      }

      // Vérifier que l'utilisateur existe
      const targetUser = await User.findById(user_id);
      if (!targetUser) {
        return handleCORS(NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 }));
      }

      // Vérifier que l'utilisateur n'est pas déjà dans le projet
      const exists = project.membres.some(m => m.user_id.toString() === user_id);
      if (exists) {
        return handleCORS(NextResponse.json({ error: 'Cet utilisateur est déjà membre du projet' }, { status: 400 }));
      }

      // Ajouter le membre avec le rôle de projet (utiliser l'ID du ProjectRole, pas du Role système)
      project.membres.push({
        user_id,
        project_role_id: projectRole._id,
        date_ajout: new Date()
      });

      await project.save();

      // Invalider le cache du projet pour que les changements soient visibles immédiatement
      const projectServiceModule = await import('@/lib/services/projectService');
      const projectServiceInstance = projectServiceModule.default;
      if (projectServiceInstance?.invalidateCache) {
        projectServiceInstance.invalidateCache(projectId);
      }

      // Créer notification
      await createNotification(
        user_id,
        'ajout_projet',
        'Ajouté à un projet',
        `Vous avez été ajouté au projet ${project.nom} avec le rôle ${projectRole.nom}`,
        'projet',
        project._id,
        project.nom,
        user._id
      );

      await logActivity(user, 'modification', 'projet', project._id, `Ajout membre ${targetUser.nom_complet} au projet ${project.nom} (rôle: ${projectRole.nom})`, { request, httpMethod: 'POST', endpoint: '/projects/:id/members', httpStatus: 201, relatedProjectId: project._id });

      return handleCORS(NextResponse.json({
        message: 'Membre ajouté avec succès',
        member: project.membres[project.membres.length - 1]
      }));
    }

    // POST /api/projects/:id/roles - Créer rôle personnalisé pour le projet
    if (path.match(/^\/projects\/[^/]+\/roles\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier les permissions : seul le chef de projet ou admin peut créer des rôles
      const canManageRoles = user.role_id?.permissions?.adminConfig ||
        user.role_id?.permissions?.gererMembresProjet ||
        project.chef_projet.toString() === user._id.toString();

      if (!canManageRoles) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, description, permissions, visibleMenus } = body;

      if (!nom || !permissions || !visibleMenus) {
        return handleCORS(NextResponse.json({
          error: 'Nom, permissions et visibleMenus sont requis'
        }, { status: 400 }));
      }

      // Créer le rôle personnalisé
      const customRole = await ProjectRole.create({
        nom,
        description,
        project_id: projectId,
        is_custom: true,
        is_predefined: false,
        permissions,
        visibleMenus
      });

      // Ajouter le rôle à la liste des rôles personnalisés du projet
      if (!project.custom_project_roles) {
        project.custom_project_roles = [];
      }
      project.custom_project_roles.push(customRole._id);
      await project.save();

      await logActivity(user, 'création', 'rôle_projet', customRole._id, `Création rôle personnalisé ${nom} pour projet ${project.nom}`, { request, httpMethod: 'POST', endpoint: '/projects/:id/roles', httpStatus: 201, relatedProjectId: project._id });

      return handleCORS(NextResponse.json({
        message: 'Rôle personnalisé créé avec succès',
        role: customRole
      }));
    }

    // POST /api/tasks - Créer tâche
    if (path === '/tasks' || path === '/tasks/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
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
        deliverable_id,
        labels = [],
        tags = [],
        date_échéance,
        date_début
      } = body;

      if (!projet_id || !titre) {
        return handleCORS(NextResponse.json({
          error: 'Projet et titre requis'
        }, { status: 400 }));
      }

      // Charger le projet avec ses members et leurs rôles projet
      const project = await Project.findById(projet_id)
        .populate({
          path: 'membres.project_role_id'
        });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Trouver les données du member
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Vérifier accès au projet
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined;

      const canAccessProject = hasSystemAccess || isMember;

      if (!canAccessProject) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas accès à ce projet'
        }, { status: 403 }));
      }

      // Fusionner les permissions (système + projet)
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Vérifier permission fusionnée
      if (!merged.permissions.gererTaches) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de créer des tâches dans ce projet'
        }, { status: 403 }));
      }

      // Validate and normalize task type
      const validTaskTypes = ['Épic', 'Story', 'Tâche', 'Bug'];
      const normalizedType = type || 'Tâche';

      // Map common variations to valid types
      const typeMap = {
        'epic': 'Épic',
        'épic': 'Épic',
        'story': 'Story',
        'tâche': 'Tâche',
        'task': 'Tâche',
        'bug': 'Bug'
      };

      const finalType = typeMap[normalizedType.toLowerCase()] || validTaskTypes.find(t => t.toLowerCase() === normalizedType.toLowerCase()) || 'Tâche';

      // Normalize deliverable_id: convert empty string to null
      const finalDeliverableId = deliverable_id && deliverable_id.toString().trim() !== '' ? deliverable_id : null;

      const task = await Task.create({
        projet_id,
        titre,
        description,
        type: finalType,
        parent_id,
        epic_id,
        statut,
        colonne_kanban: getKanbanColumnId(statut),
        priorité,
        assigné_à,
        story_points,
        estimation_heures,
        sprint_id,
        deliverable_id: finalDeliverableId,
        labels,
        tags,
        date_début,
        date_échéance,
        créé_par: user._id
      });

      await Project.findByIdAndUpdate(projet_id, {
        $inc: { 'stats.total_tâches': 1 }
      });

      await logActivity(user, 'création', 'tâche', task._id, `Création tâche ${titre}`, { request, httpMethod: 'POST', endpoint: '/tasks', httpStatus: 201, relatedProjectId: projet_id });

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

      // Emit real-time event
      await emitToProject(projet_id.toString(), SOCKET_EVENTS.TASK_CREATED, {
        task: {
          _id: task._id,
          titre: task.titre,
          description: task.description,
          statut: task.statut,
          priorité: task.priorité,
          assigné_à: task.assigné_à,
          projet_id: task.projet_id,
          créé_par: user._id,
          created_at: task.created_at
        },
        createdBy: {
          _id: user._id,
          nom_complet: user.nom_complet,
          email: user.email
        }
      });

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

      await logActivity(user, 'création', 'template', template._id, `Création template ${nom}`, { request, httpMethod: 'POST', endpoint: '/project-templates', httpStatus: 201 });

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

      await logActivity(user, 'création', 'rôle', role._id, `Création rôle personnalisé ${nom}`, { request, httpMethod: 'POST', endpoint: '/roles', httpStatus: 201 });

      return handleCORS(NextResponse.json({
        message: 'Rôle créé avec succès',
        role
      }));
    }

    // POST /api/sprints - Créer sprint
    if (path === '/sprints' || path === '/sprints/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const { projet_id, nom, objectif, date_début, date_fin, capacité_équipe } = body;

      if (!projet_id || !nom || !date_début || !date_fin) {
        return handleCORS(NextResponse.json({
          error: 'Champs requis manquants'
        }, { status: 400 }));
      }

      // Charger le projet avec ses members et leurs rôles projet
      const project = await Project.findById(projet_id)
        .populate({
          path: 'membres.project_role_id'
        });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Trouver les données du member
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Vérifier accès au projet
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined;

      const canAccessProject = hasSystemAccess || isMember;

      if (!canAccessProject) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas accès à ce projet'
        }, { status: 403 }));
      }

      // Fusionner les permissions (système + projet)
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Vérifier permission fusionnée
      if (!merged.permissions.gererSprints) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de créer des sprints dans ce projet'
        }, { status: 403 }));
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

      await logActivity(user, 'création', 'sprint', sprint._id, `Création sprint ${nom}`, { request, httpMethod: 'POST', endpoint: '/sprints', httpStatus: 201, relatedProjectId: projet_id });

      return handleCORS(NextResponse.json({
        message: 'Sprint créé avec succès',
        sprint
      }));
    }

    // POST /api/timesheets - Créer entrée timesheet
    if (path === '/timesheets' || path === '/timesheets/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const { projet_id, tâche_id, date, heures, description, type_saisie } = body;

      if (!projet_id || !date || !heures) {
        return handleCORS(NextResponse.json({
          error: 'Champs requis: projet_id, date, heures'
        }, { status: 400 }));
      }

      // Charger le projet avec ses members et leurs rôles projet
      const project = await Project.findById(projet_id)
        .populate({
          path: 'membres.project_role_id'
        });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Trouver les données du member
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Vérifier accès au projet
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined;

      const canAccessProject = hasSystemAccess || isMember;

      if (!canAccessProject) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas accès à ce projet'
        }, { status: 403 }));
      }

      // Fusionner les permissions (système + projet)
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Vérifier permission fusionnée
      if (!merged.permissions.saisirTemps) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de saisir du temps dans ce projet'
        }, { status: 403 }));
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

      await logActivity(user, 'création', 'timesheet', timesheet._id, `Saisie temps ${heures}h`, { request, httpMethod: 'POST', endpoint: '/timesheets', httpStatus: 201 });

      return handleCORS(NextResponse.json({
        message: 'Temps enregistré avec succès',
        timesheet
      }));
    }

    // POST /api/deliverable-types - Créer type de livrable
    if (path === '/deliverable-types' || path === '/deliverable-types/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { nom, description, couleur, workflow_étapes } = body;

      if (!nom) {
        return handleCORS(NextResponse.json({ error: 'Nom requis' }, { status: 400 }));
      }

      const newType = await DeliverableType.create({
        nom,
        description: description || '',
        couleur: couleur || '#6366f1',
        workflow_étapes: workflow_étapes || ['Création', 'Validation'],
        créé_par: user._id
      });

      await logActivity(user, 'création', 'deliverable-type', newType._id, `Création type livrable ${nom}`, { request, httpMethod: 'POST', endpoint: '/deliverable-types', httpStatus: 201 });

      return handleCORS(NextResponse.json({
        message: 'Type de livrable créé',
        type: newType
      }));
    }

    // POST /api/expenses - Créer dépense
    if (path === '/expenses' || path === '/expenses/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      if (!user.role_id?.permissions?.modifierBudget) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { projet_id, catégorie, description, montant, date_dépense, type, fournisseur } = body;

      if (!projet_id || !catégorie || !description || !montant || !date_dépense) {
        return handleCORS(NextResponse.json({
          error: 'Champs requis manquants'
        }, { status: 400 }));
      }

      const project = await Project.findById(projet_id).populate({
        path: 'membres.project_role_id'
      });
      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets || user.role_id?.permissions?.adminConfig;
      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      const merged = getMergedPermissions(user, memberData?.project_role_id);
      if (!merged.permissions.modifierBudget) {
        return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas la permission de modifier le budget' }, { status: 403 }));
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

      await logActivity(user, 'création', 'expense', expense._id, `Création dépense ${montant}€`, { request, httpMethod: 'POST', endpoint: '/expenses', httpStatus: 201 });

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

      // Rate limiting: 50 uploads per hour per user
      const uploadLimit = checkRateLimit(`user:${user._id}`, RATE_LIMIT_CONFIG.upload);
      if (!uploadLimit.allowed) {
        const response = NextResponse.json({
          error: 'Limite d\'uploads dépassée. Veuillez réessayer plus tard.',
          retryAfter: uploadLimit.resetTime
        }, { status: 429 });
        response.headers.set('Retry-After', uploadLimit.resetTime.toString());
        return handleCORS(response);
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const projetId = formData.get('projet_id');
        const folder = formData.get('folder') || '/';

        // SECURITY FIX: If projet_id is specified, verify user has access to project
        if (projetId) {
          const project = await Project.findById(projetId).populate({
            path: 'membres.project_role_id'
          });

          if (!project) {
            return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
          }

          // Check if user is member or has voirTousProjets permission
          const hasSystemAccess = user.role_id?.permissions?.voirTousProjets || user.role_id?.permissions?.adminConfig;
          const isMember = project.chef_projet.toString() === user._id.toString() ||
            project.product_owner?.toString() === user._id.toString() ||
            project.membres.some(m => m.user_id.toString() === user._id.toString());

          if (!hasSystemAccess && !isMember) {
            return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas accès à ce projet' }, { status: 403 }));
          }
        }

        if (!file) {
          return handleCORS(NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 }));
        }

        // File size validation: max 50MB
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          return handleCORS(NextResponse.json({
            error: `La taille du fichier dépasse la limite de ${MAX_FILE_SIZE / 1024 / 1024}MB`
          }, { status: 400 }));
        }

        // MIME type whitelist - allow common file types
        const ALLOWED_MIME_TYPES = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/zip',
          'application/x-zip-compressed'
        ];

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return handleCORS(NextResponse.json({
            error: 'Type de fichier non autorisé. Types acceptés: PDF, Word, Excel, Images, ZIP'
          }, { status: 400 }));
        }

        // Filename validation - prevent path traversal
        const sanitizedFilename = file.name.replace(/\.\.\//g, '').replace(/\0/g, '');
        if (!sanitizedFilename) {
          return handleCORS(NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 }));
        }

        // Convertir le fichier en base64 pour stockage (simple pour MVP)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');

        const fileDoc = await File.create({
          nom: sanitizedFilename,
          nom_original: sanitizedFilename,
          type: file.type,
          type_mime: file.type,
          taille: file.size,
          url: `data:${file.type};base64,${base64}`,
          projet_id: projetId || null,
          dossier: folder || '/',
          entity_type: 'projet',
          entity_id: projetId || null,
          uploadé_par: user._id
        });

        // Synchroniser vers SharePoint si configuré et projet spécifié
        let sharepointInfo = null;
        if (projetId) {
          try {
            const sharepointService = (await import('@/lib/services/sharepointService')).default;
            const isConfigured = await sharepointService.isSharePointConfigured();

            if (isConfigured) {
              const project = await Project.findById(projetId).select('nom');
              if (project) {
                const spResult = await sharepointService.uploadFileToProject(
                  projetId,
                  project.nom,
                  sanitizedFilename,
                  base64,
                  file.type
                );

                // Mettre à jour le fichier avec les infos SharePoint
                fileDoc.sharepoint_id = spResult.id;
                fileDoc.sharepoint_url = spResult.webUrl;
                fileDoc.sharepoint_synced = true;
                fileDoc.last_sync_sharepoint = new Date();
                await fileDoc.save();

                sharepointInfo = {
                  synced: true,
                  sharepoint_id: spResult.id,
                  sharepoint_url: spResult.webUrl
                };
              }
            }
          } catch (spError) {
            // Log l'erreur mais ne pas bloquer l'upload local
            console.error('Erreur sync SharePoint:', spError.message);
            sharepointInfo = {
              synced: false,
              error: spError.message
            };
          }
        }

        await logActivity(user, 'création', 'fichier', fileDoc._id, `Upload fichier ${sanitizedFilename}${sharepointInfo?.synced ? ' (sync SharePoint)' : ''}`, { request, httpMethod: 'POST', endpoint: '/files/upload', httpStatus: 201, relatedProjectId: projetId || null });

        return handleCORS(NextResponse.json({
          message: 'Fichier téléversé avec succès',
          file: fileDoc,
          sharepoint: sharepointInfo
        }));
      } catch (error) {
        console.error('Erreur upload:', error);
        return handleCORS(NextResponse.json({ error: 'Erreur lors du téléversement. Veuillez réessayer.' }, { status: 500 }));
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

      // SECURITY FIX: If projet_id is specified, verify user has access to project
      if (projet_id) {
        const project = await Project.findById(projet_id).populate({
          path: 'membres.project_role_id'
        });

        if (!project) {
          return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
        }

        // Check if user is member or has voirTousProjets permission
        const hasSystemAccess = user.role_id?.permissions?.voirTousProjets || user.role_id?.permissions?.adminConfig;
        const isMember = project.chef_projet.toString() === user._id.toString() ||
          project.product_owner?.toString() === user._id.toString() ||
          project.membres.some(m => m.user_id.toString() === user._id.toString());

        if (!hasSystemAccess && !isMember) {
          return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas accès à ce projet' }, { status: 403 }));
        }
      }

      // Créer un "fichier" de type dossier pour la structure
      const folder = await File.create({
        nom: nom,
        nom_original: nom,
        type: 'folder',
        type_mime: 'application/x-folder',
        taille: 0,
        dossier: parent || '/',
        projet_id: projet_id || null,
        entity_type: 'projet',
        entity_id: projet_id || null,
        uploadé_par: user._id
      });

      await logActivity(user, 'création', 'dossier', folder._id, `Création dossier ${nom}`, {
        request,
        httpMethod: 'POST',
        endpoint: '/files/folder',
        httpStatus: 201,
        relatedProjectId: projet_id || null,
        metadata: { folderName: nom, parentFolder: parent || '/' }
      });

      return handleCORS(NextResponse.json({
        message: 'Dossier créé avec succès',
        folder
      }));
    }

    // POST /api/comments - Créer commentaire
    if (path === '/comments' || path === '/comments/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      // Check system-level comment permission
      if (!user.role_id?.permissions?.commenter) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { entity_type, entity_id, contenu, parent_id, mentions } = body;

      if (!entity_type || !entity_id || !contenu) {
        return handleCORS(NextResponse.json({
          error: 'Champs requis manquants'
        }, { status: 400 }));
      }

      // Validate and normalize entity_type - aligned with Comment model enum
      const validEntityTypes = ['projet', 'tâche', 'livrable', 'sprint'];
      const entityTypeMap = {
        // English -> French mapping for backwards compatibility
        'project': 'projet',
        'projet': 'projet',
        'task': 'tâche',
        'tâche': 'tâche',
        'deliverable': 'livrable',
        'livrable': 'livrable',
        'sprint': 'sprint'
      };
      const normalizedEntityType = entityTypeMap[entity_type.toLowerCase()];

      if (!normalizedEntityType) {
        return handleCORS(NextResponse.json({
          error: `Type d'entité invalide. Doit être: ${validEntityTypes.join(', ')}`
        }, { status: 400 }));
      }

      // If commenting on project entity, verify project access and merged permissions
      let projet_id = null;
      if (normalizedEntityType === 'projet') {
        projet_id = entity_id;
      } else if (normalizedEntityType === 'tâche') {
        const task = await Task.findById(entity_id);
        if (task) projet_id = task.projet_id;
      } else if (normalizedEntityType === 'livrable') {
        const deliverable = await Deliverable.findById(entity_id);
        if (deliverable) projet_id = deliverable.projet_id;
      } else if (normalizedEntityType === 'sprint') {
        const sprint = await Sprint.findById(entity_id);
        if (sprint) projet_id = sprint.projet_id;
      }

      // Verify project access if applicable
      if (projet_id) {
        const project = await Project.findById(projet_id).populate({
          path: 'membres.project_role_id'
        });

        if (!project) {
          return handleCORS(NextResponse.json({ error: 'Entité non trouvée' }, { status: 404 }));
        }

        const memberData = project.membres.find(m =>
          m.user_id.toString() === user._id.toString()
        );

        const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
          user.role_id?.permissions?.adminConfig;

        const isMember = memberData !== undefined;
        const canAccessProject = hasSystemAccess || isMember;

        if (!canAccessProject) {
          return handleCORS(NextResponse.json({
            error: 'Vous n\'avez pas accès à ce projet'
          }, { status: 403 }));
        }

        // Verify merged permission for commenting
        const merged = getMergedPermissions(user, memberData?.project_role_id);
        if (!merged.permissions.commenter) {
          return handleCORS(NextResponse.json({
            error: 'Vous n\'avez pas la permission de commenter dans ce projet'
          }, { status: 403 }));
        }
      }

      const comment = await Comment.create({
        entity_type: normalizedEntityType,
        entity_id,
        contenu,
        parent_id,
        mentions: mentions || [],
        auteur: user._id,
        niveau: parent_id ? 1 : 0
      });

      // Créer notifications pour les mentions (batch pour performance)
      if (mentions && mentions.length > 0) {
        await createNotificationsBatch(
          mentions,
          'mention',
          'Vous avez été mentionné',
          `${user.nom_complet} vous a mentionné dans un commentaire`,
          normalizedEntityType,
          entity_id,
          '',
          user._id
        );
      }

      await logActivity(user, 'création', 'comment', comment._id, 'Nouveau commentaire', { request, httpMethod: 'POST', endpoint: '/comments', httpStatus: 201 });

      return handleCORS(NextResponse.json({
        message: 'Commentaire créé avec succès',
        comment
      }));
    }

    // POST /api/deliverables - Créer livrable
    if (path === '/deliverables' || path === '/deliverables/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      // Check system-level permissions (validerLivrable OR gererTaches)
      const hasSystemPermission = user.role_id?.permissions?.validerLivrable ||
        user.role_id?.permissions?.gererTaches;

      if (!hasSystemPermission) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const { projet_id, type_id, nom, description, assigné_à, date_échéance } = body;

      if (!projet_id || !type_id || !nom) {
        return handleCORS(NextResponse.json({
          error: 'Champs requis manquants'
        }, { status: 400 }));
      }

      const project = await Project.findById(projet_id).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Find member data for merged permission check
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString() ||
        memberData !== undefined;

      const canAccessProject = hasSystemAccess || isMember;
      if (!canAccessProject) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Check merged permissions (validerLivrable OR gererTaches at project level)
      const merged = getMergedPermissions(user, memberData?.project_role_id);
      const canCreateDeliverable = merged.permissions.validerLivrable ||
        merged.permissions.gererTaches;

      if (!canCreateDeliverable) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de créer des livrables dans ce projet'
        }, { status: 403 }));
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

      await logActivity(user, 'création', 'deliverable', deliverable._id, `Création livrable ${nom}`, { request, httpMethod: 'POST', endpoint: '/deliverables', httpStatus: 201, relatedProjectId: projet_id });

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

      if (!tenant_id || !client_id || !client_secret || !site_id) {
        return handleCORS(NextResponse.json({
          error: 'Tous les identifiants sont requis (tenant_id, client_id, client_secret, site_id)'
        }, { status: 400 }));
      }

      // Valider le format des IDs (UUID)
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

      try {
        // Test réel de connexion via Microsoft Graph API
        const sharepointService = (await import('@/lib/services/sharepointService')).default;
        const SharePointConfig = (await import('@/models/SharePointConfig')).default;

        const testResult = await sharepointService.testConnectionWithConfig({
          tenant_id,
          client_id,
          client_secret,
          site_id
        });

        if (testResult.success) {
          // Mettre à jour le statut de connexion
          await SharePointConfig.updateConnectionStatus({
            connected: true,
            site_name: testResult.site.name,
            site_url: testResult.site.webUrl,
            last_error: null
          });

          await logActivity(user, 'test', 'sharepoint', null, `Test de connexion SharePoint réussi - Site: ${testResult.site.name}`, { request, httpMethod: 'POST', endpoint: '/sharepoint/test', httpStatus: 200 });

          return handleCORS(NextResponse.json({
            success: true,
            message: 'Connexion réussie à SharePoint',
            site: testResult.site
          }));
        } else {
          // Mettre à jour le statut d'erreur
          await SharePointConfig.updateConnectionStatus({
            connected: false,
            last_error: testResult.error
          });

          await logActivity(user, 'test', 'sharepoint', null, `Test de connexion SharePoint échoué: ${testResult.error}`, { request, httpMethod: 'POST', endpoint: '/sharepoint/test', httpStatus: 400 });

          return handleCORS(NextResponse.json({
            success: false,
            error: testResult.error
          }, { status: 400 }));
        }
      } catch (error) {
        await logActivity(user, 'test', 'sharepoint', null, `Erreur test SharePoint: ${error.message}`, { request, httpMethod: 'POST', endpoint: '/sharepoint/test', httpStatus: 500 });
        return handleCORS(NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 }));
      }
    }

    // POST /api/sharepoint/sync - Synchronisation manuelle
    if (path === '/sharepoint/sync' || path === '/sharepoint/sync/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      try {
        const sharepointService = (await import('@/lib/services/sharepointService')).default;
        const SharePointConfig = (await import('@/models/SharePointConfig')).default;

        // Vérifier que SharePoint est configuré
        const isConfigured = await sharepointService.isSharePointConfigured();
        if (!isConfigured) {
          return handleCORS(NextResponse.json({
            success: false,
            error: 'SharePoint n\'est pas configuré. Veuillez configurer et tester la connexion d\'abord.'
          }, { status: 400 }));
        }

        // Lancer la synchronisation
        const syncResult = await sharepointService.syncAllProjects();

        // Mettre à jour les statistiques
        await SharePointConfig.updateSyncStats({
          files_synced: syncResult.files_synced,
          files_failed: syncResult.files_failed,
          errors: syncResult.errors.map(e => ({
            file_name: e.file_name || e.project_name,
            error: e.error
          }))
        });

        await logActivity(user, 'sync', 'sharepoint', null,
          `Synchronisation SharePoint: ${syncResult.projects_synced} projets, ${syncResult.files_synced} fichiers synchronisés, ${syncResult.files_failed} erreurs`,
          { request, httpMethod: 'POST', endpoint: '/sharepoint/sync', httpStatus: 200 });

        return handleCORS(NextResponse.json({
          success: true,
          message: 'Synchronisation terminée',
          results: {
            projects_synced: syncResult.projects_synced,
            files_synced: syncResult.files_synced,
            files_failed: syncResult.files_failed,
            errors: syncResult.errors.slice(0, 10) // Limiter les erreurs retournées
          }
        }));
      } catch (error) {
        await logActivity(user, 'sync', 'sharepoint', null, `Erreur synchronisation SharePoint: ${error.message}`, { request, httpMethod: 'POST', endpoint: '/sharepoint/sync', httpStatus: 500 });
        return handleCORS(NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 }));
      }
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

      await logActivity(user, 'création', 'template', template._id, 'Création template par défaut', { request, httpMethod: 'POST', endpoint: '/init-default-template', httpStatus: 201 });

      return handleCORS(NextResponse.json({
        message: 'Template par défaut créé avec succès',
        template
      }));
    }

    // POST /api/migrate-admin-role - Upgrade first admin from Administrateur to Super Administrateur
    if (path === '/migrate-admin-role' || path === '/migrate-admin-role/') {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      try {
        // Find the current user's role
        if (user.role_id?.nom !== 'Administrateur') {
          return handleCORS(NextResponse.json({
            message: 'Vous avez déjà le rôle Super Administrateur ou un autre rôle',
            current_role: user.role_id?.nom
          }, { status: 200 }));
        }

        // Find Super Administrateur role
        let superAdminRole = await Role.findOne({ nom: 'Super Administrateur' });
        if (!superAdminRole) {
          // Create it if it doesn't exist
          await initializeRoles();
          superAdminRole = await Role.findOne({ nom: 'Super Administrateur' });
        }

        // Update user's role
        user.role_id = superAdminRole._id;
        await user.save();

        // Populate the new role for response
        const updatedUser = await User.findById(user._id).populate('role_id');

        await logActivity(user, 'modification', 'utilisateur', user._id, 'Migration du rôle Administrateur vers Super Administrateur', { request, httpMethod: 'POST', endpoint: '/migrate-admin-role', httpStatus: 200 });

        return handleCORS(NextResponse.json({
          message: 'Rôle mis à jour avec succès vers Super Administrateur',
          user: {
            id: updatedUser._id,
            nom_complet: updatedUser.nom_complet,
            email: updatedUser.email,
            role: {
              nom: updatedUser.role_id.nom,
              permissions: updatedUser.role_id.permissions,
              visibleMenus: updatedUser.role_id.visibleMenus
            }
          }
        }));
      } catch (error) {
        console.error('Migration error:', error);
        return handleCORS(NextResponse.json({
          error: 'Erreur lors de la migration du rôle'
        }, { status: 500 }));
      }
    }

    return handleCORS(NextResponse.json({
      message: 'Endpoint POST non trouvé',
      path: path
    }, { status: 404 }));

  } catch (error) {
    const safeError = createSecureErrorResponse(error, 500);
    return handleCORS(NextResponse.json({ error: safeError.message }, { status: safeError.statusCode }));
  }
}

// ==================== PUT ROUTES ====================

export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');

    // Don't parse body for routes that don't need it (like reset-password)
    let body = {};
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const text = await request.text();
        if (text && text.trim()) {
          body = JSON.parse(text);
        }
      } catch (e) {
        // Body is empty or invalid, continue with empty body
      }
    }

    await connectDB();

    const user = await authenticate(request);
    if (!user) {
      return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
    }

    // PUT /api/tasks/:id/move - Déplacer tâche (Kanban)
    if (path.match(/^\/tasks\/[^/]+\/move\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const taskId = path.split('/')[2];
      const { nouvelle_colonne, nouveau_statut, nouvel_ordre } = body;

      const task = await Task.findById(taskId).populate({
        path: 'projet_id',
        populate: {
          path: 'membres.project_role_id'
        }
      });

      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 }));
      }

      const project = task.projet_id;

      // Find member data
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Merge permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Check merged permission
      if (!merged.permissions.deplacerTaches) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de déplacer les tâches'
        }, { status: 403 }));
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

      // Update sprint burndown if task has a sprint and status changed
      if (task.sprint_id && nouveau_statut) {
        await updateSprintBurndown(task.sprint_id);
      }

      await logActivity(user, 'modification', 'tâche', task._id, `Déplacement tâche vers ${nouveau_statut || nouvelle_colonne}`, { request, httpMethod: 'PUT', endpoint: '/tasks/:id/move', httpStatus: 200 });

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

      await logActivity(user, 'modification', 'notification', notificationId, 'Notification marquée comme lue', { request, httpMethod: 'PUT', endpoint: '/notifications/:id/read', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Notification marquée comme lue',
        notification
      }));
    }

    // PUT /api/notifications/read-all - Marquer toutes notifications comme lues
    if (path === '/notifications/read-all' || path === '/notifications/read-all/') {
      const result = await Notification.updateMany(
        { destinataire: user._id, lu: false },
        { lu: true, date_lecture: new Date() }
      );

      if (result.modifiedCount > 0) {
        await logActivity(user, 'modification', 'notification', null, `${result.modifiedCount} notification(s) marquée(s) comme lue(s)`, { request, httpMethod: 'PUT', endpoint: '/notifications/read-all', httpStatus: 200 });
      }

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
      const { nom, description, permissions, visibleMenus } = body;

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
      if (visibleMenus) role.visibleMenus = visibleMenus;

      await role.save();

      await logActivity(user, 'modification', 'role', role._id, `Modification rôle ${role.nom}`, { request, httpMethod: 'PUT', endpoint: '/roles/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Rôle modifié avec succès',
        role
      }));
    }

    // PUT /api/projects/:id/roles/:roleId - Modifier rôle personnalisé du projet
    if (path.match(/^\/projects\/[^/]+\/roles\/[^/]+\/?$/)) {
      const projectId = path.split('/')[2];
      const roleId = path.split('/')[4];

      const project = await Project.findById(projectId);
      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier les permissions : seul le chef de projet ou admin
      const canManageRoles = user.role_id?.permissions?.adminConfig ||
        user.role_id?.permissions?.gererMembresProjet ||
        project.chef_projet.toString() === user._id.toString();

      if (!canManageRoles) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const projectRole = await ProjectRole.findById(roleId);
      if (!projectRole || projectRole.project_id.toString() !== projectId) {
        return handleCORS(NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 }));
      }

      // Les rôles prédéfinis ne peuvent pas être modifiés
      if (projectRole.is_predefined) {
        return handleCORS(NextResponse.json({
          error: 'Les rôles prédéfinis ne peuvent pas être modifiés'
        }, { status: 400 }));
      }

      const { nom, description, permissions, visibleMenus } = body;

      if (nom) projectRole.nom = nom;
      if (description !== undefined) projectRole.description = description;
      if (permissions) projectRole.permissions = permissions;
      if (visibleMenus) projectRole.visibleMenus = visibleMenus;

      await projectRole.save();
      await logActivity(user, 'modification', 'rôle_projet', roleId, `Modification rôle ${projectRole.nom} du projet ${project.nom}`, { request, httpMethod: 'PUT', endpoint: '/projects/:id/roles/:roleId', httpStatus: 200, relatedProjectId: project._id });

      return handleCORS(NextResponse.json({
        message: 'Rôle modifié avec succès',
        role: projectRole
      }));
    }

    // PUT /api/projects/:id/members/:memberId/role - Changer le rôle d'un membre
    if (path.match(/^\/projects\/[^/]+\/members\/[^/]+\/role\/?$/)) {
      const projectId = path.split('/')[2];
      const memberId = path.split('/')[4];
      const { project_role_id } = body;

      if (!project_role_id) {
        return handleCORS(NextResponse.json({
          error: 'project_role_id requis'
        }, { status: 400 }));
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier les permissions
      const canChangeRoles = user.role_id?.permissions?.adminConfig ||
        user.role_id?.permissions?.changerRoleMembre ||
        user.role_id?.permissions?.gererMembresProjet ||
        project.chef_projet.toString() === user._id.toString();

      if (!canChangeRoles) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Vérifier si c'est un rôle de projet ou un rôle système
      let projectRole = await ProjectRole.findById(project_role_id);

      if (!projectRole || projectRole.project_id.toString() !== projectId) {
        // Essayer de le résoudre comme rôle système
        const systemRole = await Role.findById(project_role_id);

        if (!systemRole) {
          return handleCORS(NextResponse.json({
            error: 'Rôle invalide'
          }, { status: 400 }));
        }

        // Chercher un ProjectRole avec le même nom dans ce projet
        projectRole = await ProjectRole.findOne({
          project_id: projectId,
          nom: systemRole.nom
        });

        // Si pas de ProjectRole correspondant, en créer un basé sur le rôle système
        if (!projectRole) {
          projectRole = await ProjectRole.create({
            project_id: projectId,
            nom: systemRole.nom,
            description: systemRole.description,
            is_predefined: systemRole.is_predefined,
            permissions: systemRole.permissions,
            visibleMenus: systemRole.visibleMenus
          });
        }
      }

      // Trouver et mettre à jour le membre
      const member = project.membres.find(m => m._id.toString() === memberId);
      if (!member) {
        return handleCORS(NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 }));
      }

      const oldRoleId = member.project_role_id;
      member.project_role_id = projectRole._id;
      await project.save();

      // Invalider le cache du projet
      const projectServiceModule = await import('@/lib/services/projectService');
      const projectServiceInstance = projectServiceModule.default;
      if (projectServiceInstance?.invalidateCache) {
        projectServiceInstance.invalidateCache(projectId);
      }

      // Récupérer le nom de l'ancien rôle pour le log
      const oldRole = await ProjectRole.findById(oldRoleId);
      const memberUser = await User.findById(member.user_id);

      await logActivity(
        user,
        'modification',
        'membre_projet',
        member._id,
        `Changement rôle ${memberUser?.nom_complet}: ${oldRole?.nom || 'Non défini'} → ${projectRole.nom}`,
        { request, httpMethod: 'PUT', endpoint: '/projects/:id/members/:userId/role', httpStatus: 200, relatedProjectId: projectId }
      );

      return handleCORS(NextResponse.json({
        message: 'Rôle du membre modifié avec succès',
        member
      }));
    }

    // PUT /api/projects/:id - Modifier projet
    if (path.match(/^\/projects\/[^/]+\/?$/) && !path.includes('/members')) {
      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Check system-level permission first
      if (!user.role_id?.permissions?.modifierCharteProjet) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé - permission système requise' }, { status: 403 }));
      }

      // Check admin override
      if (!user.role_id?.permissions?.adminConfig) {
        // Non-admin: must be project owner
        const isProjectOwner = project.chef_projet.toString() === user._id.toString();
        if (!isProjectOwner) {
          return handleCORS(NextResponse.json({ error: 'Seul le chef de projet peut modifier le projet' }, { status: 403 }));
        }
      }

      const allowedFields = ['nom', 'description', 'date_début', 'date_fin_prévue', 'statut', 'priorité', 'budget', 'product_owner', 'archivé', 'colonnes_kanban', 'champs_dynamiques'];
      const restrictedFields = ['_id', 'chef_projet', 'créé_par', 'membres', 'template_id', 'created_at', 'updated_at'];

      Object.keys(body).forEach(key => {
        if (allowedFields.includes(key) && body[key] !== undefined) {
          project[key] = body[key];
        } else if (restrictedFields.includes(key)) {
          return;
        }
      });

      await project.save();
      await logActivity(user, 'modification', 'projet', project._id, `Modification projet ${project.nom}`, { request, httpMethod: 'PUT', endpoint: '/projects/:id', httpStatus: 200, relatedProjectId: project._id });

      return handleCORS(NextResponse.json({
        message: 'Projet modifié avec succès',
        project
      }));
    }

    // PUT /api/tasks/:id - Modifier tâche
    if (path.match(/^\/tasks\/[^/]+\/?$/) && !path.includes('/move')) {
      const taskId = path.split('/')[2];
      const task = await Task.findById(taskId).populate({
        path: 'projet_id',
        populate: {
          path: 'membres.project_role_id'
        }
      });

      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 }));
      }

      const project = task.projet_id;

      // Find member data
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Merge permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Check merged permission
      if (!merged.permissions.gererTaches) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de modifier les tâches'
        }, { status: 403 }));
      }

      const allowedFields = ['titre', 'description', 'statut', 'assigné_à', 'date_début', 'date_échéance', 'priorité', 'labels', 'ordre_priorité', 'deliverable_id', 'story_points', 'estimation_heures', 'sprint_id'];
      const restrictedFields = ['_id', 'créé_par', 'projet_id', 'date_création'];

      const validStatuts = ['Backlog', 'À faire', 'En cours', 'Review', 'Terminé'];
      const validPriorités = ['Basse', 'Moyenne', 'Haute', 'Critique'];

      try {
        Object.keys(body).forEach(key => {
          if (allowedFields.includes(key) && body[key] !== undefined) {
            if (key === 'statut') {
              if (!validStatuts.includes(body[key])) {
                throw new Error(`Statut invalide. Doit être: ${validStatuts.join(', ')}`);
              }
            } else if (key === 'priorité') {
              if (!validPriorités.includes(body[key])) {
                throw new Error(`Priorité invalide. Doit être: ${validPriorités.join(', ')}`);
              }
            }
            task[key] = body[key];
          } else if (restrictedFields.includes(key)) {
            return;
          }
        });

        await task.save();
        await logActivity(user, 'modification', 'tâche', task._id, `Modification tâche ${task.titre}`, { request, httpMethod: 'PUT', endpoint: '/tasks/:id', httpStatus: 200 });

        // Update sprint burndown if task has a sprint and status changed
        if (task.sprint_id && body.statut) {
          await updateSprintBurndown(task.sprint_id);
        }
      } catch (error) {
        const safeError = createSecureErrorResponse(error, 400);
        return handleCORS(NextResponse.json({
          error: safeError.message
        }, { status: safeError.statusCode }));
      }

      // Emit real-time event
      await emitToProject(task.projet_id.toString(), SOCKET_EVENTS.TASK_UPDATED, {
        task: {
          _id: task._id,
          titre: task.titre,
          description: task.description,
          statut: task.statut,
          priorité: task.priorité,
          assigné_à: task.assigné_à,
          projet_id: task.projet_id,
          updated_at: task.updated_at
        },
        updatedBy: {
          _id: user._id,
          nom_complet: user.nom_complet
        }
      });

      return handleCORS(NextResponse.json({
        message: 'Tâche modifiée avec succès',
        task
      }));
    }

    // PUT /api/sprints/:id - Modifier sprint
    if (path.match(/^\/sprints\/[^/]+\/?$/) && !path.includes('/start') && !path.includes('/complete')) {
      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId).populate({
        path: 'projet_id',
        populate: {
          path: 'membres.project_role_id'
        }
      });

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      const project = sprint.projet_id;

      // Find member data
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Merge permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Check merged permission
      if (!merged.permissions.gererSprints) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de modifier les sprints'
        }, { status: 403 }));
      }

      const allowedFields = ['nom', 'objectif', 'date_début', 'date_fin', 'capacité_équipe'];
      const restrictedFields = ['_id', 'projet_id', 'statut', 'créé_par', 'date_création'];

      Object.keys(body).forEach(key => {
        if (allowedFields.includes(key) && body[key] !== undefined) {
          sprint[key] = body[key];
        } else if (restrictedFields.includes(key)) {
          return;
        }
      });

      await sprint.save();
      await logActivity(user, 'modification', 'sprint', sprint._id, `Modification sprint ${sprint.nom}`, { request, httpMethod: 'PUT', endpoint: '/sprints/:id', httpStatus: 200, relatedProjectId: sprint.projet_id });

      return handleCORS(NextResponse.json({
        message: 'Sprint modifié avec succès',
        sprint
      }));
    }

    // PUT /api/project-templates/:id - Modifier template
    if (path.match(/^\/project-templates\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const templateId = path.split('/')[2];
      const template = await ProjectTemplate.findById(templateId);

      if (!template) {
        return handleCORS(NextResponse.json({ error: 'Template non trouvé' }, { status: 404 }));
      }

      const { nom, description, catégorie, champs } = body;

      if (nom !== undefined) template.nom = nom;
      if (description !== undefined) template.description = description;
      if (catégorie !== undefined) template.catégorie = catégorie;
      if (champs !== undefined) template.champs = champs;

      await template.save();

      await logActivity(user, 'modification', 'template', template._id, `Modification template ${template.nom}`, { request, httpMethod: 'PUT', endpoint: '/project-templates/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Template modifié avec succès',
        template
      }));
    }

    // PUT /api/timesheets/:id - Modifier timesheet
    if (path.match(/^\/timesheets\/[^/]+\/?$/) && !path.includes('/submit') && !path.includes('/validate')) {
      const timesheetId = path.split('/')[2];
      const timesheet = await TimesheetEntry.findById(timesheetId).populate('projet_id');

      if (!timesheet) {
        return handleCORS(NextResponse.json({ error: 'Timesheet non trouvé' }, { status: 404 }));
      }

      // Load project with member roles for merged permissions
      const project = await Project.findById(timesheet.projet_id).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check system-level permission
      const canEdit = user.role_id?.permissions?.saisirTemps || user.role_id?.permissions?.voirTempsPasses;
      if (!canEdit) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Check merged permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);
      const canEditMerged = merged.permissions.saisirTemps || merged.permissions.voirTempsPasses;
      if (!canEditMerged) {
        return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas la permission de modifier les timesheets dans ce projet' }, { status: 403 }));
      }

      // User isolation: can only edit own timesheets unless they have voirTempsPasses permission (merged)
      if (!merged.permissions.voirTempsPasses && timesheet.utilisateur.toString() !== user._id.toString()) {
        return handleCORS(NextResponse.json({ error: 'Vous ne pouvez modifier que vos propres timesheets' }, { status: 403 }));
      }

      const allowedFields = ['heures', 'description', 'task_id', 'activité_type', 'date'];
      const restrictedFields = ['_id', 'utilisateur', 'projet_id', 'statut', 'créé_par', 'created_at'];

      Object.keys(body).forEach(key => {
        if (allowedFields.includes(key) && body[key] !== undefined) {
          timesheet[key] = body[key];
        } else if (restrictedFields.includes(key)) {
          return;
        }
      });

      await timesheet.save();

      await logActivity(user, 'modification', 'timesheet', timesheet._id, `Modification timesheet`, { request, httpMethod: 'PUT', endpoint: '/timesheets/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Timesheet modifié avec succès',
        timesheet
      }));
    }

    // PUT /api/timesheets/:id/status - Changer statut timesheet
    if (path.match(/^\/timesheets\/[^/]+\/status\/?$/)) {
      const timesheetId = path.split('/')[2];
      const { statut } = body;

      if (!statut || !['brouillon', 'soumis', 'validé', 'refusé'].includes(statut)) {
        return handleCORS(NextResponse.json({
          error: 'Statut invalide. Doit être: brouillon, soumis, validé, ou refusé'
        }, { status: 400 }));
      }

      const timesheet = await TimesheetEntry.findById(timesheetId);
      if (!timesheet) {
        return handleCORS(NextResponse.json({ error: 'Timesheet non trouvé' }, { status: 404 }));
      }

      const isOwner = timesheet.utilisateur.toString() === user._id.toString();
      const canValidate = user.role_id?.permissions?.voirTempsPasses || user.role_id?.permissions?.adminConfig;

      if (!isOwner && !canValidate) {
        return handleCORS(NextResponse.json({ error: 'Vous ne pouvez pas modifier ce timesheet' }, { status: 403 }));
      }

      // SECURITY: Prevent owner from validating own timesheet
      // Owner can only: brouillon -> soumis (submit)
      // Validator can only: soumis -> validé/refusé (validate)
      if (isOwner && !canValidate) {
        // Owner without validator permission can only submit
        if (statut !== 'soumis' || timesheet.statut !== 'brouillon') {
          return handleCORS(NextResponse.json({
            error: 'Vous pouvez uniquement soumettre votre timesheet'
          }, { status: 403 }));
        }
      } else if (!isOwner && canValidate) {
        // Validator without being owner can only validate
        if (timesheet.statut !== 'soumis' || !['validé', 'refusé'].includes(statut)) {
          return handleCORS(NextResponse.json({
            error: 'Vous ne pouvez que valider ou refuser les timesheets soumis'
          }, { status: 403 }));
        }
      }

      const validTransitions = {
        'brouillon': ['soumis'],
        'soumis': ['brouillon', 'validé', 'refusé'],
        'validé': [],
        'refusé': ['brouillon']
      };

      if (!validTransitions[timesheet.statut]?.includes(statut)) {
        return handleCORS(NextResponse.json({
          error: `Transition de statut non autorisée: ${timesheet.statut} → ${statut}`
        }, { status: 400 }));
      }

      timesheet.statut = statut;
      if (statut === 'validé') {
        timesheet.validé_par = user._id;
        timesheet.date_validation = new Date();

        // Incrémenter temps_réel de la tâche associée
        if (timesheet.task_id) {
          await Task.findByIdAndUpdate(
            timesheet.task_id,
            { $inc: { temps_réel: timesheet.heures } }
          );
        }
      }

      await timesheet.save();

      // Invalider le cache du projet pour refléter les changements
      if (timesheet.projet_id) {
        const projectServiceModule = await import('@/lib/services/projectService');
        const projectServiceInstance = projectServiceModule.default;
        if (projectServiceInstance?.invalidateCache) {
          projectServiceInstance.invalidateCache(timesheet.projet_id.toString());
        }
      }

      await logActivity(user, 'modification', 'timesheet', timesheet._id, `Changement statut timesheet: ${statut}`, { request, httpMethod: 'PUT', endpoint: '/timesheets/:id/status', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: `Statut changé à ${statut}`,
        timesheet
      }));
    }

    // PUT /api/expenses/:id/status - Changer statut dépense
    if (path.match(/^\/expenses\/[^/]+\/status\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const expenseId = path.split('/')[2];
      const { statut } = body;

      if (!statut || !['en_attente', 'validé', 'refusé', 'payé'].includes(statut)) {
        return handleCORS(NextResponse.json({
          error: 'Statut invalide. Doit être: en_attente, validé, refusé, ou payé'
        }, { status: 400 }));
      }

      const expense = await Expense.findById(expenseId);
      if (!expense) {
        return handleCORS(NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 }));
      }

      const isCreator = expense.saisi_par.toString() === user._id.toString();
      const canValidate = user.role_id?.permissions?.modifierBudget || user.role_id?.permissions?.adminConfig;

      if (!isCreator && !canValidate) {
        return handleCORS(NextResponse.json({ error: 'Vous ne pouvez pas modifier cette dépense' }, { status: 403 }));
      }

      const validTransitions = {
        'en_attente': ['validé', 'refusé'],
        'validé': ['payé', 'refusé'],
        'refusé': ['en_attente'],
        'payé': []
      };

      if (!validTransitions[expense.statut]?.includes(statut)) {
        return handleCORS(NextResponse.json({
          error: `Transition de statut non autorisée: ${expense.statut} → ${statut}`
        }, { status: 400 }));
      }

      expense.statut = statut;
      if (statut === 'validé') {
        expense.validé_par = user._id;
        expense.date_validation = new Date();
      }

      try {
        await expense.save();
        await logActivity(user, 'modification', 'dépense', expense._id, `Changement statut dépense: ${statut}`, { request, httpMethod: 'PUT', endpoint: '/expenses/:id/status', httpStatus: 200 });

        return handleCORS(NextResponse.json({
          message: `Statut changé à ${statut}`,
          expense
        }));
      } catch (error) {
        const safeError = createSecureErrorResponse(error, 400);
        return handleCORS(NextResponse.json({
          error: safeError.message
        }, { status: safeError.statusCode }));
      }
    }


    // PUT /api/sharepoint/config - Enregistrer configuration SharePoint
    if (path === '/sharepoint/config' || path === '/sharepoint/config/') {
      if (!user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      try {
        const SharePointConfig = (await import('@/models/SharePointConfig')).default;
        const sharepointService = (await import('@/lib/services/sharepointService')).default;

        const { enabled, config } = body;

        // Construire les données à sauvegarder
        const updateData = {
          enabled: enabled || false
        };

        if (config) {
          if (config.tenant_id !== undefined) updateData.tenant_id = config.tenant_id;
          if (config.client_id !== undefined) updateData.client_id = config.client_id;
          if (config.site_id !== undefined) updateData.site_id = config.site_id;
          // Ne mettre à jour le secret que s'il n'est pas masqué
          if (config.client_secret && config.client_secret !== '********') {
            updateData.client_secret = config.client_secret;
          }
          if (config.auto_sync !== undefined) updateData.sync_enabled = config.auto_sync;
          if (config.sync_interval !== undefined) updateData.sync_interval = config.sync_interval;
        }

        // Sauvegarder la configuration
        const savedConfig = await SharePointConfig.updateConfig(updateData, user._id);

        // Invalider le cache du service
        sharepointService.invalidateConfigCache();

        await logActivity(user, 'modification', 'sharepoint', null,
          `Configuration SharePoint ${enabled ? 'activée' : 'désactivée'}`,
          { request, httpMethod: 'PUT', endpoint: '/sharepoint/config', httpStatus: 200 });

        return handleCORS(NextResponse.json({
          success: true,
          message: 'Configuration SharePoint enregistrée',
          enabled: savedConfig.enabled,
          config: {
            tenant_id: savedConfig.tenant_id || '',
            site_id: savedConfig.site_id || '',
            client_id: savedConfig.client_id || '',
            client_secret: savedConfig.client_secret ? '********' : '',
            auto_sync: savedConfig.sync_enabled || false,
            sync_interval: savedConfig.sync_interval || 60
          }
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'PUT /sharepoint/config'));
      }
    }

    // PUT /api/admin/maintenance - Modifier mode maintenance
    if (path === '/admin/maintenance' || path === '/admin/maintenance/') {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      try {
        const { enabled } = body;
        await appSettingsService.setMaintenanceMode(enabled, user._id);

        await logActivity(user, 'modification', 'système', null,
          enabled ? 'Activation mode maintenance' : 'Désactivation mode maintenance',
          { request, httpMethod: 'PUT', endpoint: '/admin/maintenance', httpStatus: 200 }
        );

        return handleCORS(NextResponse.json({
          success: true,
          message: enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé',
          enabled
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'PUT /admin/maintenance'));
      }
    }

    // PUT /api/budget/projects/:id - Modifier budget projet
    if (path.match(/^\/budget\/projects\/[^/]+\/?$/)) {
      const projectId = path.split('/')[3];
      const project = await Project.findById(projectId)
        .populate({
          path: 'membres.project_role_id'
        });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Find member data
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Merge permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Check merged permission
      if (!merged.permissions.modifierBudget) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de modifier le budget'
        }, { status: 403 }));
      }

      const allowedBudgetFields = ['prévisionnel', 'réel', 'devise', 'catégories'];
      if (body.budget) {
        const cleanedBudget = {};
        Object.keys(body.budget).forEach(key => {
          if (allowedBudgetFields.includes(key)) {
            cleanedBudget[key] = body.budget[key];
          }
        });
        project.budget = { ...project.budget, ...cleanedBudget };
        await project.save();

        await logActivity(user, 'modification', 'budget', project._id, `Modification budget du projet ${project.nom}`, { request, httpMethod: 'PUT', endpoint: '/budget/projects/:id', httpStatus: 200, relatedProjectId: project._id });
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

      const {
        nom_complet,
        telephone,
        poste,
        poste_titre,
        département_équipe,
        disponibilité_hebdo,
        fuseau_horaire
      } = body;

      const updateData = {};
      if (nom_complet) updateData.nom_complet = nom_complet;
      if (telephone !== undefined) updateData.telephone = telephone;
      // Support both field names for backwards compatibility
      if (poste_titre !== undefined) updateData.poste_titre = poste_titre;
      else if (poste !== undefined) updateData.poste_titre = poste;
      if (département_équipe !== undefined) updateData.département_équipe = département_équipe;
      if (disponibilité_hebdo !== undefined) updateData.disponibilité_hebdo = disponibilité_hebdo;
      if (fuseau_horaire !== undefined) updateData.fuseau_horaire = fuseau_horaire;

      await User.findByIdAndUpdate(user._id, updateData);

      await logActivity(user, 'modification', 'profil', user._id, 'Mise à jour du profil utilisateur', { request, httpMethod: 'PUT', endpoint: '/users/profile', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Profil mis à jour avec succès'
      }));
    }

    // PUT /api/users/:id - Modifier utilisateur (admin ou super-admin)
    if (path.match(/^\/users\/[^/]+\/?$/) && !path.includes('/profile') && !path.includes('/reset-password')) {
      const user = await authenticate(request);
      if (!user || (!user.role_id?.permissions?.gererUtilisateurs && !user.role_id?.permissions?.adminConfig)) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const userId = path.split('/')[2];
      const targetUser = await User.findById(userId).populate('role_id');

      if (!targetUser) {
        return handleCORS(NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 }));
      }

      const allowedFields = ['nom_complet', 'email', 'status', 'poste_titre', 'département_équipe', 'avatar', 'compétences'];
      const restrictedFields = ['_id', 'password', 'password_history', 'role_id', 'created_at', 'updated_at', 'first_login', 'must_change_password'];

      Object.keys(body).forEach(key => {
        if (allowedFields.includes(key) && body[key] !== undefined) {
          targetUser[key] = body[key];
        } else if (restrictedFields.includes(key)) {
          return;
        }
      });

      await targetUser.save();
      await logActivity(user, 'modification', 'utilisateur', targetUser._id, `Modification utilisateur ${targetUser.nom_complet}`, { request, httpMethod: 'PUT', endpoint: '/users/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Utilisateur modifié avec succès',
        user: {
          id: targetUser._id,
          nom_complet: targetUser.nom_complet,
          email: targetUser.email,
          role: targetUser.role_id ? {
            id: targetUser.role_id._id,
            nom: targetUser.role_id.nom,
            description: targetUser.role_id.description,
            permissions: targetUser.role_id.permissions,
            visibleMenus: targetUser.role_id.visibleMenus
          } : null,
          avatar: targetUser.avatar,
          poste_titre: targetUser.poste_titre,
          département_équipe: targetUser.département_équipe,
          status: targetUser.status
        }
      }));
    }

    // PUT /api/users/:id/role - Changer le rôle d'un utilisateur
    if (path.match(/^\/users\/[^/]+\/role\/?$/)) {
      const user = await authenticate(request);
      if (!user || (!user.role_id?.permissions?.gererUtilisateurs && !user.role_id?.permissions?.adminConfig)) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const userId = path.split('/')[2];
      const targetUser = await User.findById(userId).populate('role_id');

      if (!targetUser) {
        return handleCORS(NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 }));
      }

      const { role_id } = body;
      if (!role_id) {
        return handleCORS(NextResponse.json({ error: 'role_id requis' }, { status: 400 }));
      }

      const newRole = await Role.findById(role_id);
      if (!newRole) {
        return handleCORS(NextResponse.json({ error: 'Rôle non trouvé' }, { status: 404 }));
      }

      const oldRoleName = targetUser.role_id?.nom;
      targetUser.role_id = role_id;
      await targetUser.save();

      await logActivity(
        user,
        'modification',
        'utilisateur_role',
        targetUser._id,
        `Changement rôle ${targetUser.nom_complet}: ${oldRoleName} → ${newRole.nom}`,
        { request, httpMethod: 'PUT', endpoint: '/users/:id/role', httpStatus: 200, relatedUserIds: [targetUser._id] }
      );

      await createNotification(
        targetUser._id,
        'autre',
        'Votre rôle a été modifié',
        `Votre rôle a été changé à: ${newRole.nom}`,
        'utilisateur',
        targetUser._id,
        targetUser.nom_complet,
        user._id
      );

      return handleCORS(NextResponse.json({
        message: 'Rôle utilisateur modifié avec succès',
        user: {
          id: targetUser._id,
          nom_complet: targetUser.nom_complet,
          email: targetUser.email,
          role: {
            id: newRole._id,
            nom: newRole.nom,
            description: newRole.description,
            permissions: newRole.permissions,
            visibleMenus: newRole.visibleMenus
          },
          avatar: targetUser.avatar,
          poste_titre: targetUser.poste_titre,
          département_équipe: targetUser.département_équipe,
          status: targetUser.status
        }
      }));
    }

    // PUT /api/users/:id/reset-password - Réinitialiser le mot de passe utilisateur
    if (path.match(/^\/users\/[^/]+\/reset-password\/?$/)) {
      const user = await authenticate(request);
      if (!user || (!user.role_id?.permissions?.gererUtilisateurs && !user.role_id?.permissions?.adminConfig)) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const userId = path.split('/')[2];
      const targetUser = await User.findById(userId);

      if (!targetUser) {
        return handleCORS(NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 }));
      }

      // Reset to default password '00000000' - user must change it on next login
      const defaultPassword = '00000000';
      const hashedPassword = await hashPassword(defaultPassword);

      targetUser.password = hashedPassword;
      targetUser.must_change_password = true;
      targetUser.password_history = [
        { hash: hashedPassword, date: new Date() },
        ...(targetUser.password_history || []).slice(0, 4)
      ];

      await targetUser.save();

      await logActivity(user, 'password_reset', 'utilisateur', targetUser._id, `Réinitialisation mot de passe utilisateur ${targetUser.nom_complet}`, { request, httpMethod: 'PUT', endpoint: '/users/:id/reset-password', httpStatus: 200 });

      await createNotification(
        targetUser._id,
        'autre',
        'Mot de passe réinitialisé',
        `Votre mot de passe a été réinitialisé par un administrateur. Connectez-vous avec le mot de passe par défaut (00000000) et modifiez-le immédiatement.`,
        'utilisateur',
        targetUser._id,
        targetUser.nom_complet,
        user._id
      );

      return handleCORS(NextResponse.json({
        message: 'Mot de passe réinitialisé avec succès',
        tempPassword: defaultPassword,
        success: true
      }));
    }

    // PUT /api/sprints/:id/start - Démarrer sprint
    if (path.match(/^\/sprints\/[^/]+\/start\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId).populate('projet_id');

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      // Load project with member roles
      const project = await Project.findById(sprint.projet_id).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas accès à ce projet'
        }, { status: 403 }));
      }

      // Check merged permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);
      if (!merged.permissions.gererSprints) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de démarrer des sprints'
        }, { status: 403 }));
      }

      if (sprint.statut !== 'Planifié') {
        return handleCORS(NextResponse.json({ error: `Le sprint doit être en statut "Planifié" pour être démarré (actuellement: ${sprint.statut})` }, { status: 400 }));
      }

      // Calculate initial metrics from tasks assigned to this sprint
      const sprintTasks = await Task.find({ sprint_id: sprint._id });
      const totalStoryPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
      const totalEstimationHeures = sprintTasks.reduce((sum, t) => sum + (t.estimation_heures || 0), 0);

      // Calculate already completed points (in case tasks were completed before sprint start)
      const completedTasks = sprintTasks.filter(t => t.statut === 'Terminé');
      const completedPoints = completedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

      // Initialize burndown data
      const startDate = new Date(sprint.date_début);
      const endDate = new Date(sprint.date_fin);
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      const burndownData = [];
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        // Calculate ideal burndown (linear)
        const idealRemaining = Math.max(0, totalStoryPoints - (totalStoryPoints / Math.max(1, totalDays - 1)) * i);

        burndownData.push({
          date: currentDate,
          story_points_restants: i === 0 ? totalStoryPoints - completedPoints : null, // Only first day has actual data
          heures_restantes: i === 0 ? totalEstimationHeures : null,
          idéal: Math.round(idealRemaining * 10) / 10
        });
      }

      sprint.statut = 'Actif';
      sprint.story_points_planifiés = totalStoryPoints;
      sprint.story_points_complétés = completedPoints;
      sprint.burndown_data = burndownData;
      await sprint.save();

      await logActivity(user, 'modification', 'sprint', sprint._id, `Démarrage sprint ${sprint.nom} (${totalStoryPoints} story points planifiés)`, { request, httpMethod: 'PUT', endpoint: '/sprints/:id/start', httpStatus: 200, relatedProjectId: sprint.projet_id });

      return handleCORS(NextResponse.json({
        message: 'Sprint démarré avec succès',
        sprint
      }));
    }

    // PUT /api/sprints/:id/complete - Terminer sprint
    if (path.match(/^\/sprints\/[^/]+\/complete\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId).populate('projet_id');

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      // Load project with member roles
      const project = await Project.findById(sprint.projet_id).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas accès à ce projet'
        }, { status: 403 }));
      }

      // Check merged permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);
      if (!merged.permissions.gererSprints) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de terminer des sprints'
        }, { status: 403 }));
      }

      if (sprint.statut !== 'Actif') {
        return handleCORS(NextResponse.json({ error: 'Le sprint doit être en statut "Actif" pour être terminé' }, { status: 400 }));
      }

      // Calculate final metrics from tasks assigned to this sprint
      const sprintTasks = await Task.find({ sprint_id: sprint._id });
      const totalStoryPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

      // Calculate completed points
      const completedTasks = sprintTasks.filter(t => t.statut === 'Terminé');
      const completedPoints = completedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
      const completedHeures = completedTasks.reduce((sum, t) => sum + (t.temps_réel || 0), 0);

      // Update burndown data with final entry
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Find today's entry in burndown data or add final entry
      let burndownData = sprint.burndown_data || [];
      const todayStr = today.toDateString();
      const existingEntryIndex = burndownData.findIndex(entry =>
        new Date(entry.date).toDateString() === todayStr
      );

      const remainingPoints = totalStoryPoints - completedPoints;

      if (existingEntryIndex >= 0) {
        burndownData[existingEntryIndex].story_points_restants = remainingPoints;
        burndownData[existingEntryIndex].heures_restantes = completedHeures;
      } else {
        // Add final entry if today is outside the sprint period
        burndownData.push({
          date: today,
          story_points_restants: remainingPoints,
          heures_restantes: completedHeures,
          idéal: 0
        });
      }

      // Calculate velocity (completed story points)
      const velocity = completedPoints;

      sprint.statut = 'Terminé';
      sprint.story_points_planifiés = sprint.story_points_planifiés || totalStoryPoints;
      sprint.story_points_complétés = completedPoints;
      sprint.velocity = velocity;
      sprint.burndown_data = burndownData;
      await sprint.save();

      await logActivity(user, 'modification', 'sprint', sprint._id, `Fin sprint ${sprint.nom} (${completedPoints}/${totalStoryPoints} story points, vélocité: ${velocity})`, { request, httpMethod: 'PUT', endpoint: '/sprints/:id/complete', httpStatus: 200, relatedProjectId: sprint.projet_id });

      return handleCORS(NextResponse.json({
        message: 'Sprint terminé avec succès',
        sprint
      }));
    }


    // PUT /api/deliverable-types/:id - Modifier type de livrable
    if (path.match(/^\/deliverable-types\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const typeId = path.split('/')[2];
      const { nom, description, couleur, workflow_étapes } = body;

      const type = await DeliverableType.findById(typeId);
      if (!type) {
        return handleCORS(NextResponse.json({ error: 'Type non trouvé' }, { status: 404 }));
      }

      if (nom !== undefined) type.nom = nom;
      if (description !== undefined) type.description = description;
      if (couleur !== undefined) type.couleur = couleur;
      if (workflow_étapes !== undefined) type.workflow_étapes = workflow_étapes;

      await type.save();

      await logActivity(user, 'modification', 'deliverable-type', type._id, `Modification type livrable ${type.nom}`, { request, httpMethod: 'PUT', endpoint: '/deliverable-types/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Type de livrable modifié',
        type
      }));
    }

    // PUT /api/deliverables/:id - Modifier livrable
    if (path.match(/^\/deliverables\/[^/]+\/?$/) && !path.includes('/status')) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const deliverableId = path.split('/')[2];
      const deliverable = await Deliverable.findById(deliverableId).populate({
        path: 'projet_id',
        populate: { path: 'membres.project_role_id' }
      });

      if (!deliverable) {
        return handleCORS(NextResponse.json({ error: 'Livrable non trouvé' }, { status: 404 }));
      }

      // Vérifier accès au projet
      const project = deliverable.projet_id;
      const isMember = project.chef_projet?.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString() ||
        project.membres.some(m => m.user_id.toString() === user._id.toString());

      if (!isMember && !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Check permissions
      const memberData = project.membres.find(m => m.user_id.toString() === user._id.toString());
      const merged = getMergedPermissions(user, memberData?.project_role_id);
      const canModify = merged.permissions.validerLivrable || merged.permissions.gererTaches;

      if (!canModify) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de modifier ce livrable'
        }, { status: 403 }));
      }

      const { nom, description, assigné_à, date_échéance, statut_global, type_id } = body;
      const oldValues = {
        nom: deliverable.nom,
        description: deliverable.description,
        statut_global: deliverable.statut_global,
        assigné_à: deliverable.assigné_à,
        date_échéance: deliverable.date_échéance
      };

      // Update fields
      if (nom !== undefined) deliverable.nom = nom;
      if (description !== undefined) deliverable.description = description;
      if (assigné_à !== undefined) deliverable.assigné_à = assigné_à;
      if (date_échéance !== undefined) deliverable.date_échéance = date_échéance;
      if (statut_global !== undefined) deliverable.statut_global = statut_global;
      if (type_id !== undefined) deliverable.type_id = type_id;

      await deliverable.save();

      await logActivity(user, 'modification', 'deliverable', deliverable._id, `Modification livrable ${deliverable.nom}`, {
        request,
        httpMethod: 'PUT',
        endpoint: '/deliverables/:id',
        httpStatus: 200,
        relatedProjectId: project._id,
        oldValue: oldValues,
        newValue: { nom, description, statut_global, assigné_à, date_échéance }
      });

      return handleCORS(NextResponse.json({
        message: 'Livrable modifié avec succès',
        deliverable
      }));
    }

    // PUT /api/deliverables/:id/status - Changer statut livrable (validation)
    if (path.match(/^\/deliverables\/[^/]+\/status\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const deliverableId = path.split('/')[2];
      const deliverable = await Deliverable.findById(deliverableId).populate({
        path: 'projet_id',
        populate: { path: 'membres.project_role_id' }
      });

      if (!deliverable) {
        return handleCORS(NextResponse.json({ error: 'Livrable non trouvé' }, { status: 404 }));
      }

      const project = deliverable.projet_id;
      const isMember = project.chef_projet?.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString() ||
        project.membres.some(m => m.user_id.toString() === user._id.toString());

      if (!isMember && !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const memberData = project.membres.find(m => m.user_id.toString() === user._id.toString());
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      if (!merged.permissions.validerLivrable) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de valider les livrables'
        }, { status: 403 }));
      }

      const { statut_global, commentaire } = body;
      const oldStatus = deliverable.statut_global;

      if (!statut_global) {
        return handleCORS(NextResponse.json({ error: 'Statut requis' }, { status: 400 }));
      }

      deliverable.statut_global = statut_global;
      if (statut_global === 'Validé') {
        deliverable.validé_par = user._id;
        deliverable.date_validation = new Date();
      }

      await deliverable.save();

      const action = statut_global === 'Validé' ? 'validation' : (statut_global === 'Refusé' ? 'refus' : 'changement_statut');
      await logActivity(user, action, 'deliverable', deliverable._id, `${action === 'validation' ? 'Validation' : action === 'refus' ? 'Refus' : 'Changement statut'} livrable ${deliverable.nom}: ${oldStatus} → ${statut_global}`, {
        request,
        httpMethod: 'PUT',
        endpoint: '/deliverables/:id/status',
        httpStatus: 200,
        relatedProjectId: project._id,
        oldValue: { statut_global: oldStatus },
        newValue: { statut_global, commentaire },
        severity: action === 'validation' ? 'info' : (action === 'refus' ? 'warning' : 'info')
      });

      return handleCORS(NextResponse.json({
        message: `Livrable ${statut_global === 'Validé' ? 'validé' : 'mis à jour'} avec succès`,
        deliverable
      }));
    }

    // PUT /api/settings/maintenance - Activer/désactiver maintenance
    if (path === '/settings/maintenance' || path === '/settings/maintenance/') {
      try {
        const user = await authenticate(request);
        if (!user || !user.role_id?.permissions?.adminConfig) {
          return handleCORS(APIResponse.forbidden());
        }

        const { enabled } = body;

        // Sauvegarder dans la BD via appSettingsService
        await appSettingsService.setMaintenanceMode(enabled, user._id);

        await logActivity(user, 'modification', 'système', null,
          enabled ? 'Activation mode maintenance' : 'Désactivation mode maintenance',
          { request, httpMethod: 'PUT', endpoint: '/settings/maintenance', httpStatus: 200 }
        );

        return handleCORS(APIResponse.success({
          enabled,
          message: enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé'
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'PUT /settings/maintenance'));
      }
    }

    // PUT /api/settings - Modifier paramètres système
    if (path === '/settings' || path === '/settings/') {
      try {
        const user = await authenticate(request);
        if (!user || !user.role_id?.permissions?.adminConfig) {
          return handleCORS(APIResponse.forbidden());
        }

        const { settings } = body;

        // Sauvegarder dans la BD via appSettingsService
        await appSettingsService.setAppSettings(settings, user._id);

        await logActivity(user, 'modification', 'système', null, 'Modification paramètres système', { request, httpMethod: 'PUT', endpoint: '/settings', httpStatus: 200 });

        return handleCORS(APIResponse.success({
          message: 'Paramètres enregistrés avec succès',
          settings
        }));
      } catch (error) {
        return handleCORS(handleError(error, 'PUT /settings'));
      }
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

      await logActivity(user, 'modification', 'rôle', roleId, `Modification rôle ${updatedRole.nom}`, { request, httpMethod: 'PUT', endpoint: '/roles/:id', httpStatus: 200 });

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

      await logActivity(user, 'suppression', 'rôle', roleId, `Suppression rôle ${role.nom}`, { request, httpMethod: 'DELETE', endpoint: '/roles/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Rôle supprimé avec succès'
      }));
    }

    // DELETE /api/notifications/:id - Supprimer notification
    if (path.match(/^\/notifications\/[^/]+\/?$/)) {
      const notificationId = path.split('/')[2];
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return handleCORS(NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 }));
      }

      const canDelete = user.role_id?.permissions?.adminConfig ||
        notification.destinataire.toString() === user._id.toString();

      if (!canDelete) {
        return handleCORS(NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres notifications' }, { status: 403 }));
      }

      await Notification.findByIdAndDelete(notificationId);
      await logActivity(user, 'suppression', 'notification', notificationId, 'Suppression notification', { request, httpMethod: 'DELETE', endpoint: '/notifications/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({ message: 'Notification supprimée' }));
    }

    // DELETE /api/tasks/:id - Supprimer tâche
    if (path.match(/^\/tasks\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const taskId = path.split('/')[2];
      const task = await Task.findById(taskId).populate({
        path: 'projet_id',
        populate: {
          path: 'membres.project_role_id'
        }
      });

      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 }));
      }

      const project = task.projet_id;

      // Find member data
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      // Merge permissions
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Check merged permission
      if (!merged.permissions.gererTaches) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de supprimer les tâches'
        }, { status: 403 }));
      }

      await Task.findByIdAndDelete(taskId);

      await Project.findByIdAndUpdate(task.projet_id, {
        $inc: { 'stats.total_tâches': -1 }
      });

      await logActivity(user, 'suppression', 'tâche', task._id, `Suppression tâche ${task.titre}`, { request, httpMethod: 'DELETE', endpoint: '/tasks/:id', httpStatus: 200, relatedProjectId: task.projet_id?._id || task.projet_id });

      return handleCORS(NextResponse.json({
        message: 'Tâche supprimée avec succès'
      }));
    }

    // DELETE /api/sprints/:id - Supprimer sprint
    if (path.match(/^\/sprints\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const sprintId = path.split('/')[2];
      const sprint = await Sprint.findById(sprintId).populate('projet_id');

      if (!sprint) {
        return handleCORS(NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 }));
      }

      // Load project with member roles
      const project = await Project.findById(sprint.projet_id).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Find member data
      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      // Check project access
      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined;
      const canAccessProject = hasSystemAccess || isMember;

      if (!canAccessProject) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas accès à ce projet'
        }, { status: 403 }));
      }

      // Merge permissions (system + project)
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      // Check merged permission
      if (!merged.permissions.gererSprints) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de supprimer les sprints'
        }, { status: 403 }));
      }

      await Sprint.findByIdAndDelete(sprintId);

      await logActivity(user, 'suppression', 'sprint', sprintId, `Suppression sprint ${sprint.nom}`, { request, httpMethod: 'DELETE', endpoint: '/sprints/:id', httpStatus: 200, relatedProjectId: sprint.projet_id });

      return handleCORS(NextResponse.json({
        message: 'Sprint supprimé avec succès'
      }));
    }

    // DELETE /api/projects/:id/members/:memberId - Retirer membre du projet
    if (path.match(/^\/projects\/[^/]+\/members\/[^/]+\/?$/)) {
      const projectId = path.split('/')[2];
      const memberId = path.split('/')[4];

      const project = await Project.findById(projectId);

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // Vérifier les permissions
      const canManage = user.role_id?.permissions?.adminConfig ||
        user.role_id?.permissions?.gererMembresProjet ||
        project.chef_projet.toString() === user._id.toString();

      if (!canManage) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      // Supprimer le membre
      const memberExists = project.membres.some(m => m._id.toString() === memberId);
      if (!memberExists) {
        return handleCORS(NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 }));
      }

      project.membres = project.membres.filter(m => m._id.toString() !== memberId);
      await project.save();

      await logActivity(user, 'modification', 'projet', project._id, `Suppression membre du projet ${project.nom}`, { request, httpMethod: 'DELETE', endpoint: '/projects/:id/members/:memberId', httpStatus: 200, relatedProjectId: project._id });

      return handleCORS(NextResponse.json({
        message: 'Membre supprimé avec succès'
      }));
    }

    // DELETE /api/projects/:id - Supprimer projet
    if (path.match(/^\/projects\/[^/]+\/?$/)) {
      const projectId = path.split('/')[2];
      const project = await Project.findById(projectId).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      // SECURITY FIX: Check merged permissions (system + project level)
      // Only project owners/admins or users with supprimerProjet permission AND project access can delete
      const hasSystemPermission = user.role_id?.permissions?.supprimerProjet === true;
      if (!hasSystemPermission) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé - permission système requise' }, { status: 403 }));
      }

      // Check admin override
      if (user.role_id?.permissions?.adminConfig) {
        // Admin can delete any project
      } else {
        // Non-admin must be project owner
        const isProjectOwner = project.chef_projet.toString() === user._id.toString();
        if (!isProjectOwner) {
          return handleCORS(NextResponse.json({ error: 'Seul le chef de projet peut supprimer le projet' }, { status: 403 }));
        }
      }

      // Supprimer les tâches associées
      await Task.deleteMany({ projet_id: projectId });

      // Supprimer les sprints associés
      await Sprint.deleteMany({ projet_id: projectId });

      // Supprimer le projet
      await Project.findByIdAndDelete(projectId);

      await logActivity(user, 'suppression', 'projet', projectId, `Suppression projet ${project.nom}`, { request, httpMethod: 'DELETE', endpoint: '/projects/:id', httpStatus: 200, relatedProjectId: projectId });

      return handleCORS(NextResponse.json({
        message: 'Projet supprimé avec succès'
      }));
    }

    // DELETE /api/expenses/:id - Supprimer dépense
    if (path.match(/^\/expenses\/[^/]+\/?$/) && !path.includes('/validate')) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const expenseId = path.split('/')[2];
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        return handleCORS(NextResponse.json({ error: 'Dépense non trouvée' }, { status: 404 }));
      }

      const project = await Project.findById(expense.projet_id).populate({
        path: 'membres.project_role_id'
      });

      if (!project) {
        return handleCORS(NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 }));
      }

      const memberData = project.membres.find(m =>
        m.user_id.toString() === user._id.toString()
      );

      const hasSystemAccess = user.role_id?.permissions?.voirTousProjets ||
        user.role_id?.permissions?.adminConfig;

      const isMember = memberData !== undefined ||
        project.chef_projet.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString();

      if (!hasSystemAccess && !isMember) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé au projet' }, { status: 403 }));
      }

      const merged = getMergedPermissions(user, memberData?.project_role_id);

      if (!merged.permissions.modifierBudget) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de supprimer les dépenses'
        }, { status: 403 }));
      }

      if (expense.saisi_par.toString() !== user._id.toString() && !merged.permissions.modifierBudget) {
        return handleCORS(NextResponse.json({
          error: 'Vous ne pouvez supprimer que vos propres dépenses'
        }, { status: 403 }));
      }

      await Expense.findByIdAndDelete(expenseId);
      await logActivity(user, 'suppression', 'expense', expenseId, `Suppression dépense ${expense.montant}€`, { request, httpMethod: 'DELETE', endpoint: '/expenses/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Dépense supprimée avec succès'
      }));
    }

    // DELETE /api/deliverables/:id - Supprimer livrable
    if (path.match(/^\/deliverables\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }));
      }

      const deliverableId = path.split('/')[2];
      const deliverable = await Deliverable.findById(deliverableId).populate({
        path: 'projet_id',
        populate: { path: 'membres.project_role_id' }
      });

      if (!deliverable) {
        return handleCORS(NextResponse.json({ error: 'Livrable non trouvé' }, { status: 404 }));
      }

      const project = deliverable.projet_id;
      const isMember = project.chef_projet?.toString() === user._id.toString() ||
        project.product_owner?.toString() === user._id.toString() ||
        project.membres.some(m => m.user_id.toString() === user._id.toString());

      if (!isMember && !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const memberData = project.membres.find(m => m.user_id.toString() === user._id.toString());
      const merged = getMergedPermissions(user, memberData?.project_role_id);

      if (!merged.permissions.validerLivrable && !merged.permissions.gererTaches) {
        return handleCORS(NextResponse.json({
          error: 'Vous n\'avez pas la permission de supprimer les livrables'
        }, { status: 403 }));
      }

      const deliverableName = deliverable.nom;
      const projectId = project._id;

      await Deliverable.findByIdAndDelete(deliverableId);

      await logActivity(user, 'suppression', 'deliverable', deliverableId, `Suppression livrable ${deliverableName}`, {
        request,
        httpMethod: 'DELETE',
        endpoint: '/deliverables/:id',
        httpStatus: 200,
        relatedProjectId: projectId,
        severity: 'warning'
      });

      return handleCORS(NextResponse.json({
        message: 'Livrable supprimé avec succès'
      }));
    }

    // DELETE /api/deliverable-types/:id - Supprimer type de livrable
    if (path.match(/^\/deliverable-types\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const typeId = path.split('/')[2];

      const type = await DeliverableType.findByIdAndDelete(typeId);

      if (!type) {
        return handleCORS(NextResponse.json({ error: 'Type non trouvé' }, { status: 404 }));
      }

      await logActivity(user, 'suppression', 'deliverable-type', typeId, `Suppression type livrable ${type.nom}`, { request, httpMethod: 'DELETE', endpoint: '/deliverable-types/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Type de livrable supprimé'
      }));
    }

    // DELETE /api/project-templates/:id - Supprimer template
    if (path.match(/^\/project-templates\/[^/]+\/?$/)) {
      const user = await authenticate(request);
      if (!user || !user.role_id?.permissions?.adminConfig) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const templateId = path.split('/')[2];

      const template = await ProjectTemplate.findByIdAndDelete(templateId);

      if (!template) {
        return handleCORS(NextResponse.json({ error: 'Template non trouvé' }, { status: 404 }));
      }

      await logActivity(user, 'suppression', 'template', templateId, `Suppression template ${template.nom}`, { request, httpMethod: 'DELETE', endpoint: '/project-templates/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Template supprimé avec succès'
      }));
    }

    // DELETE /api/comments/:id - Supprimer commentaire
    if (path.match(/^\/comments\/[^/]+\/?$/)) {
      if (!user.role_id?.permissions?.commenter) {
        return handleCORS(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }));
      }

      const commentId = path.split('/')[2];
      const comment = await Comment.findById(commentId);

      if (!comment) {
        return handleCORS(NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 }));
      }

      // SECURITY FIX: Verify user has access to the commented entity
      let projet_id = null;
      if (comment.entity_type === 'projet') {
        projet_id = comment.entity_id;
      } else if (comment.entity_type === 'tâche') {
        const task = await Task.findById(comment.entity_id);
        if (task) projet_id = task.projet_id;
      } else if (comment.entity_type === 'livrable') {
        const deliverable = await Deliverable.findById(comment.entity_id);
        if (deliverable) projet_id = deliverable.projet_id;
      } else if (comment.entity_type === 'sprint') {
        const sprint = await Sprint.findById(comment.entity_id);
        if (sprint) projet_id = sprint.projet_id;
      }

      // If comment is on a project entity, verify access
      if (projet_id) {
        const project = await Project.findById(projet_id).populate({
          path: 'membres.project_role_id'
        });

        if (!project) {
          return handleCORS(NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 }));
        }

        const hasSystemAccess = user.role_id?.permissions?.voirTousProjets || user.role_id?.permissions?.adminConfig;
        const isMember = project.chef_projet.toString() === user._id.toString() ||
          project.product_owner?.toString() === user._id.toString() ||
          project.membres.some(m => m.user_id.toString() === user._id.toString());

        if (!hasSystemAccess && !isMember) {
          return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas accès à ce projet' }, { status: 403 }));
        }
      }

      const canDelete = user.role_id?.permissions?.adminConfig || comment.auteur.toString() === user._id.toString();
      if (!canDelete) {
        return handleCORS(NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres commentaires' }, { status: 403 }));
      }

      await Comment.findByIdAndDelete(commentId);
      await logActivity(user, 'suppression', 'comment', commentId, 'Suppression commentaire', { request, httpMethod: 'DELETE', endpoint: '/comments/:id', httpStatus: 200 });

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
      const file = await File.findById(fileId);

      if (!file) {
        return handleCORS(NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 }));
      }

      // SECURITY FIX: If file is attached to a project, verify user has access to project
      if (file.projet_id) {
        const project = await Project.findById(file.projet_id).populate({
          path: 'membres.project_role_id'
        });

        if (!project) {
          return handleCORS(NextResponse.json({ error: 'Projet du fichier non trouvé' }, { status: 404 }));
        }

        // Check if user is member or has voirTousProjets permission
        const hasSystemAccess = user.role_id?.permissions?.voirTousProjets || user.role_id?.permissions?.adminConfig;
        const isMember = project.chef_projet.toString() === user._id.toString() ||
          project.product_owner?.toString() === user._id.toString() ||
          project.membres.some(m => m.user_id.toString() === user._id.toString());

        if (!hasSystemAccess && !isMember) {
          return handleCORS(NextResponse.json({ error: 'Vous n\'avez pas accès à ce projet' }, { status: 403 }));
        }
      }

      // Supprimer de SharePoint si synchronisé
      let sharepointDeleted = false;
      if (file.sharepoint_id) {
        try {
          const sharepointService = (await import('@/lib/services/sharepointService')).default;
          const isConfigured = await sharepointService.isSharePointConfigured();

          if (isConfigured) {
            await sharepointService.deleteFile(file.sharepoint_id);
            sharepointDeleted = true;
          }
        } catch (spError) {
          // Log l'erreur mais continuer la suppression locale
          console.error('Erreur suppression SharePoint:', spError.message);
        }
      }

      await File.findByIdAndDelete(fileId);

      await logActivity(user, 'suppression', 'fichier', fileId, `Suppression fichier ${file.nom}${sharepointDeleted ? ' (+ SharePoint)' : ''}`, { request, httpMethod: 'DELETE', endpoint: '/files/:id', httpStatus: 200 });

      return handleCORS(NextResponse.json({
        message: 'Fichier supprimé avec succès',
        sharepoint_deleted: sharepointDeleted
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
