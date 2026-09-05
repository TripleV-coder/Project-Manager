'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Traductions
const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    projects: 'Vos Projets',
    tasks: 'Suivi des Tâches',
    team: 'Équipe & Membres',
    calendar: 'Calendrier des Événements',
    reports: 'Analyses & Rapports',
    reportsTitle: 'Bilan de Performance',
    reportsSubtitle: "Analysez la valeur créée et l'activité de vos équipes",
    timesheetTitle: 'Suivi du Temps',
    timesheetSubtitle: 'Chaque minute consacrée nous rapproche de la réussite.',
    logTimeButton: 'Déclarer mon temps',
    kanban: 'Tableau par étapes',
    backlog: 'Réserve & En attente',
    roadmap: 'Planning & Calendrier',
    files: 'Fichiers & Documents',
    comments: 'Discussions & Échanges',
    timesheets: 'Temps passés',
    budgetManagement: 'Gestion du Budget',
    budget: 'Budget & Dépenses',
    audit: 'Historique des actions',
    projectOverview: "Vue d'ensemble du Projet",
    projectGovernance: 'Gouvernance & Équipe',
    projectDeliverables: 'Livrables & Résultats',
    projectTasks: 'Suivi des Tâches',
    projectBudgetTab: 'Budget & Ressources',
    projectFiles: 'Fichiers du Projet',
    projectInfoTitle: 'Informations du Projet',
    currentStatus: 'Statut du Projet',
    priorityLevel: 'Niveau de Priorité',
    projectBudgetTitle: 'Suivi du Budget',
    plannedBudget: 'Budget Prévu',
    actualExpenses: 'Dépenses Réelles',
    budgetConsumption: 'Consommation budgétaire du projet',
    projectProgress: 'Progression du Projet',
    completedTasks: 'Tâches Terminées',
    actualHours: 'Heures Réelles',
    projectTeamTitle: 'Équipe du Projet',
    addMemberButton: 'Ajouter un Membre',
    noMembers: "L'équipe n'a pas encore de membres assignés.",
    projectDeliverablesTitle: 'Livrables du Projet',
    projectDeliverablesDesc: 'Suivez les éléments clés à produire pour la réussite du projet.',
    noDeliverables: 'Aucun livrable défini pour le moment',
    noDeliverablesDesc:
      'Les livrables sont les jalons de votre réussite. Définissez-les pour marquer votre progression.',

    // Dashboard
    overview: "Vue d'ensemble",
    overviewDesc: "Un aperçu global de vos projets et de l'activité de votre équipe.",
    welcomeBack: 'Heureux de vous retrouver pour la suite de vos succès',
    activeProjects: 'Projets en cours',
    activeProjectsStat: 'Projets en cours',
    activeInitiativesDesc: 'Vos projets actuellement actifs et en progression.',
    pendingTasks: 'Tâches à réaliser',
    actionsToTake: 'Tâches à réaliser',
    plannedTasksDesc: "Le planning prévu pour aujourd'hui.",
    achievements: 'Tâches terminées',
    globalCompletion: 'des tâches accomplies avec succès',
    expectedDeliverables: 'Livrables attendus',
    successProofsDesc: 'Les livrables clés qui concrétisent vos efforts.',
    recentProjects: 'Derniers dossiers',
    workingOnDesc: 'Les projets sur lesquels vous concentrez votre énergie.',
    myPriorities: 'Vos Priorités Immédiates',
    upcomingTasksDesc: 'Les tâches qui requièrent votre attention.',
    teamMembers: "Membres d'équipe",
    upcomingDeadlines: 'Échéances proches',
    recentActivity: 'Dernières activités',
    quickActions: 'Actions rapides',
    newProject: 'Nouveau projet',
    newTask: 'Nouvelle tâche',
    viewAll: 'Voir tout',
    viewAllProjects: 'Voir tous les projets',
    viewAllTasks: 'Voir toutes les activités',
    noProjects: 'Aucun projet pour le moment',
    createProject: 'Créer un projet',
    noTasksAssigned: 'Rien à signaler pour le moment',

    // Projects
    projectName: 'Nom du projet',
    description: "Description de l'activité",
    status: 'Statut du projet',
    startDate: 'Date de début',
    endDate: 'Échéance finale',
    progress: 'Progression',
    create: 'Créer',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    projectManagement: 'Gestion des Projets',
    allProjects: 'Tous les projets',
    myProjects: 'Mes projets',
    projectDetails: 'Détails du projet',
    members: 'Membres',
    addMember: 'Ajouter un membre',
    removeMember: 'Retirer le membre',
    projectCreated: 'Projet créé avec succès',
    projectUpdated: 'Projet mis à jour avec succès',
    projectDeleted: 'Projet supprimé avec succès',

    // Status
    // Status
    planning: 'Préparation',
    inProgress: 'En action',
    completed: 'Accompli ✨',
    cancelled: 'Annulé (pour le moment)',
    onHold: 'En pause',
    active: 'Actif',
    inactive: 'Inactif',
    archived: 'Archivé',
    draft: 'Brouillon',
    review: 'En revue collaborative',

    // Tasks
    assignedTo: 'Responsable',
    priority: "Niveau d'urgence",
    dueDate: 'Date limite',
    high: 'Urgente 🚀',
    medium: 'Importante',
    low: 'Tranquille',
    critical: 'Capitale ⚡',
    // Task Status
    // Task Status mapping
    todo: 'À faire',
    doing: 'En action',
    done: 'Accompli ✨',

    // Item Types
    epic: 'Chantier Majeur',
    story: 'Besoin Utilisateur',
    task: 'Tâche',
    bug: 'Ajustement Nécessaire',

    // Task Management
    taskManagement: 'Pilotage des activités',
    taskManagementDesc: 'Pilotez ici les actions qui font avancer vos projets avec brio.',
    noTasksDesc: 'Aucune activité pour le moment. Tout est calme et serein !',
    taskName: "Intitulé de l'action",
    taskDescription: "Décrivez les étapes ou le contenu de l'action",
    taskCreated: 'Action enregistrée',
    taskUpdated: 'Mise à jour effectuée',
    taskDeleted: 'Action supprimée',
    deleteTask: "Supprimer l'action",
    deleteTaskConfirm: 'Voulez-vous vraiment retirer cette action ?',
    noTasks: 'Aucune activité pour le moment',
    allTasks: 'Toutes les activités',
    myTasks: 'Mes priorités',
    unassigned: "En attente d'attribution",
    estimation: 'Estimation',
    hours: 'heures',
    points: 'points',
    storyPoints: "Points d'histoire",

    // Sprints
    sprintManagement: 'Gestion des Sprints',
    sprintName: 'Nom du sprint',
    sprintGoal: 'Objectif du sprint',
    sprintStart: 'Début du sprint',
    sprintEnd: 'Fin du sprint',
    currentSprint: 'Sprint actuel',
    futureSprints: 'Sprints futurs',
    pastSprints: 'Sprints passés',
    noSprints: 'Aucun sprint',
    createSprint: 'Créer un sprint',
    startSprint: 'Démarrer le sprint',
    endSprint: 'Terminer le sprint',
    sprintCreated: 'Sprint créé avec succès',
    sprintUpdated: 'Sprint mis à jour avec succès',
    sprintDeleted: 'Sprint supprimé avec succès',
    sprintStarted: 'Sprint démarré',
    sprintEnded: 'Sprint terminé',
    velocity: 'Vélocité',
    capacity: "Capacité de l'équipe",

    // Users
    userManagement: 'Gestion des collaborateurs',
    userManagementSubtitle: 'Gérez ici les membres de votre organisation.',
    inviteMember: 'Inviter un membre',
    inviteMemberTitle: 'Ajouter un membre',
    inviteMemberDesc:
      'Ajoutez un nouveau collaborateur à votre équipe en remplissant ces informations.',
    userName: 'Nom complet',
    userEmail: 'Email',
    userRole: 'Rôle',
    userStatus: 'Statut',
    userPhone: 'Téléphone',
    userPosition: 'Poste',
    userDepartment: 'Département',
    createUser: 'Inviter un nouveau membre',
    editUser: 'Modifier le profil du membre',
    deleteUser: 'Retirer le membre',
    deleteUserConfirm: 'Souhaitez-vous vraiment retirer ce collaborateur ?',
    userCreated: 'Collaborateur ajouté avec succès',
    userUpdated: 'Modifications enregistrées',
    userDeleted: 'Collaborateur retiré avec succès',
    noUsers: 'Aucun utilisateur',
    allUsers: 'Tous les utilisateurs',
    activeUsers: 'Utilisateurs actifs',
    resetPassword: 'Réinitialiser le mot de passe',
    passwordReset: 'Mot de passe réinitialisé',
    changeRole: 'Changer le rôle',
    roleChanged: 'Rôle modifié avec succès',

    // Budget
    budgetTotal: 'Budget total du projet',
    budgetSpent: 'Dépenses engagées',
    budgetRemaining: 'Budget restant',
    budgetProof: 'Justificatifs',
    budgetProofUpload: "Preuves de l'investissement (Factures, Reçus, TDR...)",
    budgetProofClick: 'Cliquez pour partager vos justificatifs',
    budgetProofHelp: 'Ajoutez vos preuves de succès financier',
    expenses: 'Suivi des dépenses & Justificatifs',
    addExpense: 'Déclarer un nouveau règlement',
    expenseCategory: "Domaine d'investissement",
    expenseAmount: 'Montant investi',
    expenseDate: 'Date du règlement',
    expenseDescription: "Nature de l'opération",
    expenseAdded: 'Dépense enregistrée avec succès',
    expenseDeleted: 'Opération supprimée avec succès',
    noExpenses: 'Aucune dépense',
    budgetAlert: 'Alerte budget',
    budgetExceeded: 'Le budget a été dépassé.',
    budgetWarning: 'Attention, le budget approche de sa limite.',
    spent: 'dépensés',
    ofBudget: 'du budget',

    // Timesheets
    timesheetManagement: 'Suivi du temps passé',
    logTime: 'Déclarer mes heures',
    hoursWorked: 'Temps passé (h)',
    date: 'Date',
    timeEntry: 'Saisie de temps',
    timeEntryAdded: 'Temps enregistré avec succès',
    timeEntryDeleted: 'Entrée supprimée avec succès',
    noTimeEntries: 'Aucune entrée de temps',
    totalHours: 'Total des heures',
    weeklyHours: 'Heures cette semaine',
    monthlyHours: 'Heures ce mois',

    // Notifications
    notificationManagement: 'Gestion des notifications',
    markAsRead: 'Marquer comme lu',
    markAllAsRead: 'Tout marquer comme lu',
    deleteNotification: 'Supprimer la notification',
    noNotifications: 'Aucune notification',
    unreadNotifications: 'Notifications non lues',
    allNotifications: 'Toutes les notifications',

    // Profile
    myProfile: 'Votre Espace Personnel',
    editProfile: 'Modifier le profil',
    personalInfo: 'Informations personnelles',
    contactInfo: 'Coordonnées',
    workInfo: 'Informations professionnelles',
    securityInfo: 'Sécurité',
    profileUpdated: 'Profil mis à jour avec succès',
    changePassword: 'Changer le mot de passe',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    passwordChanged: 'Mot de passe modifié avec succès',
    twoFactorAuth: 'Double Authentification (Sécurité renforcée)',
    enable2FA: 'Activer 2FA',
    disable2FA: 'Désactiver 2FA',
    weeklyAvailability: 'Disponibilité hebdomadaire',

    // Time
    today: "Aujourd'hui",
    yesterday: 'Hier',
    tomorrow: 'Demain',
    thisWeek: 'Cette semaine',
    thisMonth: 'Ce mois',
    lastWeek: 'Semaine dernière',
    lastMonth: 'Mois dernier',
    week: 'Semaine',
    month: 'Mois',
    year: 'Année',
    day: 'Jour',
    days: 'jours',

    // Messages
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    noData: 'Aucune donnée',
    confirmDelete: 'Confirmer la suppression',
    deleteWarning: 'Cette action est irréversible. Voulez-vous continuer ?',
    savedSuccessfully: 'Enregistré avec succès',
    errorOccurred: 'Une erreur est survenue',
    connectionError: 'Erreur de connexion',
    unauthorized: 'Non autorisé',
    forbidden: 'Accès refusé',
    notFound: 'Non trouvé',
    confirmAction: "Confirmer l'action",
    actionCancelled: 'Action annulée',
    changesNotSaved: 'Modifications non enregistrées',

    // Settings
    generalSettings: 'Identité de votre Espace',
    generalSettingsDesc: 'Ajustez la configuration de votre environnement.',
    notificationSettings: 'Gestion des Notifications',
    notificationSettingsDesc:
      'Choisissez comment vous souhaitez être informé des avancées de votre équipe.',
    securitySettings: 'Sécurité & Accès',
    securitySettingsDesc: 'Protégez vos données et vos accès.',
    appearanceSettings: 'Apparence & Style',
    appearanceSettingsDesc: 'Personnalisez votre interface.',
    triggerEvents: 'Événements déclencheurs',
    notifyTaskAssignedLabel: 'Tâche assignée',
    notifyTaskAssignedDesc: 'Quand une tâche vous est assignée',
    notifyTaskCompletedLabel: 'Tâche terminée',
    notifyTaskCompletedDesc: 'Quand une tâche de votre projet est terminée',
    notifyCommentMentionLabel: 'Mention dans un commentaire',
    notifyCommentMentionDesc: 'Quand vous êtes @mentionné',
    notifySprintStartLabel: 'Début de sprint',
    notifySprintStartDesc: 'Quand un sprint démarre',
    notifyBudgetAlertLabel: 'Alerte budget',
    notifyBudgetAlertDesc: 'Quand le budget dépasse 80%',
    language: "Langue de l'interface",
    timezone: 'Fuseau horaire',
    currency: 'Devise par défaut',
    dateFormat: 'Format de date',
    theme: 'Thème Visuel',
    light: 'Clarté',
    dark: 'Sérénité (Sombre)',
    system: 'Adaptatif (Système)',
    appName: "Nom de l'application",
    appDescription: 'Description de la mission',
    settingsSaved: 'Paramètres enregistrés avec succès',
    emailNotifications: 'Notifications par E-mail',
    pushNotifications: 'Notifications Push',
    sessionTimeout: 'Durée de session',
    passwordMinLength: 'Longueur minimale du mot de passe',
    requireNumbers: 'Exiger des chiffres',
    requireSymbols: 'Exiger des symboles',
    maxLoginAttempts: 'Tentatives de connexion max.',
    lockoutDuration: 'Durée de verrouillage',
    primaryColor: 'Couleur de Signature',
    sidebarCompact: 'Barre latérale minimaliste',
    minutes: 'minutes',
    characters: 'caractères',
    attempts: 'tentatives',

    // Auth
    login: 'Connexion',
    email: 'Email',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    rememberMe: 'Se souvenir de moi',
    loginButton: 'Se connecter',
    loggingIn: 'Connexion en cours...',
    loginSuccess: 'Connexion réussie',
    loginFailed: 'Échec de la connexion',
    logoutSuccess: 'Déconnexion réussie',
    sessionExpired: 'Session expirée',
    invalidCredentials: 'Identifiants invalides',
    accountLocked: 'Compte verrouillé',
    accountDisabled: 'Compte désactivé',
    welcomeFirstLogin: 'Bienvenue !',
    firstAdminCreated: 'Premier administrateur créé avec succès !',
    requiredFields: 'Veuillez renseigner tous les champs obligatoires',
    tempPassword: 'Mot de passe temporaire',
    resetPasswordDesc: 'Un nouvel accès sécurisé sera généré.',
    resetPasswordConfirm: 'Le collaborateur recevra ses nouveaux identifiants.',
    passwordResetSuccess: "L'accès a été réinitialisé avec succès",
    emailLabel: 'Email professionnel',
    roleLabel: 'Rôle & Responsabilités',
    invalidAuthResponse: "Réponse d'authentification invalide",
    serverConnectionError: 'Erreur de connexion au serveur',
    invalidCode: 'Code invalide',
    backupCodesWarning: 'Attention : Il ne vous reste que {count} code(s) de secours.',
    twoFactorVerification: 'Vérification 2FA',
    enterAuthCode: "Entrez le code de votre application d'authentification",
    twoFactorTitle: 'Authentification à deux facteurs',
    enterBackupCode: 'Entrez un de vos codes de secours',
    enter6DigitCode: 'Entrez le code à 6 chiffres',
    backupCode: 'Code de secours',
    verificationCode: 'Code de vérification',
    verifying: 'Vérification...',
    verify: 'Vérifier',
    backToLogin: 'Retour à la connexion',
    useAuthApp: "Utiliser l'application d'authentification",
    useBackupCode: 'Utiliser un code de secours',
    projectManagementPlatform: 'Gestion de Projets',
    connectToAccessSpace: 'Connectez-vous pour accéder à votre espace',
    enterCredentials: "Entrez vos identifiants pour accéder à l'application",

    // Humanized Keys for Projects Page
    governanceTeam: 'Gouvernance & Équipe',
    documentsFiles: 'Documents & Fichiers',
    projectModel: 'Modèle de Projet',
    projectLaunchDate: 'Date de lancement prévue',
    estimatedDeadline: 'Échéance ou fin estimée',
    specificFields: 'Champs spécifiques',
    contextQuestion: 'Quel est le contexte de ce projet ?',
    objectivesQuestion: 'Quels sont les objectifs à atteindre ?',
    tdrQuestion: 'Cahier des charges ou Référence (TDR)',
    technicalTeamQuestion: "Qui compose l'équipe technique ?",
    steeringCommitteeQuestion: 'Qui sont les membres du comité de pilotage ?',
    partnersQuestion: 'Partenaires et parties prenantes',
    strategicImpact: 'Impact Stratégique',
    ongoingMissions: 'Missions en cours',
    totalInitiatives: 'Total des initiatives',

    // Humanized Keys for Item Form Dialog
    itemTitleQuestion: "Quel est l'intitulé de cet élément ?",
    itemDescriptionPlaceholder: 'Précisez ici les détails et les attentes...',
    itemPriorityQuestion: 'Quel est le niveau de priorité ?',
    itemAssigneeQuestion: 'Qui aura le plaisir de porter cette action ?',
    itemSuccessProof: 'Justificatif de succès',
    itemSuccessProofPlaceholder: 'Détaillez ici les résultats attendus...',
    itemIdentity: 'Identité',
    itemDetails: 'Détails',
    requiredField: 'Ce champ est indispensable',
    generalInfos: 'Informations générales',
    projectDescriptionQuestion: "Décrivez l'essentiel de votre mission",
    projectTemplateQuestion: 'Quel modèle guidera cette initiative ?',
    projectContexteQuestion: "Dans quel contexte ce projet s'inscrit-il ?",
    projectObjectifsQuestion: 'Quels sont les objectifs à atteindre ?',
    projectTDRQuestion: 'Cahier des charges ou Référence (TDR)',
    projectTeamQuestion: 'Équipe & Expertises',
    projectTeamPlaceholder: "Qui sont les membres de l'équipe ?",
    projectCopilQuestion: 'Comité de Pilotage',
    projectCopilPlaceholder: 'Ex: Direction, Responsable Financier',
    projectPartnersQuestion: 'Partenaires',
    projectPartnersPlaceholder: 'Ex: Ministère, ONG XYZ',
    projectFilesQuestion: "Documents d'accompagnement",
    projectFilesHelper: 'Ajoutez ici les documents relatifs à ce projet.',
    chosenFilesLabel: 'Fichiers sélectionnés :',
    projectQuestion: 'Sur quel projet travaillons-nous ?',
    selectProject: 'Choisir le projet concerné',
    typeQuestion: "Quel est le type d'action ?",
    difficultyQuestion: 'Quel effort cela représente-t-il ?',
    epicDifficultyQuestion: 'Charge globale estimée',
    parentQuestion: "Cet élément fait-il partie d'un ensemble plus large ?",
    noParent: 'Aucun lien parent',
    sprintQuestion: "Dans quel cycle de travail l'inscrire ?",
    noSprint: 'Non planifié (Backlog)',
    deliverableQuestion: 'À quel livrable est-ce rattaché ?',
    noDeliverable: 'Aucun livrable associé',
    updating: 'Mise à jour en cours...',
    creating: 'Création en cours...',
    loadingData: 'Chargement des données...',
    dataLoadError: 'Erreur lors du chargement des données.',
    numericError: 'Une valeur chiffrée est attendue ici',
    fixErrors: 'Quelques précisions manquent encore...',
    successCreated: "L'élément a été créé avec succès",
    successUpdated: "L'élément a été mis à jour avec succès",
    reportsType: 'Type de rapport',
    reportGlobal: 'Panorama Global',
    reportGlobalDesc: "Vue d'ensemble de toutes les initiatives.",
    reportProject: 'Fiche Initiative',
    reportProjectDesc: 'Focus sur une mission spécifique.',
    reportPerformance: 'Dynamique de Contribution',
    reportPerformanceDesc: 'Impact et activité de chaque membre.',
    parameters: 'Paramètres du Rapport',
    accessDenied: 'Accès Restreint',
    noPermissionReports: "Vous n'avez pas les droits pour accéder à ces rapports.",
    noPermissionBudget: "Vous n'avez pas les droits pour consulter le budget.",
    contactAdminError: 'Veuillez contacter un administrateur.',
    backToDashboard: "Revenir à l'accueil",
    impactSummaryTitle: "Résumé de l'Impact",
    impactIndicator: 'Indicateur de Succès',
    impactValue: 'Mesure de Valeur',
    engagementIndicators: "Indicateurs d'Engagement",
    initiativesPanorama: 'Panorama des Initiatives',
    actionsInventory: 'Inventaire des Actions',
    teamDynamicsTitle: 'Dynamique & Engagement Équipe',
    selectExportFormat: 'Sous quel format préférez-vous votre bilan ?',
    generateReportButton: 'Générer le Bilan',
    generatingReport: 'Préparation de votre bilan...',
    exportFormatPdf: 'Document PDF',
    initiativeVolume: 'Nombre de projets lancés',
    activeInitiatives: 'Projets actifs',
    recordedSuccesses: 'Victoires enregistrées',
    actionVolume: "Volume d'actions menées",
    teamEnergy: "Activité de l'équipe",
    impactVision: "Regard sur l'impact",
    radiant: 'Rayonnant 🌟',
    greatMomentum: 'Excellente progression ! 💪',
    inProgressGrowth: 'En progression 🌱',
    needSupport: 'Besoin de soutien 🤝',
    inventoryActions: 'Inventaire des actions réalisées',
    confidentialDocument: 'Ce document est confidentiel',
    reportGeneratedAt: 'Généré le',
    reportPeriod: 'Période du rapport',
    adventureName: 'Nom du projet',
    stepStatus: 'Statut',
    stepUrgency: 'Niveau de priorité',
    launchDate: 'Date de début',
    successTarget: 'Échéance prévue',
    totalAdventures: 'Total des projets',
    activeAdventures: 'Projets actifs',
    victories: 'Tâches terminées',
    totalActions: 'Total des actions',
    accomplishedActions: 'Actions accomplies',
    successRate: 'Taux de succès',
    mobilizedTalents: 'Membres impliqués',
    indicator: 'Indicateur',
    value: 'Valeur',
    collaborator: 'Collaborateur',
    dynamics: "Dynamique d'équipe",
    evaluationLabel: 'Évaluation / Commentaires',
    justifyExpense: 'Justifier une dépense',
    expensePlaceholder: "Ex: Achat de licences pour booster l'équipe",
    budgetProofLabel: 'Pièces justificatives (Factures, Reçus...)',
    expenseTypeInternal: 'Contribution Interne',
    expenseTypeExternal: 'Appui Externe',
    expenseTypeEquipment: 'Équipement & Matériel',
    expenseTypeService: 'Prestation Partenaire',
    expenseTypeOther: 'Autre dépense',
    budgetInitial: 'Budget initial',
    budgetUsage: 'Utilisation du Budget',
    exportFormatExcel: 'Format Excel (.xlsx)',
    exportFormatCsv: 'Format CSV (.csv)',
    previewContent: 'Aperçu du Rapport',
    previewDescription: 'Voici les éléments qui composeront votre document.',
    globalStats: 'Statistiques Globales',
    projectsList: 'Liste des Projets',
    projectsListDesc: 'Détails des projets en cours ou terminés.',
    tasksDistribution: 'Répartition des Tâches',
    tasksDistributionDesc: 'Visualisation de la charge de travail globale.',
    projectInfo: 'Informations Projet',
    projectInfoDesc: 'Dates, statut et objectifs principaux.',
    tasksList: 'Liste des Tâches',
    tasksListDesc: 'Liste détaillée des actions réalisées et à venir.',
    userStats: 'Performances & Contributions',
    userStatsDesc: "Focus sur l'activité et les réalisations individuelles.",

    // Paramètres & Configuration
    settings: "Configuration de l'Espace",
    settingsSubtitle: 'Personnalisez votre espace de travail selon vos besoins.',
    general: 'Général',
    notifications: 'Notifications & Alertes',
    profileSubtitle: "Gérez votre identité et visualisez l'impact de votre contribution.",
    myActivity: 'Votre Parcours & Influence',
    activitySubtitle: 'Un aperçu de vos succès et de votre engagement quotidien.',
    activeMissions: 'Projets actifs',
    activeNeeds: 'Tâches en cours',
    successAccomplished: 'Tâches terminées',
    valueAddedTime: 'Heures investies',
    personalDetails: 'Détails de votre Identité',
    identitySubtitle: "Vos informations de contact et votre rôle au sein de l'organisation.",
    editMyProfile: 'Modifier mes Informations',
    usageName: "Nom d'usage",
    contactLine: 'Ligne de contact',
    expertiseTitle: 'Titre & Expertise',
    teamEntity: 'Entité ou Équipe',
    engagementWeekly: "Temps d'engagement hebdomadaire",
    accessLevel: "Niveau d'accès",
    partnerSince: 'Membre depuis',
    lastVisit: 'Dernière visite',

    // Menu & Navigation
    rolesPermissions: "Rôles & Droits d'accès",
    projectTemplates: 'Modèles de Projets',
    deliverableTypes: 'Types de Livrables',
    sharepoint: 'Espace Fichiers (SharePoint)',
    auditLogs: 'Historique des actions',
    maintenance: 'Mode Maintenance',
    yourActiveProjects: 'Vos projets en cours',
    createProjectForKanban: 'Créez un premier projet pour afficher le tableau par étapes',
    tasksAssignedToYou: 'Vos prochaines tâches à réaliser',

    // Budget categories
    humanResources: 'Ressources humaines',
    equipment: 'Matériel',
    softwareLicenses: 'Logiciels & Licences',
    subcontracting: 'Sous-traitance',
    training: 'Formation',
    travel: 'Déplacements',
    infrastructure: 'Infrastructure',
    marketing: 'Marketing',
    other: 'Autre',

    // 2FA Setup
    twoFactorDescription: 'Ajoutez une couche de sécurité supplémentaire à votre compte',
    twoFactorProtectedMessage:
      "Votre compte est protégé par l'authentification à deux facteurs. Un code sera demandé lors de chaque connexion.",
    twoFactorSetupMessage:
      "Protégez votre compte en activant l'authentification à deux facteurs. Vous aurez besoin d'une application comme Google Authenticator ou Authy.",
    twoFactorSetupError: "Erreur lors de l'initialisation",
    twoFactorCodeLength: 'Le code doit contenir 6 chiffres',
    twoFactorEnabled: '2FA activé avec succès',
    twoFactorDisabled: '2FA désactivé',
    twoFactorDisableError: 'Erreur lors de la désactivation',
    passwordRequired: 'Mot de passe requis',
    regenerateBackupCodes: 'Régénérer les codes de secours',
    regenerateBackupCodesTitle: 'Régénérer les codes de secours',
    regenerateBackupCodesWarning: 'Cette action invalidera tous vos anciens codes de secours.',
    backupCodesGenerated: 'Nouveaux codes générés',
    backupCodesError: 'Erreur lors de la régénération',
    codesCopied: 'Codes copiés',
    configure2FA: 'Configurer le 2FA',
    configure2FATitle: "Configurer l'authentification 2FA",
    configuring: 'Configuration...',
    backupCodesTitle: 'Codes de récupération',
    scanQRCodeMessage: "Scannez le QR code avec votre application d'authentification",
    saveBackupCodesMessage: 'Conservez ces codes en lieu sûr',
    orEnterManually: 'Ou entrez ce code manuellement :',
    backupCodesWarningMessage:
      "Ces codes ne seront plus affichés. Conservez-les en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.",
    copyAllCodes: 'Copier tous les codes',
    verifyAndActivate: 'Vérifier et activer',
    savedMyCodes: "J'ai sauvegardé mes codes",
    disable2FATitle: 'Désactiver le 2FA',
    disable2FAWarning:
      'Cette action réduira la sécurité de votre compte. Confirmez avec votre mot de passe.',
    yourPassword: 'Votre mot de passe',
    twoFactorCodeOptional: 'Code 2FA (optionnel)',
    disabling: 'Désactivation...',
    generating: 'Génération...',
    generateNewCodes: 'Générer de nouveaux codes',
    newBackupCodesTitle: 'Nouveaux codes de secours',
    oldCodesInvalidated:
      'Les anciens codes ont été invalidés. Ces nouveaux codes ne seront plus affichés.',

    // Push Notifications feedback
    notificationsEnabled: 'Les notifications push ont été activées ! ✨',
    notificationsDisabled: 'Les notifications push ont été désactivées.',
    notificationsPermissionDenied: 'La permission a été refusée par votre navigateur.',

    // Missing keys (notifications & profile)
    allNotificationsMarkedAsRead: 'Toutes les notifications marquées comme lues',
    emailNotEditable: "L'email ne peut pas être modifié",
    loadError: 'Erreur de chargement',
    loadingError: 'Erreur lors du chargement',
    nameRequired: 'Le nom est requis',
    new: 'Nouveau',
    noNewNotifications: 'Aucune nouvelle notification',
    notProvided: 'Non renseigné',
    notificationDeleted: 'Notification supprimée',
    notificationMarkedAsRead: 'Notification marquée comme lue',
    readNotifications: 'Notifications lues',
    saving: 'Enregistrement...',
    updateError: 'Erreur lors de la mise à jour',
    youAreUpToDate: 'Vous êtes à jour !',

    // Misc
    search: 'Rechercher',
    searchPlaceholder: 'Rechercher...',
    filter: 'Filtrer',
    filterBy: 'Filtrer par',
    sort: 'Trier',
    sortBy: 'Trier par',
    export: 'Exporter',
    import: 'Importer',
    refresh: 'Actualiser',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    yes: 'Oui',
    no: 'Non',
    all: 'Tous',
    none: 'Aucun',
    select: 'Sélectionner',
    selectAll: 'Tout sélectionner',
    clear: 'Effacer',
    reset: 'Réinitialiser',
    apply: 'Appliquer',
    confirm: 'Confirmer',
    actions: 'Actions',
    details: 'Détails',
    view: 'Voir',
    download: 'Télécharger',
    upload: 'Téléverser',
    add: 'Ajouter',
    remove: 'Retirer',
    update: 'Mettre à jour',
    name: 'Nom',
    title: 'Titre',
    type: 'Type',
    category: 'Catégorie',
    amount: 'Montant',
    total: 'Total',
    average: 'Moyenne',
    min: 'Min',
    max: 'Max',
    from: 'De',
    to: 'À',
    or: 'ou',
    and: 'et',
    of: 'de',
    items: 'éléments',
    item: 'élément',
    page: 'Page',
    perPage: 'par page',
    showing: 'Affichage de',
    results: 'résultats',
    noResults: 'Aucun résultat',
    project: 'Projet',
    user: 'Utilisateur',
    role: 'Rôle',
    sprint: 'Sprint',
    createdAt: 'Créé le',
    updatedAt: 'Mis à jour le',
    createdBy: 'Créé par',
    required: 'Requis',
    optional: 'Optionnel',
    enabled: 'Activé',
    disabled: 'Désactivé',
    configure: 'Configurer',
    advanced: 'Avancé',
    more: 'Plus',
    less: 'Moins',
    showMore: 'Voir plus',
    showLess: 'Voir moins',
    expandAll: 'Tout développer',
    collapseAll: 'Tout réduire',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    projects: 'Projects',
    tasks: 'Tasks',
    team: 'Team',
    calendar: 'Calendar',
    reports: 'Reports',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    administration: 'Administration',
    users: 'Users',
    roles: 'Roles',
    sprints: 'Sprints',
    timesheets: 'Timesheets',
    budgetManagement: 'Budget Management',
    kanban: 'Kanban',
    backlog: 'Backlog',
    roadmap: 'Roadmap',
    files: 'Files',
    comments: 'Comments',
    audit: 'Audit',

    // Dashboard
    welcomeBack: 'Welcome back',
    activeProjects: 'Active projects',
    pendingTasks: 'Pending tasks',
    teamMembers: 'Team members',
    upcomingDeadlines: 'Upcoming deadlines',
    recentActivity: 'Recent activity',
    quickActions: 'Quick actions',
    newProject: 'New project',
    newTask: 'New task',
    viewAll: 'View all',

    // Projects
    projectName: 'Project name',
    description: 'Description',
    status: 'Status',
    startDate: 'Start date',
    endDate: 'End date',
    budget: 'Budget',
    progress: 'Progress',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    projectManagement: 'Project Management',
    allProjects: 'All projects',
    myProjects: 'My projects',
    projectDetails: 'Project details',
    members: 'Members',
    addMember: 'Add member',
    removeMember: 'Remove member',
    projectCreated: 'Project created successfully',
    projectUpdated: 'Project updated successfully',
    projectDeleted: 'Project deleted successfully',

    // Status
    planning: 'Planning',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    onHold: 'On Hold',
    active: 'Active',
    inactive: 'Inactive',
    archived: 'Archived',
    draft: 'Draft',
    review: 'Review',

    // Tasks
    assignedTo: 'Assigned to',
    priority: 'Priority',
    dueDate: 'Due date',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    critical: 'Critical',
    todo: 'To do',
    doing: 'Doing',
    done: 'Done',
    taskManagement: 'Task Management',
    taskName: 'Task name',
    taskDescription: 'Task description',
    taskCreated: 'Task created successfully',
    taskUpdated: 'Task updated successfully',
    taskDeleted: 'Task deleted successfully',
    deleteTask: 'Delete task',
    deleteTaskConfirm: 'Are you sure you want to delete this task?',
    noTasks: 'No tasks',
    allTasks: 'All tasks',
    myTasks: 'My tasks',
    unassigned: 'Unassigned',
    estimation: 'Estimation',
    hours: 'hours',
    points: 'points',
    storyPoints: 'Story points',

    // Sprints
    sprintManagement: 'Sprint Management',
    sprintName: 'Sprint name',
    sprintGoal: 'Sprint goal',
    sprintStart: 'Sprint start',
    sprintEnd: 'Sprint end',
    currentSprint: 'Current sprint',
    futureSprints: 'Future sprints',
    pastSprints: 'Past sprints',
    noSprints: 'No sprints',
    createSprint: 'Create sprint',
    startSprint: 'Start sprint',
    endSprint: 'End sprint',
    sprintCreated: 'Sprint created successfully',
    sprintUpdated: 'Sprint updated successfully',
    sprintDeleted: 'Sprint deleted successfully',
    sprintStarted: 'Sprint started',
    sprintEnded: 'Sprint ended',
    velocity: 'Velocity',
    capacity: 'Capacity',

    // Users
    userManagement: 'User Management',
    userName: 'Full name',
    userEmail: 'Email',
    userRole: 'Role',
    userStatus: 'Status',
    userPhone: 'Phone',
    userPosition: 'Position',
    userDepartment: 'Department',
    createUser: 'Create user',
    editUser: 'Edit user',
    deleteUser: 'Delete user',
    deleteUserConfirm: 'Are you sure you want to delete this user?',
    userCreated: 'User created successfully',
    userUpdated: 'User updated successfully',
    userDeleted: 'User deleted successfully',
    noUsers: 'No users',
    allUsers: 'All users',
    activeUsers: 'Active users',
    resetPassword: 'Reset password',
    passwordReset: 'Password reset',
    changeRole: 'Change role',
    roleChanged: 'Role changed successfully',

    // Budget
    budgetTotal: 'Total budget',
    budgetSpent: 'Spent',
    budgetRemaining: 'Remaining',
    expenses: 'Expenses',
    addExpense: 'Add expense',
    expenseCategory: 'Category',
    expenseAmount: 'Amount',
    expenseDate: 'Date',
    expenseDescription: 'Description',
    expenseAdded: 'Expense added successfully',
    expenseDeleted: 'Expense deleted successfully',
    noExpenses: 'No expenses',
    budgetAlert: 'Budget alert',
    budgetExceeded: 'Budget exceeded',
    budgetWarning: 'Warning: budget near limit',
    spent: 'spent',
    ofBudget: 'of budget',
    accessDenied: 'Restricted Access',
    noPermissionReports: 'You do not have permission to access these reports.',
    noPermissionBudget: 'You do not have permission to view the budget.',
    contactAdminError: 'Please contact an administrator.',
    backToDashboard: 'Back to home',

    // Timesheets
    timesheetManagement: 'Timesheet Management',
    logTime: 'Log time',
    hoursWorked: 'Hours worked',
    date: 'Date',
    timeEntry: 'Time entry',
    timeEntryAdded: 'Time logged successfully',
    timeEntryDeleted: 'Entry deleted successfully',
    noTimeEntries: 'No time entries',
    totalHours: 'Total hours',
    weeklyHours: 'Hours this week',
    monthlyHours: 'Hours this month',

    // Notifications
    notificationManagement: 'Notification Management',
    markAsRead: 'Mark as read',
    markAllAsRead: 'Mark all as read',
    deleteNotification: 'Delete notification',
    noNotifications: 'No notifications',
    unreadNotifications: 'Unread notifications',
    allNotifications: 'All notifications',

    // Profile
    myProfile: 'My Profile',
    editProfile: 'Edit profile',
    personalInfo: 'Personal information',
    contactInfo: 'Contact information',
    workInfo: 'Work information',
    securityInfo: 'Security',
    profileUpdated: 'Profile updated successfully',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordChanged: 'Password changed successfully',
    twoFactorAuth: 'Two-factor authentication',
    enable2FA: 'Enable 2FA',
    disable2FA: 'Disable 2FA',
    weeklyAvailability: 'Weekly availability',

    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This week',
    thisMonth: 'This month',
    lastWeek: 'Last week',
    lastMonth: 'Last month',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    day: 'Day',
    days: 'days',

    // Messages
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    noData: 'No data',
    confirmDelete: 'Confirm deletion',
    deleteWarning: 'This action is irreversible. Do you want to continue?',
    savedSuccessfully: 'Saved successfully',
    errorOccurred: 'An error occurred',
    connectionError: 'Connection error',
    unauthorized: 'Unauthorized',
    forbidden: 'Access denied',
    notFound: 'Not found',
    confirmAction: 'Confirm action',
    actionCancelled: 'Action cancelled',
    changesNotSaved: 'Changes not saved',

    // Settings
    generalSettings: 'General settings',
    notificationSettings: 'Notification settings',
    securitySettings: 'Security settings',
    appearanceSettings: 'Appearance',
    language: 'Language',
    timezone: 'Timezone',
    currency: 'Currency',
    dateFormat: 'Date format',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    appName: 'Application name',
    appDescription: 'Description',
    settingsSaved: 'Settings saved successfully',
    emailNotifications: 'Email notifications',
    pushNotifications: 'Push notifications',
    sessionTimeout: 'Session timeout',
    passwordMinLength: 'Min. password length',
    requireNumbers: 'Require numbers',
    requireSymbols: 'Require special characters',
    maxLoginAttempts: 'Max login attempts',
    lockoutDuration: 'Lockout duration',
    primaryColor: 'Primary color',
    sidebarCompact: 'Compact sidebar',
    minutes: 'minutes',
    characters: 'characters',
    attempts: 'attempts',

    // Auth
    login: 'Login',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    loginButton: 'Log in',
    loggingIn: 'Logging in...',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    logoutSuccess: 'Logout successful',
    sessionExpired: 'Session expired',
    invalidCredentials: 'Invalid credentials',
    accountLocked: 'Account locked',
    accountDisabled: 'Account disabled',
    welcomeFirstLogin: 'Welcome! Please set your new password.',
    firstAdminCreated: 'First administrator created successfully! You can now log in.',
    invalidAuthResponse: 'Invalid authentication response',
    serverConnectionError: 'Server connection error',
    invalidCode: 'Invalid code',
    backupCodesWarning:
      'Warning: You only have {count} backup code(s) left. Consider generating new ones.',
    twoFactorVerification: '2FA Verification',
    enterAuthCode: 'Enter the code from your authentication app',
    twoFactorTitle: 'Two-factor authentication',
    enterBackupCode: 'Enter one of your backup codes',
    enter6DigitCode: 'Enter the 6-digit code from your app',
    backupCode: 'Backup code',
    verificationCode: 'Verification code',
    verifying: 'Verifying...',
    verify: 'Verify',
    backToLogin: 'Back to login',
    useAuthApp: 'Use authentication app',
    useBackupCode: 'Use a backup code',
    projectManagementPlatform: 'PM - Project Management',
    connectToAccessSpace: 'Log in to access your workspace',
    enterCredentials: 'Enter your credentials to access the application',

    // Menu & Navigation
    rolesPermissions: 'Roles & Permissions',
    projectTemplates: 'Project Templates',
    deliverableTypes: 'Deliverable Types',
    sharepoint: 'SharePoint',
    auditLogs: 'Audit & Logs',
    maintenance: 'Maintenance',

    // Dashboard specific
    recentProjects: 'Recent projects',
    yourActiveProjects: 'Your latest active projects',
    noProjects: 'No projects yet',
    createProject: 'Create a project',
    createProjectForKanban: 'Create a project to use Kanban',
    viewAllProjects: 'View all projects',
    tasksAssignedToYou: 'Tasks assigned to you',
    noTasksAssigned: 'No tasks assigned',
    viewAllTasks: 'View all tasks',

    // Notification triggers
    triggerEvents: 'Trigger events',
    notifyTaskAssignedLabel: 'Task assigned',
    notifyTaskAssignedDesc: 'When a task is assigned to you',
    notifyTaskCompletedLabel: 'Task completed',
    notifyTaskCompletedDesc: 'When a task in your project is completed',
    notifyCommentMentionLabel: 'Comment mention',
    notifyCommentMentionDesc: 'When you are @mentioned',
    notifySprintStartLabel: 'Sprint start',
    notifySprintStartDesc: 'When a sprint starts',
    notifyBudgetAlertLabel: 'Budget alert',
    notifyBudgetAlertDesc: 'When budget exceeds 80%',

    // Budget categories
    humanResources: 'Human Resources',
    equipment: 'Equipment',
    softwareLicenses: 'Software & Licenses',
    subcontracting: 'Subcontracting',
    training: 'Training',
    travel: 'Travel',
    infrastructure: 'Infrastructure',
    marketing: 'Marketing',
    other: 'Other',

    // 2FA Setup
    twoFactorDescription: 'Add an extra layer of security to your account',
    twoFactorProtectedMessage:
      'Your account is protected by two-factor authentication. A code will be required at each login.',
    twoFactorSetupMessage:
      'Protect your account by enabling two-factor authentication. You will need an app like Google Authenticator or Authy.',
    twoFactorSetupError: 'Error during setup',
    twoFactorCodeLength: 'Code must be 6 digits',
    twoFactorEnabled: '2FA enabled successfully',
    twoFactorDisabled: '2FA disabled',
    twoFactorDisableError: 'Error while disabling',
    passwordRequired: 'Password required',
    regenerateBackupCodes: 'Regenerate backup codes',
    regenerateBackupCodesTitle: 'Regenerate backup codes',
    regenerateBackupCodesWarning: 'This will invalidate all your old backup codes.',
    backupCodesGenerated: 'New codes generated',
    backupCodesError: 'Error generating codes',
    codesCopied: 'Codes copied',
    configure2FA: 'Configure 2FA',
    configure2FATitle: 'Configure 2FA authentication',
    configuring: 'Configuring...',
    backupCodesTitle: 'Recovery codes',
    scanQRCodeMessage: 'Scan the QR code with your authenticator app',
    saveBackupCodesMessage: 'Keep these codes in a safe place',
    orEnterManually: 'Or enter this code manually:',
    backupCodesWarningMessage:
      'These codes will not be shown again. Keep them safe. Each code can only be used once.',
    copyAllCodes: 'Copy all codes',
    verifyAndActivate: 'Verify and activate',
    savedMyCodes: 'I have saved my codes',
    disable2FATitle: 'Disable 2FA',
    disable2FAWarning: 'This will reduce the security of your account. Confirm with your password.',
    yourPassword: 'Your password',
    twoFactorCodeOptional: '2FA code (optional)',
    disabling: 'Disabling...',
    generating: 'Generating...',
    generateNewCodes: 'Generate new codes',
    newBackupCodesTitle: 'New backup codes',
    oldCodesInvalidated:
      'Old codes have been invalidated. These new codes will not be shown again.',

    // Missing keys (notifications & profile)
    allNotificationsMarkedAsRead: 'All notifications marked as read',
    emailNotEditable: 'Email cannot be edited',
    loadError: 'Loading error',
    loadingError: 'Error while loading',
    nameRequired: 'Name is required',
    new: 'New',
    noNewNotifications: 'No new notifications',
    notProvided: 'Not provided',
    notificationDeleted: 'Notification deleted',
    notificationMarkedAsRead: 'Notification marked as read',
    readNotifications: 'Read notifications',
    saving: 'Saving...',
    updateError: 'Update error',
    youAreUpToDate: 'You are up to date!',

    // Misc
    search: 'Search',
    searchPlaceholder: 'Search...',
    filter: 'Filter',
    filterBy: 'Filter by',
    sort: 'Sort',
    sortBy: 'Sort by',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
    all: 'All',
    none: 'None',
    select: 'Select',
    selectAll: 'Select all',
    clear: 'Clear',
    reset: 'Reset',
    apply: 'Apply',
    confirm: 'Confirm',
    actions: 'Actions',
    details: 'Details',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    add: 'Add',
    remove: 'Remove',
    update: 'Update',
    name: 'Name',
    title: 'Title',
    type: 'Type',
    category: 'Category',
    amount: 'Amount',
    total: 'Total',
    average: 'Average',
    min: 'Min',
    max: 'Max',
    from: 'From',
    to: 'To',
    or: 'or',
    and: 'and',
    of: 'of',
    items: 'items',
    item: 'item',
    page: 'Page',
    perPage: 'per page',
    showing: 'Showing',
    results: 'results',
    noResults: 'No results',
    project: 'Project',
    task: 'Task',
    user: 'User',
    role: 'Role',
    sprint: 'Sprint',
    createdAt: 'Created at',
    updatedAt: 'Updated at',
    createdBy: 'Created by',
    required: 'Required',
    optional: 'Optional',
    enabled: 'Enabled',
    disabled: 'Disabled',
    configure: 'Configure',
    general: 'General',
    advanced: 'Advanced',
    more: 'More',
    less: 'Less',
    showMore: 'Show more',
    showLess: 'Show less',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
  },
};

// Symboles des devises
const currencySymbols = {
  FCFA: 'FCFA',
  EUR: '€',
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
};

// Formatage par locale
const localeMap = {
  fr: 'fr-FR',
  en: 'en-US',
};

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    appName: 'PM - Gestion de Projets',
    appDescription: 'Plateforme de gestion de projets Agile',
    langue: 'fr',
    timezone: 'Africa/Porto-Novo',
    devise: 'FCFA',
    formatDate: 'DD/MM/YYYY',
  });
  const [loaded, setLoaded] = useState(false);

  // Charger les paramètres depuis l'API
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'same-origin',
        signal: AbortSignal.timeout(8000),
      });

      if (response && response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            appName: data.settings.appName || prev.appName,
            appDescription: data.settings.appDescription || prev.appDescription,
            langue: data.settings.langue || prev.langue,
            timezone: data.settings.timezone || prev.timezone,
            devise: data.settings.devise || prev.devise,
            formatDate: data.settings.formatDate || prev.formatDate,
          }));
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Écouter les mises à jour des paramètres
    const handleSettingsUpdate = (event) => {
      if (event.detail) {
        setSettings((prev) => ({ ...prev, ...event.detail }));
        // Mettre à jour le titre si appName est dans les détails
        if (event.detail.appName) {
          document.title = event.detail.appName;
        }
      }
    };

    window.addEventListener('app-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('app-settings-updated', handleSettingsUpdate);
    };
  }, [loadSettings]);

  // Mettre à jour le titre du document quand le nom de l'app change
  useEffect(() => {
    if (typeof window !== 'undefined' && settings.appName) {
      document.title = settings.appName;
    }
  }, [settings.appName]);

  // Mettre à jour les paramètres localement
  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));

    // Mettre à jour le titre immédiatement si appName change
    if (newSettings.appName && typeof window !== 'undefined') {
      document.title = newSettings.appName;
    }

    // Émettre un événement pour synchroniser
    window.dispatchEvent(new CustomEvent('app-settings-updated', { detail: newSettings }));
  }, []);

  // Fonction de traduction
  const t = useCallback(
    (key) => {
      const lang = settings.langue || 'fr';
      return translations[lang]?.[key] || translations.fr[key] || key;
    },
    [settings.langue]
  );

  // Formater une date selon les paramètres
  const formatDate = useCallback(
    (date, options = {}) => {
      if (!date) return '';

      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const { includeTime = false, relative = false } = options;
      const locale = localeMap[settings.langue] || 'fr-FR';
      const tz = settings.timezone || 'Africa/Porto-Novo';

      // Format relatif (aujourd'hui, hier, etc.)
      if (relative) {
        const now = new Date();
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));

        if (diff === 0) return t('today');
        if (diff === 1) return t('yesterday');
        if (diff === -1) return t('tomorrow');
      }

      // Déterminer le format
      let formatOptions = { timeZone: tz };

      switch (settings.formatDate) {
        case 'MM/DD/YYYY':
          formatOptions = { ...formatOptions, month: '2-digit', day: '2-digit', year: 'numeric' };
          break;
        case 'YYYY-MM-DD': {
          // ISO format
          const isoDate = d.toLocaleDateString('en-CA', { timeZone: tz });
          if (includeTime) {
            const time = d.toLocaleTimeString(locale, {
              timeZone: tz,
              hour: '2-digit',
              minute: '2-digit',
            });
            return `${isoDate} ${time}`;
          }
          return isoDate;
        }
        case 'DD/MM/YYYY':
        default:
          formatOptions = { ...formatOptions, day: '2-digit', month: '2-digit', year: 'numeric' };
      }

      if (includeTime) {
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
      }

      return d.toLocaleDateString(locale, formatOptions);
    },
    [settings.formatDate, settings.timezone, settings.langue, t]
  );

  // Formater un montant selon la devise
  const formatCurrency = useCallback(
    (amount, options = {}) => {
      if (amount === null || amount === undefined) return '';

      const num = parseFloat(amount);
      if (isNaN(num)) return '';

      const { compact = false } = options;
      const devise = settings.devise || 'FCFA';
      const locale = localeMap[settings.langue] || 'fr-FR';

      // Format compact (1.5M, 2K, etc.)
      if (compact && Math.abs(num) >= 1000) {
        const formatter = new Intl.NumberFormat(locale, {
          notation: 'compact',
          maximumFractionDigits: 1,
        });
        return `${formatter.format(num)} ${currencySymbols[devise] || devise}`;
      }

      // Format standard
      const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      const symbol = currencySymbols[devise] || devise;

      // Position du symbole selon la devise
      if (devise === 'FCFA') {
        return `${formatter.format(num)} ${symbol}`;
      } else {
        return `${symbol}${formatter.format(num)}`;
      }
    },
    [settings.devise, settings.langue]
  );

  // Obtenir le label humanisé pour un statut
  const getStatusLabel = useCallback(
    (statut) => {
      const statusMap = {
        'En attente': t('statusPending') || 'En attente',
        'En cours': t('statusInProgress') || 'En action',
        Terminé: t('statusCompleted') || 'Accompli ✨',
        Annulé: t('statusCancelled') || 'Suspendu',
        Bloqué: t('statusBlocked') || 'En pause 🛑',
        'A faire': t('statusTodo') || 'À lancer',
        'En revue': t('statusReview') || 'En lecture 📖',
      };
      return statusMap[statut] || statut;
    },
    [t]
  );

  // Obtenir le label humanisé pour une priorité
  const getPriorityLabel = useCallback(
    (priorité) => {
      const priorityMap = {
        Basse: t('priorityLow') || 'Tranquille',
        Moyenne: t('priorityMedium') || 'Importante',
        Haute: t('priorityHigh') || 'Urgente 🚀',
        Critique: t('priorityCritical') || 'Capitale ⚡',
      };
      return priorityMap[priorité] || priorité;
    },
    [t]
  );

  // Obtenir le fuseau horaire actuel
  const getTimezone = useCallback(() => {
    return settings.timezone || 'Africa/Porto-Novo';
  }, [settings.timezone]);

  // Obtenir la langue actuelle
  const getLanguage = useCallback(() => {
    return settings.langue || 'fr';
  }, [settings.langue]);

  const value = {
    settings,
    loaded,
    updateSettings,
    t,
    formatDate,
    formatCurrency,
    getStatusLabel,
    getPriorityLabel,
    getTimezone,
    getLanguage,
    currencySymbols,
    translations,
  };

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}

// Hook simplifié pour les traductions
export function useTranslation() {
  const { t, getLanguage } = useAppSettings();
  return { t, language: getLanguage() };
}

// Hook simplifié pour le formatage
export function useFormatters() {
  const { formatDate, formatCurrency, getStatusLabel, getPriorityLabel, getTimezone } =
    useAppSettings();
  return { formatDate, formatCurrency, getStatusLabel, getPriorityLabel, timezone: getTimezone() };
}
