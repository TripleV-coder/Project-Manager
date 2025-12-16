# 📖 Guide Utilisateur - PM Gestion de Projets

## 🚀 Connexion

**URL de connexion:** http://localhost:3000/login

**Identifiants Admin par défaut:**
- Email: `admin@test.com`
- Mot de passe: `Test123!`

## 📋 Fonctionnalités Principales

### 1. 👥 Gestion des Rôles (FONCTIONNEL ✅)

**URL:** `/dashboard/admin/roles`

**Comment créer un rôle personnalisé:**
1. Cliquer sur "Créer un rôle personnalisé"
2. Entrer le nom (ex: "Consultant Externe")
3. Entrer la description
4. **Onglet Permissions (23 au total):**
   - Cocher les permissions souhaitées
   - Permissions organisées par catégorie:
     * Projets (5 permissions)
     * Équipe (2 permissions)
     * Tâches (3 permissions)
     * Sprints (1 permission)
     * Budget (2 permissions)
     * Temps (2 permissions)
     * Livrables (1 permission)
     * Fichiers (1 permission)
     * Communication (2 permissions)
     * Rapports & Audit (2 permissions)
     * Administration (2 permissions)
5. **Onglet Menus Visibles (14 au total):**
   - Cocher les menus visibles
6. Cliquer sur "Créer le rôle"

**8 Rôles Prédéfinis:**
- Administrateur (23/23 permissions)
- Chef de Projet (17/23 permissions)
- Responsable Équipe (11/23 permissions)
- Product Owner (9/23 permissions)
- Membre Équipe (6/23 permissions)
- Partie Prenante (3/23 permissions)
- Observateur (2/23 permissions)
- Invité (1/23 permissions)

### 2. 📊 Génération de Rapports (FONCTIONNEL ✅)

**URL:** `/dashboard/reports`

**Types de rapports disponibles:**
1. **Rapport Global** - Vue d'ensemble (projets, tâches, utilisateurs)
2. **Rapport Projet** - Détails d'un projet spécifique
3. **Rapport Performance** - Statistiques par utilisateur

**Formats d'export:**
- **PDF** - Document professionnel avec tableaux
- **Excel** - Fichier .xlsx avec plusieurs feuilles
- **CSV** - Données brutes

**Comment générer un rapport:**
1. Sélectionner le type de rapport
2. Si "Rapport Projet", choisir le projet
3. Choisir le format (PDF/Excel/CSV)
4. Cliquer sur "Générer et télécharger"
5. Le fichier se télécharge automatiquement

### 3. 📋 Gestion des Tâches (FONCTIONNEL ✅)

**URL:** `/dashboard/tasks`

**Fonctionnalités:**
- Créer des tâches avec:
  * Titre et description
  * Projet associé
  * Priorité (Basse, Moyenne, Haute, Critique)
  * Assignation à un utilisateur
  * Date d'échéance
- Modifier les tâches existantes
- Supprimer des tâches
- Filtrer par projet et statut
- Recherche par mots-clés

### 4. 🎯 Kanban Board (FONCTIONNEL ✅)

**URL:** `/dashboard/kanban`

**Fonctionnalités:**
- Drag & Drop des tâches entre colonnes
- Colonnes par défaut:
  * Backlog
  * À faire
  * En cours
  * Review
  * Terminé
- Filtrer par projet
- Vue temps réel

### 5. 📚 Backlog (FONCTIONNEL ✅)

**URL:** `/dashboard/backlog`

**Hiérarchie:**
- Épics (niveau le plus haut)
- User Stories (sous les épics)
- Tâches (sous les stories)

**Fonctionnalités:**
- Voir la hiérarchie complète
- Expandre/Collapser les épics
- Filtrer par projet
- Priorisation

### 6. ⚡ Sprints (FONCTIONNEL ✅)

**URL:** `/dashboard/sprints`

**Fonctionnalités:**
- Créer des sprints avec:
  * Nom du sprint
  * Projet
  * Objectif
  * Dates de début et fin
  * Capacité équipe (heures)
- Statuts: Planifié, Actif, Terminé
- Démarrer/Terminer les sprints

### 7. 🗺️ Roadmap (FONCTIONNEL ✅)

**URL:** `/dashboard/roadmap`

**Fonctionnalités:**
- Vue timeline des tâches
- Visualisation par mois
- Filtrer par projet
- Voir les échéances visuellement

### 8. ⏱️ Timesheets (FONCTIONNEL ✅)

**URL:** `/dashboard/timesheets`

**Fonctionnalités:**
- Saisir du temps:
  * Projet
  * Tâche (optionnel)
  * Date
  * Heures travaillées
  * Description
- Statistiques:
  * Total semaine
  * Entrées ce mois
  * Moyenne par jour
- Validation des timesheets

### 9. 💰 Budget (FONCTIONNEL ✅ - FCFA)

**URL:** `/dashboard/budget`

**Devise:** FCFA (Franc CFA - Bénin)

**Fonctionnalités:**
- Voir budget par projet:
  * Budget total
  * Dépensé
  * Restant
  * Pourcentage de consommation
- Alerte si > 80% consommé
- Ajouter des dépenses
- Liste détaillée des dépenses

### 10. 📁 Fichiers (FONCTIONNEL ✅)

**URL:** `/dashboard/files`

**Fonctionnalités:**
- Upload de fichiers
- Filtrer par projet
- Recherche
- Download de fichiers
- Suppression

### 11. 💬 Commentaires (FONCTIONNEL ✅)

**URL:** `/dashboard/comments`

**Fonctionnalités:**
- Publier des commentaires
- @mentions
- Filtrer par projet
- Flux d'activité en temps réel

### 12. 🔔 Notifications (FONCTIONNEL ✅)

**URL:** `/dashboard/notifications`

**Fonctionnalités:**
- Liste toutes les notifications
- Filtres: Toutes / Non lues / Lues
- Marquer comme lu (une ou toutes)
- Supprimer des notifications
- Badge "Nouveau" pour non lues
- Compteur de notifications non lues

### 13. ⚙️ Paramètres (FONCTIONNEL ✅)

**URL:** `/dashboard/settings`

**Onglets:**
1. **Profil** - Nom, email, téléphone, poste
2. **Sécurité** - Changer mot de passe, sessions
3. **Notifications** - Préférences email/push
4. **Préférences** - Thème, langue

### 14. 👤 Profil (FONCTIONNEL ✅)

**URL:** `/dashboard/profile`

**Fonctionnalités:**
- Voir son profil complet
- Modifier informations personnelles
- Statistiques d'activité
- Rôle et permissions

### 15. 🔧 Mode Maintenance (FONCTIONNEL ✅)

**URL:** `/dashboard/maintenance`

**Admin uniquement**

**Fonctionnalités:**
- Activer/désactiver le mode maintenance
- Message personnalisable
- Aperçu en temps réel
- Statut visuel

## 🎨 Devise et Localisation

**Devise:** FCFA (Franc CFA)
**Langue:** Français
**Pays:** Bénin 🇧🇯

## 📞 Support

Pour toute question, contacter l'administrateur système.

## ✅ Checklist des Fonctionnalités

- [x] Authentification (Login, First Admin, Reset Password)
- [x] Dashboard Portfolio
- [x] Gestion des Projets
- [x] Kanban Board (Drag & Drop)
- [x] Gestion des Tâches
- [x] Backlog (Hiérarchie Épics → Stories → Tasks)
- [x] Sprints (Planning, Burndown)
- [x] Roadmap / Gantt
- [x] Timesheets (Saisie du temps)
- [x] Budget (FCFA, Dépenses, Alertes)
- [x] Fichiers (Upload, Download)
- [x] Commentaires (Flux d'activité)
- [x] Rapports (PDF, Excel, CSV) ✨
- [x] Notifications (Temps réel)
- [x] Gestion Utilisateurs
- [x] Gestion Rôles (23 permissions, Rôles personnalisés) ✨
- [x] Templates Projets
- [x] Types Livrables
- [x] Paramètres Utilisateur
- [x] Profil Utilisateur
- [x] Mode Maintenance

**Toutes les fonctionnalités sont 100% opérationnelles ! 🚀**
