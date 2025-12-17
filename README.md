# PM - Gestion de Projets Agile

<div align="center">

![Logo](https://img.shields.io/badge/PM-Gestion_de_Projets-4f46e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0yMiAxOUgybS0yIDBoNGw0LTEwIDQgNSA0LTkgNiAxNHoiLz48L3N2Zz4=)

![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Plateforme complète de gestion de projets Agile avec support Scrum, Kanban, gestion budgétaire en FCFA et système de permissions avancé (RBAC)**

[Fonctionnalites](#-fonctionnalités-complètes) •
[Installation](#-installation) •
[Roles et Permissions](#-système-rbac-complet) •
[API](#-api-reference-complète) •
[Architecture](#-architecture-technique)

</div>

---

## Table des Matières Détaillée

1. [Apercu General](#-aperçu-général)
2. [Systeme d'Authentification](#-système-dauthentification-complet)
3. [Systeme RBAC Complet](#-système-rbac-complet)
4. [Fonctionnement des Roles](#-fonctionnement-détaillé-des-rôles)
5. [Fonctionnalites Completes](#-fonctionnalités-complètes)
   - [Dashboard](#1-dashboard-dashboard)
   - [Projets](#2-projets-dashboardprojects)
   - [Kanban](#3-kanban-dashboardkanban)
   - [Backlog](#4-backlog-dashboardbacklog)
   - [Sprints](#5-sprints-dashboardsprints)
   - [Tâches](#7-tâches-dashboardtasks)
   - [Timesheets](#10-timesheets-dashboardtimesheets)
   - [Budget](#11-budget-dashboardbudget)
   - [Livrables](#15-livrables-dashboarddeliverables)
   - [Profil Utilisateur](#16-profil-utilisateur-dashboardprofile)
   - [Internationalisation](#17-internationalisation-i18n)
   - [Thème et Personnalisation](#18-thème-et-personnalisation)
   - [Intégration SharePoint](#19-intégration-sharepoint)
   - [Dépendances Tâches](#20-dépendances-entre-tâches)
   - [Templates Projets](#21-templates-de-projets)
6. [Workflows et Transitions](#-workflows-et-transitions-de-statut)
7. [Installation](#-installation)
8. [Configuration](#-configuration)
9. [Guide Utilisation Detaille](#-guide-dutilisation-détaillé)
10. [API Reference Complete](#-api-reference-complète)
11. [Modeles de Donnees](#-modèles-de-données-complets)
12. [Architecture Technique](#-architecture-technique)
13. [Securite](#-sécurité)
14. [Scripts Disponibles](#-scripts-disponibles)
15. [Changelog](#-changelog)

---

## 📋 Aperçu Général

**PM - Gestion de Projets** est une application web complète de gestion de projets Agile développée avec Next.js 14 et MongoDB. Elle offre une solution tout-en-un pour les équipes souhaitant gérer leurs projets selon les méthodologies Scrum et Kanban.

### Caractéristiques Principales

- **Gestion Agile Complète** : Support natif Scrum (Sprints, Backlog, Story Points) et Kanban (Drag & Drop)
- **Multi-Projets** : Gérez plusieurs projets simultanément avec des templates personnalisables
- **Système de Permissions Granulaire (RBAC)** : 10 rôles prédéfinis avec 23 permissions atomiques
- **Budget en FCFA** : Suivi budgétaire adapté au marché africain
- **Temps Réel** : Notifications et mises à jour via Socket.io
- **Rapports Professionnels** : Export PDF, Excel et CSV avec design entreprise
- **Interface Moderne** : UI/UX responsive avec Tailwind CSS et shadcn/ui
- **Workflows Automatisés** : Transitions de statut avec règles et escalades

---

## 🔐 Système d'Authentification Complet

### Flux d'Authentification

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX D'AUTHENTIFICATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PREMIÈRE VISITE (Pas d'admin)                               │
│     └─> Redirection vers /first-admin                           │
│         └─> Création du Super Administrateur                    │
│             └─> 10 rôles prédéfinis créés automatiquement       │
│                                                                  │
│  2. CONNEXION NORMALE                                           │
│     └─> /login                                                  │
│         ├─> Vérification email/mot de passe                     │
│         ├─> Vérification compte non verrouillé                  │
│         ├─> Génération token JWT (24h)                          │
│         └─> Redirection selon first_login:                      │
│             ├─> true: /first-login (changer mot de passe)       │
│             └─> false: /dashboard                               │
│                                                                  │
│  3. PREMIÈRE CONNEXION UTILISATEUR                              │
│     └─> /first-login                                            │
│         └─> Changement mot de passe obligatoire                 │
│             └─> Redirection vers /dashboard                     │
│                                                                  │
│  4. SESSIONS ET TOKENS                                          │
│     ├─> Token JWT stocké dans localStorage (pm_token)           │
│     ├─> Expiration: 24 heures                                   │
│     ├─> Header: Authorization: Bearer <token>                   │
│     └─> Refresh automatique avant expiration                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sécurité des Comptes

| Fonctionnalité | Description | Configuration |
|----------------|-------------|---------------|
| **Verrouillage automatique** | Après 5 tentatives échouées | 15 minutes |
| **Hachage mot de passe** | bcryptjs avec salt | 12 rounds |
| **Longueur minimum** | Mot de passe | 8 caractères |
| **Historique mots de passe** | Empêche réutilisation | 5 derniers |
| **Token JWT** | Algorithme HS256 | 24h expiration |
| **Première connexion** | Changement obligatoire | must_change_password: true |

### Création d'Utilisateur

Quand un administrateur crée un utilisateur :
1. Mot de passe temporaire généré : `00000000`
2. `first_login: true` et `must_change_password: true`
3. À la première connexion → redirection `/first-login`
4. L'utilisateur DOIT changer son mot de passe
5. Après changement → accès normal au dashboard

---

## 🛡️ Système RBAC Complet

### Principe de Fonctionnement

Le système RBAC (Role-Based Access Control) fonctionne sur **deux niveaux** :

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTÈME DE PERMISSIONS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NIVEAU 1: PERMISSIONS (23 permissions atomiques)               │
│  ═══════════════════════════════════════════════                │
│  Définit ce que l'utilisateur PEUT FAIRE                        │
│  Exemple: creerProjet, gererTaches, voirBudget                  │
│                                                                  │
│  NIVEAU 2: MENUS VISIBLES (14 menus)                            │
│  ════════════════════════════════════                           │
│  Définit ce que l'utilisateur PEUT VOIR                         │
│  Exemple: projects, kanban, budget, admin                       │
│                                                                  │
│  RÈGLE FONDAMENTALE:                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Un menu est visible UNIQUEMENT SI:                       │    │
│  │ 1. La PERMISSION requise est accordée (true)            │    │
│  │ 2. ET le MENU est activé dans visibleMenus (true)       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Les 23 Permissions Atomiques

| Permission | Description | Qui l'a par défaut |
|------------|-------------|-------------------|
| `voirTousProjets` | Voir TOUS les projets (même non membre) | Admin, Super Admin |
| `voirSesProjets` | Voir les projets où on est membre | Tous les rôles |
| `creerProjet` | Créer de nouveaux projets | Chef Projet, Admin, Super Admin |
| `supprimerProjet` | Supprimer des projets | Admin, Super Admin |
| `modifierCharteProjet` | Modifier les infos du projet | Chef Projet, Admin, Super Admin |
| `gererMembresProjet` | Ajouter/retirer des membres | Chef Projet, Admin, Super Admin |
| `changerRoleMembre` | Changer le rôle d'un membre | Chef Projet, Admin, Super Admin |
| `gererTaches` | Créer/modifier/supprimer des tâches | PO, Resp. Équipe, Chef Projet, Admin |
| `deplacerTaches` | Déplacer les tâches (Kanban) | Membre, Consultant, PO, Resp, Chef, Admin |
| `prioriserBacklog` | Réordonner le backlog | PO, Resp. Équipe, Chef Projet, Admin |
| `gererSprints` | Créer/démarrer/terminer sprints | Resp. Équipe, Chef Projet, Admin |
| `modifierBudget` | Modifier le budget, ajouter dépenses | Chef Projet, Admin, Super Admin |
| `voirBudget` | Voir les informations budgétaires | PO, Consultant, Stakeholder, Observateur, Resp, Chef, Admin |
| `voirTempsPasses` | Voir les timesheets de tous | PO, Membre, Consultant, Observateur, Resp, Chef, Admin |
| `saisirTemps` | Saisir son temps de travail | Membre, Consultant, Resp, Chef, Admin |
| `validerLivrable` | Valider/refuser les livrables | PO, Admin, Super Admin |
| `gererFichiers` | Upload/supprimer des fichiers | Membre, Consultant, PO, Resp, Chef, Admin |
| `commenter` | Écrire des commentaires | Invité, Stakeholder, Membre, Consultant, PO, Resp, Chef, Admin |
| `recevoirNotifications` | Recevoir les notifications | Tous les rôles |
| `genererRapports` | Générer et exporter des rapports | PO, Resp. Équipe, Chef Projet, Admin |
| `voirAudit` | Voir les logs d'audit | Admin, Super Admin |
| `gererUtilisateurs` | Créer/modifier/désactiver utilisateurs | Super Admin uniquement |
| `adminConfig` | Accès configuration système | Admin, Super Admin |

### Les 14 Menus et leurs Permissions Requises

| Menu | Clé | Permission Requise | URL |
|------|-----|-------------------|-----|
| Dashboard | `portfolio` | `voirSesProjets` | `/dashboard` |
| Projets | `projects` | `voirSesProjets` | `/dashboard/projects` |
| Kanban | `kanban` | `deplacerTaches` | `/dashboard/kanban` |
| Backlog | `backlog` | `prioriserBacklog` | `/dashboard/backlog` |
| Sprints | `sprints` | `gererSprints` | `/dashboard/sprints` |
| Roadmap | `roadmap` | `voirSesProjets` | `/dashboard/roadmap` |
| Tâches | `tasks` | `gererTaches` | `/dashboard/tasks` |
| Fichiers | `files` | `gererFichiers` | `/dashboard/files` |
| Commentaires | `comments` | `commenter` | `/dashboard/comments` |
| Timesheets | `timesheets` | `saisirTemps` | `/dashboard/timesheets` |
| Budget | `budget` | `voirBudget` | `/dashboard/budget` |
| Rapports | `reports` | `genererRapports` | `/dashboard/reports` |
| Notifications | `notifications` | `recevoirNotifications` | `/dashboard/notifications` |
| Administration | `admin` | `adminConfig` | `/dashboard/admin/*` |

---

## 👥 Fonctionnement Détaillé des Rôles

### Comment fonctionne l'accès aux projets

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCÈS AUX PROJETS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CAS 1: Utilisateur avec voirTousProjets = true                 │
│  ═══════════════════════════════════════════                    │
│  (Admin, Super Admin)                                           │
│  └─> Voit TOUS les projets de l'application                     │
│      └─> Même ceux où il n'est pas membre                       │
│                                                                  │
│  CAS 2: Utilisateur avec voirSesProjets = true SEULEMENT        │
│  ═══════════════════════════════════════════════════            │
│  (Tous les autres rôles)                                        │
│  └─> Voit UNIQUEMENT les projets où il est:                     │
│      ├─> Chef de projet (chef_projet)                           │
│      ├─> Product Owner (product_owner)                          │
│      └─> Membre de l'équipe (membres.user_id)                   │
│                                                                  │
│  CONSÉQUENCE IMPORTANTE:                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Si un Invité/Observateur/etc. ne voit aucun projet,     │    │
│  │ c'est qu'il n'a pas été AJOUTÉ comme membre à un projet │    │
│  │                                                          │    │
│  │ Solution: L'ajouter comme membre dans le projet          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Les 10 Rôles Prédéfinis en Détail

---

#### 1. Super Administrateur

**Description**: Accès TOTAL au système - Seul rôle pouvant gérer les utilisateurs

**Cas d'usage**: Propriétaire de l'application, administrateur système principal

| Ce qu'il peut faire | Ce qu'il peut voir |
|--------------------|--------------------|
| ✅ Tout créer | ✅ Tous les projets |
| ✅ Tout modifier | ✅ Tous les menus (14/14) |
| ✅ Tout supprimer | ✅ Logs d'audit complets |
| ✅ Gérer les utilisateurs | ✅ Configuration système |
| ✅ Gérer les rôles | ✅ Tous les budgets |
| ✅ Configurer le système | ✅ Tous les timesheets |

**Menus visibles**: Dashboard, Projets, Kanban, Backlog, Sprints, Roadmap, Tâches, Fichiers, Commentaires, Timesheets, Budget, Rapports, Notifications, Admin

**Permissions activées** (23/23):
```
voirTousProjets, voirSesProjets, creerProjet, supprimerProjet,
modifierCharteProjet, gererMembresProjet, changerRoleMembre,
gererTaches, deplacerTaches, prioriserBacklog, gererSprints,
modifierBudget, voirBudget, voirTempsPasses, saisirTemps,
validerLivrable, gererFichiers, commenter, recevoirNotifications,
genererRapports, voirAudit, gererUtilisateurs, adminConfig
```

---

#### 2. Administrateur

**Description**: Accès complet SAUF la gestion des utilisateurs

**Cas d'usage**: Responsable technique, gestionnaire de l'application

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Créer/supprimer projets | ❌ Créer des utilisateurs |
| ✅ Configurer le système | ❌ Modifier des utilisateurs |
| ✅ Voir les audits | ❌ Désactiver des comptes |
| ✅ Tout le reste | ❌ Réinitialiser mots de passe |

**Menus visibles**: Tous (14/14)

**Permissions activées** (22/23 - sans `gererUtilisateurs`):
```
voirTousProjets, voirSesProjets, creerProjet, supprimerProjet,
modifierCharteProjet, gererMembresProjet, changerRoleMembre,
gererTaches, deplacerTaches, prioriserBacklog, gererSprints,
modifierBudget, voirBudget, voirTempsPasses, saisirTemps,
validerLivrable, gererFichiers, commenter, recevoirNotifications,
genererRapports, voirAudit, adminConfig
```

---

#### 3. Chef de Projet

**Description**: Gestion complète de SES projets assignés

**Cas d'usage**: Project Manager, responsable d'un ou plusieurs projets

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Créer des projets | ❌ Supprimer des projets |
| ✅ Modifier ses projets | ❌ Accès administration |
| ✅ Gérer son équipe | ❌ Voir les audits |
| ✅ Gérer les sprints | ❌ Valider les livrables |
| ✅ Modifier le budget | ❌ Voir tous les projets |
| ✅ Générer des rapports | |

**Menus visibles** (13/14 - sans Admin): Dashboard, Projets, Kanban, Backlog, Sprints, Roadmap, Tâches, Fichiers, Commentaires, Timesheets, Budget, Rapports, Notifications

**Permissions activées** (17/23):
```
voirSesProjets, creerProjet, modifierCharteProjet, gererMembresProjet,
changerRoleMembre, gererTaches, deplacerTaches, prioriserBacklog,
gererSprints, modifierBudget, voirBudget, voirTempsPasses, saisirTemps,
gererFichiers, commenter, recevoirNotifications, genererRapports
```

---

#### 4. Responsable Équipe

**Description**: Gestion des tâches, sprints et reporting pour son équipe

**Cas d'usage**: Team Lead, Scrum Master

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Gérer les tâches | ❌ Créer des projets |
| ✅ Gérer les sprints | ❌ Modifier le budget |
| ✅ Prioriser le backlog | ❌ Gérer les membres |
| ✅ Générer des rapports | ❌ Valider les livrables |
| ✅ Voir le budget (lecture) | ❌ Accès administration |
| ✅ Saisir son temps | |

**Menus visibles** (12/14): Projets, Kanban, Backlog, Sprints, Roadmap, Tâches, Fichiers, Commentaires, Timesheets, Budget, Rapports, Notifications

**Permissions activées** (12/23):
```
voirSesProjets, gererTaches, deplacerTaches, prioriserBacklog,
gererSprints, voirBudget, voirTempsPasses, saisirTemps,
gererFichiers, commenter, recevoirNotifications, genererRapports
```

---

#### 5. Product Owner

**Description**: Gestion du backlog, priorisation et validation des livrables

**Cas d'usage**: Product Owner Scrum, responsable produit

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Gérer les tâches | ❌ Gérer les sprints |
| ✅ Prioriser le backlog | ❌ Modifier le budget |
| ✅ Valider les livrables | ❌ Saisir du temps |
| ✅ Générer des rapports | ❌ Accès administration |
| ✅ Voir le budget | |

**Menus visibles** (10/14): Projets, Kanban, Backlog, Roadmap, Tâches, Fichiers, Commentaires, Budget, Rapports, Notifications

**Permissions activées** (11/23):
```
voirSesProjets, gererTaches, deplacerTaches, prioriserBacklog,
voirBudget, voirTempsPasses, validerLivrable, gererFichiers,
commenter, recevoirNotifications, genererRapports
```

---

#### 6. Membre Équipe

**Description**: Contribution aux tâches et suivi du temps

**Cas d'usage**: Développeur, designer, analyste - membres actifs de l'équipe

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Déplacer les tâches (Kanban) | ❌ Créer/supprimer des tâches |
| ✅ Saisir son temps | ❌ Gérer les sprints |
| ✅ Upload des fichiers | ❌ Prioriser le backlog |
| ✅ Commenter | ❌ Voir le budget |
| ✅ Voir les timesheets | ❌ Générer des rapports |

**Menus visibles** (7/14): Projets, Kanban, Roadmap, Fichiers, Commentaires, Timesheets, Notifications

**Permissions activées** (7/23):
```
voirSesProjets, deplacerTaches, voirTempsPasses, saisirTemps,
gererFichiers, commenter, recevoirNotifications
```

---

#### 7. Consultant

**Description**: Contribution limitée aux projets assignés

**Cas d'usage**: Consultant externe, prestataire, freelance

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Déplacer les tâches | ❌ Créer/modifier des tâches |
| ✅ Saisir son temps | ❌ Créer des projets |
| ✅ Voir le budget (lecture) | ❌ Supprimer des projets |
| ✅ Upload des fichiers | ❌ Gérer les sprints |
| ✅ Commenter | ❌ Générer des rapports |

**Menus visibles** (8/14): Projets, Kanban, Roadmap, Fichiers, Commentaires, Timesheets, Budget, Notifications

**Permissions activées** (8/23):
```
voirSesProjets, deplacerTaches, voirBudget, voirTempsPasses,
saisirTemps, gererFichiers, commenter, recevoirNotifications
```

**Note de sécurité**: Ce rôle n'a PAS les permissions `creerProjet` et `supprimerProjet` pour des raisons de sécurité.

---

#### 8. Partie Prenante (Stakeholder)

**Description**: Lecture et commentaires sur les projets partagés

**Cas d'usage**: Sponsor, manager externe, client interne

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Voir ses projets | ❌ Modifier quoi que ce soit |
| ✅ Voir le budget | ❌ Upload des fichiers |
| ✅ Voir les fichiers | ❌ Gérer des tâches |
| ✅ Commenter | ❌ Saisir du temps |
| ✅ Recevoir des notifications | ❌ Voir les timesheets |

**Menus visibles** (5/14): Projets, Roadmap, Commentaires, Budget, Notifications

**Permissions activées** (5/23):
```
voirSesProjets, voirBudget, voirFichiers, commenter, recevoirNotifications
```

---

#### 9. Observateur

**Description**: Lecture seule stricte - Aucune interaction possible

**Cas d'usage**: Auditeur, contrôleur financier, observateur externe

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Voir ses projets | ❌ Commenter |
| ✅ Voir le budget | ❌ Modifier quoi que ce soit |
| ✅ Voir les timesheets | ❌ Upload des fichiers |
| ✅ Voir les fichiers | ❌ Interagir |
| ✅ Recevoir des notifications | |

**Menus visibles** (4/14): Projets, Roadmap, Budget, Notifications

**Permissions activées** (5/23):
```
voirSesProjets, voirBudget, voirTempsPasses, voirFichiers, recevoirNotifications
```

---

#### 10. Invité

**Description**: Accès temporaire en lecture avec possibilité de commenter

**Cas d'usage**: Client externe, partenaire temporaire, visiteur

| Ce qu'il peut faire | Ce qu'il NE peut PAS faire |
|--------------------|---------------------------|
| ✅ Voir ses projets | ❌ Tout modifier |
| ✅ Voir les fichiers | ❌ Voir le budget |
| ✅ Commenter | ❌ Voir les timesheets |
| ✅ Recevoir des notifications | ❌ Upload des fichiers |

**Menus visibles** (4/14): Projets, Roadmap, Commentaires, Notifications

**Permissions activées** (4/23):
```
voirSesProjets, voirFichiers, commenter, recevoirNotifications
```

---

### Matrice Complète des Permissions par Rôle

| Permission | Invité | Observateur | Stakeholder | Membre | Consultant | PO | Resp. Équipe | Chef Projet | Admin | Super Admin |
|------------|:------:|:-----------:|:-----------:|:------:|:----------:|:--:|:------------:|:-----------:|:-----:|:-----------:|
| voirTousProjets | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| voirSesProjets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| creerProjet | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| supprimerProjet | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| modifierCharteProjet | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| gererMembresProjet | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| changerRoleMembre | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| gererTaches | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| deplacerTaches | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| prioriserBacklog | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| gererSprints | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| modifierBudget | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| voirBudget | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| voirTempsPasses | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| saisirTemps | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| validerLivrable | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| gererFichiers | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| voirFichiers | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| commenter | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| recevoirNotifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| genererRapports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| voirAudit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| gererUtilisateurs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| adminConfig | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## ✨ Fonctionnalités Complètes

### 1. Dashboard (`/dashboard`)

**Accès**: Tous les utilisateurs avec `voirSesProjets`

Le tableau de bord central offre une vue d'ensemble personnalisée selon votre rôle :

| Élément | Description | Données affichées |
|---------|-------------|-------------------|
| **Statistiques** | Cartes avec chiffres clés | Projets actifs, tâches en cours, sprints actifs |
| **Projets récents** | 5 derniers projets consultés | Nom, statut, progression % |
| **Mes tâches** | Tâches assignées à moi | Titre, priorité, date échéance |
| **Activité récente** | Fil des dernières actions | Qui, quoi, quand |
| **Graphique vélocité** | Performance de l'équipe | Points complétés par sprint |

**Fonctionnement**:
- Les données sont filtrées selon les projets accessibles à l'utilisateur
- Actualisation automatique via Socket.io
- Clic sur un élément → navigation directe

---

### 2. Projets (`/dashboard/projects`)

**Accès**: Tous les utilisateurs avec `voirSesProjets`

#### Liste des Projets

| Fonctionnalité | Comment ça marche |
|----------------|-------------------|
| **Affichage** | Liste paginée (50/page) avec nom, statut, progression, chef de projet |
| **Filtrage** | Filtre par `voirTousProjets` ou projets où l'utilisateur est membre |
| **Recherche** | Recherche textuelle sur nom et description |
| **Tri** | Par date de création (plus récent en premier) |

#### Création de Projet (permission: `creerProjet`)

```
Étape 1: Sélection du template
├─> Templates prédéfinis (Web, Mobile, Marketing, etc.)
└─> Projet vierge

Étape 2: Informations de base
├─> Nom du projet (obligatoire)
├─> Description
├─> Priorité (Basse, Moyenne, Haute, Critique)
├─> Dates de début et fin prévue
└─> Product Owner (optionnel)

Étape 3: Champs dynamiques
└─> Champs spécifiques au template choisi

Étape 4: Validation
└─> Création du projet avec:
    ├─> Chef de projet = utilisateur créateur
    ├─> 5 colonnes Kanban par défaut
    ├─> 8 rôles projet initialisés
    └─> Statut = "Planification"
```

#### Détail d'un Projet (`/dashboard/projects/[id]`)

**Sections affichées**:

| Section | Contenu | Permissions pour modifier |
|---------|---------|--------------------------|
| **Informations** | Nom, description, statut, priorité, dates | `modifierCharteProjet` |
| **Progression** | Barre de progression, stats tâches | Auto-calculé |
| **Équipe** | Liste des membres avec rôles projet | `gererMembresProjet` |
| **Budget** | Prévisionnel, réel, reste | `modifierBudget` |
| **Sprints** | Liste des sprints du projet | `gererSprints` |
| **Fichiers** | Fichiers liés au projet | `gererFichiers` |

---

### 3. Kanban (`/dashboard/kanban`)

**Accès**: Utilisateurs avec `deplacerTaches` ET menu `kanban` activé

#### Fonctionnement du Kanban

```
┌─────────────────────────────────────────────────────────────────┐
│                        TABLEAU KANBAN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ BACKLOG  │  │ À FAIRE  │  │ EN COURS │  │ TERMINÉ  │         │
│  │          │  │          │  │          │  │          │         │
│  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │         │
│  │ │Tâche │ │  │ │Tâche │ │  │ │Tâche │ │  │ │Tâche │ │         │
│  │ │  1   │ │  │ │  2   │ │  │ │  3   │ │  │ │  4   │ │         │
│  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │         │
│  │          │  │          │  │          │  │          │         │
│  │ ┌──────┐ │  │          │  │ ┌──────┐ │  │          │         │
│  │ │Tâche │ │  │          │  │ │Tâche │ │  │          │         │
│  │ │  5   │ │  │          │  │ │  6   │ │  │          │         │
│  │ └──────┘ │  │          │  │ └──────┘ │  │          │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                  │
│  DRAG & DROP: Glissez une tâche vers une autre colonne          │
│  └─> Met à jour le statut de la tâche automatiquement           │
│  └─> Notification temps réel aux autres utilisateurs            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Fonctionnalité | Description |
|----------------|-------------|
| **Colonnes par défaut** | Backlog, À faire, En cours, Review, Terminé |
| **Drag & Drop** | Bibliothèque @dnd-kit pour fluidité |
| **Filtres** | Par projet, assigné, priorité, type, sprint |
| **Création rapide** | Bouton + dans chaque colonne |
| **Limites WIP** | Configurable par colonne (Work In Progress) |
| **Vue sprint** | Filtrer par sprint actif |

**Carte Kanban affiche**:
- Titre de la tâche
- Type (Épic/Story/Tâche/Bug) avec couleur
- Priorité (badge coloré)
- Assigné (avatar)
- Story points
- Nombre de sous-tâches

---

### 4. Backlog (`/dashboard/backlog`)

**Accès**: Utilisateurs avec `prioriserBacklog` ET menu `backlog` activé

#### Hiérarchie du Backlog

```
ÉPIC (Grande fonctionnalité)
├── STORY 1 (User Story)
│   ├── Tâche 1.1
│   ├── Tâche 1.2
│   └── Bug 1.3
├── STORY 2
│   ├── Tâche 2.1
│   └── Tâche 2.2
└── Bug direct sur l'Épic
```

| Type | Description | Story Points | Couleur |
|------|-------------|--------------|---------|
| **Épic** | Grande fonctionnalité (plusieurs sprints) | Somme des enfants | Violet |
| **Story** | User Story (1 sprint max) | 1-13 (Fibonacci) | Bleu |
| **Tâche** | Travail technique | 1-8 | Gris |
| **Bug** | Correction d'anomalie | 1-5 | Rouge |

**Fonctionnalités du Backlog**:

| Action | Comment | Permission |
|--------|---------|------------|
| Réordonner | Drag & drop pour changer la priorité | `prioriserBacklog` |
| Créer un item | Bouton + en haut | `gererTaches` |
| Assigner au sprint | Dropdown sprint sur chaque item | `gererSprints` |
| Estimer | Clic sur story points | `gererTaches` |
| Critères d'acceptation | Onglet dans le détail | `gererTaches` |

---

### 5. Sprints (`/dashboard/sprints`)

**Accès**: Utilisateurs avec `gererSprints` ET menu `sprints` activé

#### Cycle de Vie d'un Sprint

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYCLE DE VIE SPRINT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PLANIFIÉ ──────────> ACTIF ──────────> TERMINÉ                 │
│      │                   │                   │                   │
│      │                   │                   │                   │
│      ▼                   ▼                   ▼                   │
│  - Créer sprint      - Sprint en cours   - Sprint clos          │
│  - Définir dates     - Burndown actif    - Vélocité calculée    │
│  - Fixer objectif    - Tâches en cours   - Rétrospective        │
│  - Ajouter tâches    - Suivi quotidien   - Report des restants  │
│                                                                  │
│  Transition automatique:                                         │
│  - Planifié → Actif: quand date_début atteinte                  │
│  - Actif → Terminé: quand date_fin atteinte                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Création d'un Sprint

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| Nom | Ex: "Sprint 1", "Sprint Mars" | Oui |
| Objectif | Ce qu'on veut accomplir | Non |
| Date début | Premier jour du sprint | Oui |
| Date fin | Dernier jour (généralement 2 semaines) | Oui |
| Capacité équipe | Heures disponibles totales | Non |

#### Burndown Chart

Le graphique burndown montre:
- **Ligne idéale**: Progression théorique linéaire
- **Ligne réelle**: Points réellement complétés
- **Axe X**: Jours du sprint
- **Axe Y**: Story points restants

**Calcul de la vélocité**:
```
Vélocité = Story Points complétés / Nombre de sprints terminés
```

---

### 6. Roadmap (`/dashboard/roadmap`)

**Accès**: Tous les utilisateurs avec `voirSesProjets` ET menu `roadmap` activé

#### Vue Timeline

| Fonctionnalité | Description |
|----------------|-------------|
| **Vue Gantt** | Timeline horizontale des épics et sprints |
| **Zoom** | Jour, Semaine, Mois, Trimestre |
| **Jalons** | Points clés (dates importantes) |
| **Dépendances** | Lignes entre items liés |
| **Filtrage** | Par projet (accessible selon permissions) |

**Données affichées**:
- Sprints (barres bleues)
- Épics (barres violettes)
- Livrables (diamants)
- Dates de début/fin

**Important**: La roadmap ne montre que les données des projets auxquels l'utilisateur a accès.

---

### 7. Tâches (`/dashboard/tasks`)

**Accès**: Utilisateurs avec `gererTaches` ET menu `tasks` activé

#### Gestion Complète des Tâches

| Champ | Type | Description |
|-------|------|-------------|
| `titre` | String | Titre de la tâche (obligatoire) |
| `description` | Text | Description détaillée |
| `type` | Enum | Épic, Story, Tâche, Bug |
| `statut` | Enum | Backlog, À faire, En cours, Review, Terminé |
| `priorité` | Enum | Basse, Moyenne, Haute, Critique |
| `story_points` | Number | Estimation (Fibonacci: 1,2,3,5,8,13) |
| `estimation_heures` | Number | Heures estimées |
| `assigné_à` | User | Membre assigné |
| `sprint_id` | Sprint | Sprint associé |
| `parent_id` | Task | Tâche parente (pour hiérarchie) |
| `date_début` | Date | Date de début prévue |
| `date_échéance` | Date | Date limite |
| `labels` | Array | Tags personnalisés |
| `checklist` | Array | Liste de sous-éléments à cocher |

#### Workflow des Tâches

```
Backlog → À faire → En cours → Review → Terminé
   ↑         ↓          ↓         ↓
   └─────────┴──────────┴─────────┘
         (Retours possibles)
```

**Règles de transition**:
- `En cours` → `Terminé` : Doit passer par `Review` d'abord
- Toute tâche peut revenir à `Backlog`
- Les transitions sont vérifiées côté API

---

### 8. Fichiers (`/dashboard/files`)

**Accès**: Utilisateurs avec `gererFichiers` ET menu `files` activé

| Fonctionnalité | Description | Permission |
|----------------|-------------|------------|
| **Upload** | Drag & drop ou bouton | `gererFichiers` |
| **Dossiers** | Créer des dossiers hiérarchiques | `gererFichiers` |
| **Preview** | Aperçu images et documents | Lecture |
| **Téléchargement** | Download direct | Lecture |
| **Suppression** | Supprimer fichiers/dossiers | `gererFichiers` |
| **Lien projet** | Associer à un projet | `gererFichiers` |

**Types supportés**:
- Images: jpg, png, gif, svg, webp
- Documents: pdf, doc, docx, xls, xlsx, ppt, pptx
- Code: js, ts, py, java, etc.
- Archives: zip, rar, 7z

**Métadonnées stockées**:
- Nom original
- Taille
- Type MIME
- Date upload
- Uploadé par
- Projet associé

---

### 9. Commentaires (`/dashboard/comments`)

**Accès**: Utilisateurs avec `commenter` ET menu `comments` activé

| Fonctionnalité | Description |
|----------------|-------------|
| **Commentaire sur tâche** | Discussion contextuelle |
| **@mentions** | Notifier un utilisateur |
| **Édition** | Modifier ses propres commentaires |
| **Suppression** | Supprimer ses propres commentaires |
| **Fil d'activité** | Historique chronologique |

**Format des mentions**:
```
@nom_utilisateur sera notifié par notification in-app
```

**Données d'un commentaire**:
- Contenu (texte)
- Auteur
- Date création
- Date modification
- Tâche associée
- Mentions extraites

---

### 10. Timesheets (`/dashboard/timesheets`)

**Accès**: Utilisateurs avec `saisirTemps` ET menu `timesheets` activé

#### Saisie du Temps

| Champ | Description |
|-------|-------------|
| Projet | Projet concerné |
| Tâche | Tâche travaillée |
| Date | Jour de travail |
| Heures | Durée (décimales acceptées: 1.5h) |
| Description | Ce qui a été fait |

#### Workflow des Timesheets

```
BROUILLON ──────> SOUMIS ──────> VALIDÉ
     │              │
     │              ├──────> REFUSÉ ──────> BROUILLON
     │              │                           │
     └──────────────┘                           │
              (retour possible)                 │
                                                │
     └──────────────────────────────────────────┘
                 (correction et resoumettre)
```

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| **Brouillon** | En cours de saisie | Soumettre, Modifier |
| **Soumis** | Envoyé pour validation | Retirer, (Valider/Refuser par manager) |
| **Validé** | Approuvé | Aucune (terminal) |
| **Refusé** | Rejeté | Corriger et resoumettre |

**Auto-soumission**: Les timesheets en brouillon sont automatiquement soumis 5 jours avant la fin du mois.

#### Liaison Temps et Tâches

```
┌─────────────────────────────────────────────────────────────────┐
│                    CALCUL DU TEMPS DE TRAVAIL                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SAISIE TIMESHEET                                            │
│     └─> Utilisateur saisit ses heures sur une tâche             │
│         ├─> Statut: "Brouillon"                                  │
│         └─> Heures non comptabilisées dans temps_réel           │
│                                                                  │
│  2. SOUMISSION                                                   │
│     └─> Utilisateur soumet son timesheet                         │
│         ├─> Statut: "Soumis"                                     │
│         └─> En attente de validation                             │
│                                                                  │
│  3. VALIDATION                                                   │
│     └─> Manager valide le timesheet                              │
│         ├─> Statut: "Validé"                                     │
│         ├─> temps_réel de la tâche incrémenté (+heures)         │
│         └─> Stats projet mises à jour automatiquement           │
│                                                                  │
│  4. PROPAGATION DES CALCULS                                      │
│     ├─> Tâche: temps_réel = Σ timesheets validés                │
│     ├─> Projet: stats.heures_réelles = Σ tâches.temps_réel      │
│     └─> Sprint: burndown recalculé                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Champs de Temps

| Niveau | Champ | Description | Mise à jour |
|--------|-------|-------------|-------------|
| **Tâche** | `estimation_heures` | Heures estimées pour la tâche | Manuel |
| **Tâche** | `temps_réel` | Heures réellement passées | Auto (validation timesheet) |
| **Projet** | `stats.heures_estimées` | Somme estimations tâches | Auto (agrégation) |
| **Projet** | `stats.heures_réelles` | Somme temps réels tâches | Auto (agrégation) |
| **Sprint** | `capacité_équipe` | Heures disponibles équipe | Manuel |
| **Sprint** | `burndown_data.heures_restantes` | Heures restantes jour J | Auto |

#### Affichage des Statistiques

**Dashboard Timesheets** :
- **Heures mensuelles** : Total des heures saisies sur le mois
- **Moyenne/jour** : Heures totales / nombre d'entrées

**Page Projet** :
- **Heures estimées** : Somme des `estimation_heures` de toutes les tâches
- **Heures réelles** : Somme des `temps_réel` de toutes les tâches

**Sprint Burndown** :
- Affiche uniquement les heures réelles validées (pas de fallback sur estimations)

---

### 11. Budget (`/dashboard/budget`)

**Accès**: Utilisateurs avec `voirBudget` ET menu `budget` activé

#### Gestion Budgétaire

| Élément | Description | Permission pour modifier |
|---------|-------------|-------------------------|
| **Budget prévisionnel** | Montant total alloué | `modifierBudget` |
| **Dépenses** | Liste des dépenses | `modifierBudget` |
| **Catégories** | Groupement des dépenses | `modifierBudget` |
| **Alertes** | Notifications de dépassement | Automatique |

**Devise**: FCFA par défaut

#### Structure d'une Dépense

| Champ | Type | Description |
|-------|------|-------------|
| `description` | String | Libellé de la dépense |
| `montant` | Number | Montant en FCFA |
| `catégorie` | String | Personnel, Matériel, Logiciel, etc. |
| `date` | Date | Date de la dépense |
| `statut` | Enum | en_attente, validé, refusé, payé |
| `pièce_jointe` | File | Justificatif |

#### Workflow des Dépenses

```
EN_ATTENTE ──────> VALIDÉ ──────> PAYÉ
      │              │
      └───> REFUSÉ ──┘
             │
             └───> EN_ATTENTE (après correction)
```

**Alertes automatiques**:
- 🟡 Orange: Budget consommé à 80%
- 🔴 Rouge: Budget consommé à 100%

---

### 12. Rapports (`/dashboard/reports`)

**Accès**: Utilisateurs avec `genererRapports` ET menu `reports` activé

#### Types de Rapports

| Rapport | Contenu | Formats |
|---------|---------|---------|
| **Avancement** | Progression des projets, tâches par statut, burndown | PDF, Excel, CSV |
| **Budget** | Dépenses, écarts, graphiques consommation | PDF, Excel, CSV |
| **Temps** | Heures par projet, par personne, par période | PDF, Excel, CSV |
| **Performance** | Vélocité équipe, métriques Agile, tendances | PDF, Excel, CSV |

#### Caractéristiques des Exports

**PDF**:
- En-tête avec logo
- Date et heure de génération
- Numérotation des pages
- Mise en page professionnelle

**Excel**:
- Styles et couleurs entreprise
- Formules de calcul
- Graphiques intégrés
- Feuilles multiples

**CSV**:
- Export brut des données
- Compatible tous tableurs
- Encodage UTF-8

---

### 13. Notifications (`/dashboard/notifications`)

**Accès**: Utilisateurs avec `recevoirNotifications` ET menu `notifications` activé

#### Types de Notifications

| Type | Déclencheur |
|------|-------------|
| **Assignation** | Tâche assignée à l'utilisateur |
| **Mention** | @mention dans un commentaire |
| **Deadline** | Tâche arrivant à échéance |
| **Commentaire** | Nouveau commentaire sur tâche assignée |
| **Statut** | Changement de statut d'une tâche |
| **Sprint** | Début/fin de sprint |
| **Budget** | Alerte budget (80%, 100%) |

#### Fonctionnalités

| Action | Description |
|--------|-------------|
| **Marquer comme lu** | Clic sur notification individuelle |
| **Tout marquer lu** | Bouton en haut |
| **Supprimer** | Icône poubelle |
| **Filtrer** | Toutes, Non lues, Lues |

**Badge compteur**: Le nombre de notifications non lues s'affiche sur l'icône cloche dans le header et la sidebar. Ce compteur se met à jour en temps réel quand vous marquez les notifications comme lues.

---

### 14. Administration

#### 14.1 Rôles & Permissions (`/dashboard/admin/roles`)

**Accès**: `adminConfig`

| Fonctionnalité | Description |
|----------------|-------------|
| **Liste des rôles** | Tableau avec tous les rôles |
| **Modifier les permissions** | Checkbox pour chaque permission |
| **Modifier les menus** | Checkbox pour chaque menu |
| **Créer un rôle** | Nouveau rôle personnalisé |
| **Supprimer un rôle** | Uniquement rôles personnalisés |

**Note**: Les 10 rôles prédéfinis ne peuvent pas être supprimés.

#### 14.2 Utilisateurs (`/dashboard/users`)

**Accès**: `gererUtilisateurs` (Super Admin uniquement)

| Action | Description |
|--------|-------------|
| **Créer utilisateur** | Nom, email, rôle |
| **Modifier** | Changer rôle, statut |
| **Désactiver** | Statut = "Désactivé" |
| **Réinitialiser MDP** | Remet à "00000000" + first_login: true |

#### 14.3 Templates Projets (`/dashboard/admin/templates`)

**Accès**: `adminConfig`

| Fonctionnalité | Description |
|----------------|-------------|
| **Templates prédéfinis** | Web, Mobile, Marketing, etc. |
| **Créer template** | Nom, description, champs personnalisés |
| **Champs dynamiques** | Texte, Nombre, Date, Liste, Checkbox |
| **Dupliquer** | Copier un template existant |
| **Activer/Désactiver** | Rendre disponible ou non |

#### 14.4 Types de Livrables (`/dashboard/admin/deliverable-types`)

**Accès**: `adminConfig`

Types par défaut: Document, Code Source, Design, Rapport, Prototype

#### 14.5 Audit & Logs (`/dashboard/admin/audit`)

**Accès**: `voirAudit`

| Information | Description |
|-------------|-------------|
| **Qui** | Utilisateur ayant fait l'action |
| **Quoi** | Type d'action (CREATE, UPDATE, DELETE) |
| **Quand** | Date et heure précise |
| **Où** | Entité concernée (Project, Task, etc.) |
| **Détails** | Anciennes et nouvelles valeurs |

#### 14.6 SharePoint (`/dashboard/admin/sharepoint`)

**Accès**: `adminConfig`

Configuration de l'intégration Microsoft SharePoint (voir [Section 19](#19-intégration-sharepoint) pour les détails complets) :
- Configuration des identifiants Azure AD (Tenant ID, Client ID, Client Secret, Site ID)
- Test de connexion réel via Microsoft Graph API
- Activation/désactivation de la synchronisation automatique
- Synchronisation manuelle de tous les projets
- Statistiques de synchronisation et historique des erreurs

#### 14.7 Paramètres (`/dashboard/settings`)

**Accès**: `adminConfig`

- Nom de l'application
- Langue par défaut
- Fuseau horaire
- Thème (clair/sombre)
- Expiration session

#### 14.8 Maintenance (`/dashboard/maintenance`)

**Accès**: `adminConfig`

- Activer/désactiver le mode maintenance
- Message personnalisé aux utilisateurs
- Seuls les admins peuvent accéder pendant la maintenance

---

### 15. Livrables (`/dashboard/deliverables`)

**Accès**: Utilisateurs avec `validerLivrable` ou accès projet

#### Concept des Livrables

Un livrable représente un élément concret à produire dans le cadre d'un projet : document, code source, design, rapport, prototype, etc.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYCLE DE VIE LIVRABLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  À PRODUIRE ───> EN VALIDATION ───> VALIDÉ ───> ARCHIVÉ         │
│       │               │                                          │
│       │               └──> REFUSÉ ──────────────┐                │
│       │                                          │                │
│       └──────────────────────────────────────────┘                │
│                    (retour pour correction)                      │
│                                                                  │
│  Workflow multi-étapes configurable:                             │
│  ├── Création (par défaut)                                       │
│  ├── Revue technique                                             │
│  ├── Validation métier                                           │
│  └── Approbation finale                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Structure d'un Livrable

| Champ | Type | Description |
|-------|------|-------------|
| `nom` | String | Nom du livrable |
| `description` | Text | Description détaillée |
| `type` | DeliverableType | Type (Document, Code, Design, etc.) |
| `statut_global` | Enum | À produire, En validation, Validé, Refusé, Archivé |
| `assigné_à` | User | Responsable de la production |
| `date_échéance` | Date | Date limite de livraison |
| `fichiers` | Array | Fichiers attachés avec versions |
| `metadata` | Object | Métadonnées personnalisées selon le type |

#### Types de Livrables Personnalisés

L'administrateur peut créer des types de livrables avec :

| Configuration | Description |
|---------------|-------------|
| **Étapes workflow** | Définir les étapes de validation (séquentiel ou parallèle) |
| **Approbateurs** | Par rôle ou utilisateur spécifique |
| **Délais** | Délai maximum par étape |
| **Signature électronique** | Obligatoire ou optionnelle |
| **Champs métadonnées** | Champs personnalisés (texte, nombre, date, liste) |
| **Dépendances** | Livrables prérequis |

#### Historique et Traçabilité

Chaque action sur un livrable est tracée :
- Étape actuelle et précédentes
- Action (validé, refusé, demande_modification)
- Utilisateur et date
- Commentaires et fichiers joints
- Signatures avec IP et timestamp

---

### 16. Profil Utilisateur (`/dashboard/profile`)

**Accès**: Tous les utilisateurs connectés

#### Informations Personnelles

| Section | Champs modifiables |
|---------|-------------------|
| **Identité** | Nom complet, avatar |
| **Contact** | Email (lecture seule), téléphone |
| **Professionnel** | Poste, département/équipe |
| **Compétences** | Liste de compétences (tags) |
| **Disponibilité** | Heures hebdomadaires (défaut: 35h) |
| **Localisation** | Fuseau horaire |
| **Facturation** | Taux journalier (FCFA) |

#### Statistiques Personnelles

Le profil affiche vos métriques :
- **Projets actifs** : Nombre de projets où vous êtes membre
- **Tâches complétées** : Total des tâches terminées
- **Tâches en cours** : Tâches actuellement assignées
- **Heures travaillées** : Total des heures validées (timesheets)

#### Sécurité du Compte

```
┌─────────────────────────────────────────────────────────────────┐
│                    SÉCURITÉ DU COMPTE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CHANGEMENT DE MOT DE PASSE                                      │
│  ├── Mot de passe actuel requis                                  │
│  ├── Nouveau mot de passe (min. 8 caractères)                   │
│  ├── Confirmation du nouveau mot de passe                        │
│  └── Historique: 5 derniers MDP interdits                       │
│                                                                  │
│  AUTHENTIFICATION À DEUX FACTEURS (2FA)                          │
│  ├── Activation/Désactivation                                    │
│  ├── QR Code pour application authenticateur                    │
│  ├── Code manuel si scan impossible                              │
│  ├── 10 codes de secours générés                                │
│  └── Régénération des codes possible                            │
│                                                                  │
│  APPLICATIONS COMPATIBLES 2FA:                                   │
│  ├── Google Authenticator                                        │
│  ├── Microsoft Authenticator                                     │
│  ├── Authy                                                       │
│  └── Tout app TOTP standard                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Codes de Secours 2FA

Lors de l'activation de la 2FA, 10 codes de secours sont générés :
- Format : `XXXX-XXXX` (8 caractères alphanumériques)
- Usage unique : chaque code ne peut être utilisé qu'une fois
- À conserver en lieu sûr (hors de l'appareil principal)
- Avertissement affiché si moins de 3 codes restants
- Possibilité de régénérer tous les codes (invalide les anciens)

---

### 17. Internationalisation (i18n)

**Langues supportées** : Français (FR), English (EN)

#### Fonctionnement

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTÈME DE TRADUCTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CONFIGURATION                                                   │
│  ├── Langue par défaut: Français (FR)                           │
│  ├── Changement via: Paramètres > Langue                        │
│  └── Persistance: localStorage + base de données                │
│                                                                  │
│  COUVERTURE                                                      │
│  ├── Interface utilisateur complète                             │
│  ├── Messages d'erreur et de succès                             │
│  ├── Emails de notification                                     │
│  ├── Exports PDF et Excel                                       │
│  └── 400+ clés de traduction                                    │
│                                                                  │
│  ZONES TRADUITES                                                 │
│  ├── Navigation et menus                                         │
│  ├── Formulaires et labels                                       │
│  ├── Messages toast                                              │
│  ├── Boutons et actions                                          │
│  ├── Statuts et états                                            │
│  ├── Dates (format localisé)                                    │
│  └── Montants (format devise)                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Formats Localisés

| Élément | Français (FR) | English (EN) |
|---------|---------------|--------------|
| **Date** | 17/12/2025 | 12/17/2025 |
| **Heure** | 14:30 | 2:30 PM |
| **Nombre** | 1 234,56 | 1,234.56 |
| **Devise** | 50 000 FCFA | 50,000 FCFA |

#### Utilisation dans le Code

```javascript
// Récupérer la fonction de traduction
const { t, language, setLanguage } = useAppSettings();

// Utiliser une traduction
<h1>{t('dashboard')}</h1>  // "Tableau de bord" ou "Dashboard"

// Changer la langue
setLanguage('en');  // Passe en anglais
```

---

### 18. Thème et Personnalisation

#### Modes de Thème

| Mode | Description |
|------|-------------|
| **Clair (Light)** | Fond blanc, texte sombre |
| **Sombre (Dark)** | Fond sombre, texte clair |
| **Système (System)** | Suit les préférences OS |

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERSONNALISATION UI                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  THÈME                                                           │
│  ├── Clair / Sombre / Système                                   │
│  ├── Transition fluide entre thèmes                             │
│  └── Persistance localStorage (pm_theme)                        │
│                                                                  │
│  COULEUR PRINCIPALE                                              │
│  ├── Indigo (défaut) - #6366f1                                  │
│  ├── Sky (bleu ciel) - #0ea5e9                                  │
│  ├── Emerald (vert) - #10b981                                   │
│  ├── Amber (orange) - #f59e0b                                   │
│  ├── Red (rouge) - #ef4444                                      │
│  └── Violet - #8b5cf6                                           │
│                                                                  │
│  SIDEBAR                                                         │
│  ├── Mode étendu: icônes + texte                                │
│  └── Mode compact: icônes seules                                │
│                                                                  │
│  PERSISTANCE                                                     │
│  ├── pm_theme: mode de thème                                    │
│  ├── pm_primary_color: couleur principale                       │
│  └── pm_sidebar_compact: état sidebar                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Application du Thème

Le thème s'applique via des variables CSS personnalisées :
- Les composants shadcn/ui s'adaptent automatiquement
- Les graphiques Recharts suivent le thème
- Les exports PDF utilisent un style neutre professionnel

---

### 19. Intégration SharePoint

**Accès**: `adminConfig`

L'intégration SharePoint permet de synchroniser automatiquement les fichiers de vos projets avec Microsoft SharePoint via l'API Microsoft Graph.

#### Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Configuration persistante** | Les identifiants sont stockés de manière sécurisée en base de données |
| **Test de connexion réel** | Validation via Microsoft Graph API |
| **Upload automatique** | Les fichiers uploadés sont automatiquement synchronisés vers SharePoint |
| **Suppression synchronisée** | La suppression locale supprime aussi le fichier SharePoint |
| **Synchronisation manuelle** | Bouton pour synchroniser tous les projets d'un coup |
| **Statistiques de sync** | Suivi des fichiers synchronisés et des erreurs |

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTÉGRATION SHAREPOINT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FLUX DE SYNCHRONISATION                                         │
│  ════════════════════════                                       │
│                                                                  │
│  1. UPLOAD FICHIER                                               │
│     └─> Fichier sauvegardé localement (MongoDB)                 │
│         └─> Si SharePoint configuré ET projet spécifié          │
│             └─> Upload automatique vers SharePoint               │
│                 └─> Métadonnées SharePoint enregistrées          │
│                                                                  │
│  2. SUPPRESSION FICHIER                                          │
│     └─> Si fichier synchronisé (sharepoint_id présent)          │
│         └─> Suppression sur SharePoint                           │
│     └─> Suppression locale (MongoDB)                             │
│                                                                  │
│  3. SYNCHRONISATION MANUELLE                                     │
│     └─> Parcourt tous les projets actifs                        │
│         └─> Pour chaque fichier non synchronisé                 │
│             └─> Crée dossier projet sur SharePoint              │
│             └─> Upload le fichier                                │
│             └─> Met à jour les métadonnées                       │
│                                                                  │
│  STRUCTURE SHAREPOINT                                            │
│  ════════════════════                                           │
│  SharePoint Site/                                                │
│  └── Projet_{id}_{nom}/                                         │
│      ├── document1.pdf                                           │
│      ├── image.png                                               │
│      └── rapport.xlsx                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Configuration

| Paramètre | Description | Format |
|-----------|-------------|--------|
| `Tenant ID` | Identifiant Azure AD de l'organisation | UUID |
| `Client ID` | ID de l'application enregistrée | UUID |
| `Client Secret` | Secret de l'application | String |
| `Site ID` | Identifiant du site SharePoint | String |

#### Guide de Configuration Azure AD

1. **Créer une application** dans Azure Active Directory
2. **Configurer les permissions** Microsoft Graph :
   - `Sites.ReadWrite.All` (Application)
   - `Files.ReadWrite.All` (Application)
3. **Générer un Client Secret**
4. **Récupérer le Site ID** avec le script utilitaire
5. **Tester la connexion** via l'interface d'administration
6. **Activer** l'intégration

#### Script Utilitaire

Pour récupérer le Site ID SharePoint :

```bash
node scripts/get-sharepoint-site-id.js [tenant-id] [client-id] [client-secret] [hostname] [site-path]

# Exemple:
node scripts/get-sharepoint-site-id.js \
  "12345678-1234-1234-1234-123456789012" \
  "abcdefgh-abcd-abcd-abcd-abcdefghijkl" \
  "your-client-secret" \
  "contoso.sharepoint.com" \
  "/sites/MonSite"
```

#### Métadonnées Fichiers

Chaque fichier synchronisé contient :

| Champ | Description |
|-------|-------------|
| `sharepoint_id` | ID unique du fichier sur SharePoint |
| `sharepoint_url` | URL directe vers le fichier |
| `sharepoint_synced` | Statut de synchronisation (true/false) |
| `last_sync_sharepoint` | Date de dernière synchronisation |

#### Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/sharepoint/config` | Récupérer la configuration |
| `PUT` | `/api/sharepoint/config` | Sauvegarder la configuration |
| `POST` | `/api/sharepoint/test` | Tester la connexion |
| `POST` | `/api/sharepoint/sync` | Lancer une synchronisation manuelle |

---

### 20. Dépendances entre Tâches

#### Types de Dépendances

| Type | Signification |
|------|---------------|
| `bloque` | Cette tâche bloque une autre tâche |
| `bloqué_par` | Cette tâche est bloquée par une autre |
| `lié_à` | Relation simple sans blocage |

#### Comportement

```
┌─────────────────────────────────────────────────────────────────┐
│                    GESTION DES DÉPENDANCES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TÂCHE A ─────bloque─────> TÂCHE B                              │
│     │                          │                                 │
│     │                          ├── Ne peut pas démarrer tant    │
│     │                          │   que A n'est pas terminée     │
│     │                          │                                 │
│     └── Affiche badge "Bloque X tâches"                         │
│                                                                  │
│  VISUALISATION                                                   │
│  ├── Liste des dépendances dans le détail tâche                │
│  ├── Lignes de connexion dans la Roadmap                       │
│  └── Alertes si dépendance non satisfaite                      │
│                                                                  │
│  RÈGLES                                                          │
│  ├── Pas de dépendances circulaires                            │
│  ├── Une tâche peut avoir plusieurs dépendances                │
│  └── Les dépendances sont vérifiées lors des transitions       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 21. Templates de Projets

**Accès**: `adminConfig`

#### Création de Template

| Élément | Description |
|---------|-------------|
| **Nom et description** | Identification du template |
| **Catégorie** | Web, Mobile, Marketing, Infrastructure, etc. |
| **Champs personnalisés** | Champs spécifiques au type de projet |
| **Colonnes Kanban** | Configuration par défaut des colonnes |
| **Rôles projet** | Rôles prédéfinis pour ce type |
| **Livrables auto** | Livrables créés automatiquement |

#### Types de Champs Dynamiques

| Type | Usage | Options |
|------|-------|---------|
| `texte` | Texte libre | min/max length, pattern regex |
| `nombre` | Valeur numérique | min, max, décimales |
| `date` | Date | min/max date, format |
| `sélecteur` | Liste déroulante | options prédéfinies |
| `utilisateur` | Sélection user | filtres par rôle |
| `fichier` | Upload fichier | types acceptés, taille max |
| `budget` | Montant devise | devise, format |
| `url` | Lien web | validation URL |
| `checkbox` | Oui/Non | valeur par défaut |

#### Champs Conditionnels

```javascript
// Exemple: Champ visible si type = "externe"
{
  "show_if": {
    "field": "type_projet",
    "operator": "equals",
    "value": "externe"
  }
}

// Exemple: Champ requis si budget > 1000000
{
  "require_if": {
    "field": "budget_previsionnel",
    "operator": "greater_than",
    "value": 1000000
  }
}
```

---

## 🔄 Workflows et Transitions de Statut

### Workflow des Tâches

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW TÂCHES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Statuts disponibles:                                            │
│  ├── Backlog (gris)     - Non démarrée                          │
│  ├── À faire (bleu)     - Prête à démarrer                      │
│  ├── En cours (jaune)   - Travail en cours                      │
│  ├── Review (violet)    - En attente de revue                   │
│  └── Terminé (vert)     - Complétée                             │
│                                                                  │
│  Transitions autorisées:                                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Backlog  →  À faire                           ✅       │     │
│  │ À faire  →  En cours, Backlog                 ✅       │     │
│  │ En cours →  Review, À faire                   ✅       │     │
│  │ En cours →  Terminé                           ❌       │     │
│  │           (doit passer par Review)                     │     │
│  │ Review   →  Terminé, En cours                 ✅       │     │
│  │ Terminé  →  (aucune - état terminal)                   │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Auto-transitions:                                               │
│  - À faire → En cours: après 3 jours si date_début atteinte    │
│  - En cours → Review: quand 80% de la checklist est cochée     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow des Sprints

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW SPRINTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Planifié ──────────> Actif ──────────> Terminé                 │
│                                                                  │
│  Conditions de transition:                                       │
│  ├── Planifié → Actif: date_début <= aujourd'hui                │
│  └── Actif → Terminé: date_fin <= aujourd'hui                   │
│                                                                  │
│  Auto-transitions:                                               │
│  - Sprint passe automatiquement en "Actif" le jour du début    │
│  - Sprint passe automatiquement en "Terminé" le jour de fin    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow des Dépenses

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW DÉPENSES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  en_attente ──────> validé ──────> payé                         │
│       │                │                                         │
│       └───> refusé ────┘                                         │
│                │                                                 │
│                └───> en_attente (après correction)               │
│                                                                  │
│  Permissions:                                                    │
│  - Valider/Refuser: modifierBudget ou adminConfig               │
│                                                                  │
│  Auto-transition:                                                │
│  - validé → payé: 3 jours après validation                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow des Livrables

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW LIVRABLES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  À produire ──────> En validation ──────> Validé ──────> Archivé│
│                           │                                      │
│                           └───> Refusé ──────> À produire        │
│                                                                  │
│  Permissions:                                                    │
│  - Valider/Refuser: validerLivrable ou adminConfig              │
│                                                                  │
│  Auto-transition:                                                │
│  - En validation → Validé: après 14 jours sans action           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

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
git clone https://github.com/TripleV-coder/Project-Manager.git
cd Project-Manager

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
MONGO_URL=mongodb://localhost:27017/pm_gestion

# ============================================
# SÉCURITÉ (OBLIGATOIRE)
# ============================================
# Générez avec : openssl rand -base64 32
JWT_SECRET=votre-secret-jwt-tres-securise-et-long

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# SOCKET.IO (Temps réel)
# ============================================
SOCKET_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000
SOCKET_PORT=4000
```

---

## 📖 Guide d'Utilisation Détaillé

### Ajouter un Utilisateur à un Projet

Pour qu'un utilisateur (Invité, Observateur, etc.) puisse voir un projet:

1. Connectez-vous en tant que Chef de Projet ou Admin
2. Allez dans **Projets** → Sélectionnez le projet
3. Section **Équipe** → Cliquez **+ Ajouter membre**
4. Sélectionnez l'utilisateur
5. Choisissez son rôle dans le projet
6. Validez

L'utilisateur pourra maintenant voir ce projet dans sa liste.

### Créer une Tâche

1. **Menu** → **Tâches** (ou depuis le Kanban)
2. Cliquez **+ Nouvelle tâche**
3. Remplissez:
   - Titre (obligatoire)
   - Type (Tâche, Story, Bug, Épic)
   - Priorité
   - Assigné
   - Sprint (si applicable)
   - Story points
   - Description
4. Cliquez **Créer**

### Planifier un Sprint

1. **Menu** → **Sprints** → **+ Nouveau Sprint**
2. Définissez:
   - Nom du sprint
   - Dates de début et fin
   - Objectif
3. Cliquez **Créer**
4. Ajoutez des tâches depuis le backlog
5. Cliquez **Démarrer le sprint** quand prêt

### Générer un Rapport

1. **Menu** → **Rapports**
2. Sélectionnez le type de rapport
3. Filtrez par projet et période
4. Cliquez sur **PDF**, **Excel** ou **CSV**
5. Le fichier se télécharge automatiquement

---

## 📚 API Reference Complète

### Authentification

Toutes les routes (sauf `/api/check` et `/api/auth/*`) requièrent un token JWT :

```bash
Authorization: Bearer <votre_token_jwt>
```

### Format de Réponse

```json
// Succès
{
  "success": true,
  "data": { ... },
  "message": "Message optionnel"
}

// Erreur
{
  "success": false,
  "error": "Message d'erreur"
}
```

### Endpoints Principaux

#### Authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/check` | État de l'API | Non |
| `POST` | `/api/auth/first-admin` | Créer premier admin | Non |
| `POST` | `/api/auth/login` | Connexion | Non |
| `POST` | `/api/auth/first-login-reset` | Reset première connexion | Non |
| `GET` | `/api/auth/me` | Profil connecté | Oui |

#### Projets

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/projects` | Liste projets | `voirSesProjets` |
| `POST` | `/api/projects` | Créer projet | `creerProjet` |
| `GET` | `/api/projects/:id` | Détails projet | `voirSesProjets` |
| `PUT` | `/api/projects/:id` | Modifier projet | `modifierCharteProjet` |
| `DELETE` | `/api/projects/:id` | Supprimer projet | `supprimerProjet` |
| `POST` | `/api/projects/:id/members` | Ajouter membre | `gererMembresProjet` |

#### Tâches

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/tasks` | Liste tâches | `voirSesProjets` |
| `POST` | `/api/tasks` | Créer tâche | `gererTaches` |
| `PUT` | `/api/tasks/:id` | Modifier tâche | `gererTaches` |
| `PUT` | `/api/tasks/:id/move` | Déplacer (Kanban) | `deplacerTaches` |
| `DELETE` | `/api/tasks/:id` | Supprimer tâche | `gererTaches` |

#### Sprints

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/sprints` | Liste sprints | `voirSesProjets` |
| `POST` | `/api/sprints` | Créer sprint | `gererSprints` |
| `PUT` | `/api/sprints/:id` | Modifier sprint | `gererSprints` |
| `PUT` | `/api/sprints/:id/start` | Démarrer sprint | `gererSprints` |
| `PUT` | `/api/sprints/:id/complete` | Terminer sprint | `gererSprints` |

#### Utilisateurs & Rôles

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/users` | Liste utilisateurs | `adminConfig` |
| `POST` | `/api/users` | Créer utilisateur | `gererUtilisateurs` |
| `PUT` | `/api/users/:id` | Modifier utilisateur | `gererUtilisateurs` |
| `GET` | `/api/roles` | Liste rôles | - |
| `PUT` | `/api/roles/:id` | Modifier rôle | `adminConfig` |

#### Budget & Dépenses

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/expenses?projet_id=X` | Dépenses projet | `voirBudget` |
| `POST` | `/api/expenses` | Ajouter dépense | `modifierBudget` |
| `PUT` | `/api/expenses/:id` | Modifier dépense | `modifierBudget` |
| `DELETE` | `/api/expenses/:id` | Supprimer dépense | `modifierBudget` |

#### Notifications

| Méthode | Endpoint | Description | Permission |
|---------|----------|-------------|------------|
| `GET` | `/api/notifications` | Liste notifications | `recevoirNotifications` |
| `PUT` | `/api/notifications/:id/read` | Marquer lue | `recevoirNotifications` |
| `PUT` | `/api/notifications/read-all` | Tout marquer lu | `recevoirNotifications` |
| `DELETE` | `/api/notifications/:id` | Supprimer | `recevoirNotifications` |

---

## 📊 Modèles de Données Complets

### User (Utilisateur)

```javascript
{
  _id: ObjectId,
  nom_complet: String,           // "Jean Dupont"
  email: String,                 // "jean@example.com" (unique)
  password: String,              // Hash bcrypt (select: false)
  role_id: ObjectId,             // Référence vers Role
  status: "Actif" | "Désactivé" | "Suspendu",
  first_login: Boolean,          // true = doit changer MDP
  must_change_password: Boolean,
  avatar: String,                // URL
  poste_titre: String,           // "Développeur Senior"
  département_équipe: String,
  compétences: [String],
  disponibilité_hebdo: Number,   // 35 (heures)
  taux_journalier: Number,       // En FCFA
  fuseau_horaire: String,        // "Europe/Paris"
  notifications_préférées: {
    email: Boolean,
    in_app: Boolean,
    push: Boolean
  },
  dernière_connexion: Date,
  failedLoginAttempts: Number,   // Verrouillage après 5
  lockUntil: Date,               // Date de déverrouillage
  created_at: Date,
  updated_at: Date
}
```

### Role (Rôle)

```javascript
{
  _id: ObjectId,
  nom: String,                   // "Chef de Projet"
  description: String,
  is_predefined: Boolean,        // true pour les 10 rôles de base
  is_custom: Boolean,            // true pour rôles créés
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
  nom: String,
  description: String,
  template_id: ObjectId,
  champs_dynamiques: Object,     // Champs personnalisés du template
  statut: "Planification" | "En cours" | "En pause" | "Terminé" | "Annulé",
  priorité: "Basse" | "Moyenne" | "Haute" | "Critique",
  date_début: Date,
  date_fin_prévue: Date,
  date_fin_réelle: Date,
  chef_projet: ObjectId,         // User
  product_owner: ObjectId,       // User
  membres: [{
    user_id: ObjectId,
    project_role_id: ObjectId,
    date_ajout: Date
  }],
  budget: {
    prévisionnel: Number,
    réel: Number,
    devise: String               // "FCFA"
  },
  colonnes_kanban: [{
    id: String,
    nom: String,
    couleur: String,
    wip_limit: Number,
    ordre: Number
  }],
  stats: {
    total_tâches: Number,
    tâches_terminées: Number,
    progression: Number          // 0-100
  },
  créé_par: ObjectId,
  archivé: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### Task (Tâche)

```javascript
{
  _id: ObjectId,
  projet_id: ObjectId,
  titre: String,
  description: String,
  type: "Épic" | "Story" | "Tâche" | "Bug",
  parent_id: ObjectId,           // Pour hiérarchie
  epic_id: ObjectId,
  statut: "Backlog" | "À faire" | "En cours" | "Review" | "Terminé",
  colonne_kanban: String,
  priorité: "Basse" | "Moyenne" | "Haute" | "Critique",
  ordre_priorité: Number,
  story_points: Number,          // 1, 2, 3, 5, 8, 13
  estimation_heures: Number,
  temps_réel: Number,
  assigné_à: ObjectId,
  créé_par: ObjectId,
  sprint_id: ObjectId,
  deliverable_id: ObjectId,
  dépendances: [{
    task_id: ObjectId,
    type: "bloque" | "bloqué_par" | "lié_à"
  }],
  labels: [String],
  checklist: [{
    id: String,
    texte: String,
    complété: Boolean,
    ordre: Number
  }],
  date_début: Date,
  date_échéance: Date,
  date_complétion: Date,
  acceptance_criteria: [String],
  has_subtasks: Boolean,
  subtasks_count: Number,
  subtasks_completed: Number,
  created_at: Date,
  updated_at: Date
}
```

### Sprint

```javascript
{
  _id: ObjectId,
  projet_id: ObjectId,
  nom: String,                   // "Sprint 1"
  objectif: String,
  statut: "Planifié" | "Actif" | "Terminé",
  date_début: Date,
  date_fin: Date,
  capacité_équipe: Number,       // Heures totales
  story_points_planifiés: Number,
  story_points_complétés: Number,
  velocity: Number,
  burndown_data: [{
    date: Date,
    story_points_restants: Number,
    heures_restantes: Number,
    idéal: Number
  }],
  retrospective: {
    ce_qui_a_bien_marché: [String],
    à_améliorer: [String],
    actions: [{
      description: String,
      responsable: ObjectId,
      statut: "TODO" | "En cours" | "Fait"
    }]
  },
  created_at: Date
}
```

---

## 🏗️ Architecture Technique

### Structure du Projet

```
Project-Manager/
├── app/                              # Next.js App Router
│   ├── api/[[...path]]/route.js      # API Backend (70+ endpoints)
│   ├── dashboard/                    # Pages dashboard (25 pages)
│   ├── first-admin/                  # Création premier admin
│   ├── first-login/                  # Première connexion
│   ├── login/                        # Connexion
│   └── layout.js                     # Layout racine + Toaster
├── components/                       # Composants React (40+)
│   ├── ui/                           # shadcn/ui
│   └── kanban/                       # Composants Kanban
├── models/                           # Modèles Mongoose (17)
├── lib/                              # Utilitaires et services
│   ├── menuConfig.js                 # Config menus/permissions
│   ├── workflows.js                  # Transitions de statut
│   ├── permissions.js                # Gestion RBAC
│   └── services/                     # Services métier
├── hooks/                            # Hooks React personnalisés
├── context/                          # Contextes React
└── scripts/                          # Scripts utilitaires
```

### Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS 3.4 |
| **UI** | shadcn/ui, Radix UI, Lucide Icons |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable |
| **Graphiques** | Recharts |
| **Backend** | Next.js API Routes |
| **Auth** | JWT (jose), bcryptjs |
| **Base de données** | MongoDB 7+, Mongoose 8 |
| **Temps réel** | Socket.io 4.8 |
| **Export** | jsPDF, ExcelJS, PapaParse |
| **Notifications** | Sonner (toast) |

---

## 🔐 Sécurité

### Mesures Implémentées

| Mesure | Description |
|--------|-------------|
| **JWT** | Tokens signés HS256, expiration 24h |
| **Hachage MDP** | bcryptjs, 12 salt rounds |
| **Verrouillage compte** | 5 tentatives → 15 min lock |
| **Rate Limiting** | 100 req/min par IP |
| **CORS** | Origines configurables |
| **Validation** | Joi/Zod sur toutes entrées |
| **RBAC** | 23 permissions, 14 menus |
| **Audit** | Logging de toutes les actions |

### Vulnérabilités Corrigées

- ✅ Cache Poisoning (Next.js)
- ✅ Denial of Service
- ✅ Authorization Bypass
- ✅ SSRF dans Middleware
- ✅ XSS
- ✅ Injection MongoDB

---

## 🛠️ Scripts Disponibles

```bash
# Développement
yarn dev              # Démarrage avec hot reload
yarn dev:socket       # App + serveur Socket.io

# Production
yarn build            # Build de production
yarn start            # Démarrer en production

# Qualité
yarn lint             # Vérifier le code (ESLint)
yarn test             # Lancer les tests

# Base de données
yarn clear:db         # Vider MongoDB (ATTENTION!)

# Socket.io
yarn socket           # Serveur Socket.io seul
```

---

## 📝 Changelog

### Version 1.0.7 (Décembre 2025)

- ✅ Optimisation calculs temps de travail
- ✅ Correction affichage "Heures mensuelles" (affiche total heures, pas le count)
- ✅ Correction burndown sprint (temps réel uniquement, pas de fallback estimation)
- ✅ Invalidation cache projet après validation timesheet
- ✅ Incrémentation automatique temps_réel tâche à la validation
- ✅ Documentation complète gestion du temps

### Version 1.0.6 (Décembre 2025)

- ✅ Paramètres système fonctionnels (langue, thème, maintenance)
- ✅ Amélioration gestion rôles membres projet

### Version 1.0.5 (Décembre 2025)

- ✅ Mode maintenance avec message personnalisé
- ✅ Thème sombre complet
- ✅ Préférences UI utilisateur

### Version 1.0.4 (Décembre 2025)

- ✅ Page profil utilisateur complète
- ✅ Gestion budget améliorée
- ✅ Corrections permissions divers rôles

### Version 1.0.3 (Décembre 2025)

- ✅ Correction filtrage projets pour rôles lecture seule
- ✅ APIs sprints/tasks/deliverables filtrés par projets accessibles
- ✅ Compteur notifications temps réel corrigé
- ✅ Documentation README exhaustive

### Version 1.0.2 (Décembre 2025)

- ✅ Audit et correction des 10 rôles prédéfinis
- ✅ Ajout composant Toaster pour notifications
- ✅ Suppression fichiers inutiles (16 fichiers)

### Version 1.0.1 (Décembre 2025)

- ✅ Mise à jour Next.js 14.2.33
- ✅ Correction vulnérabilités sécurité
- ✅ Rapports professionnels (PDF, Excel, CSV)

---

## 📄 Licence

Ce projet est sous licence **MIT**.

---

<div align="center">

**Fait avec ❤️ pour les équipes Agile**

⭐ **Star** ce repo si vous l'aimez !

</div>
