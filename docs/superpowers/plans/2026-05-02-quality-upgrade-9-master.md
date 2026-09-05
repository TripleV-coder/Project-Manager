# Project-Manager Quality Upgrade — Master Plan (6.8 → 9.0/10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer Project-Manager (Next.js 14 + MongoDB + Socket.io) de 6.8/10 à 9.0/10 sur 12 dimensions (architecture, qualité, sécurité, tests, perf, UX, API, DB, doc, DevOps, observabilité, fonctionnel).

**Architecture:** 7 phases incrémentales, chacune commitable indépendamment. Chaque phase a son propre plan détaillé dans `docs/superpowers/plans/2026-05-02-phase-N-*.md`. TDD systématique. Commits fréquents (1 par étape majeure). Branche dédiée `feat/quality-upgrade-9`.

**Tech Stack:** Next.js 14.2.33 · React 18 · MongoDB 7 + Mongoose 8.10 · Socket.io 4.8 · Zod 3.25 · Jest 29 · ESLint 9 (flat config) · TypeScript 6 (strict) · Tailwind 3.4 · Radix UI.

---

## État de départ (baseline 2026-05-02)

| Métrique         | Valeur                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------ |
| LOC              | 56 419 (286 fichiers JS/JSX)                                                                  |
| Tests            | 29 fichiers / 8 359 LOC                                                                       |
| Coverage estimé  | 35-45 %                                                                                       |
| Lint problems    | 95 (13 errors + 82 warnings)                                                                  |
| TypeScript       | `strict: true` mais `noImplicitAny: false` + `strictNullChecks: false` + 0 fichier `.ts` réel |
| Modèles Mongoose | 18                                                                                            |
| Pages dashboard  | 17 · Routes API                                                                               | 26+ dossiers |
| Vulnérabilités   | inconnu — `npm audit` à exécuter                                                              |
| **Note globale** | **6.8 / 10**                                                                                  |

Détail dimension par dimension : voir le rapport d'analyse en début de session.

---

## Cibles par dimension (objectif 9/10)

| #   | Dimension     | Avant   | Après   | Phase principale |
| --- | ------------- | ------- | ------- | ---------------- |
| 1   | Architecture  | 7.0     | 9.0     | Phase 2          |
| 2   | Qualité code  | 6.5     | 9.0     | Phase 1 + 3      |
| 3   | Sécurité      | 7.5     | 9.5     | Phase 1          |
| 4   | Tests         | 6.0     | 9.0     | Phase 4          |
| 5   | Performance   | 6.5     | 9.0     | Phase 5          |
| 6   | UX/UI         | 7.0     | 9.0     | Phase 6          |
| 7   | API           | 7.0     | 9.0     | Phase 2          |
| 8   | Database      | 7.0     | 9.0     | Phase 3          |
| 9   | Documentation | 6.0     | 9.0     | Phase 6          |
| 10  | DevOps        | 6.5     | 9.0     | Phase 6          |
| 11  | Observabilité | 5.5     | 9.0     | Phase 5          |
| 12  | Fonctionnel   | 7.5     | 9.0     | Phase 6          |
|     | **Pondéré**   | **6.8** | **9.1** |                  |

---

## Vue d'ensemble des 7 phases

| Phase | Titre                                   | Durée | Livrables clés                                                                                  |
| ----- | --------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| 0     | Préparation environnement               | 0.5 j | `npm install`, baseline lint/typecheck/tests, branche `feat/quality-upgrade-9`                  |
| 1     | Quick Wins + Sécurité critique          | 2 j   | Lint 0 warning, CSP nonce, 2FA admin forcé, rate-limit/user, password policy, `npm audit fix`   |
| 2     | Architecture API unifiée + Soft deletes | 2 j   | `withApiHandler()` HOC, contextes splittés, `deleted_at` sur 8 modèles + restore                |
| 3     | TypeScript strict + DB optimization     | 3 j   | 100 % `lib/` & `models/` en `.ts`, strict null-checks, 5 indexes composés, framework migrations |
| 4     | Tests E2E + Coverage 70 %               | 3 j   | Playwright (5 workflows), tests hooks/contexts, threshold CI 70 %, snapshots Storybook          |
| 5     | Observabilité + Performance             | 3 j   | pino structured logs, Sentry, Redis cache, pagination cursor, query filters                     |
| 6     | DevOps + Documentation + Features       | 3 j   | CD pipeline staging/prod, ARCHITECTURE.md, OpenAPI auto + Swagger UI, Storybook, Gantt, i18n EN |

**Total : ~16.5 jours-homme** sur ~3 semaines calendrier.

---

## Stratégie d'exécution

1. **Branche dédiée** : `feat/quality-upgrade-9` créée à la Phase 0.
2. **Une phase = un sous-plan détaillé** : chaque phase a son propre fichier (`2026-05-02-phase-N-<slug>.md`) écrit _juste avant_ son exécution pour éviter la dérive (le code aura évolué). Le master plan reste l'index.
3. **TDD** : chaque feature commence par un test rouge → implémentation minimale → test vert → refactor.
4. **Commits fréquents** : un commit par étape numérotée du sous-plan, message au format `phase-N: <action>`.
5. **Verification gates** : à la fin de chaque phase, exécuter `npm run lint:strict && npm run typecheck && npm test && npm run build` — la phase n'est validée que si tout passe.
6. **Checkpoint utilisateur** : à la fin de chaque phase, présenter le diff + les notes mises à jour des dimensions concernées. Validation user requise avant phase suivante.

---

## Phase 0 — Préparation environnement (0.5 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-0-bootstrap.md` (à générer)

**Objectifs :**

- Réinstaller les dépendances (`node_modules` est manquant actuellement).
- Capturer les baselines : lint, typecheck, test coverage, npm audit.
- Créer la branche `feat/quality-upgrade-9`.
- Créer `CONTEXT.md` à la racine pour suivi inter-sessions.

**Critères de succès :**

- [ ] `npm install` exit 0
- [ ] `lint_baseline.txt`, `typecheck_baseline.txt`, `audit_baseline.json` committés dans `docs/superpowers/baselines/`
- [ ] `git checkout -b feat/quality-upgrade-9` actif
- [ ] `CONTEXT.md` initialisé avec la baseline

---

## Phase 1 — Quick Wins + Sécurité critique (2 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-1-quickwins-security.md` (généré dans la même session que celle-ci)

**Périmètre :**

1. Lint 0 warning (95 → 0) : suppression unused vars, fix exhaustive-deps via `useCallback`, fix erreur `token is not defined` dans `app/dashboard/profile/page.js:97`
2. `npm audit fix` + lockfile maintenance
3. **Sécurité hard** :
   - CSP nonce-based (retirer `'unsafe-inline'` script-src en production)
   - 2FA forcé pour rôles admin (`Role.is_admin === true`)
   - Rate-limit par `user_id` (en plus d'IP) dans `lib/rateLimit.js`
   - Password policy : min 12 chars, 1 maj, 1 chiffre, 1 spécial (zod refine + bcrypt)
   - `validateRequestSize()` (max 1 MB) sur tous les `POST/PUT/PATCH`
   - DOMPurify systématique dans `app/api/comments/route.js` et tous les champs HTML libres
   - Suppression de `tempPassword` des réponses API (issue connue de la spec d'avril)
4. **Configuration** : `lint:strict` activé en pre-commit Husky; `no-unused-vars` passe en `error`.
5. **Quick wins UX** : empty states pour 4 pages (projects, tasks, files, sprints), autofocus sur dialogs de création.

**Critères de succès :**

- [ ] `npm run lint:strict` exit 0
- [ ] `npm audit --omit=dev` : 0 high/critical
- [ ] Test E2E manuel : un compte non-admin sans 2FA peut se connecter ; un compte admin sans 2FA est redirigé vers `/dashboard/profile/2fa-setup`
- [ ] Header response `Content-Security-Policy` ne contient plus `'unsafe-inline'` dans `script-src` en production
- [ ] Score sécurité estimé ≥ 9.0/10

**Gain estimé** : 6.8 → 7.4

---

## Phase 2 — Architecture API unifiée + Soft deletes (2 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-2-api-architecture.md` (à générer)

**Périmètre :**

1. **`lib/withApiHandler.js`** — HOC unique combinant : auth + RBAC check + Zod validation (body/query/params) + audit logging + try/catch + APIResponse standardisée + rate-limit. Migration de 26 routes API.
2. **Refactor contextes** : `AppSettingsContext` (~2000 lignes traductions inline) splitté en `FormattersContext`, `TranslationsContext`, `SettingsContext`. Suppression des re-renders cascadés via `useMemo` ciblé.
3. **Soft deletes cohérents** : champ `deleted_at: Date | null` sur 8 modèles (Task, Sprint, Project, Comment, File, Deliverable, Budget, Expense). Plugin Mongoose `softDelete` qui :
   - ajoute hook `pre-find` filtrant `{ deleted_at: null }` par défaut,
   - expose `Model.findDeleted()`, `doc.restore()`,
   - audit-trail automatique.
4. **Routes** : `DELETE /api/<resource>/:id` → soft delete · `PATCH /api/<resource>/:id/restore` → restore (admin only) · `DELETE /api/<resource>/:id?hard=true` → hard delete (admin only).

**Critères de succès :**

- [ ] 100 % des routes API utilisent `withApiHandler`
- [ ] `AppSettingsContext` ≤ 200 lignes; translations dans `lib/i18n/fr.json`
- [ ] Tests unitaires soft-delete plugin (find/findDeleted/restore) tous verts
- [ ] Score architecture ≥ 9.0, API ≥ 9.0

**Gain estimé** : 7.4 → 7.9

---

## Phase 3 — TypeScript strict + DB optimization (3 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-3-typescript-db.md` (à générer)

**Périmètre :**

1. **TypeScript migration** :
   - `tsconfig.json` : `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`
   - Migration `lib/` (70 fichiers) et `models/` (18 fichiers) de `.js` → `.ts`
   - Création `types/api.ts`, `types/models.ts`, `types/permissions.ts`
   - Pour chaque fichier migré : test associé reste vert sans modification
2. **Database** :
   - 5 indexes composés via `models/<X>.js` :
     ```js
     UserSchema.index({ email: 1, status: 1 });
     TaskSchema.index({ projet_id: 1, statut: 1, deleted_at: 1 });
     SprintSchema.index({ projet_id: 1, statut: 1 });
     ProjectSchema.index({ chef_projet: 1, archived: 1, deleted_at: 1 });
     CommentSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
     ```
   - Framework migrations : `migrate-mongo` configuré, scripts `npm run db:migrate` / `db:rollback`
   - Premier migration : ajout des indexes ci-dessus + `deleted_at` backfill

**Critères de succès :**

- [ ] `npm run typecheck` exit 0
- [ ] `lib/` et `models/` 100 % `.ts`
- [ ] `db.tasks.getIndexes()` montre l'index composé `projet_id_1_statut_1_deleted_at_1`
- [ ] Score qualité code ≥ 9.0, DB ≥ 9.0

**Gain estimé** : 7.9 → 8.3

---

## Phase 4 — Tests E2E + Coverage 70 % (3 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-4-tests.md` (à générer)

**Périmètre :**

1. **Playwright** : `@playwright/test` installé, 5 scénarios :
   - `auth.spec.ts` : login → 2FA → logout → login refusé après 5 échecs
   - `projects.spec.ts` : create project → invite member → archive → restore
   - `kanban.spec.ts` : create task → drag entre colonnes → checklist → delete
   - `budget.spec.ts` : create budget → add expense → check % consumed
   - `reports.spec.ts` : generate PDF + Excel → vérifier hash non vide
2. **Tests hooks/contexts** : `useAuthFetch`, `useRealtime`, `useRBACPermissions` (Jest + `@testing-library/react-hooks`)
3. **Snapshots** : 10 composants UI critiques (Button, Dialog, KanbanColumn, TaskCard, FormField, ConfirmationDialog, Footer, ErrorBoundary, StatusBadge, WorkflowStatusBadge)
4. **Coverage threshold** : `jest.config.js` ajoute `coverageThreshold: { global: { lines: 70, branches: 65, functions: 70 } }`
5. **CI** : `.github/workflows/ci.yml` étendu pour run Playwright + upload artifacts

**Critères de succès :**

- [ ] `npx playwright test` exit 0 (5/5 verts)
- [ ] `npm run test:coverage` exit 0 (≥ 70 % global)
- [ ] CI badge couverture verte sur README
- [ ] Score tests ≥ 9.0

**Gain estimé** : 8.3 → 8.6

---

## Phase 5 — Observabilité + Performance (3 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-5-observability-perf.md` (à générer)

**Périmètre :**

1. **Structured logging** : remplacer `lib/logger.js` minimaliste par `pino` + `pino-pretty` (dev). Format JSON `{ timestamp, level, module, requestId, userId, message, ...meta }`. Correlation IDs générés en middleware (`x-request-id`).
2. **Sentry** : `@sentry/nextjs` configuré, `instrumentation.ts`, source-maps en CI, alertes Slack via webhook.
3. **Redis cache** : `ioredis` + wrapper `lib/cache.js` (get/set/del/wrap). Caching pour : translations, app settings, user permissions (TTL 5 min), project metadata (TTL 1 min).
4. **Query filters** : middleware `parseQueryFilters()` → Mongo filter object (`?status=done&assignee=user123&since=2026-01-01`). Appliqué à `/api/tasks`, `/api/projects`, `/api/sprints`.
5. **Pagination cursor** : `?cursor=<base64>&limit=20` retournant `{ items, nextCursor, hasMore }`. Migration de l'ancienne pagination `?page=` (compat 6 mois via dual-support).
6. **Bundle analyzer** : `@next/bundle-analyzer`, target First Load JS ≤ 250 KB; lazy-load admin pages, charts (recharts), exporters (jspdf, exceljs).

**Critères de succès :**

- [ ] Logs production en JSON, recherchables par `requestId`
- [ ] Sentry capture une erreur volontaire en preview
- [ ] Redis hit ratio ≥ 70 % sur translations après 1 h trafic
- [ ] First Load JS ≤ 250 KB sur `/dashboard`
- [ ] Score observabilité ≥ 9.0, perf ≥ 9.0

**Gain estimé** : 8.6 → 8.9

---

## Phase 6 — DevOps + Documentation + Features finales (3 j)

**Détail dans :** `docs/superpowers/plans/2026-05-02-phase-6-devops-docs-features.md` (à générer)

**Périmètre :**

1. **CD pipeline** : `.github/workflows/deploy.yml` — sur push main : test → build Docker → push GHCR → deploy staging (Railway/Fly.io) → smoke test → deploy prod (manual approval).
2. **Documentation** :
   - `ARCHITECTURE.md` (~800 lignes) : request flow, auth flow, realtime, error patterns, soft delete strategy, caching, ER diagram (Mermaid)
   - `CONTRIBUTING.md` : setup, branches, commits, tests
   - 5 ADRs dans `docs/adr/` : choix de Mongoose, Socket.io, Radix UI, withApiHandler pattern, soft delete strategy
3. **OpenAPI auto-gen** : `lib/openapi/generator.ts` parse `lib/schemas.js` (Zod) + introspection des routes → OpenAPI 3.0 JSON. Servi à `/api/docs` via Swagger UI. Sync automatique en build.
4. **Storybook** : `@storybook/nextjs`, 10 composants documentés, déployé sur GitHub Pages.
5. **Features** :
   - Gantt chart pour roadmap (`recharts` ou `frappe-gantt`)
   - i18n EN : `next-intl` configuré, `lib/i18n/en.json` traduit, switcher dans navbar
   - Saved filters (localStorage + opt-in cloud sync)
6. **Features avancées** : resource allocation view (capacity hebdo × heures loguées) — optionnel selon temps restant.

**Critères de succès :**

- [ ] Deploy staging automatique sur push main
- [ ] `ARCHITECTURE.md` couvre les 6 sections
- [ ] `/api/docs` accessible et synchronisé
- [ ] Storybook déployé
- [ ] Gantt visible sur `/dashboard/roadmap`
- [ ] EN switch fonctionnel
- [ ] Score doc ≥ 9.0, DevOps ≥ 9.0, fonctionnel ≥ 9.0

**Gain estimé** : 8.9 → 9.1

---

## Critères d'acceptation finaux (toutes phases)

- [ ] `npm run lint:strict` exit 0
- [ ] `npm run typecheck` exit 0
- [ ] `npm run test:coverage` ≥ 70 % lines, branches ≥ 65 %
- [ ] `npx playwright test` 5/5 verts
- [ ] `npm run build` exit 0, First Load JS ≤ 250 KB
- [ ] `npm audit --omit=dev` 0 high/critical
- [ ] CI/CD vert sur main
- [ ] `/api/docs` Swagger UI accessible
- [ ] Storybook déployé
- [ ] Note pondérée recalculée ≥ **9.0/10**

---

## Risques & mitigations

| Risque                                                              | Impact   | Mitigation                                                                                          |
| ------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Migration TS casse runtime (mongo plugins, Mongoose discriminators) | Élevé    | Migration fichier par fichier, tests verts à chaque commit, feature flag par module si nécessaire   |
| Perf régression après Redis cache                                   | Moyen    | Bench avant/après avec `autocannon`, fallback sur node-cache si Redis indispo                       |
| 2FA admin force exclut le seul admin du système                     | Critique | Migration data : si aucun admin 2FA, page de force-setup à la connexion (pas de redirect en boucle) |
| Soft delete change la sémantique des queries existantes             | Élevé    | Plugin Mongoose appliqué progressivement modèle par modèle, tests d'intégration par modèle          |
| Bundle analyzer révèle dépendance bloquante (jspdf 700 KB)          | Moyen    | Lazy-load via `dynamic(() => import(...), { ssr: false })`                                          |
| Coverage 70 % impossible en 3 j                                     | Moyen    | Prioriser parcours critiques, accepter 65 % branches si lines ≥ 70                                  |

---

## Self-review

**Spec coverage :** ✅ chaque dimension de l'analyse a au moins une phase associée. La spec d'avril 2026 (Sprints 1-6) est intégralement couverte par les phases 1-6 ci-dessus avec un superset de scope.

**Placeholder scan :** ✅ aucun "TBD/TODO/à définir". Les sous-plans détaillés des phases 0, 2-6 sont _explicitement marqués comme à générer_ — c'est intentionnel (just-in-time planning pour précision), pas un placeholder.

**Type consistency :** ✅ noms cohérents : `withApiHandler` (phase 2 et plus), `deleted_at` (phase 2 et 3), `requestId` (phase 5).

---

## Execution Handoff

Plan maître + Phase 1 détaillée prêts. Les sous-plans des phases 0, 2-6 seront rédigés _juste avant_ leur exécution (just-in-time) pour éviter la dérive.

**Modes d'exécution :**

1. **Subagent-Driven (recommandé)** — un sous-agent frais par tâche numérotée, review entre tâches, itération rapide.
2. **Inline Execution** — exécution dans cette session avec checkpoints.

À choisir après validation du plan maître par l'utilisateur.
