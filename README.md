# PM - Gestion de Projets Agile

<div align="center">

![Logo](https://img.shields.io/badge/PM-Gestion_de_Projets-4f46e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0yMiAxOUgybS0yIDBoNGw0LTEwIDQgNSA0LTkgNiAxNHoiLz48L3N2Zz4=)

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Plateforme complète de gestion de projets Agile avec support Scrum, Kanban, gestion budgétaire en FCFA et système de permissions avancé**

[Fonctionnalites](#-fonctionnalités-détaillées) •
[Installation](#-installation) •
[Roles et Permissions](#-système-de-rôles-et-permissions) •
[API](#-api-reference) •
[Architecture](#-architecture-technique)

</div>

---

## Table des Matières

1. [Apercu General](#-aperçu-général)
2. [Fonctionnalites Detaillees](#-fonctionnalités-détaillées)
3. [Installation](#-installation)
4. [Configuration](#-configuration)
5. [Systeme de Roles et Permissions](#-système-de-rôles-et-permissions)
6. [Guide Utilisation](#-guide-dutilisation)
7. [API Reference](#-api-reference)
8. [Architecture Technique](#-architecture-technique)
9. [Modeles de Donnees](#-modèles-de-données)
10. [Securite](#-sécurité)
11. [Tests](#-tests)
12. [Scripts Disponibles](#-scripts-disponibles)
13. [Modifications Recentes](#-modifications-récentes)
14. [Contribution](#-contribution)

---

## 📋 Aperçu Général

**PM - Gestion de Projets** est une application web complète de gestion de projets Agile développée avec Next.js 14 et MongoDB. Elle offre une solution tout-en-un pour les équipes souhaitant gérer leurs projets selon les méthodologies Scrum et Kanban.

### Caractéristiques Principales

- **Gestion Agile Complète** : Support natif Scrum (Sprints, Backlog, Story Points) et Kanban (Drag & Drop)
- **Multi-Projets** : Gérez plusieurs projets simultanément avec des templates personnalisables
- **Système de Permissions Granulaire** : 10 rôles prédéfinis avec 23 permissions atomiques
- **Budget en FCFA** : Suivi budgétaire adapté au marché africain
- **Temps Réel** : Notifications et mises à jour via Socket.io
- **Rapports Professionnels** : Export PDF, Excel et CSV avec design entreprise
- **Interface Moderne** : UI/UX responsive avec Tailwind CSS et shadcn/ui

---

## ✨ Fonctionnalités Détaillées

### 1. Dashboard (`/dashboard`)

Le tableau de bord central offre une vue d'ensemble de tous vos projets :

| Fonctionnalité | Description |
|----------------|-------------|
| **Statistiques globales** | Nombre de projets, tâches en cours, sprints actifs |
| **Projets récents** | Accès rapide aux derniers projets consultés |
| **Tâches assignées** | Liste des tâches personnelles avec priorité |
| **Graphiques** | Vélocité d'équipe, burndown charts |
| **Activité récente** | Fil d'activité des actions récentes |

### 2. Gestion des Projets (`/dashboard/projects`)

Module complet de gestion de projets :

| Fonctionnalité | Description |
|----------------|-------------|
| **Création de projet** | Wizard avec templates prédéfinis ou projet vierge |
| **Templates personnalisés** | Créez vos propres modèles de projet |
| **Champs dynamiques** | Ajoutez des champs personnalisés (texte, nombre, date, liste) |
| **Équipe projet** | Assignation de membres avec rôles spécifiques |
| **Progression** | Suivi automatique basé sur les tâches terminées |
| **Dates** | Gestion des dates de début, fin prévue et fin réelle |
| **Statuts** | Planification, En cours, En pause, Terminé, Annulé |
| **Priorités** | Basse, Moyenne, Haute, Critique |

### 3. Kanban (`/dashboard/kanban`)

Tableau Kanban interactif avec drag & drop :

| Fonctionnalité | Description |
|----------------|-------------|
| **Colonnes personnalisables** | À faire, En cours, En revue, Terminé |
| **Drag & Drop** | Déplacez les tâches entre colonnes (via @dnd-kit) |
| **Filtres avancés** | Par projet, assigné, priorité, type |
| **Création rapide** | Ajoutez des tâches directement depuis le board |
| **Limites WIP** | Configurez des limites par colonne |
| **Vue par sprint** | Filtrez par sprint actif |

### 4. Backlog (`/dashboard/backlog`)

Gestion hiérarchique du backlog produit :

| Fonctionnalité | Description |
|----------------|-------------|
| **Hiérarchie Épic → Story → Task** | Organisation en 3 niveaux |
| **Story Points** | Estimation de complexité (Fibonacci) |
| **Prioritisation** | Drag & drop pour réordonner |
| **Critères d'acceptation** | Définissez les DoD pour chaque Story |
| **Assignation Sprint** | Planifiez les items dans les sprints |
| **Types d'items** | Épic, Story, Tâche, Bug |

### 5. Sprints (`/dashboard/sprints`)

Gestion complète des sprints Scrum :

| Fonctionnalité | Description |
|----------------|-------------|
| **Création de sprint** | Nom, dates, objectif, capacité |
| **Planification** | Assignez des tâches du backlog |
| **Démarrage** | Lancez le sprint avec burndown initial |
| **Burndown Chart** | Suivi graphique de l'avancement |
| **Vélocité** | Calcul automatique des points complétés |
| **Clôture** | Terminez le sprint avec rapport |
| **Statuts** | Planifié, Actif, Terminé |

### 6. Roadmap (`/dashboard/roadmap`)

Vue timeline des projets et épics :

| Fonctionnalité | Description |
|----------------|-------------|
| **Vue Gantt** | Timeline horizontale des projets |
| **Zoom** | Jour, Semaine, Mois, Trimestre |
| **Dépendances** | Visualisez les liens entre items |
| **Jalons** | Points clés du projet |
| **Export** | Exportez la roadmap en image |

### 7. Tâches (`/dashboard/tasks`)

Gestion détaillée des tâches :

| Fonctionnalité | Description |
|----------------|-------------|
| **CRUD complet** | Créer, lire, modifier, supprimer |
| **Types** | Épic, Story, Tâche, Bug |
| **Statuts** | À faire, En cours, En revue, Terminé, Bloqué |
| **Priorités** | Critique, Haute, Moyenne, Basse |
| **Assignation** | Assignez à un membre de l'équipe |
| **Estimation** | Heures et story points |
| **Dates** | Date début, échéance |
| **Parent** | Lien hiérarchique (Épic → Story → Task) |
| **Sprint** | Associez à un sprint |
| **Livrable** | Liez à un livrable |

### 8. Fichiers (`/dashboard/files`)

Gestionnaire de fichiers intégré :

| Fonctionnalité | Description |
|----------------|-------------|
| **Upload** | Téléversement multiple avec drag & drop |
| **Dossiers** | Organisation hiérarchique |
| **Preview** | Aperçu des images et documents |
| **Téléchargement** | Download direct |
| **Métadonnées** | Taille, type, date d'upload |
| **Lien projet** | Fichiers associés aux projets |
| **Recherche** | Recherche par nom |

### 9. Commentaires (`/dashboard/comments`)

Système de commentaires et discussions :

| Fonctionnalité | Description |
|----------------|-------------|
| **Commentaires sur tâches** | Discussions contextuelles |
| **@mentions** | Mentionnez des utilisateurs |
| **Fil d'activité** | Historique des commentaires |
| **Édition** | Modifiez vos commentaires |
| **Suppression** | Supprimez vos commentaires |
| **Notifications** | Alertes sur nouvelles mentions |

### 10. Timesheets (`/dashboard/timesheets`)

Suivi du temps passé :

| Fonctionnalité | Description |
|----------------|-------------|
| **Saisie du temps** | Heures travaillées par tâche |
| **Date** | Sélection de la date de travail |
| **Description** | Notes sur le travail effectué |
| **Historique** | Consultez vos saisies passées |
| **Statuts** | Brouillon, Soumis, Validé, Rejeté |
| **Validation** | Workflow d'approbation |
| **Rapports** | Temps par projet/personne |

### 11. Budget (`/dashboard/budget`)

Gestion budgétaire en FCFA :

| Fonctionnalité | Description |
|----------------|-------------|
| **Budget prévisionnel** | Définissez le budget total |
| **Dépenses** | Enregistrez les dépenses |
| **Catégories** | Classez les dépenses |
| **Alertes** | Notifications à 80% et 100% |
| **Écart** | Calcul automatique du reste |
| **Graphiques** | Visualisation de la consommation |
| **Devise** | FCFA par défaut |
| **Statuts** | En attente, Approuvé, Rejeté |

### 12. Rapports (`/dashboard/reports`)

Génération de rapports professionnels :

| Type de Rapport | Formats | Contenu |
|-----------------|---------|---------|
| **Avancement** | PDF, Excel, CSV | Progression des projets, tâches par statut |
| **Budget** | PDF, Excel, CSV | Dépenses, écarts, graphiques |
| **Temps** | PDF, Excel, CSV | Heures par projet/personne |
| **Performance** | PDF, Excel, CSV | Vélocité, burndown, métriques |

**Caractéristiques des exports :**
- En-têtes/pieds de page professionnels avec logo
- Date et heure de génération
- Numérotation des pages (PDF)
- Styles et couleurs entreprise (Excel)
- Noms de fichiers avec date (format DD-MM-YYYY)

### 13. Notifications (`/dashboard/notifications`)

Système de notifications in-app :

| Fonctionnalité | Description |
|----------------|-------------|
| **Types** | Assignation, mention, deadline, etc. |
| **Badge compteur** | Nombre de non-lues |
| **Marquer comme lu** | Individuel ou toutes |
| **Filtres** | Par type, par date |
| **Suppression** | Nettoyez les anciennes |
| **Temps réel** | Via Socket.io |

### 14. Administration

#### 14.1 Rôles & Permissions (`/dashboard/admin/roles`)

| Fonctionnalité | Description |
|----------------|-------------|
| **10 rôles prédéfinis** | Configurés avec permissions optimales |
| **23 permissions** | Granularité fine des accès |
| **Matrice visuelle** | Interface de configuration intuitive |
| **Rôles personnalisés** | Créez vos propres rôles |
| **Menus visibles** | Configurez les menus par rôle |

#### 14.2 Utilisateurs (`/dashboard/users`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Création** | Nom, email, rôle, statut |
| **Mot de passe temporaire** | Généré automatiquement (00000000) |
| **Réinitialisation** | Reset du mot de passe |
| **Statuts** | Actif, Désactivé |
| **Dernière connexion** | Traçabilité |

#### 14.3 Templates (`/dashboard/admin/templates`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Création de templates** | Modèles de projets réutilisables |
| **Champs personnalisés** | Ajoutez des champs spécifiques |
| **Duplication** | Copiez un template existant |
| **Activation** | Activez/désactivez les templates |

#### 14.4 Types de Livrables (`/dashboard/admin/deliverable-types`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Types prédéfinis** | Document, Code, Design, etc. |
| **Types personnalisés** | Créez vos propres types |
| **Workflows** | Statuts de validation |

#### 14.5 Audit & Logs (`/dashboard/admin/audit`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Historique complet** | Toutes les actions système |
| **Filtres** | Par utilisateur, action, date |
| **Détails** | Qui, quoi, quand, où |
| **Export** | CSV pour analyse |
| **Par utilisateur** | Vue détaillée par personne |

#### 14.6 SharePoint (`/dashboard/admin/sharepoint`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Configuration Azure AD** | Tenant, Client ID, Secret |
| **Test de connexion** | Vérification des credentials |
| **Synchronisation** | Sync des fichiers |

#### 14.7 Paramètres (`/dashboard/settings`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Général** | Nom de l'application, langue |
| **Sécurité** | Expiration session, 2FA |
| **Apparence** | Thème, couleurs |

#### 14.8 Maintenance (`/dashboard/maintenance`)

| Fonctionnalité | Description |
|----------------|-------------|
| **Mode maintenance** | Activez/désactivez |
| **Message personnalisé** | Information aux utilisateurs |
| **Accès admin** | Seuls les admins peuvent accéder |

---

## 🔧 Installation

### Prérequis

| Logiciel | Version | Téléchargement |
|----------|---------|----------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **MongoDB** | 6+ | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Yarn** | 1.22+ | `npm install -g yarn` |
| **Docker** (optionnel) | 20+ | [docker.com](https://www.docker.com/) |

### Option 1 : Installation Locale

```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/pm-gestion-projets.git
cd pm-gestion-projets

# 2. Installer les dépendances
yarn install

# 3. Configurer l'environnement
cp .env.example .env
# Éditez .env avec vos paramètres (voir section Configuration)

# 4. Démarrer MongoDB (si local)
# macOS avec Homebrew :
brew services start mongodb-community

# Ubuntu/Debian :
sudo systemctl start mongod

# 5. Démarrer l'application
yarn dev
```

### Option 2 : Docker Compose

```bash
# Démarrer tous les services (MongoDB + App + Socket.io)
./scripts/start-dev-docker.sh

# Ou manuellement :
docker compose up -d
```

### Option 3 : Production

```bash
# Build de production
yarn build

# Démarrer en production
yarn start
```

### Premier Lancement

1. Ouvrez **http://localhost:3000**
2. Vous serez redirigé vers `/first-admin`
3. Créez le compte **Super Administrateur** :
   - Nom complet
   - Email
   - Mot de passe (min. 8 caractères)
4. Connectez-vous à `/login`
5. Les 10 rôles prédéfinis sont automatiquement créés

---

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

```env
# ============================================
# BASE DE DONNÉES (OBLIGATOIRE)
# ============================================
# MongoDB local
MONGO_URL=mongodb://localhost:27017/pm_gestion

# MongoDB avec authentification (Docker)
MONGO_URL=mongodb://admin:admin123@localhost:27017/project-manager?authSource=admin

# MongoDB Atlas (Cloud)
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/pm_gestion

# ============================================
# SÉCURITÉ (OBLIGATOIRE)
# ============================================
# Secret JWT - CHANGEZ CETTE VALEUR EN PRODUCTION !
# Générez avec : openssl rand -base64 32
JWT_SECRET=votre-secret-jwt-tres-securise-et-long

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CORS - Origines autorisées (séparées par virgule)
CORS_ORIGINS=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# ============================================
# SOCKET.IO (Temps réel)
# ============================================
SOCKET_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000
SOCKET_PORT=4000

# ============================================
# SERVICES OPTIONNELS
# ============================================

# EMAIL SMTP (Notifications par email)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=votre-email@gmail.com
# SMTP_PASS=xxxx xxxx xxxx xxxx
# SMTP_FROM="PM Gestion" <votre-email@gmail.com>

# PUSH NOTIFICATIONS (Web Push)
# Générez avec : npx web-push generate-vapid-keys
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=votre-cle-publique
# VAPID_PRIVATE_KEY=votre-cle-privee
# VAPID_SUBJECT=mailto:admin@pm-gestion.com

# SHAREPOINT (Intégration Microsoft)
# SHAREPOINT_ENABLED=true
# SHAREPOINT_TENANT_ID=votre-tenant-id
# SHAREPOINT_CLIENT_ID=votre-client-id
# SHAREPOINT_CLIENT_SECRET=votre-secret
# SHAREPOINT_SITE_ID=votre-site-id
```

### Configuration MongoDB

#### Local (macOS)
```bash
brew install mongodb-community
brew services start mongodb-community
```

#### Local (Ubuntu/Debian)
```bash
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Docker
```bash
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  mongo:7
```

#### MongoDB Atlas (Cloud)
1. Créez un compte sur [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Créez un cluster gratuit (M0)
3. Configurez un utilisateur et un accès réseau
4. Copiez l'URL de connexion dans `.env`

---

## 🛡️ Système de Rôles et Permissions

### Vue d'Ensemble

Le système de permissions est basé sur deux concepts :
1. **Permissions** : Actions autorisées (23 permissions atomiques)
2. **Menus Visibles** : Pages accessibles dans l'interface (14 menus)

Un menu n'est visible que si :
- La **permission requise** est accordée
- **ET** le menu est activé dans `visibleMenus`

### Les 10 Rôles Prédéfinis

#### 1. Super Administrateur
> Accès complet au système - Configuration, rôles et administration

| Catégorie | Permissions |
|-----------|-------------|
| **Admin** | ✅ adminConfig, ✅ gererUtilisateurs, ✅ voirAudit |
| **Projets** | ✅ voirTousProjets, ✅ creerProjet, ✅ supprimerProjet, ✅ modifierCharteProjet |
| **Équipe** | ✅ gererMembresProjet, ✅ changerRoleMembre |
| **Tâches** | ✅ gererTaches, ✅ deplacerTaches, ✅ prioriserBacklog |
| **Sprints** | ✅ gererSprints |
| **Budget** | ✅ modifierBudget, ✅ voirBudget |
| **Temps** | ✅ voirTempsPasses, ✅ saisirTemps |
| **Autres** | ✅ validerLivrable, ✅ gererFichiers, ✅ commenter, ✅ recevoirNotifications, ✅ genererRapports |

**Menus** : Tous (14/14)

---

#### 2. Administrateur
> Accès complet sans gestion des utilisateurs

| Catégorie | Permissions |
|-----------|-------------|
| **Admin** | ✅ adminConfig, ❌ gererUtilisateurs, ✅ voirAudit |
| **Projets** | ✅ voirTousProjets, ✅ creerProjet, ✅ supprimerProjet, ✅ modifierCharteProjet |
| **Reste** | Identique au Super Admin |

**Menus** : Tous (14/14)

---

#### 3. Chef de Projet
> Gestion complète de ses projets assignés

| Catégorie | Permissions |
|-----------|-------------|
| **Admin** | ❌ adminConfig, ❌ gererUtilisateurs, ❌ voirAudit |
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets, ✅ creerProjet, ❌ supprimerProjet, ✅ modifierCharteProjet |
| **Équipe** | ✅ gererMembresProjet, ✅ changerRoleMembre |
| **Tâches** | ✅ gererTaches, ✅ deplacerTaches, ✅ prioriserBacklog |
| **Sprints** | ✅ gererSprints |
| **Budget** | ✅ modifierBudget, ✅ voirBudget |
| **Temps** | ✅ voirTempsPasses, ✅ saisirTemps |
| **Autres** | ❌ validerLivrable, ✅ gererFichiers, ✅ commenter, ✅ recevoirNotifications, ✅ genererRapports |

**Menus** : 13/14 (sans Admin)

---

#### 4. Responsable Équipe
> Gestion de l'équipe, des tâches et du reporting

| Catégorie | Permissions |
|-----------|-------------|
| **Admin** | ❌ Aucune permission admin |
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets, ❌ creerProjet, ❌ supprimerProjet, ❌ modifierCharteProjet |
| **Équipe** | ❌ gererMembresProjet, ❌ changerRoleMembre |
| **Tâches** | ✅ gererTaches, ✅ deplacerTaches, ✅ prioriserBacklog |
| **Sprints** | ✅ gererSprints |
| **Budget** | ❌ modifierBudget, ✅ voirBudget |
| **Temps** | ✅ voirTempsPasses, ✅ saisirTemps |
| **Autres** | ❌ validerLivrable, ✅ gererFichiers, ✅ commenter, ✅ recevoirNotifications, ✅ genererRapports |

**Menus** : projects, kanban, backlog, sprints, roadmap, tasks, files, comments, timesheets, budget, reports, notifications

---

#### 5. Product Owner
> Backlog, prioritisation et validation des livrables

| Catégorie | Permissions |
|-----------|-------------|
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets, ❌ créer/supprimer/modifier |
| **Tâches** | ✅ gererTaches, ✅ deplacerTaches, ✅ prioriserBacklog |
| **Sprints** | ❌ gererSprints |
| **Budget** | ❌ modifierBudget, ✅ voirBudget |
| **Temps** | ✅ voirTempsPasses, ❌ saisirTemps |
| **Autres** | ✅ validerLivrable, ✅ gererFichiers, ✅ commenter, ✅ recevoirNotifications, ✅ genererRapports |

**Menus** : projects, kanban, backlog, roadmap, tasks, files, comments, budget, reports, notifications

---

#### 6. Membre Équipe
> Contribution aux tâches et suivi du temps

| Catégorie | Permissions |
|-----------|-------------|
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets |
| **Tâches** | ❌ gererTaches, ✅ deplacerTaches, ❌ prioriserBacklog |
| **Temps** | ✅ voirTempsPasses, ✅ saisirTemps |
| **Autres** | ✅ gererFichiers, ✅ commenter, ✅ recevoirNotifications |

**Menus** : projects, kanban, roadmap, files, comments, timesheets, notifications

---

#### 7. Consultant
> Contribution limitée aux projets assignés

| Catégorie | Permissions |
|-----------|-------------|
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets, ❌ créer/supprimer |
| **Tâches** | ❌ gererTaches, ✅ deplacerTaches |
| **Budget** | ❌ modifierBudget, ✅ voirBudget |
| **Temps** | ✅ voirTempsPasses, ✅ saisirTemps |
| **Autres** | ✅ gererFichiers, ✅ commenter, ✅ recevoirNotifications |

**Menus** : projects, kanban, roadmap, files, comments, timesheets, budget, notifications

---

#### 8. Partie Prenante (Stakeholder)
> Lecture et commentaires sur les projets partagés

| Catégorie | Permissions |
|-----------|-------------|
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets |
| **Lecture** | ✅ voirBudget, ✅ voirFichiers |
| **Interaction** | ✅ commenter, ✅ recevoirNotifications |

**Menus** : projects, roadmap, comments, budget, notifications

---

#### 9. Observateur
> Lecture seule stricte

| Catégorie | Permissions |
|-----------|-------------|
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets |
| **Lecture** | ✅ voirBudget, ✅ voirTempsPasses, ✅ voirFichiers |
| **Interaction** | ❌ commenter, ✅ recevoirNotifications |

**Menus** : projects, roadmap, budget, notifications

---

#### 10. Invité
> Accès temporaire en lecture avec commentaires

| Catégorie | Permissions |
|-----------|-------------|
| **Projets** | ❌ voirTousProjets, ✅ voirSesProjets |
| **Lecture** | ✅ voirFichiers |
| **Interaction** | ✅ commenter, ✅ recevoirNotifications |

**Menus** : projects, roadmap, comments, notifications

---

### Matrice des Permissions Critiques

| Action | Invité | Observateur | Partie Prenante | Membre | Consultant | PO | Resp. Équipe | Chef Projet | Admin | Super Admin |
|--------|:------:|:-----------:|:---------------:|:------:|:----------:|:--:|:------------:|:-----------:|:-----:|:-----------:|
| **Admin système** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Gérer utilisateurs** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Supprimer projets** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Créer projets** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Modifier projets** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Modifier budget** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Gérer membres** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Gérer tâches** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Gérer sprints** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Valider livrables** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Gérer fichiers** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Commenter** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Mapping Menus → Permissions

| Menu | Permission Requise | Description |
|------|-------------------|-------------|
| `portfolio` | `voirSesProjets` | Dashboard principal |
| `projects` | `voirSesProjets` | Liste des projets |
| `kanban` | `deplacerTaches` | Tableau Kanban |
| `backlog` | `prioriserBacklog` | Gestion du backlog |
| `sprints` | `gererSprints` | Gestion des sprints |
| `roadmap` | `voirSesProjets` | Timeline/Gantt |
| `tasks` | `gererTaches` | Liste des tâches |
| `files` | `gererFichiers` | Gestionnaire de fichiers |
| `comments` | `commenter` | Commentaires |
| `timesheets` | `saisirTemps` | Feuilles de temps |
| `budget` | `voirBudget` | Gestion budgétaire |
| `reports` | `genererRapports` | Rapports |
| `notifications` | `recevoirNotifications` | Notifications |
| `admin` | `adminConfig` | Administration |

---

## 📖 Guide d'Utilisation

### Première Connexion

1. **Accédez à l'application** : http://localhost:3000
2. **Créez le Super Admin** : Remplissez le formulaire `/first-admin`
3. **Connectez-vous** : Utilisez vos identifiants sur `/login`
4. **Changez votre mot de passe** : Si c'est la première connexion

### Créer un Projet

1. **Menu** → **Projets** → **+ Nouveau Projet**
2. **Sélectionnez un template** ou "Projet Vierge"
3. **Remplissez les informations** :
   - Nom du projet (obligatoire)
   - Description
   - Dates de début et fin prévue
   - Priorité
4. **Champs personnalisés** : Remplissez selon le template
5. **Cliquez** → **Créer**

### Gérer une Équipe

1. **Ouvrez un projet** → **Détails**
2. **Section Équipe** → **+ Ajouter**
3. **Sélectionnez un utilisateur**
4. **Choisissez son rôle** dans le projet
5. **Confirmez** l'ajout

### Utiliser le Kanban

1. **Menu** → **Kanban**
2. **Sélectionnez un projet** (dropdown)
3. **Drag & Drop** : Déplacez les cartes entre colonnes
4. **Créer une tâche** : Bouton **+ Tâche**
5. **Filtrer** : Par assigné, priorité, type

### Planifier un Sprint

1. **Menu** → **Sprints** → **+ Nouveau Sprint**
2. **Définissez** :
   - Nom (ex: "Sprint 1")
   - Dates de début et fin (généralement 2 semaines)
   - Objectif du sprint
3. **Ajoutez des tâches** depuis le backlog
4. **Démarrez le sprint** quand prêt
5. **Suivez le burndown** pour l'avancement

### Gérer le Budget

1. **Menu** → **Budget**
2. **Sélectionnez un projet**
3. **Définissez le budget** : Cliquez sur le montant prévisionnel
4. **Ajoutez des dépenses** : **+ Nouvelle dépense**
   - Description
   - Montant (FCFA)
   - Catégorie
   - Date
5. **Surveillez les alertes** : Orange à 80%, Rouge à 100%

### Générer un Rapport

1. **Menu** → **Rapports**
2. **Choisissez le type** :
   - Avancement
   - Budget
   - Temps
   - Performance
3. **Sélectionnez** : Projet, période
4. **Exportez** : PDF, Excel ou CSV

---

## 📚 API Reference

### Authentification

Toutes les routes (sauf `/api/check` et `/api/auth/*`) requièrent un token JWT :

```bash
# Header d'authentification
Authorization: Bearer <votre_token_jwt>
```

### Format de Réponse Standard

```json
{
  "success": true,
  "data": { ... },
  "message": "Message optionnel"
}
```

```json
{
  "success": false,
  "error": "Message d'erreur",
  "details": { ... }
}
```

### Endpoints

#### Authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/check` | Vérifier l'état de l'API | Non |
| `POST` | `/api/auth/first-admin` | Créer le premier administrateur | Non |
| `POST` | `/api/auth/login` | Connexion utilisateur | Non |
| `POST` | `/api/auth/first-login-reset` | Réinitialiser mot de passe (première connexion) | Non |
| `GET` | `/api/auth/me` | Obtenir le profil de l'utilisateur connecté | Oui |

#### Projets

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/projects` | Liste des projets | `voirSesProjets` |
| `POST` | `/api/projects` | Créer un projet | `creerProjet` |
| `GET` | `/api/projects/:id` | Détails d'un projet | `voirSesProjets` |
| `PUT` | `/api/projects/:id` | Modifier un projet | `modifierCharteProjet` |
| `DELETE` | `/api/projects/:id` | Supprimer un projet | `supprimerProjet` |
| `POST` | `/api/projects/:id/members` | Ajouter un membre | `gererMembresProjet` |
| `DELETE` | `/api/projects/:id/members/:memberId` | Retirer un membre | `gererMembresProjet` |

#### Tâches

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/tasks` | Liste des tâches | `voirSesProjets` |
| `POST` | `/api/tasks` | Créer une tâche | `gererTaches` |
| `GET` | `/api/tasks/:id` | Détails d'une tâche | `voirSesProjets` |
| `PUT` | `/api/tasks/:id` | Modifier une tâche | `gererTaches` |
| `PUT` | `/api/tasks/:id/move` | Déplacer (Kanban) | `deplacerTaches` |
| `DELETE` | `/api/tasks/:id` | Supprimer une tâche | `gererTaches` |

#### Sprints

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/sprints` | Liste des sprints | `voirSesProjets` |
| `POST` | `/api/sprints` | Créer un sprint | `gererSprints` |
| `GET` | `/api/sprints/:id` | Détails d'un sprint | `voirSesProjets` |
| `PUT` | `/api/sprints/:id` | Modifier un sprint | `gererSprints` |
| `PUT` | `/api/sprints/:id/start` | Démarrer un sprint | `gererSprints` |
| `PUT` | `/api/sprints/:id/complete` | Terminer un sprint | `gererSprints` |
| `DELETE` | `/api/sprints/:id` | Supprimer un sprint | `gererSprints` |

#### Utilisateurs & Rôles

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/users` | Liste des utilisateurs | `adminConfig` |
| `POST` | `/api/users` | Créer un utilisateur | `gererUtilisateurs` |
| `PUT` | `/api/users/:id` | Modifier un utilisateur | `gererUtilisateurs` |
| `PUT` | `/api/users/:id/reset-password` | Réinitialiser mot de passe | `gererUtilisateurs` |
| `GET` | `/api/roles` | Liste des rôles | - |
| `POST` | `/api/roles` | Créer un rôle | `adminConfig` |
| `PUT` | `/api/roles/:id` | Modifier un rôle | `adminConfig` |
| `DELETE` | `/api/roles/:id` | Supprimer un rôle | `adminConfig` |

#### Fichiers

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/files` | Liste des fichiers | `gererFichiers` |
| `POST` | `/api/files/upload` | Téléverser un fichier | `gererFichiers` |
| `POST` | `/api/files/folder` | Créer un dossier | `gererFichiers` |
| `GET` | `/api/files/:id/download` | Télécharger un fichier | `gererFichiers` |
| `DELETE` | `/api/files/:id` | Supprimer un fichier | `gererFichiers` |

#### Budget & Dépenses

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/budget/:projectId` | Budget d'un projet | `voirBudget` |
| `PUT` | `/api/budget/:projectId` | Modifier le budget | `modifierBudget` |
| `POST` | `/api/expenses` | Ajouter une dépense | `modifierBudget` |
| `PUT` | `/api/expenses/:id` | Modifier une dépense | `modifierBudget` |
| `DELETE` | `/api/expenses/:id` | Supprimer une dépense | `modifierBudget` |

#### Timesheets

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/timesheets` | Liste des entrées | `voirTempsPasses` |
| `POST` | `/api/timesheets` | Créer une entrée | `saisirTemps` |
| `PUT` | `/api/timesheets/:id` | Modifier une entrée | `saisirTemps` |
| `PUT` | `/api/timesheets/:id/status` | Changer le statut | `modifierBudget` |
| `DELETE` | `/api/timesheets/:id` | Supprimer une entrée | `saisirTemps` |

#### Commentaires

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/comments` | Liste des commentaires | `commenter` |
| `POST` | `/api/comments` | Créer un commentaire | `commenter` |
| `PUT` | `/api/comments/:id` | Modifier un commentaire | `commenter` |
| `DELETE` | `/api/comments/:id` | Supprimer un commentaire | `commenter` |

#### Notifications

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/notifications` | Liste des notifications | `recevoirNotifications` |
| `PUT` | `/api/notifications/:id/read` | Marquer comme lue | `recevoirNotifications` |
| `PUT` | `/api/notifications/read-all` | Tout marquer comme lu | `recevoirNotifications` |
| `DELETE` | `/api/notifications/:id` | Supprimer | `recevoirNotifications` |

#### Administration

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/settings` | Paramètres système | `adminConfig` |
| `PUT` | `/api/settings` | Modifier les paramètres | `adminConfig` |
| `GET` | `/api/settings/maintenance` | État maintenance | - |
| `PUT` | `/api/settings/maintenance` | Toggle maintenance | `adminConfig` |
| `GET` | `/api/audit/logs` | Logs d'audit | `voirAudit` |
| `GET` | `/api/audit/user/:userId` | Activité utilisateur | `voirAudit` |
| `GET` | `/api/templates` | Liste des templates | - |
| `POST` | `/api/templates` | Créer un template | `adminConfig` |
| `PUT` | `/api/templates/:id` | Modifier un template | `adminConfig` |
| `DELETE` | `/api/templates/:id` | Supprimer un template | `adminConfig` |

---

## 🏗️ Architecture Technique

### Structure du Projet

```
pm-gestion-projets/
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── [[...path]]/route.js      # API Backend (5374 lignes, 70+ endpoints)
│   │   ├── health/route.js           # Health check
│   │   └── socket/route.js           # Socket.io endpoint
│   ├── dashboard/                    # Pages du dashboard (17 pages)
│   │   ├── admin/                    # Administration (6 pages)
│   │   │   ├── audit/                # Logs d'audit
│   │   │   ├── deliverable-types/    # Types de livrables
│   │   │   ├── roles/                # Gestion des rôles
│   │   │   ├── sharepoint/           # Config SharePoint
│   │   │   └── templates/            # Templates projets
│   │   ├── backlog/                  # Gestion du backlog
│   │   ├── budget/                   # Gestion budgétaire
│   │   ├── comments/                 # Commentaires
│   │   ├── files/                    # Fichiers
│   │   ├── kanban/                   # Tableau Kanban
│   │   ├── maintenance/              # Mode maintenance
│   │   ├── notifications/            # Notifications
│   │   ├── profile/                  # Profil utilisateur
│   │   ├── projects/                 # Projets
│   │   │   └── [id]/                 # Détail projet
│   │   ├── reports/                  # Rapports
│   │   ├── roadmap/                  # Timeline/Gantt
│   │   ├── settings/                 # Paramètres
│   │   ├── sprints/                  # Sprints
│   │   ├── tasks/                    # Tâches
│   │   ├── timesheets/               # Feuilles de temps
│   │   ├── users/                    # Utilisateurs
│   │   ├── layout.js                 # Layout dashboard
│   │   └── page.js                   # Page principale
│   ├── first-admin/                  # Création premier admin
│   ├── first-login/                  # Première connexion
│   ├── login/                        # Connexion
│   ├── welcome/                      # Page d'accueil
│   ├── layout.js                     # Layout racine
│   ├── page.js                       # Page racine
│   ├── not-found.js                  # Page 404
│   └── error.js                      # Gestion erreurs
├── components/                       # Composants React
│   ├── ui/                           # Composants shadcn/ui (40+)
│   ├── kanban/                       # Composants Kanban
│   ├── charts/                       # Graphiques (Burndown, Velocity)
│   ├── ItemFormDialog.jsx            # Formulaire tâches/épics/stories
│   ├── WorkflowStatusBadge.jsx       # Badge de statut
│   ├── StatusBadge.jsx               # Badge simple
│   ├── ConfirmationDialog.jsx        # Dialogue de confirmation
│   └── Footer.jsx                    # Pied de page
├── models/                           # Modèles Mongoose (18)
│   ├── User.js                       # Utilisateurs
│   ├── Role.js                       # Rôles système
│   ├── ProjectRole.js                # Rôles projet
│   ├── Project.js                    # Projets
│   ├── ProjectTemplate.js            # Templates
│   ├── Task.js                       # Tâches
│   ├── Sprint.js                     # Sprints
│   ├── Deliverable.js                # Livrables
│   ├── DeliverableType.js            # Types de livrables
│   ├── Comment.js                    # Commentaires
│   ├── File.js                       # Fichiers
│   ├── Notification.js               # Notifications
│   ├── Timesheet.js                  # Timesheets
│   ├── Budget.js                     # Dépenses
│   ├── AuditLog.js                   # Logs d'audit
│   ├── UserSession.js                # Sessions
│   └── AppSettings.js                # Paramètres app
├── lib/                              # Utilitaires et services
│   ├── auth.js                       # Authentification JWT
│   ├── authCookie.js                 # Gestion cookies
│   ├── apiResponse.js                # Réponses API standardisées
│   ├── apiMiddleware.js              # Middlewares API
│   ├── apiErrors.js                  # Gestion des erreurs
│   ├── db.js                         # Connexion MongoDB
│   ├── mongodb.js                    # Helper MongoDB
│   ├── mongoOptimize.js              # Optimisations MongoDB
│   ├── cache.js                      # Cache en mémoire
│   ├── rateLimit.js                  # Rate limiting
│   ├── permissions.js                # Gestion permissions
│   ├── menuConfig.js                 # Configuration menus
│   ├── projectRoleInit.js            # Initialisation rôles
│   ├── validation.js                 # Validation données
│   ├── validationSchemas.js          # Schémas Joi
│   ├── validators.js                 # Validateurs
│   ├── workflows.js                  # Workflows de statut
│   ├── statusTransitionUtils.js      # Transitions de statut
│   ├── auditService.js               # Service d'audit
│   ├── auditApiHandler.js            # Handler API audit
│   ├── auditNotificationService.js   # Notifications audit
│   ├── socket-server.js              # Serveur Socket.io
│   ├── socket-client.js              # Client Socket.io
│   ├── socket-emitter.js             # Émetteur d'événements
│   ├── socket-events.js              # Événements Socket
│   ├── fetch-with-timeout.js         # Fetch avec timeout
│   ├── inputValidator.js             # Validation entrées
│   ├── envValidation.js              # Validation env
│   └── services/                     # Services métier
│       ├── projectService.js         # Service projets
│       ├── userService.js            # Service utilisateurs
│       └── taskService.js            # Service tâches
├── hooks/                            # Hooks React personnalisés
│   ├── useRBACPermissions.js         # Permissions RBAC
│   ├── useConfirmation.js            # Dialogue confirmation
│   ├── useRealtime.js                # Données temps réel
│   ├── useSocketListener.js          # Écoute Socket
│   ├── useTaskSync.js                # Sync tâches
│   ├── useCommentSync.js             # Sync commentaires
│   ├── useNotificationSync.js        # Sync notifications
│   ├── usePushNotifications.js       # Push notifications
│   ├── useItemFormData.js            # Données formulaire
│   ├── useOptimizedQuery.js          # Requêtes optimisées
│   ├── use-toast.js                  # Notifications toast
│   └── use-mobile.jsx                # Détection mobile
├── context/                          # Contextes React
│   ├── SocketContext.jsx             # Contexte Socket.io
│   └── ConfirmationContext.jsx       # Contexte confirmation
├── public/                           # Assets statiques
├── scripts/                          # Scripts utilitaires
│   ├── start-dev.js                  # Démarrage dev
│   ├── start-dev-docker.sh           # Docker dev
│   ├── clear-db.js                   # Vider la BDD
│   └── socket-server.js              # Serveur Socket
├── .env                              # Variables d'environnement
├── docker-compose.yml                # Configuration Docker
├── package.json                      # Dépendances
├── tailwind.config.js                # Config Tailwind
├── next.config.mjs                   # Config Next.js
└── jest.config.js                    # Config tests
```

### Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS 3.4 |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons |
| **State Management** | React Context, Zustand |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable |
| **Graphiques** | Recharts |
| **Animations** | Framer Motion |
| **Backend** | Next.js API Routes |
| **Authentification** | JWT (jose), bcryptjs |
| **Base de données** | MongoDB 7+, Mongoose 8 |
| **Temps réel** | Socket.io 4.8 |
| **Validation** | Joi, Zod |
| **Export** | jsPDF, ExcelJS, PapaParse |
| **Email** | Nodemailer |
| **Tests** | Jest, Testing Library |

### Dépendances Principales

```json
{
  "dependencies": {
    "next": "^14.2.33",
    "react": "^18",
    "react-dom": "^18",
    "mongoose": "^8.10.0",
    "mongodb": "^6.6.0",
    "jose": "^5.9.6",
    "bcryptjs": "^2.4.3",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "recharts": "^2.15.3",
    "jspdf": "^3.0.4",
    "exceljs": "^4.4.0",
    "papaparse": "^5.5.3",
    "tailwindcss": "^3.4.1",
    "framer-motion": "^11.18.0",
    "sonner": "^2.0.5",
    "zod": "^3.25.67",
    "joi": "^18.0.2"
  }
}
```

---

## 📊 Modèles de Données

### User (Utilisateur)

```javascript
{
  _id: ObjectId,
  nom_complet: String,           // Nom complet
  email: String,                 // Email unique
  password: String,              // Hash bcrypt
  role_id: ObjectId (ref: Role), // Rôle système
  status: String,                // 'Actif' | 'Désactivé'
  avatar: String,                // URL avatar
  première_connexion: Boolean,   // Doit changer MDP
  dernière_connexion: Date,      // Dernière connexion
  notifications_préférées: {
    in_app: Boolean,
    email: Boolean,
    push: Boolean
  },
  created_at: Date,
  updated_at: Date
}
```

### Role (Rôle)

```javascript
{
  _id: ObjectId,
  nom: String,                   // Nom du rôle
  description: String,           // Description
  is_predefined: Boolean,        // Rôle prédéfini
  is_custom: Boolean,            // Rôle personnalisé
  permissions: {
    voirTousProjets: Boolean,
    voirSesProjets: Boolean,
    creerProjet: Boolean,
    supprimerProjet: Boolean,
    modifierCharteProjet: Boolean,
    gererMembresProjet: Boolean,
    changerRoleMembre: Boolean,
    gererTaches: Boolean,
    deplacerTaches: Boolean,
    prioriserBacklog: Boolean,
    gererSprints: Boolean,
    modifierBudget: Boolean,
    voirBudget: Boolean,
    voirTempsPasses: Boolean,
    saisirTemps: Boolean,
    validerLivrable: Boolean,
    gererFichiers: Boolean,
    commenter: Boolean,
    recevoirNotifications: Boolean,
    genererRapports: Boolean,
    voirAudit: Boolean,
    gererUtilisateurs: Boolean,
    adminConfig: Boolean
  },
  visibleMenus: {
    portfolio: Boolean,
    projects: Boolean,
    kanban: Boolean,
    backlog: Boolean,
    sprints: Boolean,
    roadmap: Boolean,
    tasks: Boolean,
    files: Boolean,
    comments: Boolean,
    timesheets: Boolean,
    budget: Boolean,
    reports: Boolean,
    notifications: Boolean,
    admin: Boolean
  },
  created_at: Date
}
```

### Project (Projet)

```javascript
{
  _id: ObjectId,
  nom: String,                        // Nom du projet
  description: String,                // Description
  statut: String,                     // Planification | En cours | En pause | Terminé | Annulé
  priorité: String,                   // Basse | Moyenne | Haute | Critique
  date_début: Date,                   // Date de début
  date_fin_prévue: Date,              // Date de fin prévue
  date_fin_réelle: Date,              // Date de fin réelle
  chef_projet: ObjectId (ref: User),  // Chef de projet
  product_owner: ObjectId (ref: User),// Product Owner
  template_id: ObjectId (ref: Template),
  créé_par: ObjectId (ref: User),
  membres: [{
    user_id: ObjectId (ref: User),
    project_role_id: ObjectId (ref: Role),
    date_ajout: Date
  }],
  budget: {
    prévisionnel: Number,
    réel: Number,
    devise: String                    // 'FCFA' par défaut
  },
  stats: {
    total_tâches: Number,
    tâches_terminées: Number,
    progression: Number,
    heures_estimées: Number,
    heures_réelles: Number
  },
  custom_fields: Object,              // Champs personnalisés
  created_at: Date,
  updated_at: Date
}
```

### Task (Tâche)

```javascript
{
  _id: ObjectId,
  titre: String,                      // Titre
  description: String,                // Description
  type: String,                       // Épic | Story | Tâche | Bug
  statut: String,                     // À faire | En cours | En revue | Terminé | Bloqué
  priorité: String,                   // Critique | Haute | Moyenne | Basse
  story_points: Number,               // Points d'estimation
  estimation_heures: Number,          // Heures estimées
  heures_réelles: Number,             // Heures réelles
  projet_id: ObjectId (ref: Project), // Projet parent
  sprint_id: ObjectId (ref: Sprint),  // Sprint associé
  parent_id: ObjectId (ref: Task),    // Parent (Épic ou Story)
  assigné_à: ObjectId (ref: User),    // Assigné
  créé_par: ObjectId (ref: User),     // Créateur
  deliverable_id: ObjectId,           // Livrable associé
  date_début: Date,
  date_échéance: Date,
  date_terminée: Date,
  acceptance_criteria: [String],      // Critères d'acceptation
  ordre: Number,                      // Ordre dans le backlog
  created_at: Date,
  updated_at: Date
}
```

### Sprint

```javascript
{
  _id: ObjectId,
  nom: String,                        // Nom du sprint
  objectif: String,                   // Objectif
  projet_id: ObjectId (ref: Project), // Projet
  statut: String,                     // Planifié | Actif | Terminé
  date_début: Date,
  date_fin: Date,
  capacité: Number,                   // Points de capacité
  story_points_planifiés: Number,     // Points planifiés
  story_points_complétés: Number,     // Points complétés
  burndown_data: [{
    date: Date,
    story_points_restants: Number,
    heures_restantes: Number,
    idéal: Number
  }],
  created_at: Date,
  updated_at: Date
}
```

---

## 🔐 Sécurité

### Authentification

- **JWT** : Tokens signés avec algorithme HS256
- **Expiration** : Configurable (défaut 24h)
- **Refresh** : Automatique avant expiration
- **Stockage** : LocalStorage + Cookie HttpOnly

### Mots de Passe

- **Hachage** : bcryptjs avec salt rounds = 12
- **Validation** : Minimum 8 caractères
- **Première connexion** : Changement obligatoire
- **Temporaire** : Généré automatiquement

### Protection API

- **Rate Limiting** : 100 requêtes/minute par IP
- **CORS** : Origines autorisées configurables
- **Validation** : Joi/Zod sur toutes les entrées
- **Sanitization** : Nettoyage des entrées utilisateur

### Permissions

- **RBAC** : Role-Based Access Control
- **Vérification** : Chaque endpoint vérifie les permissions
- **Granularité** : 23 permissions atomiques
- **Audit** : Toutes les actions sont loggées

### Vulnérabilités Corrigées

- ✅ Cache Poisoning (Next.js)
- ✅ Denial of Service (image optimization)
- ✅ Server Actions DoS
- ✅ Authorization Bypass
- ✅ SSRF dans Middleware
- ✅ XSS dans les entrées utilisateur
- ✅ Injection MongoDB

---

## 🧪 Tests

### Lancer les Tests

```bash
# Tous les tests
yarn test

# Tests avec couverture
yarn test:coverage

# Tests en mode watch
yarn test:watch

# Tests unitaires
yarn test:unit

# Tests d'intégration
yarn test:integration

# Tests CI/CD
yarn test:ci
```

### Vérification API

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3000/api/check

# Réponse attendue :
{
  "message": "PM - Gestion de Projets API",
  "hasAdmin": true,
  "needsFirstAdmin": false
}
```

### Tester la Connexion

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"VotreMotDePasse"}'
```

---

## 🛠️ Scripts Disponibles

```bash
# Développement
yarn dev              # Démarrage avec hot reload (4GB RAM)
yarn dev:light        # Démarrage léger avec Turbopack (2GB RAM)
yarn dev:socket       # App + serveur Socket.io
yarn dev:socket:light # App légère + Socket.io

# Production
yarn build            # Build de production
yarn start            # Démarrer en production

# Qualité de code
yarn lint             # Vérifier le code (ESLint)
yarn lint:fix         # Corriger automatiquement
yarn lint:strict      # Mode strict (0 warnings)

# Tests
yarn test             # Lancer les tests
yarn test:watch       # Mode watch
yarn test:coverage    # Avec couverture
yarn test:all         # Couverture + verbose

# Base de données
yarn clear:db         # Vider complètement MongoDB

# Socket.io
yarn socket           # Démarrer le serveur Socket.io seul
```

---

## 📝 Modifications Récentes

### Version 1.0.2 (Décembre 2024)

**🛡️ Système de Rôles et Permissions**
- ✅ Audit complet et correction des 10 rôles prédéfinis
- ✅ Correction des incohérences permissions/menus
- ✅ Suppression des permissions dangereuses du rôle Consultant
- ✅ Ajout de permissions manquantes (commenter, notifications) pour Invité
- ✅ Matrice de permissions cohérente et documentée
- ✅ Validation que chaque menu a sa permission correspondante

**🔔 Notifications Toast**
- ✅ Ajout du composant Toaster dans le layout principal
- ✅ Notifications de confirmation pour toutes les actions CRUD
- ✅ Messages en français avec contexte approprié

### Version 1.0.1 (Décembre 2024)

**🔐 Sécurité**
- ✅ Mise à jour Next.js 14.2.31 → 14.2.33
- ✅ Correction de 10 vulnérabilités critiques
- ✅ Protection contre Cache Poisoning, DoS, SSRF

**📊 Rapports Professionnels**
- ✅ Design entreprise avec en-têtes/pieds de page
- ✅ Logo, date/heure, numérotation des pages
- ✅ Export PDF, Excel, CSV complet
- ✅ Rapport Performance disponible

**🗄️ Base de Données**
- ✅ Script `yarn clear:db` pour reset

---

## 🤝 Contribution

### Comment Contribuer

1. **Fork** le repository
2. **Créez** une branche : `git checkout -b feature/ma-feature`
3. **Committez** : `git commit -m 'Ajout de ma feature'`
4. **Push** : `git push origin feature/ma-feature`
5. **Ouvrez** une Pull Request

### Conventions de Code

- **ESLint** : Respectez les règles configurées
- **Commits** : Messages clairs et concis
- **Tests** : Ajoutez des tests pour les nouvelles fonctionnalités
- **Documentation** : Mettez à jour le README si nécessaire

### Structure des Commits

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Exemple: feat(kanban): ajout du drag & drop multi-colonnes
```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 📞 Support

- **Bugs** : [GitHub Issues](https://github.com/votre-username/pm-gestion-projets/issues)
- **Questions** : [GitHub Discussions](https://github.com/votre-username/pm-gestion-projets/discussions)
- **Documentation** : Ce README

---

<div align="center">

**Fait avec ❤️ pour les équipes Agile**

⭐ **Star** ce repo si vous l'aimez !

</div>
