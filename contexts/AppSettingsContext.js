'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Traductions
const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    projects: 'Projets',
    tasks: 'Tâches',
    team: 'Équipe',
    calendar: 'Calendrier',
    reports: 'Rapports',
    notifications: 'Notifications',
    settings: 'Paramètres',
    profile: 'Profil',
    logout: 'Déconnexion',
    administration: 'Administration',
    users: 'Utilisateurs',
    roles: 'Rôles',
    sprints: 'Sprints',
    timesheets: 'Feuilles de temps',
    budgetManagement: 'Gestion du budget',
    kanban: 'Kanban',
    backlog: 'Backlog',
    roadmap: 'Roadmap',
    files: 'Fichiers',
    comments: 'Commentaires',
    audit: 'Audit',

    // Dashboard
    welcomeBack: 'Bienvenue',
    activeProjects: 'Projets actifs',
    pendingTasks: 'Tâches en attente',
    teamMembers: 'Membres d\'équipe',
    upcomingDeadlines: 'Échéances à venir',
    recentActivity: 'Activité récente',
    quickActions: 'Actions rapides',
    newProject: 'Nouveau projet',
    newTask: 'Nouvelle tâche',
    viewAll: 'Voir tout',

    // Projects
    projectName: 'Nom du projet',
    description: 'Description',
    status: 'Statut',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    budget: 'Budget',
    progress: 'Progression',
    create: 'Créer',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    projectManagement: 'Gestion des projets',
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
    planning: 'Planification',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    onHold: 'En pause',
    active: 'Actif',
    inactive: 'Inactif',
    archived: 'Archivé',
    draft: 'Brouillon',
    review: 'En revue',

    // Tasks
    assignedTo: 'Assignée à',
    priority: 'Priorité',
    dueDate: 'Échéance',
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
    critical: 'Critique',
    todo: 'À faire',
    doing: 'En cours',
    done: 'Terminé',
    taskManagement: 'Gestion des tâches',
    taskName: 'Nom de la tâche',
    taskDescription: 'Description de la tâche',
    taskCreated: 'Tâche créée avec succès',
    taskUpdated: 'Tâche mise à jour avec succès',
    taskDeleted: 'Tâche supprimée avec succès',
    deleteTask: 'Supprimer la tâche',
    deleteTaskConfirm: 'Êtes-vous sûr de vouloir supprimer cette tâche ?',
    noTasks: 'Aucune tâche',
    allTasks: 'Toutes les tâches',
    myTasks: 'Mes tâches',
    unassigned: 'Non assignée',
    estimation: 'Estimation',
    hours: 'heures',
    points: 'points',
    storyPoints: 'Points d\'histoire',

    // Sprints
    sprintManagement: 'Gestion des sprints',
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
    capacity: 'Capacité',

    // Users
    userManagement: 'Gestion des utilisateurs',
    userName: 'Nom complet',
    userEmail: 'Email',
    userRole: 'Rôle',
    userStatus: 'Statut',
    userPhone: 'Téléphone',
    userPosition: 'Poste',
    userDepartment: 'Département',
    createUser: 'Créer un utilisateur',
    editUser: 'Modifier l\'utilisateur',
    deleteUser: 'Supprimer l\'utilisateur',
    deleteUserConfirm: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
    userCreated: 'Utilisateur créé avec succès',
    userUpdated: 'Utilisateur mis à jour avec succès',
    userDeleted: 'Utilisateur supprimé avec succès',
    noUsers: 'Aucun utilisateur',
    allUsers: 'Tous les utilisateurs',
    activeUsers: 'Utilisateurs actifs',
    resetPassword: 'Réinitialiser le mot de passe',
    passwordReset: 'Mot de passe réinitialisé',
    changeRole: 'Changer le rôle',
    roleChanged: 'Rôle modifié avec succès',

    // Budget
    budgetTotal: 'Budget total',
    budgetSpent: 'Dépensé',
    budgetRemaining: 'Restant',
    expenses: 'Dépenses',
    addExpense: 'Ajouter une dépense',
    expenseCategory: 'Catégorie',
    expenseAmount: 'Montant',
    expenseDate: 'Date',
    expenseDescription: 'Description',
    expenseAdded: 'Dépense ajoutée avec succès',
    expenseDeleted: 'Dépense supprimée avec succès',
    noExpenses: 'Aucune dépense',
    budgetAlert: 'Alerte budget',
    budgetExceeded: 'Budget dépassé',
    budgetWarning: 'Attention : budget proche de la limite',
    spent: 'dépensés',
    ofBudget: 'du budget',

    // Timesheets
    timesheetManagement: 'Gestion des feuilles de temps',
    logTime: 'Saisir du temps',
    hoursWorked: 'Heures travaillées',
    date: 'Date',
    timeEntry: 'Entrée de temps',
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
    myProfile: 'Mon profil',
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
    twoFactorAuth: 'Authentification à deux facteurs',
    enable2FA: 'Activer 2FA',
    disable2FA: 'Désactiver 2FA',
    weeklyAvailability: 'Disponibilité hebdomadaire',

    // Time
    today: 'Aujourd\'hui',
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
    confirmAction: 'Confirmer l\'action',
    actionCancelled: 'Action annulée',
    changesNotSaved: 'Les modifications n\'ont pas été enregistrées',

    // Settings
    generalSettings: 'Paramètres généraux',
    notificationSettings: 'Paramètres de notifications',
    securitySettings: 'Paramètres de sécurité',
    appearanceSettings: 'Apparence',
    language: 'Langue',
    timezone: 'Fuseau horaire',
    currency: 'Devise',
    dateFormat: 'Format de date',
    theme: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
    appName: 'Nom de l\'application',
    appDescription: 'Description',
    settingsSaved: 'Paramètres enregistrés avec succès',
    emailNotifications: 'Notifications par email',
    pushNotifications: 'Notifications push',
    sessionTimeout: 'Expiration de session',
    passwordMinLength: 'Longueur min. mot de passe',
    requireNumbers: 'Exiger des chiffres',
    requireSymbols: 'Exiger des caractères spéciaux',
    maxLoginAttempts: 'Tentatives de connexion max',
    lockoutDuration: 'Durée de blocage',
    primaryColor: 'Couleur principale',
    sidebarCompact: 'Sidebar compacte',
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
    welcomeFirstLogin: 'Bienvenue ! Veuillez définir votre nouveau mot de passe.',
    firstAdminCreated: 'Premier administrateur créé avec succès ! Vous pouvez maintenant vous connecter.',
    invalidAuthResponse: 'Réponse d\'authentification invalide',
    serverConnectionError: 'Erreur de connexion au serveur',
    invalidCode: 'Code invalide',
    backupCodesWarning: 'Attention: Il ne vous reste que {count} code(s) de secours. Pensez à en générer de nouveaux.',
    twoFactorVerification: 'Vérification 2FA',
    enterAuthCode: 'Entrez le code de votre application d\'authentification',
    twoFactorTitle: 'Authentification à deux facteurs',
    enterBackupCode: 'Entrez un de vos codes de secours',
    enter6DigitCode: 'Entrez le code à 6 chiffres de votre application',
    backupCode: 'Code de secours',
    verificationCode: 'Code de vérification',
    verifying: 'Vérification...',
    verify: 'Vérifier',
    backToLogin: 'Retour à la connexion',
    useAuthApp: 'Utiliser l\'application d\'authentification',
    useBackupCode: 'Utiliser un code de secours',
    projectManagementPlatform: 'PM - Gestion de Projets',
    connectToAccessSpace: 'Connectez-vous pour accéder à votre espace',
    enterCredentials: 'Entrez vos identifiants pour accéder à l\'application',

    // Menu & Navigation
    rolesPermissions: 'Rôles & Permissions',
    projectTemplates: 'Templates Projets',
    deliverableTypes: 'Types Livrables',
    sharepoint: 'SharePoint',
    auditLogs: 'Audit & Logs',
    maintenance: 'Maintenance',

    // Dashboard specific
    recentProjects: 'Projets récents',
    yourActiveProjects: 'Vos derniers projets actifs',
    noProjects: 'Aucun projet pour le moment',
    createProject: 'Créer un projet',
    createProjectForKanban: 'Créez un projet pour utiliser le Kanban',
    viewAllProjects: 'Voir tous les projets',
    tasksAssignedToYou: 'Tâches qui vous sont assignées',
    noTasksAssigned: 'Aucune tâche assignée',
    viewAllTasks: 'Voir toutes les tâches',

    // Notification triggers
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
    twoFactorProtectedMessage: 'Votre compte est protégé par l\'authentification à deux facteurs. Un code sera demandé lors de chaque connexion.',
    twoFactorSetupMessage: 'Protégez votre compte en activant l\'authentification à deux facteurs. Vous aurez besoin d\'une application comme Google Authenticator ou Authy.',
    twoFactorSetupError: 'Erreur lors de l\'initialisation',
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
    configure2FATitle: 'Configurer l\'authentification 2FA',
    configuring: 'Configuration...',
    backupCodesTitle: 'Codes de récupération',
    scanQRCodeMessage: 'Scannez le QR code avec votre application d\'authentification',
    saveBackupCodesMessage: 'Conservez ces codes en lieu sûr',
    orEnterManually: 'Ou entrez ce code manuellement :',
    backupCodesWarningMessage: 'Ces codes ne seront plus affichés. Conservez-les en lieu sûr. Chaque code ne peut être utilisé qu\'une seule fois.',
    copyAllCodes: 'Copier tous les codes',
    verifyAndActivate: 'Vérifier et activer',
    savedMyCodes: 'J\'ai sauvegardé mes codes',
    disable2FATitle: 'Désactiver le 2FA',
    disable2FAWarning: 'Cette action réduira la sécurité de votre compte. Confirmez avec votre mot de passe.',
    yourPassword: 'Votre mot de passe',
    twoFactorCodeOptional: 'Code 2FA (optionnel)',
    disabling: 'Désactivation...',
    generating: 'Génération...',
    generateNewCodes: 'Générer de nouveaux codes',
    newBackupCodesTitle: 'Nouveaux codes de secours',
    oldCodesInvalidated: 'Les anciens codes ont été invalidés. Ces nouveaux codes ne seront plus affichés.',

    // Missing keys (notifications & profile)
    allNotificationsMarkedAsRead: 'Toutes les notifications marquées comme lues',
    emailNotEditable: 'L\'email ne peut pas être modifié',
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
    task: 'Tâche',
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
    general: 'Général',
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
    backupCodesWarning: 'Warning: You only have {count} backup code(s) left. Consider generating new ones.',
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
    twoFactorProtectedMessage: 'Your account is protected by two-factor authentication. A code will be required at each login.',
    twoFactorSetupMessage: 'Protect your account by enabling two-factor authentication. You will need an app like Google Authenticator or Authy.',
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
    backupCodesWarningMessage: 'These codes will not be shown again. Keep them safe. Each code can only be used once.',
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
    oldCodesInvalidated: 'Old codes have been invalidated. These new codes will not be shown again.',

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
  }
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
      const token = localStorage.getItem('pm_token');
      if (!token) {
        setLoaded(true);
        return;
      }

      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({
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
        setSettings(prev => ({ ...prev, ...event.detail }));
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
    setSettings(prev => ({ ...prev, ...newSettings }));

    // Mettre à jour le titre immédiatement si appName change
    if (newSettings.appName && typeof window !== 'undefined') {
      document.title = newSettings.appName;
    }

    // Émettre un événement pour synchroniser
    window.dispatchEvent(new CustomEvent('app-settings-updated', { detail: newSettings }));
  }, []);

  // Fonction de traduction
  const t = useCallback((key) => {
    const lang = settings.langue || 'fr';
    return translations[lang]?.[key] || translations.fr[key] || key;
  }, [settings.langue]);

  // Formater une date selon les paramètres
  const formatDate = useCallback((date, options = {}) => {
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
      case 'YYYY-MM-DD':
        // ISO format
        const isoDate = d.toLocaleDateString('en-CA', { timeZone: tz });
        if (includeTime) {
          const time = d.toLocaleTimeString(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          return `${isoDate} ${time}`;
        }
        return isoDate;
      case 'DD/MM/YYYY':
      default:
        formatOptions = { ...formatOptions, day: '2-digit', month: '2-digit', year: 'numeric' };
    }

    if (includeTime) {
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
    }

    return d.toLocaleDateString(locale, formatOptions);
  }, [settings.formatDate, settings.timezone, settings.langue, t]);

  // Formater un montant selon la devise
  const formatCurrency = useCallback((amount, options = {}) => {
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
  }, [settings.devise, settings.langue]);

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
    getTimezone,
    getLanguage,
    currencySymbols,
    translations,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
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
  const { formatDate, formatCurrency, getTimezone } = useAppSettings();
  return { formatDate, formatCurrency, timezone: getTimezone() };
}
