# Phase 4 — Tests E2E + Coverage 70 % (3 j)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Couvrir les 5 workflows critiques en E2E (Playwright), monter le coverage Jest à ≥ 70 % lignes / 65 % branches via des tests ciblés sur hooks/contexts/composants UI critiques, puis enforcer le seuil en CI.

**Architecture:** Playwright pour les workflows multi-pages (auth → 2FA → projet → kanban → rapport). Jest avec `@testing-library/react` pour les hooks. Snapshots pour 10 composants UI les plus visibles. CI met à jour `.github/workflows/ci.yml` avec un job dédié Playwright (matrice 2 navigateurs Chromium + Firefox).

**Tech Stack:** @playwright/test 1.x · @testing-library/react · @testing-library/react-hooks · mongodb-memory-server · GitHub Actions.

**Pré-requis :** Phases 0-3 complètes (env stable, API unifiée, TS strict).

---

## File Structure

| Fichier                                           | Action | Responsabilité                                                              |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `playwright.config.ts`                            | Create | config 2 navigateurs, baseURL, timeouts, traces                             |
| `tests/e2e/auth.spec.ts`                          | Create | login/logout/2FA/rate-limit                                                 |
| `tests/e2e/projects.spec.ts`                      | Create | CRUD projet + invite + archive + restore                                    |
| `tests/e2e/kanban.spec.ts`                        | Create | drag-drop tâches                                                            |
| `tests/e2e/budget.spec.ts`                        | Create | budget + dépenses + % consommé                                              |
| `tests/e2e/reports.spec.ts`                       | Create | export PDF + Excel                                                          |
| `tests/e2e/fixtures/auth.ts`                      | Create | helper login + session storage                                              |
| `tests/e2e/fixtures/seed.ts`                      | Create | seed DB de test (admin user, project)                                       |
| `hooks/__tests__/useAuthFetch.test.tsx`           | Create | tests du hook                                                               |
| `hooks/__tests__/useRBACPermissions.test.tsx`     | Create | idem                                                                        |
| `hooks/__tests__/useRealtime.test.tsx`            | Create | idem (mock socket)                                                          |
| `contexts/__tests__/TranslationsContext.test.tsx` | Create | tests + suite locale switch                                                 |
| `components/__tests__/Button.test.tsx`            | Create | snapshot + a11y                                                             |
| `components/__tests__/Dialog.test.tsx`            | Create | snapshot + ouverture/fermeture                                              |
| `components/__tests__/KanbanColumn.test.tsx`      | Create | snapshot + dnd state                                                        |
| `components/__tests__/TaskCard.test.tsx`          | Create | snapshot                                                                    |
| `components/__tests__/EmptyState.test.tsx`        | Create | snapshot + click action                                                     |
| `jest.config.js`                                  | Modify | `coverageThreshold: { global: { lines: 70, branches: 65, functions: 70 } }` |
| `.github/workflows/ci.yml`                        | Modify | Ajout job E2E + upload artifacts                                            |
| `.github/workflows/playwright.yml`                | Create | Workflow dédié Playwright en parallèle                                      |
| `package.json`                                    | Modify | scripts `test:e2e`, `test:e2e:ui`                                           |

---

## Tasks

### Task 4.1 : Installer Playwright

- [ ] **Step 1 :** Installation

  ```bash
  npm install --save-dev @playwright/test
  npx playwright install --with-deps chromium firefox
  ```

- [ ] **Step 2 :** `playwright.config.ts`

  ```ts
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
    webServer: process.env.CI
      ? {
          command: 'npm run start',
          url: 'http://localhost:3000',
          reuseExistingServer: false,
          timeout: 120 * 1000,
        }
      : undefined,
  });
  ```

- [ ] **Step 3 :** Scripts package.json

  ```json
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed"
  ```

- [ ] **Step 4 :** `.gitignore` ajouter

  ```
  /test-results/
  /playwright-report/
  /playwright/.cache/
  ```

- [ ] **Step 5 :** Commit
  ```bash
  git add playwright.config.ts package.json package-lock.json .gitignore
  git commit -m "phase-4: setup Playwright (chromium + firefox)"
  ```

---

### Task 4.2 : Fixtures E2E (auth + seed)

**Files :** `tests/e2e/fixtures/auth.ts`, `tests/e2e/fixtures/seed.ts`.

- [ ] **Step 1 :** `seed.ts` — seed la DB de test (utilise `MONGODB_URI=mongodb://localhost:27017/pm_e2e`)

  ```ts
  import mongoose from 'mongoose';
  import bcrypt from 'bcryptjs';
  import User from '../../../models/User';
  import Role from '../../../models/Role';

  export async function seedE2E() {
    const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/pm_e2e';
    if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

    await Promise.all([User.deleteMany({}), Role.deleteMany({})]);

    const adminRole = await Role.create({
      nom: 'Super Administrateur',
      is_predefined: true,
      permissions: {
        adminConfig: true,
        gererUtilisateurs: true,
        creerProjet: true,
        gererTaches: true,
        voirTousProjets: true,
      },
    });

    const passwordHash = await bcrypt.hash('Aa1!testpass', 10);
    const admin = await User.create({
      email: 'admin@e2e.test',
      password: passwordHash,
      nom: 'E2E',
      prénom: 'Admin',
      role_id: adminRole._id,
      twoFactorEnabled: true,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP', // TOTP test seed
    });
    return { admin, adminRole };
  }
  ```

- [ ] **Step 2 :** `auth.ts` — fixture Playwright

  ```ts
  import { test as base, expect } from '@playwright/test';
  import { authenticator } from 'otplib';

  export const test = base.extend<{ authedPage: any }>({
    authedPage: async ({ page }, use) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@e2e.test');
      await page.fill('input[name="password"]', 'Aa1!testpass');
      await page.click('button[type="submit"]');
      // 2FA
      const code = authenticator.generate('JBSWY3DPEHPK3PXP');
      await page.fill('input[name="totp"]', code);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/);
      await use(page);
    },
  });
  export { expect };
  ```

- [ ] **Step 3 :** Commit
  ```bash
  git add tests/e2e/fixtures
  git commit -m "phase-4: e2e fixtures (seed + auth helper)"
  ```

---

### Task 4.3 : Workflow E2E #1 — Auth

**File :** `tests/e2e/auth.spec.ts`.

- [ ] **Step 1 :** Implémentation

  ```ts
  import { test, expect } from './fixtures/auth';
  import { seedE2E } from './fixtures/seed';

  test.beforeAll(async () => {
    await seedE2E();
  });

  test('login → 2FA → dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@e2e.test');
    await page.fill('input[name="password"]', 'Aa1!testpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/2fa/);
  });

  test('5 logins échoués → 429', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      const r = await page.request.post('/api/auth/login', {
        data: { email: 'x@x.x', password: 'wrong' },
      });
      expect([401, 429]).toContain(r.status());
    }
    const last = await page.request.post('/api/auth/login', {
      data: { email: 'x@x.x', password: 'wrong' },
    });
    expect(last.status()).toBe(429);
  });

  test('logout déconnecte', async ({ authedPage: page }) => {
    await page.click('[data-testid="logout-btn"]');
    await page.waitForURL(/\/login/);
  });
  ```

- [ ] **Step 2 :** Faire passer en local

  ```bash
  npm run start &
  npx playwright test auth
  ```

- [ ] **Step 3 :** Commit
  ```bash
  git add tests/e2e/auth.spec.ts
  git commit -m "phase-4: e2e auth (login, 2FA, rate-limit, logout)"
  ```

---

### Task 4.4 : Workflow E2E #2-5 (projects, kanban, budget, reports)

> Pour chaque scénario, le pattern est identique : seed → action via UI → assertion sur API + UI.

- [ ] **Step 1 :** `projects.spec.ts` — créer un projet via dialog "+ Nouveau projet", vérifier qu'il apparaît dans la liste, archiver, restaurer.
- [ ] **Step 2 :** `kanban.spec.ts` — créer 3 tâches dans la colonne "À faire", drag de la 1ère vers "En cours", vérifier le statut côté API.
- [ ] **Step 3 :** `budget.spec.ts` — créer un budget de 10000, ajouter dépense de 3000, vérifier % consommé = 30 %.
- [ ] **Step 4 :** `reports.spec.ts` — depuis `/dashboard/reports`, cliquer "Export PDF", attendre download, vérifier que le fichier est non vide (`.length > 0`).

  Code pour download :

  ```ts
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Export PDF")');
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  ```

- [ ] **Step 5 :** Run all

  ```bash
  npx playwright test
  ```

  Attendu : 5 spec files, ≥ 15 tests verts.

- [ ] **Step 6 :** Commit
  ```bash
  git add tests/e2e/
  git commit -m "phase-4: e2e workflows (projects, kanban, budget, reports)"
  ```

---

### Task 4.5 : Tests hooks et contextes

**Files :** `hooks/__tests__/*.test.tsx`, `contexts/__tests__/*.test.tsx`.

- [ ] **Step 1 :** Installer si nécessaire `@testing-library/react-hooks` (note : sur React 18, utiliser `renderHook` de `@testing-library/react` directement) :

  ```bash
  # déjà inclus dans @testing-library/react 14
  ```

- [ ] **Step 2 :** Exemple `useAuthFetch.test.tsx`

  ```tsx
  import { renderHook, act } from '@testing-library/react';
  import { useAuthFetch } from '@/hooks/useAuthFetch';

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    });
  });

  test('appelle fetch avec credentials include', async () => {
    const { result } = renderHook(() => useAuthFetch());
    await act(async () => {
      const res = await result.current('/api/x');
      expect(res.ok).toBe(true);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  test('redirige sur 401', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const replace = jest.fn();
    Object.defineProperty(window, 'location', { value: { replace }, writable: true });
    const { result } = renderHook(() => useAuthFetch());
    await act(async () => {
      await result.current('/api/x');
    });
    expect(replace).toHaveBeenCalledWith('/login');
  });
  ```

- [ ] **Step 3 :** Idem pour `useRBACPermissions` (mocker la réponse `/api/me`) et `useRealtime` (mocker `socket.io-client` avec `jest.mock`).

- [ ] **Step 4 :** Tests contexts : `TranslationsContext.test.tsx` vérifie que `t('common.save') === 'Enregistrer'` quand `locale === 'fr'`.

- [ ] **Step 5 :** Run + commit
  ```bash
  npm test -- hooks contexts
  git add hooks/__tests__ contexts/__tests__
  git commit -m "phase-4: unit tests for hooks and contexts"
  ```

---

### Task 4.6 : Snapshot tests 10 composants UI

**Files :** `components/__tests__/*.test.tsx` (10 fichiers).

- [ ] **Step 1 :** Pour chaque composant (Button, Dialog, KanbanColumn, TaskCard, FormField, ConfirmationDialog, Footer, ErrorBoundary, StatusBadge, EmptyState), écrire :

  ```tsx
  import { render } from '@testing-library/react';
  import { Button } from '@/components/ui/button';

  test('Button snapshot', () => {
    const { container } = render(<Button variant="default">Hello</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
  ```

- [ ] **Step 2 :** Pour les composants stateful (Dialog), tester un toggle :

  ```tsx
  test('Dialog open/close', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole } = render(<MyDialog />);
    await user.click(getByRole('button', { name: 'Open' }));
    expect(getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(queryByRole('dialog')).toBeNull();
  });
  ```

- [ ] **Step 3 :** Run + valider visuellement les snapshots (`__snapshots__/`)

  ```bash
  npm test -- components
  ```

- [ ] **Step 4 :** Commit
  ```bash
  git add components/__tests__/ components/__tests__/__snapshots__/
  git commit -m "phase-4: snapshot tests for 10 UI components"
  ```

---

### Task 4.7 : Coverage threshold 70 % en CI

- [ ] **Step 1 :** Modifier `jest.config.js`

  ```js
  module.exports = {
    // ... existing
    coverageThreshold: {
      global: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 65,
      },
    },
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  };
  ```

- [ ] **Step 2 :** Lancer

  ```bash
  npm run test:coverage
  ```

  Si below threshold : ajouter des tests sur les modules les moins couverts (priorité : services métier, validations, permissions).

- [ ] **Step 3 :** Itérer jusqu'à passer.

- [ ] **Step 4 :** Commit
  ```bash
  git add jest.config.js
  git commit -m "phase-4: enforce 70% coverage threshold"
  ```

---

### Task 4.8 : CI GitHub Actions — Playwright

**File :** `.github/workflows/playwright.yml`.

- [ ] **Step 1 :** Créer

  ```yaml
  name: Playwright E2E
  on:
    push:
      branches: [main, 'feat/**']
    pull_request:

  jobs:
    e2e:
      timeout-minutes: 30
      runs-on: ubuntu-latest
      services:
        mongo:
          image: mongo:7
          ports: [27017:27017]
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: npm
        - run: npm ci
        - run: npx playwright install --with-deps chromium firefox
        - name: Build
          run: npm run build
          env:
            JWT_SECRET: e2e-secret-changeme
            MONGODB_URI: mongodb://localhost:27017/pm_e2e
        - name: E2E
          run: npm run test:e2e
          env:
            JWT_SECRET: e2e-secret-changeme
            MONGODB_URI: mongodb://localhost:27017/pm_e2e
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: playwright-report
            path: playwright-report/
  ```

- [ ] **Step 2 :** Étendre `ci.yml` (existant) pour exécuter `npm run test:coverage` et publier le résumé en commentaire PR (action `5monkeys/cobertura-action` ou simplement upload artifact).

- [ ] **Step 3 :** Commit
  ```bash
  git add .github/workflows/
  git commit -m "phase-4: CI Playwright matrix + coverage upload"
  ```

---

### Task 4.9 : Verification gate Phase 4

- [ ] `npm run test:e2e` exit 0 (5 spec files, ≥ 15 tests)
- [ ] `npm run test:coverage` exit 0 (lines ≥ 70 %, branches ≥ 65 %)
- [ ] CI badge sur README
- [ ] Update CONTEXT.md
- [ ] Tag : `git tag phase-4-complete`

---

## Critères d'acceptation

- [ ] 5 fichiers `.spec.ts` existent dans `tests/e2e/`
- [ ] Coverage globale ≥ 70 % lignes
- [ ] CI Playwright vert sur PR test

---

## Self-review

✅ Spec coverage : 5 workflows mappés à 5 spec files; hooks et composants mappés à 10+5 fichiers de tests.
✅ Placeholder scan : aucun TBD ; chaque spec a un scénario complet.
✅ Type consistency : `seedE2E`, `authedPage` cohérents ; CI utilise les mêmes scripts npm que en local.
