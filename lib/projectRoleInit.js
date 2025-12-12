import ProjectRole from '@/models/ProjectRole';

/**
 * Create 8 predefined project-level roles for a new project
 * These roles define permissions WITHIN a specific project
 * Combined with system roles for final access control
 *
 * IMPORTANT: Idempotent function - safe to call multiple times for same projectId
 * Checks for existing roles before creating to prevent duplicates
 */
export async function initializeProjectRoles(projectId) {
  const predefinedRoles = [
    {
      nom: 'Chef de Projet',
      description: 'Gestion complète du projet, équipe et budget',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
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
        gererUtilisateurs: false,
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
      description: 'Gestion équipe, tâches et reporting',
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
        gererUtilisateurs: false,
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
        gererUtilisateurs: false,
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
      description: 'Tâches personnelles, time tracking et commentaires',
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
        gererUtilisateurs: false,
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
      description: 'Lecture seule - suivi et commentaires',
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
        gererUtilisateurs: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: true,
        projects: true,
        kanban: true,
        backlog: false,
        sprints: false,
        roadmap: false,
        tasks: false,
        files: false,
        comments: true,
        timesheets: false,
        budget: false,
        reports: false,
        notifications: true,
        admin: false
      }
    },
    {
      nom: 'Consultant',
      description: 'Accès spécialisé à domaines spécifiques',
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
        prioriserBacklog: false,
        gererSprints: false,
        modifierBudget: false,
        voirBudget: true,
        voirTempsPasses: true,
        saisirTemps: true,
        validerLivrable: false,
        gererFichiers: true,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: false,
        voirAudit: false,
        gererUtilisateurs: false,
        adminConfig: false
      },
      visibleMenus: {
        portfolio: true,
        projects: true,
        kanban: true,
        backlog: true,
        sprints: true,
        roadmap: false,
        tasks: true,
        files: true,
        comments: true,
        timesheets: true,
        budget: true,
        reports: false,
        notifications: true,
        admin: false
      }
    },
    {
      nom: 'Responsable Fonctionnel',
      description: 'Rôle projet intermédiaire - Gestion spécifique avec droits modérés',
      is_predefined: true,
      permissions: {
        voirTousProjets: false,
        voirSesProjets: true,
        creerProjet: false,
        supprimerProjet: false,
        modifierCharteProjet: true,
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
        gererUtilisateurs: false,
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
      nom: 'Auditeur',
      description: 'Accès lecture complète pour audits et vérifications',
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
        voirBudget: true,
        voirTempsPasses: true,
        saisirTemps: false,
        validerLivrable: false,
        gererFichiers: true,
        commenter: true,
        recevoirNotifications: true,
        genererRapports: true,
        voirAudit: true,
        gererUtilisateurs: false,
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
    }
  ];

  const createdRoles = [];

  for (const roleData of predefinedRoles) {
    // Check if role already exists for this project
    const existingRole = await ProjectRole.findOne({
      project_id: projectId,
      nom: roleData.nom
    });

    if (existingRole) {
      // Role already exists, use it
      createdRoles.push(existingRole._id);
    } else {
      // Role doesn't exist, create it
      const role = await ProjectRole.create({
        ...roleData,
        project_id: projectId
      });
      createdRoles.push(role._id);
    }
  }

  return createdRoles;
}

/**
 * Get all available project roles (predefined + custom) for a project
 */
export async function getProjectRoles(projectId) {
  try {
    const roles = await ProjectRole.find({ project_id: projectId });
    return roles;
  } catch (error) {
    console.error('Error fetching project roles:', error);
    return [];
  }
}

/**
 * Get a specific project role by ID
 */
export async function getProjectRoleById(roleId) {
  try {
    const role = await ProjectRole.findById(roleId);
    return role;
  } catch (error) {
    console.error('Error fetching project role:', error);
    return null;
  }
}
