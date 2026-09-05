# Rapport complet — Audit RBAC, lancement & tests de l'application

**Projet** : PM — Gestion de Projets Agile (Next.js 14 + MongoDB)
**Date** : 29 août 2026
**Environnement** : local (`http://localhost:3000`, socket `:4000`, MongoDB via `mongodb-memory-server` 7.0.14 sur `:27017`, base `pm_gestion`)
**Objet** : Vérification RBAC/sécurité, lancement de l'application, tests fonctionnels, retour détaillé.

---

## 1. Résumé exécutif

- L'application **ne pouvait pas démarrer sur une base vierge** : 3 bugs bloquants (initialisation, login, création de projet) + 1 crash runtime (`/api/settings`).
- **7 corrections minimales appliquées** pour rendre l'app bootable et testable.
- État final : **lint OK (0 erreur)**, **typecheck OK**, **458/458 tests passés (32 suites)**, application fonctionnelle.
- **Points CRITIQUES non corrigés** : le RBAC « 2 niveaux » (système + projet) n'est pas appliqué en backend ; `POST /api/projects` et `files/upload` sont accessibles sans permission ; les sprints sont manipulables hors scoping projet.
- À ce jour **aucun commit** n'a été fait : 3 fichiers applicatifs + les mocks de tests sont modifiés.

---

## 2. Environnement de test

| Composant        | Détail                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Web              | Next.js dev, `http://localhost:3000`                                                                             |
| Temps réel       | Socket.io, `http://localhost:4000` (`scripts/socket-server.js`)                                                  |
| Base de données  | MongoDB 7.0.14 (binaire officiel via `mongodb-memory-server`), `mongodb://localhost:27017/pm_gestion`            |
| Comptes de test  | `admin@test.pm` / `TestPassword123!` (Super Admin) ; `membre@test.pm` / `MembrePass123!` (rôle Membre restreint) |
| Données insérées | 2 projets, 1 tâche, 1 sprint, 1 rôle « Membre », 2 utilisateurs                                                  |

Note : le registry Docker était inaccessible ; MongoDB a été démarré avec `mongodb-memory-server` (binaire téléchargé depuis `fastdl.mongodb.org`).

---

## 3. Bugs bloquants corrigés (7 correctifs)

| #   | Fichier                                      | Problème                                                                                                                                                         | Impact avant correction                                                                                               |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `app/api/auth/first-admin/route.js:44`       | `initializeProjectRoles()` appelé **sans projet** alors que `models/ProjectRole.js:7` rend `project_id` **requis**                                               | `POST /api/auth/first-admin` → **400** « Path `project_id` is required. » — l'app est **inutilisable sur DB vierge**  |
| 2   | `app/api/auth/first-admin/route.js:34`       | Rôle fallback « Super Administrateur » **partiel** (9/23 permissions, `visibleMenus.admin:false`)                                                                | Admin bootstrap sans `creerProjet`, `gererTaches`, etc. → **incapable de créer projets/tâches**, menu Admin invisible |
| 3   | `app/api/auth/login/route.js:42`             | `password` a `select:false` dans `models/User.js:29` mais le `findOne` ne fait pas `.select('+password')`                                                        | **login → 500** « Illegal arguments: string, undefined » (bcrypt sur `undefined`)                                     |
| 4   | `app/api/auth/first-login-reset/route.js:30` | Idem                                                                                                                                                             | **first-login-reset → 401** systématique (« Mot de passe temporaire incorrect »)                                      |
| 5   | `app/api/settings/route.js:11,38`            | Appels à `getSettings()` / `updateSettings()` ; les méthodes réelles du service sont `getAppSettings()` / `setAppSettings()` (`lib/appSettingsService.js:80,84`) | **GET et PUT /api/settings → 500** (crash runtime)                                                                    |
| 6   | `models/Project.js:7`                        | `template_id` **requis**, aucun template en base (`GET /api/project-templates` → `[]`)                                                                           | **Impossible de créer un projet** (« projet vierge » documenté mais inutilisable)                                     |
| 7   | `tests/api/auth.test.js`                     | Les mocks simulaient `User.findOne().populate()` sans la chaîne `.select()` ; un mock référençait sa propre initialisation (ReferenceError)                      | 4 tests login échouaient                                                                                              |

### Correctifs appliqués en détail

- Retrait de l'appel `initializeProjectRoles()` hors-contexte projet dans le flux first-admin (les rôles projet se créent **par projet**).
- Rôle « Super Administrateur » fallback étendu à la matrice complète **23/23 permissions + 14/14 menus** (cohérent avec le README).
- Ajout de `.select('+password')` sur les `findOne` de `login` et `first-login-reset`.
- Correction des noms de méthodes `getAppSettings()` / `setAppSettings()` dans `app/api/settings/route.js`.
- `template_id` passé en **`default: null`** (optionnel) dans `models/Project.js`.
- Mocks Jest adaptés à la chaîne `.select().populate()`.

---

## 4. Vérifications fonctionnelles effectuées

### 4.1 Parcours d'initialisation (base vierge)

| Test                                 | Résultat                                         |
| ------------------------------------ | ------------------------------------------------ |
| `GET /`                              | 307 → `/welcome` ✓                               |
| Redis bonjour `/welcome`, `/login`   | 200 ✓                                            |
| `POST /api/auth/first-admin`         | **201** « Administrateur créé avec succès » ✓    |
| `POST /api/auth/login` (admin)       | **200**, rôle complet 23/23 ✓                    |
| `GET /api/auth/me`                   | 200, utilisateur + permissions ✓                 |
| `GET /api/projects` (admin)          | 200, voit tous les projets ✓                     |
| `POST /api/projects` (projet vierge) | **201** ✓ (après fix #6)                         |
| `POST /api/tasks` (admin)            | 201 ✓                                            |
| `POST /api/sprints` (admin)          | 201 ✓ (champs accentués `date_début`/`date_fin`) |
| `GET /api/settings` (admin & membre) | **200** ✓ (après fix #5)                         |

### 4.2 Contrôles d'authentification

| Test                               | Résultat                      |
| ---------------------------------- | ----------------------------- |
| API protégée **sans token**        | **401** « Non authentifié » ✓ |
| `/dashboard` sans cookie           | 307 → `/login` ✓              |
| `/dashboard` avec cookie admin     | 200 ✓                         |
| `GET /api/audit/actions` sans auth | 401 ✓                         |

### 4.3 Négation RBAC (contrôle négatif, rôle « Membre » restreint)

| Action membre            | Permissions système du rôle   | Résultat                                          |
| ------------------------ | ----------------------------- | ------------------------------------------------- |
| `GET /api/users`         | `gererUtilisateurs` requis    | **403** ✓                                         |
| `POST /api/roles`        | `adminConfig` requis          | **403** ✓                                         |
| `GET /api/audit/actions` | `voirAudit` requis (handler)  | **403** ✓                                         |
| `POST /api/tasks`        | `gererTaches` requis          | **403** ✓                                         |
| `POST /api/sprints`      | `gererSprints` requis         | **403** ✓                                         |
| `GET /api/projects`      | auth seule                    | 200 mais filtré (membre : uniquement les siens) ✓ |
| **`POST /api/projects`** | **aucune permission requise** | **200 — création réussie ✗ (faille)**             |
| `GET /api/sprints`       | **aucune permission/scoping** | **200 — données exposées ✗ (faille)**             |
| `GET /api/roles`         | **auth seule**                | **200 — matrice de permissions exposée ✗**        |

---

## 5. Qualité du code

| Commande                 | Résultat                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `npm run lint`           | **0 erreur** — 4 warnings préexistants (variables inutilisées, `prefer-const`)           |
| `npm run typecheck`      | **Pass**                                                                                 |
| `npm test`               | **458/458 tests, 32 suites** ✓                                                           |
| `tests/api/auth.test.js` | 5/5 ✓ (après fix #7)                                                                     |
| `npm run build`          | non exécuté (server dev actif ; builds `.next` existants) — à relancer avant déploiement |

---

## 6. Problèmes restants (non corrigés — à décider)

### CRITIQUE

1. **RBAC « 2 niveaux » inexistant en backend.** `withApiProtection` (`lib/withApiProtection.js:95`) n'évalue que `user.role_id.permissions` (rôle **système**). Le rôle **projet** n'est chargé que dans `app/api/tasks/[id]/route.js:62` (`getMergedPermissions`). Les helpers `canAccessProjectResource` (`lib/permissions.js:196`) et `getUserProjectRole` (`lib/services/projectService.js:153`) sont définis mais **zéro appel** env. Une permission système est donc suffisante pour agir sur n'importe quel projet, sans croisement avec le rôle projet du membre.

2. **`POST /api/projects` sans permission** (`app/api/projects/route.js:98`) : un membre avec `creerProjet:false` a créé un projet (**confirmé en direct**).

3. **`files/upload` sans permission ni contrôle d'appartenance** (`app/api/files/upload/route.js:12`) : tout utilisateur authentifié peut uploader sur n'importe quelle entité/projet.

4. **Sprints hors scoping projet** (`app/api/sprints/[id]/route.js` PUT/DELETE, `start`, `end`) : `gererSprints` (système) vérifié mais **aucun contrôle d'appartenance au projet** → un utilisateur avec la permission peut gérer les sprints de n'importe quel projet par ID.

### ÉLEVÉ

5. **IDOR lecture** : `GET /api/sprints` (liste, `:12`) et `GET /api/comments` (`:12`) accessibles à tout utilisateur authentifié, sans permission ni filtrage projet.

6. **`GET /api/roles`** (`app/api/roles/route.js:9`) exposé en auth seule → matrice de permissions visible par tous les comptes.

7. **Clés de permission inexistantes** : `gererProjets` (deliverables POST/PUT/DELETE) et `gererCommentaires` (`comments/[id]` DELETE) ne figurent pas dans `ALL_PERMISSIONS` (`lib/permissions.js:13`) → `evaluatePermissions` retourne toujours false → **seuls les admins passent**, permissions légitimes des PO/Chefs de projet cassées.

8. **Détection admin par nom de rôle** (`app/api/projects/route.js:27`, `includes('admin')`) au lieu de la permission `voirTousProjets`.

### MOYEN

9. **Les 10 rôles système prédéfinis** annoncés « créés automatiquement » (README) ne sont **pas seedés** : seul « Super Administrateur » existe ; les 9 autres rôles doivent être créés manuellement via l'admin, et aucun template de projet n'est pré-existant.

10. **`audit/*` sans rate limiting** : routes utilisant `authenticateRequest` manuel (pas `withApiProtection`) → `audit/export` peut sortir 10 000 lignes sans limite de débit.

11. **`GET /api/settings`** renvoie des données publiques sans auth (OK pour la finalité, mais à confirmer comme voulu).

---

## 7. Recommandations prioritaires

1. **Généraliser le niveau projet** : faire charger à `withApiProtection` le rôle projet (via `getUserProjectRole`) et évaluer `hasPermission`/`canAccessProjectResource` (système **AND** projet) comme documenté. À appliquer sur : sprints, tasks, deliverables, files, expenses, comments.
2. **`POST /api/projects`** → exiger `creerProjet` (`requiredPermissions`).
3. **`files/upload`** → exiger `gererFichiers` + appartenance au projet.
4. **Scoping projet** des GET sprints/comments + permission sur `GET /api/roles`.
5. **Remplacer/créer** `gererProjets` et `gererCommentaires` par des clés réelles de `ALL_PERMISSIONS` (ou les corriger au bon niveau).
6. **Seeding** des 10 rôles système + templates de projet (migration idempotente).
7. Harmoniser `audit/*` sous `withApiProtection` (rate limiting).

---

## 8. État des modifications

**Fichiers modifiés (non commités) :**

- `app/api/auth/first-admin/route.js`
- `app/api/auth/login/route.js`
- `app/api/auth/first-login-reset/route.js`
- `app/api/settings/route.js`
- `models/Project.js`
- `tests/api/auth.test.js`

**Artefacts de test :** `data/db` (MongoDB local), `data/mongodb.log`, `/tmp/opencode/cookies*.txt`, contrôles via curl (aucune modification du schéma).

**Prochaines étapes possibles :** commit des correctifs, ou traitement des points critiques §6 (scoping projet + permissions POST projets/upload).
