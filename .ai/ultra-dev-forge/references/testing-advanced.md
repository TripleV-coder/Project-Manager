# Testing Pyramid Avancé — Ultra Dev Forge

## Règle ZERO FAKE dans les Tests

> Les tests doivent tester le vrai comportement, pas mocker la totalité de l'application.
> Un test qui mock tout ne teste rien.

---

## Pyramide Complète

```
           ▲
          / \
         /E2E\          Playwright — 10-20 flows critiques
        /─────\
       / Intég. \       Supertest + DB réelle — tous les endpoints API
      /──────────\
     /  Contrat   \     Pact.js — interface frontend/backend
    /──────────────\
   /  Composants    \   Testing Library — comportement UI
  /──────────────────\
 /   Unitaires        \ Vitest — business logic pure
/──────────────────────\
```

---

## Tests Unitaires (Vitest)

```typescript
// Ne tester que la LOGIQUE PURE — pas les effets de bord
// Toute fonction avec des side effects → test d'intégration

// ✅ BON candidat au test unitaire
function calculateInvoiceTotal(items: InvoiceItem[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal * (1 + taxRate);
}

describe('calculateInvoiceTotal', () => {
  it('calcule correctement la TVA', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
    ];
    expect(calculateInvoiceTotal(items, 0.2)).toBe(300); // (200+50) * 1.2
  });

  it('retourne 0 pour une liste vide', () => {
    expect(calculateInvoiceTotal([], 0.2)).toBe(0);
  });

  it('gère les quantités décimales', () => {
    const items = [{ price: 100, quantity: 1.5 }];
    expect(calculateInvoiceTotal(items, 0)).toBe(150);
  });
});
```

---

## Tests de Composants (Testing Library)

```typescript
// Tester le COMPORTEMENT visible par l'utilisateur
// Pas l'implémentation interne

// Setup global
// vitest.setup.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'  // MSW

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock serveur (MSW) — simule l'API avec des données réalistes
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/projects', () => {
    return HttpResponse.json({
      items: [
        { id: 'proj_1', name: 'Website Redesign', status: 'active', _count: { documents: 5 } },
        { id: 'proj_2', name: 'Mobile App', status: 'active', _count: { documents: 12 } },
      ],
      total: 2,
      hasNextPage: false,
    })
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as { name: string }
    return HttpResponse.json(
      { id: 'proj_new', name: body.name, status: 'active', _count: { documents: 0 } },
      { status: 201 }
    )
  }),
]

// Test de composant
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectList } from './ProjectList'

test('affiche la liste des projets chargés depuis l\'API', async () => {
  render(<ProjectList />)

  // Vérifier l'état loading
  expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()

  // Attendre les données réelles (via MSW)
  await waitFor(() => {
    expect(screen.getByText('Website Redesign')).toBeInTheDocument()
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
  })

  // Vérifier le count
  expect(screen.getByText('5 documents')).toBeInTheDocument()
})

test('crée un projet et l\'affiche dans la liste', async () => {
  const user = userEvent.setup()
  render(<ProjectList />)

  await waitFor(() => expect(screen.getByText('Website Redesign')).toBeInTheDocument())

  await user.click(screen.getByRole('button', { name: 'Nouveau projet' }))
  await user.type(screen.getByLabelText('Nom du projet'), 'New Project')
  await user.click(screen.getByRole('button', { name: 'Créer' }))

  await waitFor(() => {
    expect(screen.getByText('New Project')).toBeInTheDocument()
  })
})

test('affiche l\'empty state si aucun projet', async () => {
  // Override le handler pour ce test
  server.use(
    http.get('/api/projects', () => HttpResponse.json({ items: [], total: 0, hasNextPage: false }))
  )

  render(<ProjectList />)

  await waitFor(() => {
    expect(screen.getByText('Votre premier projet vous attend')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer un projet' })).toBeInTheDocument()
  })
})
```

---

## Tests d'Intégration API (Supertest + vraie DB test)

```typescript
// Utiliser une vraie DB de test — jamais de mock de la DB
// DATABASE_URL_TEST=postgresql://localhost/myapp_test

// tests/setup.ts
import { execSync } from 'child_process';

beforeAll(async () => {
  // Appliquer les migrations sur la DB de test
  execSync('DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy');
});

beforeEach(async () => {
  // Nettoyer les données entre les tests (pas la structure)
  await cleanDatabase();
});

// Helper pour créer des fixtures réalistes
async function createTestUser(overrides = {}) {
  return db.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: await bcrypt.hash('TestPass123!', 12),
      name: 'Test User',
      ...overrides,
    },
  });
}

// Test d'endpoint complet
describe('POST /api/projects', () => {
  it('crée un projet et retourne 201', async () => {
    const { token } = await loginAs(await createTestUser());

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Project', description: 'A test project' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.stringMatching(/^proj_/),
      name: 'My Project',
      status: 'active',
    });
    expect(res.body.password).toBeUndefined(); // Jamais exposer des champs sensibles

    // Vérifier que c'est vraiment en DB
    const inDB = await db.project.findUnique({ where: { id: res.body.id } });
    expect(inDB).not.toBeNull();
    expect(inDB!.name).toBe('My Project');
  });

  it('retourne 401 sans authentication', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si le nom est vide', async () => {
    const { token } = await loginAs(await createTestUser());
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('retourne 409 si le nom existe déjà dans le tenant', async () => {
    const user = await createTestUser();
    await createProject({ name: 'Existing', tenantId: user.tenantId });

    const { token } = await loginAs(user);
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Existing' });

    expect(res.status).toBe(409);
  });
});
```

---

## Tests E2E (Playwright)

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});

// e2e/auth.spec.ts
test.describe('Authentication', () => {
  test('inscription complète → dashboard', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Nom').fill('Jane Doe');
    await page.getByLabel('Email').fill(`jane-${Date.now()}@test.com`);
    await page.getByLabel('Mot de passe').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    // Vérifier la redirection vers le dashboard (page réelle)
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Bienvenue, Jane')).toBeVisible();

    // Vérifier que la navbar montre le bon état connecté
    await expect(page.getByRole('button', { name: /Jane Doe/i })).toBeVisible();
  });

  test('login → accès aux données protégées', async ({ page }) => {
    // Créer un user en DB directement pour la rapidité
    const user = await createTestUserInDB();

    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Mot de passe').fill('TestPass123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL('/dashboard');

    // Vérifier que les données réelles sont affichées
    await expect(page.getByTestId('project-count')).toBeVisible();
  });
});

// e2e/critical-flows/payment.spec.ts
test('upgrade vers plan Pro → features débloquées', async ({ page }) => {
  const user = await loginAsTestUser(page);

  await page.goto('/settings/billing');
  await page.getByRole('button', { name: 'Upgrade to Pro' }).click();

  // Stripe test mode
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Subscribe' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Pro plan')).toBeVisible();

  // Vérifier que les features Pro sont réellement débloquées
  await page.goto('/projects/new');
  await expect(page.getByText('Pro templates')).toBeVisible();
});
```

---

## Tests de Charge (k6)

```javascript
// load-tests/api-baseline.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const projectListDuration = new Trend('project_list_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Rampe montée
    { duration: '1m', target: 50 }, // Charge soutenue
    { duration: '30s', target: 100 }, // Pic de charge
    { duration: '30s', target: 0 }, // Descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'], // < 1% d'erreurs
    project_list_duration: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.app.com';
const TEST_TOKEN = __ENV.TEST_TOKEN; // Token d'un user de test stable

export default function () {
  const headers = { Authorization: `Bearer ${TEST_TOKEN}` };

  group('Projects API', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/projects`, { headers });
    projectListDuration.add(Date.now() - start);

    errorRate.add(res.status !== 200);
    check(res, {
      'status 200': (r) => r.status === 200,
      'response time OK': (r) => r.timings.duration < 500,
      'items array present': (r) => JSON.parse(r.body).items !== undefined,
    });
  });

  sleep(1);
}
```

---

## Tests Visuels (Storybook + Chromatic)

```typescript
// Chaque composant du design system a ses stories
// CI échoue si diff visuel détecté

// stories/DataTable.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from '@app/ui';

const meta: Meta<typeof DataTable> = {
  component: DataTable,
  parameters: { chromatic: { viewports: [375, 768, 1440] } },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const WithData: Story = {
  args: {
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created', type: 'date' },
    ],
    data: [
      { id: '1', name: 'Project Alpha', status: 'active', createdAt: new Date('2024-01-15') },
      { id: '2', name: 'Project Beta', status: 'archived', createdAt: new Date('2024-02-20') },
    ],
    totalRows: 2,
  },
};

export const Loading: Story = {
  args: { ...WithData.args, isLoading: true },
};

export const Empty: Story = {
  args: { ...WithData.args, data: [], totalRows: 0 },
};

export const ErrorState: Story = {
  args: { ...WithData.args, error: 'Failed to load data' },
};
```

---

## CI/CD Pipeline — Tests Intégrés

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: test, POSTGRES_PASSWORD: test }
        options: --health-cmd pg_isready
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping"

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:unit --coverage

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/test
          REDIS_URL: redis://localhost:6379
        run: |
          npx prisma migrate deploy
          npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v4

      - name: Run E2E tests
        run: npx playwright test
        env: { E2E_BASE_URL: http://localhost:3000 }

  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build-storybook
      - uses: chromaui/action@latest
        with: { projectToken: ${{ secrets.CHROMATIC_TOKEN }} }
```
