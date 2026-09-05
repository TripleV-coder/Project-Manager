# Project-Manager — Roadmap "Aller à 9/10"

**Date:** 2026-05-03
**Version cible:** v1.2.0 → v1.3.0
**Score actuel:** 6,8/10 (moyenne pondérée 12 dimensions)
**Score cible:** ≥ 9/10 sur chaque dimension critique

---

## 1. Audit baseline (résumé)

| #   | Dimension                 | Actuel | Cible | Δ    |
| --- | ------------------------- | ------ | ----- | ---- |
| 1   | Architecture & modularité | 7,1    | 9,0   | +1,9 |
| 2   | Sécurité                  | 6,5    | 9,5   | +3,0 |
| 3   | Qualité de code           | 4,4    | 9,0   | +4,6 |
| 4   | Tests & QA                | 4,5    | 9,0   | +4,5 |
| 5   | Features fonctionnelles   | 7,5    | 9,0   | +1,5 |
| 6   | UX / Design               | 7,0    | 9,0   | +2,0 |
| 7   | Performance               | 6,0    | 9,0   | +3,0 |
| 8   | Documentation             | 5,5    | 9,0   | +3,5 |
| 9   | Accessibilité             | 4,0    | 9,0   | +5,0 |
| 10  | Observabilité             | 5,0    | 9,0   | +4,0 |
| 11  | Scalabilité               | 5,5    | 9,0   | +3,5 |
| 12  | DevOps / Build            | 7,0    | 9,0   | +2,0 |

**Codebase:** ~51 500 LOC · 338 fichiers · 50 routes API · 25 pages dashboard · 19 modèles Mongoose.

---

## 2. Principes directeurs

1. **Zero regression** : aucun déploiement ne casse une feature existante (suite E2E avant chaque merge majeur).
2. **Incremental** : par lots de 2-5 jours max, mergeable indépendamment.
3. **TDD pour tout nouveau code** ; rétro-tests sur le legacy refactoré uniquement.
4. **Pas de big-bang TS** : migration progressive `lib/` → `app/api/` → `hooks/contexts/` → `components/` → `app/dashboard/`.
5. **YAGNI** : pas d'intégrations 3rd-party (Slack/Teams/GitHub) tant que le core n'est pas à 9.
6. **Mesure avant/après** : chaque sprint a une métrique objective (coverage %, Lighthouse, axe violations, p95 latency).

---

## 3. Architecture cible

### 3.1 Couches

```
[ Pages dashboard (UI orchestration) ]
        ↓ feature components (Sprint*, Project*, Kanban*)
        ↓ shared UI (components/ui/* shadcn)
[ Stores Zustand (UI state) + Hooks (data + actions) ]
        ↓ API client (lib/api-client.ts, typed)
─────────────────────── HTTP ───────────────────────
[ Route handlers (app/api/**/route.ts) ]
        ↓ service layer (lib/services/*.ts)
        ↓ repository (lib/repositories/*.ts) ← NOUVEAU
[ Mongoose models ] [ Cache (Redis) ] [ External: SP, SMTP, Push ]
```

### 3.2 Nouveaux modules

- `lib/repositories/` : isole les requêtes Mongo des services (testabilité ++).
- `lib/observability/` : `logger.ts` (Pino), `metrics.ts` (compteurs OpenTelemetry-ready), `tracing.ts`.
- `lib/security/secrets.ts` : chiffrement AES-GCM des secrets stockés (SharePoint client_secret).
- `lib/auth/refresh.ts` : access (15 min) + refresh (7 j rotatifs).
- `lib/queue/` : adaptateur BullMQ pour email + push async (Redis backend).
- `stores/` : Zustand par domaine (`useProjectStore`, `useSprintStore`, `useUiStore`).

### 3.3 Décomposition god-pages (4 pages > 1 000 LOC)

| Fichier                                 | LOC   | Cible                                                                                                                                                                        |
| --------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/dashboard/projects/[id]/page.js`   | 1 890 | < 250 LOC, extraction en 8 composants : `ProjectHeader`, `ProjectTabs`, `ProjectOverview`, `MembersPanel`, `DeliverablesPanel`, `BudgetPanel`, `FilesPanel`, `SettingsPanel` |
| `app/dashboard/sprints/page.js`         | 1 498 | < 300 LOC, `SprintList`, `SprintBoard`, `SprintMetrics`, `SprintForm`                                                                                                        |
| `app/dashboard/reports/page.js`         | 1 040 | < 300 LOC, `ReportFilters`, `ReportTable`, `ReportExportMenu` + service export séparé                                                                                        |
| `app/dashboard/admin/templates/page.js` | 1 031 | < 300 LOC, `TemplateList`, `TemplateBuilder`, `WorkflowStepEditor`                                                                                                           |

---

## 4. Roadmap détaillée — 8 sprints

### Sprint 0 — Préparation & quick wins (3 j)

**Objectif:** débloquer le terrain, fix lint, baseline metrics.

**Livrables:**

- Fix les 13 erreurs ESLint (duplicate keys, `token`/`Loader2` undefined, parsing JSX) : **2 h**.
- Retirer `.env` du suivi git (`git rm --cached .env`), rotation immédiate `JWT_SECRET` + `SOCKET_EMIT_SECRET` (32 bytes random) : **1 h**.
- Ajouter `.env*` à `.gitignore` (vérifier), créer `.env.example` complet et documenté : **1 h**.
- Ajouter `npm audit --production` au pipeline + corriger findings high/critical : **2 h**.
- Activer `coverage` dans Jest (vérifier `lcov.info` non vide), corriger config si elle ne reporte rien : **3 h**.
- Ajouter Lighthouse CI baseline : **2 h**.
- Créer `docs/ARCHITECTURE.md` (squelette) et `CONTEXT.md` (sessions Claude) : **2 h**.

**Critères de sortie:** `npm run lint:strict` passe, `npm run test:coverage` produit un rapport non-vide, `.env` rotaté.

---

### Sprint 1 — Sécurité (3,5 j)

**Objectif:** sécurité 6,5 → 9,5.

**Livrables:**

- **Refresh tokens** : access JWT 15 min + refresh JWT 7 j en HttpOnly cookie séparé, rotation à chaque refresh, blacklist via `tokenVersion`. Routes `/api/auth/refresh` et `/api/auth/logout` invalident le couple.
- **Chiffrement secrets en DB** : `lib/security/secrets.ts` (AES-256-GCM, master key en env), migration `SharePointConfig.client_secret` → `client_secret_encrypted` + IV.
- **Permissions AND vs OR** : revoir `lib/withApiProtection.js` ligne 61 ; introduire `requireAll: boolean` (défaut `true`). Audit chaque appel.
- **CSP strict en production** : nonce-based pour scripts inline (Next.js middleware), retrait `unsafe-inline`/`unsafe-eval` en prod.
- **CORS strict** : rejet si `ALLOWED_ORIGINS` vide ou origin non whitelistée.
- **User enumeration** : login route renvoie message générique unique (pas de détection user-existant) + délai constant via `crypto.timingSafeEqual`.
- **Anomaly alerting** : 5+ failed logins → notif admin (email + dashboard) ; log critical dans audit.
- **Tests sécurité** : suite OWASP (Top 10) avec `app/api/__tests__/security.test.ts` (CSRF, IDOR, injection, XSS, auth bypass, RBAC matrix).

**Validation:**

- `npm audit --production` : 0 high/critical.
- Tests OWASP couverts ≥ 80 %.
- ZAP baseline scan sans alerte high.

---

### Sprint 2 — Qualité de code & TypeScript (5 j)

**Objectif:** qualité 4,4 → 9,0.

**Livrables:**

- **Activer `strict: true`, `strictNullChecks: true`, `noImplicitAny: true`** dans `tsconfig.json`.
- **Migration TS progressive** : `lib/auth/`, `lib/security/`, `lib/services/`, `lib/repositories/` → `.ts`. Cible: 50 % du codebase en `.ts` à fin sprint.
- **Centraliser** : helpers `lib/api-helpers.ts` (extractApiData, formatDate, etc.).
- **Standardiser réponses API** : `ApiResponse<T>` typé, codes erreur enum.
- **Logger structuré** : remplacer `console.log/error` par `lib/observability/logger.ts` (Pino, niveaux, contextes).
- **Husky strict** : `lint-staged` rejette si lint warnings ; CI échoue si `lint:strict` non-zero.
- **Fix 82 warnings ESLint** (exhaustive-deps, unused vars).
- **JSDoc** sur tous les exports `lib/**`, `hooks/**`, `contexts/**`.

**Validation:**

- `tsc --noEmit` : 0 erreur.
- `eslint . --max-warnings=0` : passe.
- 50 % LOC en `.ts`/`.tsx`.

---

### Sprint 3 — Architecture & refactoring god-pages (5 j)

**Objectif:** architecture 7,1 → 9,0.

**Livrables:**

- **Décomposer 4 god-pages** (voir 3.3) : extraction composants + Zustand stores par domaine.
- **Pattern Repository** : `lib/repositories/{ProjectRepo,TaskRepo,SprintRepo,UserRepo}.ts`, services consomment uniquement les repos.
- **Fusionner `authCookie.js` + `requestAuth.js`** en `lib/auth/index.ts` unifié.
- **Extraire `lib/workflows.js` (756 LOC)** par entité : `workflows/task.ts`, `workflows/sprint.ts`, `workflows/deliverable.ts` + state machines XState (optionnel) ou pattern simple.
- **Sidebar (655 LOC)** : extraire `useMenuVisibility` hook + `MenuItem` component.
- **`ItemFormFields.jsx` (390 LOC switch)** : refacto avec map `<type, Component>` (registry).

**Validation:**

- 0 fichier > 500 LOC dans `app/dashboard/**`.
- Coverage des composants extraits ≥ 70 %.
- Aucune régression UI (E2E sprint 6).

---

### Sprint 4 — Tests & QA (5 j)

**Objectif:** tests 4,5 → 9,0.

**Livrables:**

- **Coverage cible** : `lib/` ≥ 85 %, `app/api/` ≥ 80 %, `components/` ≥ 70 %, `hooks/` ≥ 80 %.
- **React Testing Library** : tests pour `KanbanColumn`, `TaskCard`, `TaskStatusWorkflow`, `ItemFormDialog`, `TwoFactorSetup`, `ConfirmationDialog`, sidebar.
- **MSW (Mock Service Worker)** : tests intégration sans tape les vraies APIs.
- **MongoDB Memory Server** : tests intégration repos sans Docker.
- **Playwright E2E** : 5 parcours critiques :
  1. Login + 2FA setup
  2. Créer projet → ajouter tâche → drag kanban → start/end sprint
  3. Upload fichier → commenter → notification reçue
  4. Admin : créer rôle, assigner perm, vérifier accès
  5. Export rapport PDF + Excel
- **Tests visuels** : Storybook + Chromatic (ou Playwright snapshots) pour `components/ui/`.
- **Tests contract** : OpenAPI → Dredd ou Schemathesis sur `docs/openapi.yaml`.

**Validation:**

- `npm run test:ci` produit coverage global ≥ 80 %.
- 5 E2E verts en CI.
- 0 test flaky sur 10 runs consécutifs.

---

### Sprint 5 — Performance & scalabilité (4 j)

**Objectif:** perf 6,0 → 9,0 ; scalabilité 5,5 → 9,0.

**Livrables:**

- **Pagination universelle** : tous les `GET /api/<resource>` listant : `?page`, `?limit` (défaut 50, max 200), retour `{data, meta:{total, page, totalPages}}`. Mongoose `.lean().limit().skip()` ou cursor-based pour l'audit.
- **Redis** : remplacer `node-cache` (lib/cache.js) et `lib/rateLimit.js` par adaptateur `ioredis`. Fallback in-memory en dev.
- **BullMQ queue** : `emailService.send()` push job → worker async (sortie du request handler).
- **Indexes Mongo** : audit avec `mongoOptimize.js`, ajouter compound indexes manquants (Task: `{projet_id, sprint_id, status}`, AuditLog: `{utilisateur, timestamp}` desc).
- **React** : `dynamic()` imports pour `reports`, `roadmap`, `admin/templates`, `charts/*`. `React.memo` sur `TaskCard`, `KanbanColumn`. `useMemo` sur calcul permissions mergées.
- **Next.js** : activer `next/image` partout, virtualisation des longues listes (`@tanstack/react-virtual` sur audit log + tâches).
- **Bundle analyzer** : `@next/bundle-analyzer`, cible bundle initial < 250 KB gzip.
- **Lighthouse CI** : performance ≥ 90, perf budget en CI.

**Validation:**

- p95 API < 200 ms (mesuré via observability).
- Lighthouse perf ≥ 90 sur 3 pages clés (dashboard, kanban, projects).
- Bundle initial ≤ 250 KB gzip.
- App déployable en 2+ instances (cache + rate limit cohérents).

---

### Sprint 6 — Accessibilité & UX (4 j)

**Objectif:** a11y 4,0 → 9,0 ; UX 7,0 → 9,0.

**Livrables:**

- **Audit axe-core** : `npm install -D @axe-core/react`, intégration dev + CI (jest-axe sur composants).
- **Cible** : 0 violation `serious`/`critical` ; ≤ 5 `moderate`.
- **Aria + sémantique** : audit pages critiques (login, dashboard, kanban, projet), ajouter labels manquants, gestion focus modals (Radix le fait, vérifier wrappers custom), skip links, landmarks.
- **Contraste** : audit WCAG AA sur thème sombre + clair (variables Tailwind), corriger tokens defaillants.
- **Skeletons** : recréer `components/ui/Skeleton.jsx` (supprimé) + remplacer spinners génériques sur 8 pages.
- **Cmd+K (`cmdk` est déjà installé !)** : `components/CommandPalette.tsx`, recherche cross-resource (projets, tâches, users, pages), keyboard nav.
- **Empty states** illustrés (icône + CTA) sur 10 pages.
- **Mobile-first** : tables → cards stackées en < 768 px, sidebar drawer mobile.
- **Toast unifié** (sonner) avec types success/error/warning/info.

**Validation:**

- `jest-axe` 0 violation sur 100 % composants.
- Lighthouse a11y ≥ 95 sur 5 pages.
- Test manuel clavier sur 3 parcours critiques.

---

### Sprint 7 — Observabilité & DevOps (3 j)

**Objectif:** observabilité 5,0 → 9,0 ; DevOps 7,0 → 9,0.

**Livrables:**

- **Logging** : Pino structuré JSON, request ID propagé (déjà partiellement), niveaux par env.
- **Metrics** : `prom-client`, endpoint `/api/metrics` (admin only), métriques HTTP (durée, status), DB (queries count), business (logins, tasks créées).
- **Traces** : OpenTelemetry SDK, exporter OTLP (Jaeger/Tempo en local via docker-compose).
- **Sentry** (ou alternative) : capture erreurs front + back, source maps en prod.
- **Healthcheck enrichi** : `/api/health` retourne status DB, Redis, SMTP, queue.
- **CI GitHub Actions** :
  - Job lint + typecheck + tests + coverage.
  - Job build (next build) + bundle analyzer comment.
  - Job e2e Playwright (containerized).
  - Job Lighthouse CI.
  - Job ZAP baseline (sécurité).
- **Docker prod-ready** : multi-stage, distroless, SIGTERM handling, healthcheck dans `docker-compose.yml`.
- **Migration MongoDB versionnée** : système de migration dans `scripts/migrations/` (idempotent, rollback).

**Validation:**

- CI complète verte sur PR template.
- Sentry capte une erreur de test depuis prod build.
- Dashboard Grafana basique connecté aux métriques (optionnel mais bonus).

---

### Sprint 8 — Documentation & polish features (3 j)

**Objectif:** doc 5,5 → 9,0 ; features 7,5 → 9,0.

**Livrables:**

- **Split README** :
  - `README.md` (≤ 200 lignes : pitch, install, scripts, liens).
  - `docs/ARCHITECTURE.md` (couches, decisions, ADR).
  - `docs/SECURITY.md` (RBAC, threats, secrets).
  - `docs/DEPLOYMENT.md` (Docker, env, CI/CD).
  - `docs/CONTRIBUTING.md` (TDD, lint, commits).
  - `docs/API.md` (lien openapi + exemples).
  - `docs/adr/` (Architecture Decision Records, format Nygard).
- **OpenAPI** : à jour, généré + validé en CI (`spectral lint`).
- **JSDoc/TSDoc** : tous les exports publics annotés ; `typedoc` build pour `docs/api/`.
- **Storybook** déployé statiquement (Chromatic ou GH Pages).
- **Polish features** :
  - Email automation : trigger sur `task.assigned`, `task.overdue`, `comment.mention` (templates dans `lib/services/emailService.ts`).
  - Saved filters (tasks/audit) en localStorage scoped par user.
  - Calendrier view (`react-big-calendar` ou custom) sur deadline tasks/sprints.
  - i18n : passer à `next-intl` (vrai standard), extraire les clés du `AppSettingsContext` monolithe.

**Validation:**

- Doc complète accessible, table des matières claire.
- `spectral lint docs/openapi.yaml` passe.
- 100 % exports publics ont JSDoc/TSDoc.

---

## 5. Quality gates & métriques continues

Ces seuils sont enforced en CI. Aucun PR ne merge en `main` s'ils sont violés.

| Gate            | Seuil                        | Outil                     |
| --------------- | ---------------------------- | ------------------------- |
| Lint warnings   | 0                            | `eslint --max-warnings=0` |
| TypeScript      | 0 erreur                     | `tsc --noEmit`            |
| Tests coverage  | ≥ 80 % global, ≥ 85 % `lib/` | Jest                      |
| E2E             | 5/5 verts                    | Playwright                |
| Bundle initial  | ≤ 250 KB gzip                | bundle-analyzer           |
| Lighthouse perf | ≥ 90                         | Lighthouse CI             |
| Lighthouse a11y | ≥ 95                         | Lighthouse CI             |
| axe violations  | 0 critical/serious           | jest-axe                  |
| Security audit  | 0 high/critical              | `npm audit` + ZAP         |
| OpenAPI lint    | 0 erreur                     | `spectral lint`           |

---

## 6. Risques & mitigations

| Risque                                  | Probabilité | Impact            | Mitigation                                                         |
| --------------------------------------- | ----------- | ----------------- | ------------------------------------------------------------------ |
| Régression UI lors du refacto god-pages | Élevée      | Élevé             | E2E avant Sprint 3, rollback plan, feature flags                   |
| Migration TS casse build                | Moyenne     | Moyen             | Migration fichier par fichier, `// @ts-check` d'abord              |
| Refresh token break clients existants   | Moyenne     | Élevé             | Migration douce : ancien JWT toléré 7 j, double-cookie             |
| Redis indispo en prod                   | Faible      | Élevé             | Fallback in-memory + alerte ; healthcheck bloque deploy si indispo |
| Coverage 0% bug Jest                    | Inconnue    | Bloquant Sprint 4 | Sprint 0 fix la collection coverage avant tout                     |
| TS strict révèle bugs cachés            | Élevée      | Moyen             | Acceptable : ce sont des bugs réels à fixer                        |

---

## 7. Estimation & planning

**Total:** 35,5 jours-homme (≈ 7-8 sprints d'1 semaine pour 1 dev senior, ou 3-4 sprints pour 2 devs).

| Sprint                     | Durée | Score visé après |
| -------------------------- | ----- | ---------------- |
| 0 — Prép & quick wins      | 3 j   | 7,2              |
| 1 — Sécurité               | 3,5 j | 7,7              |
| 2 — Qualité & TS           | 5 j   | 8,0              |
| 3 — Architecture           | 5 j   | 8,3              |
| 4 — Tests                  | 5 j   | 8,6              |
| 5 — Perf & scale           | 4 j   | 8,8              |
| 6 — A11y & UX              | 4 j   | 9,0              |
| 7 — Observabilité & DevOps | 3 j   | 9,1              |
| 8 — Docs & polish features | 3 j   | 9,2              |

---

## 8. Ordre d'exécution recommandé

```
Sprint 0 (debloquant)
   ↓
Sprint 1 (sécurité — risques critiques d'abord)
   ↓
Sprint 2 (qualité + TS — fondation pour tout le reste)
   ↓
Sprint 4 (tests AVANT refacto — filet de sécurité)
   ↓
Sprint 3 (refacto architecture — protégé par les tests)
   ↓
Sprint 5 (perf — quand le code est propre)
   ↓
Sprint 6 (a11y/UX — finition utilisateur)
   ↓
Sprint 7 (observabilité — production-ready)
   ↓
Sprint 8 (documentation — quand tout est stable)
```

**Note:** ce design intervertit Sprint 3 et 4 par rapport à la numérotation, car les tests doivent précéder le refacto pour servir de filet.

---

## 9. Out of scope (explicitement)

- Intégrations 3rd-party (Slack, Teams, GitHub, Jira) → reportées v2.0.
- App mobile native (iOS/Android) → PWA suffit pour 9/10.
- Multi-tenancy / multi-workspace → non requis (interne).
- Migration vers un autre framework (Remix, Astro) → non.
- IA / suggestions automatiques de tâches → reporté.
- Vue Gantt avancée (drag dépendances, critical path) → roadmap timeline existante suffit pour 9.

---

## 10. Suite

1. Validation utilisateur sur ce design.
2. Création des tâches détaillées (1 plan d'implémentation par sprint via `superpowers:writing-plans`).
3. Démarrage Sprint 0 immédiatement après validation.
