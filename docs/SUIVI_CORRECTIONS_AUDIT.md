# Suivi des corrections — Audit RBAC, lancement & tests

**Date** : 29 août 2026  
**Source** : `docs/RAPPORT_AUDIT_TEST.md`  
**Statut** : corrections d’audit appliquées, tests de non-régression ajoutés, suite locale verte.

---

## 1. Ce qui a été vérifié dans le code (constats du rapport)

Les points **critiques et élevés** du rapport étaient **réels** avant correction :

| #   | Constat du rapport                                        | Vérifié ?                                                                                |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| C1  | RBAC 2 niveaux (système + projet) non appliqué en backend | Oui — `withApiProtection` ne lit que le rôle système ; le rôle projet n’était pas croisé |
| C2  | `POST /api/projects` sans `creerProjet`                   | Oui                                                                                      |
| C3  | `files/upload` sans permission ni appartenance            | Oui                                                                                      |
| C4  | Sprints mutables hors scope projet (y compris start/end)  | Oui — start/end n’avaient qu’une permission système                                      |
| E5  | IDOR lecture `GET /api/sprints` et `GET /api/comments`    | Oui                                                                                      |
| E6  | `GET /api/roles` exposé à tout compte authentifié         | Oui                                                                                      |
| E7  | Clés fantômes `gererProjets` / `gererCommentaires`        | Oui — absentes de `ALL_PERMISSIONS`                                                      |
| E8  | Détection admin par `includes('admin')`                   | Oui                                                                                      |
| M9  | 10 rôles système + templates non seedés                   | Oui — seul Super Admin existait au bootstrap                                             |
| M10 | `audit/*` hors `withApiProtection` (pas de rate limit)    | Oui                                                                                      |
| M11 | `GET /api/settings` public                                | Oui — **volontaire** (`requireAuth: false`, settings publiques uniquement)               |

Les 7 bugs bloquants du rapport (first-admin, login password, settings, `template_id`, mocks Jest) étaient déjà corrigés dans le working tree.

---

## 2. Ce qui a été corrigé

### Helpers centraux

- **`lib/projectAccess.js`** — résolution du projet d’une entité, appartenance, fusion **système AND projet**, liste des projets accessibles.
- **`lib/systemSeed.js`** — seeder idempotent des **10 rôles système** + 2 templates projet.
- Rôles projet prédéfinis créés à la **création d’un projet** via `initializeProjectRoles(project._id)` (plus jamais au first-admin sans `project_id`).

### Règle RBAC retenue

1. `adminConfig` → accès global.
2. Sinon : permission **système** requise **et** appartenance au projet.
3. Chef / PO / créateur : la permission système suffit sur **leur** projet.
4. Membre : le **rôle projet** assigné doit aussi autoriser l’action. Sans `project_role_id` → mutation refusée.

`withApiProtection` reste le garde-fou **système** (auth, rate limit, permission). Le niveau projet est appliqué **dans la route**, parce que le wrapper n’a pas le `projectId`.

### Routes protégées

| Zone                                             | Correction                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `POST /api/projects`                             | `requiredPermissions: ['creerProjet', 'adminConfig']` + init rôles projet                               |
| `GET /api/projects`                              | Filtre par `isGlobalProjectReader` (`adminConfig` / `voirTousProjets`), plus de test sur le nom de rôle |
| `GET/PUT/DELETE /api/projects/:id`               | `canAccessProject` / `canUseProjectPermission` (`modifierCharteProjet`, `supprimerProjet`)              |
| `GET /api/roles`                                 | `adminConfig`                                                                                           |
| Sprints liste / CRUD / **start** / **end**       | Scope projet + `gererSprints` projet + `withApiProtection`                                              |
| `files/upload`                                   | `gererFichiers` + appartenance + `projet_id` persisté                                                   |
| `GET /api/files`                                 | Filtre entités / projets accessibles                                                                    |
| Commentaires GET/POST/[id]                       | Scope entité → projet ; clé réelle `commenter`                                                          |
| Tâches, livrables, dépenses                      | Mutations projet + listes filtrées (y compris `product_owner`)                                          |
| Timesheets                                       | `saisirTemps` au niveau projet ; GET filtré par projets accessibles ; champ schéma `utilisateur`        |
| `audit/*` (y compris GET `/api/audit` et export) | `withApiProtection` + `voirAudit` + preset `sensitive`                                                  |
| First-admin                                      | `ensurePredefinedSystemRoles` + `ensureDefaultProjectTemplates`                                         |
| Templates GET                                    | Re-seed idempotent si la base existait déjà sans templates                                              |

### Tests ajoutés / ajustés

- `tests/lib/projectAccess.test.js` — appartenance, AND système/projet, IDOR outsider, résolution d’entité
- `tests/lib/systemSeed.test.js` — 10 rôles, 23 permissions Super Admin, templates
- `tests/security/rbac-audit.test.js` — filets anti-régression sur les routes citées par l’audit
- `tests/integration/projects.test.js` — `creerProjet` requis (403 sans permission)
- `tests/integration/tasks.test.js` — mock d’appartenance projet pour `canUseProjectPermission`

### Validation locale (29 août 2026)

| Commande            | Résultat                           |
| ------------------- | ---------------------------------- |
| `npm run lint`      | 0 erreur (4 warnings préexistants) |
| `npm run typecheck` | OK                                 |
| `npm test`          | **492/492** (35 suites)            |

---

## 3. Ce qui reste / à vérifier

Ces points **ne bloquent pas** les failles de l’audit, mais doivent être revus avant production.

| Point                                                    | Pourquoi                                                                                     | Action recommandée                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exécution runtime (curl / navigateur)**                | Les tests Jest mockent Mongoose ; ils ne rejouent pas le scénario admin vs membre du rapport | Relancer le parcours §4 du rapport : membre `creerProjet:false` → POST projet **403** ; GET sprints d’un autre projet **vide/403** ; upload hors projet **403** |
| **`npm run build`**                                      | Non exécuté dans l’audit d’origine (dev server actif)                                        | Lancer un build avant déploiement                                                                                                                               |
| **Membres sans `project_role_id`**                       | Ils peuvent **lire** (appartenance) mais plus **muter**                                      | À la nomination d’un membre, toujours assigner un rôle projet                                                                                                   |
| **Timesheets modèle vs API**                             | Le schéma utilise `utilisateur` / `brouillon` ; l’API écrivait `user_id` / `Brouillon`       | Corrigé sur create/list ; vérifier les documents déjà en base                                                                                                   |
| **GET `/api/settings` public**                           | Confirmé volontaire                                                                          | Conserver tel quel, ou authentifier si un jour des settings sensibles y sont ajoutés                                                                            |
| **`project-templates` GET**                              | Auth manuelle, pas `withApiProtection`                                                       | Harmoniser plus tard (rate limit)                                                                                                                               |
| **Autres routes encore en `authenticateRequest` manuel** | push, notifications/read-all, activity, reset-password                                       | Hors périmètre audit ; même passe rate-limit possible                                                                                                           |
| **IDOR résiduel possible**                               | Toute route non passée (ex. fichiers par ID direct s’il existe un GET `files/:id`)           | Grep des `findById` API sans `canAccessProject`                                                                                                                 |
| **Commit git**                                           | Toujours **aucun commit** demandé                                                            | Commit ciblé RBAC + tests + ce document, **sans** `data/db`, cookies, secrets                                                                                   |
| **Seed sur base déjà peuplée**                           | `ensurePredefinedSystemRoles` **met à jour** les 10 rôles prédéfinis                         | Vérifier qu’aucun rôle custom n’a le même `nom` ; les rôles custom (`is_custom: true`) ne sont pas écrasés s’ils ont un autre nom                               |

---

## 4. Comment retester manuellement (checklist)

Compte **membre restreint** (`creerProjet:false`, `gererSprints:false`, hors projet B) :

1. `POST /api/projects` → **403**
2. `GET /api/sprints` → uniquement les sprints des projets dont il est membre
3. `PUT /api/sprints/:id/start` d’un projet étranger → **403**
4. `POST /api/files/upload` sur une entité d’un autre projet → **403**
5. `GET /api/comments` sans filtre → pas de commentaires hors projets
6. `GET /api/roles` → **403**
7. `GET /api/audit/export` → **403**

Compte **admin** / chef du projet :

8. Création projet → 201 + 8 rôles projet en base
9. First-admin sur DB vierge → 10 rôles système + templates
10. Upload / sprint / commentaire sur **son** projet → 2xx

---

## 5. Fichiers clés

- `lib/projectAccess.js`
- `lib/systemSeed.js`
- `lib/projectRoleInit.js`
- `app/api/projects/route.js`, `app/api/projects/[id]/route.js`
- `app/api/sprints/**`
- `app/api/files/upload/route.js`, `app/api/files/route.js`
- `app/api/comments/**`
- `app/api/tasks/**`, `app/api/deliverables/**`, `app/api/expenses/**`, `app/api/timesheets/**`
- `app/api/audit/**`, `app/api/roles/route.js`
- `app/api/auth/first-admin/route.js`
- `tests/lib/projectAccess.test.js`, `tests/lib/systemSeed.test.js`, `tests/security/rbac-audit.test.js`
