# PM - Gestion de Projets Agile

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)

> Plateforme complète de gestion de projets Agile avec support Scrum, Kanban, et gestion budgétaire en FCFA.

## 📋 Table des Matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture Technique](#-architecture-technique)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Guide d'Utilisation](#-guide-dutilisation)
- [API Reference](#-api-reference)
- [Rôles et Permissions](#-rôles-et-permissions)
- [Captures d'Écran](#-captures-décran)
- [Contribution](#-contribution)

---

## 🎯 Aperçu

**PM - Gestion de Projets** est une application web complète pour la gestion de projets Agile, développée avec Next.js 14 et MongoDB. Elle offre une suite complète d'outils pour les équipes de développement, incluant :

- Gestion de projets multi-équipes
- Tableaux Kanban interactifs avec drag & drop
- Backlog avec hiérarchie Epic → Story → Tâche
- Planification et suivi de Sprints
- Diagrammes Gantt / Roadmap
- Gestion budgétaire en FCFA
- Système de rôles granulaire (8 rôles, 22 permissions)
- Rapports exportables (PDF, Excel, CSV)

---

## ✨ Fonctionnalités

### 🏠 Dashboard
- Vue d'ensemble des projets et tâches
- Statistiques en temps réel
- Accès rapide aux éléments récents

### 📁 Gestion de Projets
- Création de projets avec templates personnalisables
- Suivi de progression automatique
- Catégorisation et filtrage avancé
- Budget par projet en FCFA

### 📋 Kanban
- Colonnes personnalisables par projet
- Drag & drop des tâches (dnd-kit)
- Création rapide de tâches
- Filtrage par assigné, priorité, tags

### 📚 Backlog
- Hiérarchie Epic → Story → Tâche
- Estimation en story points
- Assignation aux sprints
- Priorisation visuelle

### 🏃 Sprints
- Planification de sprints
- Démarrage / Arrêt de sprint
- Suivi de capacité équipe
- Objectifs de sprint

### 📊 Roadmap & Gantt
- Vue chronologique des tâches
- Navigation par mois/trimestre/année
- Visualisation des dépendances
- Zoom et filtres avancés

### ✅ Tâches
- CRUD complet
- Priorités (Critique, Haute, Moyenne, Basse)
- Statuts personnalisables
- Dates d'échéance et rappels
- Sous-tâches

### 📂 Gestion de Fichiers
- Upload multi-fichiers avec progress bar
- Organisation par dossiers
- Preview des images
- Téléchargement et suppression

### 💬 Commentaires & Activité
- Commentaires sur projets et tâches
- Mentions @utilisateur
- Fil d'activité avec timeline
- Historique des actions

### ⏱️ Timesheets
- Saisie du temps passé
- Historique par utilisateur/projet
- KPIs de productivité

### 💰 Budget
- Budget total par projet en FCFA
- Suivi des dépenses par catégorie
- Alertes de dépassement (>80%, >100%)
- Réserve de contingence
- 9 catégories de dépenses

### 📈 Rapports
- 3 types : Global, Par Projet, Performance
- Export PDF (jsPDF)
- Export Excel (xlsx)
- Export CSV (papaparse)

### 🔔 Notifications
- Notifications in-app
- Marquer comme lu
- Filtrage par type

### 👥 Gestion des Utilisateurs
- Création avec mot de passe temporaire
- Assignation de rôles
- Statut actif/inactif
- Historique de connexion

### 🛡️ Rôles & Permissions
- 8 rôles prédéfinis
- 22 permissions atomiques
- Matrice visuelle avec checkboxes
- Création de rôles personnalisés
- Configuration des menus visibles

### 📝 Templates de Projets
- Modèles réutilisables
- Champs personnalisés
- Catégorisation

### 📋 Types de Livrables
- Workflow de validation personnalisable
- Étapes réorganisables
- Couleurs distinctives

### ☁️ Intégration SharePoint
- Configuration Azure AD
- Synchronisation des fichiers
- Guide de configuration inclus

### ⚙️ Paramètres Système
- Configuration générale (langue, timezone, devise)
- Paramètres de notifications
- Sécurité (session, password policy, 2FA)
- Apparence (thème, couleurs)

### 🔧 Mode Maintenance
- Activation/désactivation
- Message personnalisé
- Accès admin uniquement

---

## 🏗️ Architecture Technique

### Stack Technologique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 14 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| Backend | Next.js API Routes |
| Base de données | MongoDB + Mongoose |
| Authentification | JWT (JSON Web Tokens) |
| Drag & Drop | @dnd-kit |
| Graphiques | Recharts |
| Tables | TanStack Table |
| PDF Export | jsPDF + jspdf-autotable |
| Excel Export | xlsx |
| CSV Export | papaparse |
| Icons | Lucide React |

### Structure des Dossiers

```
/app
├── app/
│   ├── api/
│   │   └── [[...path]]/
│   │       └── route.js          # API monolithique (70+ routes)
│   ├── dashboard/
│   │   ├── admin/
│   │   │   ├── page.js           # Administration
│   │   │   ├── roles/page.js     # Rôles & Permissions
│   │   │   ├── templates/page.js # Templates Projets
│   │   │   ├── deliverable-types/page.js
│   │   │   └── sharepoint/page.js
│   │   ├── backlog/page.js
│   │   ├── budget/page.js
│   │   ├── comments/page.js
│   │   ├── files/page.js
│   │   ├── kanban/page.js
│   │   ├── notifications/page.js
│   │   ├── profile/page.js
│   │   ├── projects/page.js
│   │   ├── reports/page.js
│   │   ├── roadmap/page.js
│   │   ├── settings/page.js
│   │   ├── sprints/page.js
│   │   ├── tasks/page.js
│   │   ├── timesheets/page.js
│   │   ├── users/page.js
│   │   ├── layout.js             # Layout avec sidebar
│   │   └── page.js               # Dashboard principal
│   ├── first-admin/page.js       # Création premier admin
│   ├── first-login-reset/page.js # Reset password
│   ├── login/page.js
│   ├── layout.js
│   └── page.js
├── components/
│   ├── kanban/
│   │   ├── KanbanColumn.js
│   │   └── TaskCard.js
│   └── ui/                       # Composants shadcn/ui
├── lib/
│   └── utils.js
├── models/
│   ├── User.js
│   ├── Role.js
│   ├── Project.js
│   ├── Task.js
│   ├── Sprint.js
│   ├── File.js
│   ├── Comment.js
│   ├── Notification.js
│   ├── ProjectTemplate.js
│   ├── Timesheet.js
│   ├── AuditLog.js
│   └── ...
├── .env                          # Variables d'environnement
├── package.json
└── tailwind.config.js
```

---

## 🚀 Installation

### Prérequis

- Node.js 18+
- MongoDB 6+
- Yarn (recommandé)

### Étapes d'Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-repo/pm-gestion-projets.git
cd pm-gestion-projets

# 2. Installer les dépendances
yarn install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# 4. Lancer en développement
yarn dev

# 5. Accéder à l'application
# http://localhost:3000
```

### Premier Démarrage

1. Accédez à `/first-admin`
2. Créez le compte Super Administrateur
3. Connectez-vous avec vos identifiants
4. Commencez à créer vos projets !

---

## ⚙️ Configuration

### Variables d'Environnement

```env
# Base de données MongoDB
MONGO_URL=mongodb://localhost:27017/pm_gestion

# URL publique de l'application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Secret JWT (générer une clé sécurisée)
JWT_SECRET=votre-secret-jwt-tres-securise

# SharePoint (optionnel)
SHAREPOINT_ENABLED=false
SHAREPOINT_TENANT_ID=
SHAREPOINT_CLIENT_ID=
SHAREPOINT_CLIENT_SECRET=
SHAREPOINT_SITE_ID=
```

---

## 📖 Guide d'Utilisation

### Authentification

#### Création du Premier Administrateur

1. Au premier lancement, accédez à `/first-admin`
2. Remplissez le formulaire :
   - Nom complet
   - Email
   - Mot de passe (min. 8 caractères, chiffres et symboles)
3. Cliquez sur "Créer le compte"

#### Connexion

1. Accédez à `/login`
2. Entrez vos identifiants
3. Si première connexion (mot de passe temporaire), vous serez redirigé vers `/first-login-reset`

### Création d'un Projet

1. Menu **Projets** → **+ Nouveau Projet**
2. Sélectionnez un template (ou "Projet Vierge")
3. Remplissez les informations :
   - Nom du projet
   - Description
   - Dates de début/fin
   - Responsable
4. Cliquez sur **Créer**

### Utilisation du Kanban

1. Menu **Kanban**
2. Sélectionnez un projet
3. Glissez-déposez les tâches entre colonnes
4. Cliquez sur **+ Tâche** pour créer rapidement

### Gestion du Backlog

1. Menu **Backlog**
2. Sélectionnez un projet
3. Créez des Epics, Stories, Tâches via le menu **+ Créer**
4. Assignez aux sprints via le menu contextuel

### Planification d'un Sprint

1. Menu **Sprints** → **+ Nouveau Sprint**
2. Définissez :
   - Nom du sprint
   - Dates de début/fin
   - Objectif
   - Capacité de l'équipe
3. Assignez des tâches depuis le Backlog
4. Cliquez sur **Démarrer** quand prêt

### Gestion du Budget

1. Menu **Budget**
2. Sélectionnez un projet
3. Cliquez sur la carte **Budget Total** pour modifier
4. Ajoutez des dépenses via **+ Ajouter une dépense**
5. Suivez la consommation en temps réel

### Génération de Rapports

1. Menu **Rapports**
2. Choisissez le type de rapport
3. Sélectionnez le projet (si applicable)
4. Cliquez sur **PDF**, **Excel** ou **CSV**

### Administration

#### Gestion des Rôles

1. Menu **Admin** → **Rôles & Permissions**
2. Cliquez sur un rôle pour voir ses permissions
3. **+ Nouveau Rôle** pour créer un rôle personnalisé
4. Cochez/décochez les 22 permissions
5. Configurez les menus visibles

#### Mode Maintenance

1. Menu **Admin** → Page principale
2. Activez le switch **Mode Maintenance**
3. Entrez un message explicatif
4. Les utilisateurs verront le message de maintenance

---

## 📚 API Reference

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/first-admin` | Créer le premier admin |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/first-login-reset` | Reset mot de passe |
| GET | `/api/auth/me` | Profil utilisateur connecté |

### Utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Liste des utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| PUT | `/api/users/:id` | Modifier un utilisateur |
| PUT | `/api/users/profile` | Modifier son profil |

### Rôles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/roles` | Liste des rôles |
| POST | `/api/roles` | Créer un rôle |
| PUT | `/api/roles/:id` | Modifier un rôle |
| DELETE | `/api/roles/:id` | Supprimer un rôle |

### Projets

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/projects` | Liste des projets |
| POST | `/api/projects` | Créer un projet |
| GET | `/api/projects/:id` | Détail d'un projet |
| PUT | `/api/projects/:id` | Modifier un projet |
| DELETE | `/api/projects/:id` | Supprimer un projet |

### Tâches

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tasks` | Liste des tâches |
| POST | `/api/tasks` | Créer une tâche |
| PUT | `/api/tasks/:id` | Modifier une tâche |
| PUT | `/api/tasks/:id/move` | Déplacer (Kanban) |
| DELETE | `/api/tasks/:id` | Supprimer une tâche |

### Sprints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sprints` | Liste des sprints |
| POST | `/api/sprints` | Créer un sprint |
| PUT | `/api/sprints/:id/start` | Démarrer un sprint |
| PUT | `/api/sprints/:id/complete` | Terminer un sprint |
| DELETE | `/api/sprints/:id` | Supprimer un sprint |

### Fichiers

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/files` | Liste des fichiers |
| POST | `/api/files/upload` | Upload fichier |
| POST | `/api/files/folder` | Créer un dossier |
| GET | `/api/files/:id/download` | Télécharger |
| DELETE | `/api/files/:id` | Supprimer |

### Commentaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/comments` | Liste des commentaires |
| POST | `/api/comments` | Poster un commentaire |
| DELETE | `/api/comments/:id` | Supprimer |

### Budget

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| PUT | `/api/budget/projects/:id` | Modifier budget projet |

### Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notifications` | Liste des notifications |
| PUT | `/api/notifications/read-all` | Marquer tout lu |
| PUT | `/api/notifications/:id/read` | Marquer lu |
| DELETE | `/api/notifications/:id` | Supprimer |

### Paramètres

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/settings` | Paramètres système |
| PUT | `/api/settings` | Modifier paramètres |
| GET | `/api/settings/maintenance` | État maintenance |
| PUT | `/api/settings/maintenance` | Toggle maintenance |

### Types de Livrables

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/deliverable-types` | Liste des types |
| POST | `/api/deliverable-types` | Créer un type |
| PUT | `/api/deliverable-types/:id` | Modifier |
| DELETE | `/api/deliverable-types/:id` | Supprimer |

### SharePoint

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sharepoint/config` | Configuration |
| PUT | `/api/sharepoint/config` | Enregistrer config |
| POST | `/api/sharepoint/test` | Tester connexion |
| POST | `/api/sharepoint/sync` | Sync manuelle |

---

## 🛡️ Rôles et Permissions

### 8 Rôles Prédéfinis

| Rôle | Description |
|------|-------------|
| **Super Admin** | Accès complet à toutes les fonctionnalités |
| **Administrateur** | Gestion utilisateurs et configuration |
| **Chef de Projet** | Gestion complète des projets assignés |
| **Responsable Équipe** | Gestion de son équipe et tâches |
| **Développeur Senior** | Gestion des tâches et sprints |
| **Développeur** | Création et mise à jour de tâches |
| **Testeur QA** | Validation et rapports de tests |
| **Observateur** | Lecture seule |

### 22 Permissions Atomiques

#### Projets
- `voirProjets` - Voir les projets
- `creerProjet` - Créer un projet
- `modifierProjet` - Modifier un projet
- `supprimerProjet` - Supprimer un projet
- `assignerMembres` - Assigner des membres

#### Équipe
- `voirEquipe` - Voir l'équipe
- `gererUtilisateurs` - Gérer les utilisateurs

#### Tâches
- `voirTaches` - Voir les tâches
- `gererTaches` - Créer/modifier/supprimer
- `assignerTaches` - Assigner des tâches
- `deplacerTaches` - Déplacer dans Kanban

#### Sprints
- `voirSprints` - Voir les sprints
- `gererSprints` - Gérer les sprints
- `prioriserBacklog` - Prioriser le backlog

#### Budget
- `voirBudget` - Voir le budget
- `gererBudget` - Modifier le budget

#### Rapports
- `voirRapports` - Voir les rapports
- `genererRapports` - Générer des rapports

#### Fichiers
- `gererFichiers` - Gérer les fichiers

#### Timesheets
- `saisirTemps` - Saisir son temps
- `voirTempsPasses` - Voir tous les temps

#### Commentaires
- `commenter` - Poster des commentaires

#### Administration
- `adminConfig` - Accès configuration admin
- `voirAudit` - Voir les logs d'audit

---

## 🖼️ Captures d'Écran

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Kanban
![Kanban](docs/screenshots/kanban.png)

### Backlog
![Backlog](docs/screenshots/backlog.png)

### Rôles & Permissions
![Roles](docs/screenshots/roles.png)

---

## 🤝 Contribution

### Comment Contribuer

1. Fork le projet
2. Créez une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

### Standards de Code

- Utilisez ESLint et Prettier
- Suivez les conventions de nommage en français pour les variables métier
- Documentez les nouvelles fonctionnalités
- Testez avant de soumettre

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 📞 Support

Pour toute question ou assistance :

- 📧 Email : support@pm-gestion.com
- 📝 Issues : [GitHub Issues](https://github.com/votre-repo/pm-gestion-projets/issues)

---

**Développé avec ❤️ pour les équipes Agile**
