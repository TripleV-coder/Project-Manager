# Phase 1 — Quick Wins + Sécurité critique (2 j)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabiliser la base : 0 lint warning, 0 vuln critique, durcir l'authentification (CSP nonce, 2FA admin obligatoire, rate-limit per user, password policy 12+, taille requête bornée, DOMPurify systématique), retirer `tempPassword` des réponses, ajouter empty states.

**Architecture:** Travail mécanique séquentiel sur des modules ciblés. Chaque tâche commit indépendante. TDD pour les pièces sécurité (rate-limit, password policy, CSP nonce, 2FA gate). Lint-fix automatique pour les warnings cosmétiques.

**Tech Stack:** ESLint 9 flat config · Zod 3.25 · jose 5.9 · bcryptjs 2.4 · isomorphic-dompurify 3.11 · otplib 12 · jest 29.

**Branche :** `feat/quality-upgrade-9` (créée en Phase 0).

---

## Préliminaire — État au 2026-05-02

- Le rapport `lint_results.txt` date du 2026-04-25. **Avant exécution**, regénérer la baseline : `npm run lint > docs/superpowers/baselines/lint_baseline.txt`.
- Certaines erreurs listées (`token is not defined` à `app/dashboard/projects/page.js:292`, `app/dashboard/profile/page.js:74`) **peuvent déjà être corrigées** par l'évolution du code. Si une étape de ce plan trouve l'erreur absente, marquer l'étape comme déjà résolue et passer à la suivante.
- `node_modules` est manquant : Phase 0 (`npm install`) doit être faite avant d'attaquer Phase 1.

---

## File Structure (Phase 1)

| Fichier                                  | Action     | Responsabilité                                                                             |
| ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `middleware.js`                          | Modify     | Génération nonce CSP par requête, propagation via header `x-nonce`                         |
| `app/layout.js`                          | Modify     | Lecture `x-nonce` (`headers()`) pour passer aux `<Script nonce>`                           |
| `lib/passwordPolicy.js`                  | **Create** | Zod schema de mot de passe (≥12, 1 maj, 1 min, 1 chiffre, 1 spécial) + tests               |
| `lib/passwordPolicy.test.js`             | **Create** | Tests unitaires Jest                                                                       |
| `lib/schemas.js`                         | Modify     | Réutiliser `passwordSchema` partout au lieu de `min(8)`                                    |
| `lib/requestSize.js`                     | **Create** | `validateRequestSize(req, maxBytes)`                                                       |
| `lib/requestSize.test.js`                | **Create** | Tests                                                                                      |
| `lib/twoFactorGate.js`                   | **Create** | Helper `requiresTwoFactor(user, role)` + redirect logic                                    |
| `lib/twoFactorGate.test.js`              | **Create** | Tests                                                                                      |
| `lib/sanitize.js`                        | Modify     | Helper `sanitizeRichText` exporté + utilisé partout                                        |
| `app/api/auth/login/route.js`            | Modify     | Réinitialiser le rate-limit après succès, supprimer `tempPassword` exposé                  |
| `app/api/users/route.js`                 | Modify     | Supprimer `tempPassword` du retour, l'envoyer par email seulement                          |
| `app/api/comments/route.js`              | Modify     | DOMPurify sur `contenu`                                                                    |
| `lib/rateLimit.js`                       | Modify     | Aucun changement de logique — usage seulement (déjà supporte combined)                     |
| `lib/withRateLimitedHandler.js`          | **Create** | Petit HOC en attendant le `withApiHandler` complet (Phase 2)                               |
| `app/dashboard/profile/page.js`          | Modify     | Fix erreur `'token' is not defined` ligne 74 (si encore présente)                          |
| `app/dashboard/projects/page.js`         | Modify     | Fix `Duplicate key` lignes 46-47, fix `token` ligne 292 (si encore présent)                |
| `app/dashboard/projects/[id]/page.js`    | Modify     | Fix `Duplicate key 'budget_prévisionnel'` ligne 335, fix `Loader2` undef ligne 1405        |
| `components/StatusBadge.jsx`             | Modify     | Fix `useCallback` conditionnel ligne 33                                                    |
| `contexts/AppSettingsContext.js`         | Modify     | Fix parsing error ligne 1170 (probable JSX dans un `.js` ; renommer en `.jsx` ou échapper) |
| `contexts/PreferencesContext.js`         | Modify     | Fix parsing error ligne 114 (idem)                                                         |
| `contexts/ThemeContext.js`               | Modify     | Fix parsing error ligne 57 (idem)                                                          |
| `app/maintenance/page.js`                | Modify     | Fix `'token' is not defined` ligne 28 (si présent)                                         |
| `lib/auth.js`                            | Modify     | Fix `Unnecessary escape character: \[` ligne 73                                            |
| `app/dashboard/sprints/page.js`          | Modify     | 9 warnings exhaustive-deps : `useCallback` deps complétées avec `authFetch`, `t`           |
| `eslint.config.mjs`                      | Modify     | Promote `no-unused-vars` à `error`, ajouter `react-hooks/exhaustive-deps: error`           |
| `package.json`                           | Modify     | Pre-commit `lint-staged` → ajouter `--max-warnings=0`                                      |
| `app/dashboard/projects/empty-state.jsx` | **Create** | Empty state (4 fichiers similaires)                                                        |
| `app/dashboard/tasks/empty-state.jsx`    | **Create** | idem                                                                                       |
| `app/dashboard/files/empty-state.jsx`    | **Create** | idem                                                                                       |
| `app/dashboard/sprints/empty-state.jsx`  | **Create** | idem                                                                                       |

---

## Tasks

### Task 1.1 : Régénérer baseline lint et créer dossier baselines

**Files:**

- Create: `docs/superpowers/baselines/lint_baseline.txt`
- Create: `docs/superpowers/baselines/typecheck_baseline.txt`
- Create: `docs/superpowers/baselines/audit_baseline.json`

- [ ] **Step 1 :** Créer le dossier

  ```bash
  mkdir -p docs/superpowers/baselines
  ```

- [ ] **Step 2 :** Générer la baseline lint (peut produire plus ou moins que 95)

  ```bash
  npm run lint > docs/superpowers/baselines/lint_baseline.txt 2>&1 || true
  ```

  Attendu : nombre de problèmes ≥ 0. Stocker la sortie complète.

- [ ] **Step 3 :** Baseline typecheck

  ```bash
  npm run typecheck > docs/superpowers/baselines/typecheck_baseline.txt 2>&1 || true
  ```

- [ ] **Step 4 :** Baseline audit

  ```bash
  npm audit --json > docs/superpowers/baselines/audit_baseline.json 2>&1 || true
  ```

- [ ] **Step 5 :** Commit
  ```bash
  git add docs/superpowers/baselines/
  git commit -m "phase-1: capture lint/typecheck/audit baselines"
  ```

---

### Task 1.2 : `npm audit fix` sans mise à jour majeure

**Files :** `package.json`, `package-lock.json`.

- [ ] **Step 1 :** Audit non-destructif

  ```bash
  npm audit fix
  ```

- [ ] **Step 2 :** Vérifier qu'aucune dépendance majeure n'a été bumpée

  ```bash
  git diff package.json
  ```

  Si une dépendance majeure veut bumper (ex: `next` 14 → 15), **ne pas l'appliquer**, l'ajouter à la liste de tâches Phase 6.

- [ ] **Step 3 :** Re-tester rapidement

  ```bash
  npm test -- --listTests
  ```

- [ ] **Step 4 :** Commit
  ```bash
  git add package.json package-lock.json
  git commit -m "phase-1: npm audit fix (patch/minor only)"
  ```

---

### Task 1.3 : Fix erreurs lint bloquantes

> Pour chaque fichier ci-dessous, **vérifier que l'erreur est encore présente** dans le code actuel via `npm run lint <file>` avant d'intervenir. Si non, sauter.

#### 1.3.a — `app/dashboard/profile/page.js:74` (`token` not defined)

- [ ] Lire `app/dashboard/profile/page.js` autour de la ligne 74. Si `token` est référencé : remplacer par le retour du `useAuthFetch()` (qui gère déjà le token via cookie HttpOnly). Sinon, ignorer.

#### 1.3.b — `app/dashboard/projects/page.js`

- [ ] **`Duplicate key 'date_début'` ligne 46 et `'date_fin_prévue'` ligne 47** : ouvrir le fichier, identifier l'objet (probable formulaire `defaultValues`). Garder une seule clé, fusionner les valeurs si pertinent.
- [ ] **`'token' is not defined` ligne 292 (si présent)** : remplacer par `authFetch` ou supprimer la référence orpheline.

#### 1.3.c — `app/dashboard/projects/[id]/page.js`

- [ ] **`Duplicate key 'budget_prévisionnel'` ligne 335** : déduplication.
- [ ] **`'Loader2' is not defined` ligne 1405** : ajouter l'import `import { Loader2 } from 'lucide-react';`. Vérifier que `lucide-react` est bien dans `package.json` (oui).

#### 1.3.d — `components/StatusBadge.jsx:33` `useCallback` conditionnel

- [ ] Lire le composant. Le hook est appelé dans une branche conditionnelle. Refactor : sortir le `useCallback` au top-level, utiliser `useMemo` ou un early-return _après_ tous les hooks. Test : `npm test -- StatusBadge` (créer le test si manquant).

#### 1.3.e — `contexts/*Context.js` parsing errors (3 fichiers)

- [ ] `AppSettingsContext.js:1170`, `PreferencesContext.js:114`, `ThemeContext.js:57` : ces fichiers contiennent du JSX dans une extension `.js`. Deux options :
  - **Option A (recommandée)** : renommer en `.jsx` (`git mv contexts/AppSettingsContext.js contexts/AppSettingsContext.jsx`) — plus de parsing error. Vérifier les imports : Next.js 14 résout `.jsx` automatiquement.
  - **Option B** : ajuster `eslint.config.mjs` pour parser le JSX dans `.js` via `parserOptions: { ecmaFeatures: { jsx: true } }` (déjà fait pour `app/`, à étendre à `contexts/`).
- [ ] Choisir Option A. Vérifier l'app démarre via `npm run dev` puis curl `http://localhost:3000`.

#### 1.3.f — `app/maintenance/page.js:28` `token` not defined

- [ ] Vérifier si présent. Sinon ignorer. Sinon corriger comme 1.3.a.

#### 1.3.g — `lib/auth.js:73` `Unnecessary escape character: \[`

- [ ] Trouver la regex contenant `\[` inutile. Retirer le backslash dans une classe de caractères, ou échapper différemment.

- [ ] **Step final 1.3 :** commit
  ```bash
  git add app/ components/ contexts/ lib/auth.js
  git commit -m "phase-1: fix 13 lint errors (no-undef, no-dupe-keys, parsing, react-hooks)"
  ```

---

### Task 1.4 : Fix les 82 warnings (mécanique)

**Stratégie** : majorité = `no-unused-vars` (≈ 60) + `react-hooks/exhaustive-deps` (≈ 22).

- [ ] **Step 1 :** auto-fix

  ```bash
  npm run lint:fix
  ```

- [ ] **Step 2 :** Pour les imports/vars inutilisés restants, **les supprimer** (ne pas les préfixer `_`). Recourir aux outils :

  ```bash
  npx eslint . --rule 'no-unused-vars: error' --fix
  ```

- [ ] **Step 3 :** Pour les `react-hooks/exhaustive-deps` :
  - Si la dep est `authFetch` ou `t` (i18n) : ajouter dans le tableau de deps. Ces fonctions sont stables (memoïsées dans leurs hooks).
  - Si la dep ajoute un re-render infini : memoïser au call site avec `useCallback` / `useMemo`.
  - Ne **jamais** ajouter `// eslint-disable-line` — c'est interdit par la spec.

- [ ] **Step 4 :** Vérifier

  ```bash
  npm run lint:strict
  ```

  Attendu : exit 0.

- [ ] **Step 5 :** Lancer les tests pour s'assurer qu'aucune régression

  ```bash
  npm test
  ```

- [ ] **Step 6 :** Commit
  ```bash
  git add -A
  git commit -m "phase-1: resolve all lint warnings (unused vars, exhaustive-deps)"
  ```

---

### Task 1.5 : ESLint en strict permanent + Husky enforcement

**Files :** `eslint.config.mjs`, `package.json`, `.husky/pre-commit`.

- [ ] **Step 1 :** Modifier `eslint.config.mjs` — promouvoir les règles critiques en `error` :

  ```js
  // dans la section frontend (déjà présente)
  rules: {
    // ...
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps': 'error',
  }
  ```

- [ ] **Step 2 :** `.husky/pre-commit` — passer `lint-staged` en strict :

  ```sh
  #!/usr/bin/env sh
  . "$(dirname -- "$0")/_/husky.sh"
  npx lint-staged
  npm run lint:strict
  npm run typecheck
  ```

- [ ] **Step 3 :** Tester le hook manuellement

  ```bash
  echo "// stray" >> components/Footer.jsx
  git add components/Footer.jsx
  git commit -m "test pre-commit"
  # doit échouer si la règle bloque, sinon revert
  git checkout components/Footer.jsx
  ```

- [ ] **Step 4 :** Commit config
  ```bash
  git add eslint.config.mjs .husky/pre-commit
  git commit -m "phase-1: enforce 0 lint warnings + typecheck in pre-commit"
  ```

---

### Task 1.6 : Password policy stricte

**Files :**

- Create: `lib/passwordPolicy.js`
- Create: `lib/__tests__/passwordPolicy.test.js`
- Modify: `lib/schemas.js`

- [ ] **Step 1 :** Écrire le test (TDD)

  Créer `lib/__tests__/passwordPolicy.test.js` :

  ```js
  import { strongPasswordSchema, validatePassword } from '@/lib/passwordPolicy';

  describe('strongPasswordSchema', () => {
    test('accepte un mot de passe valide de 12 chars avec maj/min/chiffre/spécial', () => {
      expect(strongPasswordSchema.safeParse('Aa1!aaaaaaaa').success).toBe(true);
    });
    test('rejette < 12 caractères', () => {
      expect(strongPasswordSchema.safeParse('Aa1!aaaa').success).toBe(false);
    });
    test('rejette sans majuscule', () => {
      expect(strongPasswordSchema.safeParse('aa1!aaaaaaaa').success).toBe(false);
    });
    test('rejette sans minuscule', () => {
      expect(strongPasswordSchema.safeParse('AA1!AAAAAAAA').success).toBe(false);
    });
    test('rejette sans chiffre', () => {
      expect(strongPasswordSchema.safeParse('Aa!aaaaaaaaa').success).toBe(false);
    });
    test('rejette sans caractère spécial', () => {
      expect(strongPasswordSchema.safeParse('Aa1aaaaaaaaa').success).toBe(false);
    });
    test('rejette les mots de passe courants', () => {
      expect(strongPasswordSchema.safeParse('Password1234!').success).toBe(false);
    });
    test('validatePassword retourne erreurs traduites', () => {
      const r = validatePassword('aa');
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
  });
  ```

- [ ] **Step 2 :** Vérifier qu'il échoue

  ```bash
  npm test -- passwordPolicy
  ```

  Attendu : `Cannot find module '@/lib/passwordPolicy'`.

- [ ] **Step 3 :** Implémentation minimale

  Créer `lib/passwordPolicy.js` :

  ```js
  // @ts-check
  import { z } from 'zod';

  const COMMON_PASSWORDS = new Set([
    'password',
    'password1234',
    'qwerty',
    'azerty',
    'admin1234',
    '12345678',
    'motdepasse',
    'projectmanager',
  ]);

  export const strongPasswordSchema = z
    .string()
    .min(12, 'Le mot de passe doit faire au moins 12 caractères.')
    .max(128, 'Le mot de passe est trop long (max 128).')
    .refine((p) => /[A-Z]/.test(p), 'Au moins une majuscule.')
    .refine((p) => /[a-z]/.test(p), 'Au moins une minuscule.')
    .refine((p) => /\d/.test(p), 'Au moins un chiffre.')
    .refine((p) => /[^A-Za-z0-9]/.test(p), 'Au moins un caractère spécial.')
    .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'Mot de passe trop commun.');

  export function validatePassword(password) {
    const r = strongPasswordSchema.safeParse(password);
    return {
      valid: r.success,
      errors: r.success ? [] : r.error.errors.map((e) => e.message),
    };
  }
  ```

- [ ] **Step 4 :** Tests passent

  ```bash
  npm test -- passwordPolicy
  ```

  Attendu : 8/8 verts.

- [ ] **Step 5 :** Brancher dans `lib/schemas.js`. Trouver toutes les occurrences de `z.string().min(8)` ou similaires pour `password` :

  ```bash
  grep -n "password" lib/schemas.js
  ```

  Remplacer chaque schéma utilisateur par `import { strongPasswordSchema } from './passwordPolicy';` et `password: strongPasswordSchema`.

- [ ] **Step 6 :** Mettre à jour `models/User.js` (validation Mongoose) :

  ```js
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [12, 'Le mot de passe doit faire au moins 12 caractères'],
  },
  ```

- [ ] **Step 7 :** Lancer la suite complète

  ```bash
  npm test
  ```

- [ ] **Step 8 :** Commit
  ```bash
  git add lib/passwordPolicy.js lib/__tests__/passwordPolicy.test.js lib/schemas.js models/User.js
  git commit -m "phase-1: strong password policy (12+, complexity, common-passwords blocklist)"
  ```

---

### Task 1.7 : Validate request size

**Files :**

- Create: `lib/requestSize.js`
- Create: `lib/__tests__/requestSize.test.js`

- [ ] **Step 1 :** Test (TDD)

  `lib/__tests__/requestSize.test.js` :

  ```js
  import { validateRequestSize, MAX_BODY_BYTES } from '@/lib/requestSize';

  describe('validateRequestSize', () => {
    const mkReq = (size) => ({
      headers: new Map([['content-length', String(size)]]),
    });

    test('autorise <= 1 MB par défaut', () => {
      expect(validateRequestSize(mkReq(500_000)).ok).toBe(true);
    });
    test('refuse > 1 MB par défaut', () => {
      const r = validateRequestSize(mkReq(2_000_000));
      expect(r.ok).toBe(false);
      expect(r.status).toBe(413);
    });
    test('respecte limite custom', () => {
      expect(validateRequestSize(mkReq(2000), 1000).ok).toBe(false);
    });
    test('refuse sans content-length quand requireHeader=true', () => {
      const req = { headers: new Map() };
      expect(validateRequestSize(req, MAX_BODY_BYTES, { requireHeader: true }).ok).toBe(false);
    });
  });
  ```

- [ ] **Step 2 :** Implémentation

  `lib/requestSize.js` :

  ```js
  // @ts-check
  export const MAX_BODY_BYTES = 1_000_000; // 1 MB
  export const MAX_UPLOAD_BYTES = 10_000_000; // 10 MB

  export function validateRequestSize(request, max = MAX_BODY_BYTES, opts = {}) {
    const cl = request.headers.get
      ? request.headers.get('content-length')
      : request.headers.get('content-length'); // both styles
    if (cl == null) {
      if (opts.requireHeader) {
        return { ok: false, status: 411, error: 'Length Required' };
      }
      return { ok: true };
    }
    const size = Number(cl);
    if (Number.isNaN(size) || size < 0) {
      return { ok: false, status: 400, error: 'Invalid content-length' };
    }
    if (size > max) {
      return { ok: false, status: 413, error: `Payload too large (max ${max} bytes)` };
    }
    return { ok: true, size };
  }
  ```

- [ ] **Step 3 :** `npm test -- requestSize` → 4/4 verts.

- [ ] **Step 4 :** Commit
  ```bash
  git add lib/requestSize.js lib/__tests__/requestSize.test.js
  git commit -m "phase-1: validateRequestSize helper (1MB body, 10MB upload caps)"
  ```

---

### Task 1.8 : Helper rate-limit + size pour routes API (en attendant withApiHandler)

**Files :**

- Create: `lib/withRateLimitedHandler.js`
- Create: `lib/__tests__/withRateLimitedHandler.test.js`

- [ ] **Step 1 :** Test

  ```js
  import { withRateLimitedHandler } from '@/lib/withRateLimitedHandler';
  import { NextResponse } from 'next/server';

  describe('withRateLimitedHandler', () => {
    const noopHandler = async () => NextResponse.json({ ok: true });
    test('passe la requête sous la limite', async () => {
      const wrapped = withRateLimitedHandler(noopHandler, { max: 100, windowMs: 1000 });
      const req = { headers: new Map([['x-forwarded-for', '1.2.3.4']]), method: 'POST' };
      const res = await wrapped(req);
      expect(res.status).toBe(200);
    });
    test('renvoie 429 quand dépassé', async () => {
      const wrapped = withRateLimitedHandler(noopHandler, { max: 1, windowMs: 60_000 });
      const req = { headers: new Map([['x-forwarded-for', '5.6.7.8']]), method: 'POST' };
      await wrapped(req);
      const res = await wrapped(req);
      expect(res.status).toBe(429);
    });
    test('refuse > 1 MB', async () => {
      const wrapped = withRateLimitedHandler(noopHandler);
      const req = {
        headers: new Map([
          ['x-forwarded-for', '9.9.9.9'],
          ['content-length', '2000000'],
        ]),
        method: 'POST',
      };
      const res = await wrapped(req);
      expect(res.status).toBe(413);
    });
  });
  ```

- [ ] **Step 2 :** Implémentation

  `lib/withRateLimitedHandler.js` :

  ```js
  // @ts-check
  import { NextResponse } from 'next/server';
  import {
    checkRateLimitCombined,
    getClientIP,
    getRateLimitHeaders,
    RATE_LIMIT_CONFIG,
  } from '@/lib/rateLimit';
  import { validateRequestSize, MAX_BODY_BYTES } from '@/lib/requestSize';

  export function withRateLimitedHandler(handler, opts = {}) {
    const ipConfig = opts.ipConfig ?? RATE_LIMIT_CONFIG.global;
    const userConfig = opts.userConfig ?? RATE_LIMIT_CONFIG.sensitive;
    const maxBytes = opts.maxBytes ?? MAX_BODY_BYTES;

    return async (request, ctx) => {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

      if (isMutation) {
        const sizeCheck = validateRequestSize(request, maxBytes);
        if (!sizeCheck.ok) {
          return NextResponse.json({ error: sizeCheck.error }, { status: sizeCheck.status });
        }
      }

      const userId = request.headers.get?.('x-user-id') || null;
      const limit = checkRateLimitCombined(request, userId, ipConfig, userConfig);
      const headers = getRateLimitHeaders(limit);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: 'Trop de requêtes', retryAfter: limit.resetTime },
          { status: 429, headers }
        );
      }

      const res = await handler(request, ctx);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    };
  }
  ```

- [ ] **Step 3 :** `npm test -- withRateLimitedHandler` → 3/3 verts.

- [ ] **Step 4 :** Commit
  ```bash
  git add lib/withRateLimitedHandler.js lib/__tests__/withRateLimitedHandler.test.js
  git commit -m "phase-1: withRateLimitedHandler HOC (combined IP+user RL + body size)"
  ```

---

### Task 1.9 : Appliquer `withRateLimitedHandler` sur 5 endpoints critiques

**Files modifiés :**

- `app/api/auth/login/route.js`
- `app/api/users/route.js`
- `app/api/projects/route.js`
- `app/api/tasks/route.js`
- `app/api/files/upload/route.js`

> Note : la migration complète des 26 routes sera faite en Phase 2 avec `withApiHandler`. Phase 1 ne touche que les 5 plus exposés.

- [ ] **Step 1 :** Pour chaque fichier, wrapper l'export `POST` (et `PUT`/`DELETE` quand pertinent) :

  ```js
  // Avant
  export async function POST(request) {
    /* ... */
  }

  // Après
  import { withRateLimitedHandler } from '@/lib/withRateLimitedHandler';
  import { RATE_LIMIT_CONFIG } from '@/lib/rateLimit';

  async function postHandler(request) {
    /* ... */
  }
  export const POST = withRateLimitedHandler(postHandler, {
    ipConfig: RATE_LIMIT_CONFIG.login, // ou auth, ou global selon le cas
    userConfig: RATE_LIMIT_CONFIG.sensitive,
  });
  ```

  Choix de configs :
  - `auth/login` → `ipConfig: login` (5/15min)
  - `users` (création) → `ipConfig: auth` (10/15min)
  - `projects`, `tasks` → `ipConfig: global`
  - `files/upload` → `ipConfig: upload`, `maxBytes: MAX_UPLOAD_BYTES`

- [ ] **Step 2 :** Tests d'intégration manuels via curl (en local) :

  ```bash
  for i in {1..6}; do curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"x@x.x","password":"wrong"}'; done
  ```

  Attendu : 5 réponses 401, 6e réponse 429 avec header `X-RateLimit-Remaining: 0`.

- [ ] **Step 3 :** Commit
  ```bash
  git add app/api/
  git commit -m "phase-1: rate-limit + body-size enforcement on 5 critical endpoints"
  ```

---

### Task 1.10 : Suppression `tempPassword` des réponses API

**Files :** `app/api/users/route.js`, `app/api/users/[id]/route.js`, tout endroit qui retourne un mot de passe créé.

- [ ] **Step 1 :** Recherche

  ```bash
  grep -rn "tempPassword\|temp_password\|temporaryPassword" app/ lib/ components/
  ```

- [ ] **Step 2 :** Pour chaque occurrence dans une réponse JSON ou un toast UI :
  - Backend : remplacer par envoi par email (réutiliser `lib/services/emailService.js`).
  - Backend : ne **jamais** inclure `tempPassword` dans `NextResponse.json(...)`.
  - Frontend : remplacer le toast `Mot de passe temporaire : XXX` par `Un email avec les instructions a été envoyé.`.

- [ ] **Step 3 :** Tester création d'un utilisateur via UI admin → vérifier qu'aucun mot de passe n'apparaît côté client (Network tab + UI).

- [ ] **Step 4 :** Commit
  ```bash
  git add app/ components/ lib/
  git commit -m "phase-1: never expose tempPassword in API responses or UI (send by email only)"
  ```

---

### Task 1.11 : 2FA obligatoire pour les rôles avec `adminConfig` ou `gererUtilisateurs`

**Files :**

- Create: `lib/twoFactorGate.js`
- Create: `lib/__tests__/twoFactorGate.test.js`
- Modify: `middleware.js`
- Modify: `app/dashboard/layout.js`

- [ ] **Step 1 :** Test du gate

  `lib/__tests__/twoFactorGate.test.js` :

  ```js
  import { requiresTwoFactor } from '@/lib/twoFactorGate';

  describe('requiresTwoFactor', () => {
    test('admin sans 2FA → true', () => {
      const user = { permissions: { adminConfig: true }, twoFactorEnabled: false };
      expect(requiresTwoFactor(user)).toBe(true);
    });
    test('admin avec 2FA → false', () => {
      const user = { permissions: { adminConfig: true }, twoFactorEnabled: true };
      expect(requiresTwoFactor(user)).toBe(false);
    });
    test('user normal sans 2FA → false', () => {
      const user = { permissions: {}, twoFactorEnabled: false };
      expect(requiresTwoFactor(user)).toBe(false);
    });
    test('gererUtilisateurs déclenche aussi le gate', () => {
      const user = { permissions: { gererUtilisateurs: true }, twoFactorEnabled: false };
      expect(requiresTwoFactor(user)).toBe(true);
    });
    test('null user → false', () => {
      expect(requiresTwoFactor(null)).toBe(false);
    });
  });
  ```

- [ ] **Step 2 :** Implémentation

  `lib/twoFactorGate.js` :

  ```js
  // @ts-check
  /**
   * Permissions privilégiées qui imposent l'activation du 2FA.
   */
  const PRIVILEGED_PERMISSIONS = ['adminConfig', 'gererUtilisateurs'];

  export function requiresTwoFactor(user) {
    if (!user || !user.permissions) return false;
    if (user.twoFactorEnabled) return false;
    return PRIVILEGED_PERMISSIONS.some((p) => user.permissions[p] === true);
  }

  export const TWO_FA_SETUP_PATH = '/dashboard/profile/2fa-setup';
  export const TWO_FA_BYPASS_PATHS = [
    '/dashboard/profile/2fa-setup',
    '/api/auth/2fa',
    '/api/auth/logout',
    '/api/me',
  ];
  ```

- [ ] **Step 3 :** Test passe : `npm test -- twoFactorGate`.

- [ ] **Step 4 :** Brancher dans `app/dashboard/layout.js` (côté serveur si `'use server'`, sinon dans un effet client après `me` chargé) :

  ```js
  // après avoir chargé l'utilisateur courant
  import { requiresTwoFactor, TWO_FA_SETUP_PATH } from '@/lib/twoFactorGate';
  if (requiresTwoFactor(currentUser) && pathname !== TWO_FA_SETUP_PATH) {
    redirect(TWO_FA_SETUP_PATH);
  }
  ```

- [ ] **Step 5 :** S'assurer que la page `/dashboard/profile/2fa-setup` existe — si non, créer un MVP qui consomme le composant existant `components/TwoFactorSetup.js` :

  ```jsx
  // app/dashboard/profile/2fa-setup/page.js
  'use client';
  import TwoFactorSetup from '@/components/TwoFactorSetup';
  export default function Page() {
    return (
      <div className="container mx-auto p-6 max-w-xl">
        <h1 className="text-2xl font-bold mb-4">Activer la double authentification</h1>
        <p className="mb-6 text-muted-foreground">
          Votre rôle nécessite la 2FA. Vous ne pourrez accéder au reste de l'application qu'après
          activation.
        </p>
        <TwoFactorSetup />
      </div>
    );
  }
  ```

- [ ] **Step 6 :** Test E2E manuel :
  1. Créer un utilisateur admin sans 2FA en base (script ou UI).
  2. Se logger → vérifier redirection vers `/dashboard/profile/2fa-setup`.
  3. Activer 2FA → vérifier que les autres pages deviennent accessibles.

- [ ] **Step 7 :** Migration data : script `scripts/audit-2fa.js` qui liste les admins sans 2FA :

  ```js
  // scripts/audit-2fa.js
  import { connectDB } from '../lib/mongodb.js';
  import User from '../models/User.js';

  async function main() {
    await connectDB();
    const admins = await User.find().populate('role_id');
    const missing = admins.filter(
      (u) => u.role_id?.permissions?.adminConfig && !u.twoFactorEnabled
    );
    console.log(`${missing.length} admins sans 2FA :`);
    missing.forEach((u) => console.log(` - ${u.email}`));
    process.exit(0);
  }
  main();
  ```

  ```bash
  node scripts/audit-2fa.js
  ```

- [ ] **Step 8 :** Commit
  ```bash
  git add lib/twoFactorGate.js lib/__tests__/twoFactorGate.test.js app/dashboard scripts/audit-2fa.js
  git commit -m "phase-1: enforce 2FA for privileged roles (adminConfig, gererUtilisateurs)"
  ```

---

### Task 1.12 : DOMPurify systématique sur entrées HTML

**Files :** `lib/sanitize.js`, `app/api/comments/route.js`, partout où `contenu` ou `description_html` est accepté.

- [ ] **Step 1 :** Lire `lib/sanitize.js` actuel.

  ```bash
  cat lib/sanitize.js
  ```

  S'il n'expose pas un helper `sanitizeRichText`, l'ajouter :

  ```js
  // @ts-check
  import DOMPurify from 'isomorphic-dompurify';

  const ALLOWED_TAGS = [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'h1',
    'h2',
    'h3',
    'blockquote',
  ];
  const ALLOWED_ATTR = ['href', 'target', 'rel'];

  export function sanitizeRichText(html) {
    if (typeof html !== 'string') return '';
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
  }

  export function sanitizePlainText(s) {
    if (typeof s !== 'string') return '';
    return DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
  }
  ```

- [ ] **Step 2 :** Trouver les routes qui acceptent du HTML libre :

  ```bash
  grep -rn "contenu\|description_html\|html\b" app/api/
  ```

- [ ] **Step 3 :** Pour chaque route concernée (au moins `comments`, `tasks` description) :

  ```js
  import { sanitizeRichText } from '@/lib/sanitize';
  // après validation Zod
  data.contenu = sanitizeRichText(data.contenu);
  ```

- [ ] **Step 4 :** Test unitaire : créer `lib/__tests__/sanitize.test.js` :

  ```js
  import { sanitizeRichText, sanitizePlainText } from '@/lib/sanitize';
  describe('sanitize', () => {
    test('retire script', () => {
      expect(sanitizeRichText('hello <script>alert(1)</script>')).toBe('hello ');
    });
    test('garde tags autorisés', () => {
      expect(sanitizeRichText('<b>x</b>')).toBe('<b>x</b>');
    });
    test('plainText retire tout HTML', () => {
      expect(sanitizePlainText('<b>x</b>')).toBe('x');
    });
  });
  ```

  ```bash
  npm test -- sanitize
  ```

- [ ] **Step 5 :** Commit
  ```bash
  git add lib/sanitize.js lib/__tests__/sanitize.test.js app/api/
  git commit -m "phase-1: enforce DOMPurify on all rich-text endpoints"
  ```

---

### Task 1.13 : CSP nonce-based en production

**Files :** `middleware.js`, `app/layout.js` (et tout `<script>` inline qui resterait).

- [ ] **Step 1 :** Modifier `middleware.js` — générer un nonce par requête et l'ajouter au CSP + header partagé :

  ```js
  import { NextResponse } from 'next/server';
  import { jwtVerify } from 'jose';

  function generateNonce() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Buffer.from(arr).toString('base64');
  }

  export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const nonce = generateNonce();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    response.headers.set('x-nonce', nonce);
    // ... rest unchanged

    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline'", // tailwind nécessaire — accepté
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        `connect-src 'self' ${socketUrl} ws://localhost:* wss://localhost:*`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        isDev ? '' : 'upgrade-insecure-requests',
      ]
        .filter(Boolean)
        .join('; ')
    );
    // ...
    return response;
  }
  ```

- [ ] **Step 2 :** Modifier `app/layout.js` pour propager le nonce :

  ```js
  import { headers } from 'next/headers';
  // ...
  export default async function RootLayout({ children }) {
    const nonce = headers().get('x-nonce') || '';
    return (
      <html lang="fr">
        <body>
          {/* Si tu as des <Script> Next, leur passer nonce */}
          {children}
        </body>
      </html>
    );
  }
  ```

- [ ] **Step 3 :** Build & test

  ```bash
  npm run build
  NODE_ENV=production npm run start
  curl -sI http://localhost:3000/login | grep -i 'content-security-policy'
  ```

  Attendu : header CSP avec `nonce-<base64>` et **sans** `'unsafe-inline'` dans `script-src`.

- [ ] **Step 4 :** Surveillance erreurs CSP — ouvrir le navigateur DevTools, vérifier la console pour absence d'erreurs `Refused to execute inline script`. Si Next.js a des scripts inline non-noncés, soit upgrade Next 14.2 minor, soit ajouter `nonce={nonce}` aux `<Script>` Next concernés.

- [ ] **Step 5 :** Commit
  ```bash
  git add middleware.js app/layout.js
  git commit -m "phase-1: nonce-based CSP, drop script-src 'unsafe-inline' in production"
  ```

---

### Task 1.14 : 4 empty states UX

**Files créés :**

- `components/EmptyState.jsx` (composant générique)
- 4 wrappers dans `app/dashboard/<page>/empty-state.jsx`

- [ ] **Step 1 :** Composant générique

  ```jsx
  // components/EmptyState.jsx
  'use client';
  import { Button } from '@/components/ui/button';

  export default function EmptyState({ icon: Icon, title, description, action }) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4">
        {Icon ? <Icon className="h-12 w-12 text-muted-foreground" /> : null}
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground max-w-md">{description}</p> : null}
        {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
      </div>
    );
  }
  ```

- [ ] **Step 2 :** Brancher dans 4 pages : `projects`, `tasks`, `files`, `sprints`. Exemple `projects/page.js` :

  ```jsx
  import EmptyState from '@/components/EmptyState';
  import { FolderPlus } from 'lucide-react';
  // ...
  if (!loading && projects.length === 0) {
    return (
      <EmptyState
        icon={FolderPlus}
        title="Aucun projet pour l'instant"
        description="Créez votre premier projet pour commencer à organiser votre travail."
        action={{ label: 'Créer un projet', onClick: () => setShowCreateDialog(true) }}
      />
    );
  }
  ```

- [ ] **Step 3 :** Vérification visuelle dans `npm run dev`.

- [ ] **Step 4 :** Commit
  ```bash
  git add components/EmptyState.jsx app/dashboard/
  git commit -m "phase-1: empty states for projects/tasks/files/sprints"
  ```

---

### Task 1.15 : Verification gate (fin de phase)

- [ ] **Step 1 :** Lint strict

  ```bash
  npm run lint:strict
  ```

  Attendu : exit 0.

- [ ] **Step 2 :** Typecheck

  ```bash
  npm run typecheck
  ```

  Attendu : exit 0.

- [ ] **Step 3 :** Tests

  ```bash
  npm test
  ```

  Attendu : tous verts. Couverture stable ou en hausse.

- [ ] **Step 4 :** Build prod

  ```bash
  npm run build
  ```

  Attendu : exit 0.

- [ ] **Step 5 :** Audit sécurité

  ```bash
  npm audit --omit=dev --audit-level=high
  ```

  Attendu : 0 vulnérabilité high/critical.

- [ ] **Step 6 :** Smoke test manuel — démarrer en prod local, vérifier :
  - login fonctionne
  - rate-limit déclenche après 5 tentatives échouées
  - admin sans 2FA est redirigé vers `/dashboard/profile/2fa-setup`
  - CSP header présent et nonce-based
  - création d'utilisateur n'expose pas tempPassword

- [ ] **Step 7 :** Bilan phase. Mettre à jour `CONTEXT.md` :

  ```markdown
  ## Phase 1 — DONE (2026-05-XX)

  - Lint : 95 → 0 (strict)
  - Sécurité : CSP nonce, 2FA admin, rate-limit/user, 1MB body, password 12+, DOMPurify, no tempPassword
  - UX : 4 empty states
  - Score estimé : 6.8 → 7.4
  ```

- [ ] **Step 8 :** Commit récap + tag
  ```bash
  git add CONTEXT.md
  git commit -m "phase-1: complete (lint=0, security hardened, empty states)"
  git tag phase-1-complete
  ```

---

## Critères d'acceptation Phase 1

- [ ] `npm run lint:strict` exit 0 (0 warnings, 0 errors)
- [ ] `npm run typecheck` exit 0
- [ ] `npm test` exit 0, couverture lib/ stable ou en hausse
- [ ] `npm run build` exit 0
- [ ] `npm audit --audit-level=high` exit 0
- [ ] CSP header en prod **n'a pas** `'unsafe-inline'` dans `script-src`
- [ ] Un admin sans 2FA est redirigé vers `/dashboard/profile/2fa-setup`
- [ ] 6e tentative de login depuis la même IP renvoie 429
- [ ] Création d'utilisateur n'expose plus `tempPassword`
- [ ] Body > 1 MB renvoie 413
- [ ] Mot de passe < 12 caractères ou faible est rejeté à l'inscription

---

## Self-review

**Spec coverage :** ✅ chaque item du master plan Phase 1 est mappé à au moins une tâche (1.1-1.15). Items spec d'avril (`tempPassword` retrait, `validateRequestSize`, DOMPurify, `npm audit fix`, exhaustive-deps) couverts par 1.10, 1.7-1.9, 1.12, 1.2, 1.4 respectivement.

**Placeholder scan :** ✅ chaque step contient soit du code complet, soit une commande exacte, soit une instruction concrète. Les "si encore présent" pour les erreurs lint sont conditionnels mais avec procédure de skip explicite.

**Type consistency :** ✅ `sanitizeRichText` (1.12) réutilisé tel quel ; `requiresTwoFactor` / `TWO_FA_SETUP_PATH` (1.11) cohérents ; `withRateLimitedHandler` (1.8) signature stable ; `strongPasswordSchema` (1.6) réutilisé en 1.6 step 5.

---

## Execution Handoff

Plan de Phase 1 complet. Pour exécuter :

1. **Subagent-Driven (recommandé)** — un sous-agent par tâche numérotée (1.1 à 1.15), review entre tâches.
2. **Inline Execution** — exécution dans cette session avec checkpoints (probablement après 1.5, 1.9, 1.13, 1.15).

À choisir après validation du plan par l'utilisateur.
