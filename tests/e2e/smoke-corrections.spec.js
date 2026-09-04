const { test, expect } = require('@playwright/test');
const {
  password,
  accounts,
  PROJECT_NAME,
  TASK_TITLE,
  FORMAT_ERROR,
  submitLogin,
  expectHealthyPage,
  gotoStable,
} = require('./helpers');

const CREATED_TASK_TITLE = 'Tâche E2E créée par le chef';
const SPRINT_NAME = 'Sprint E2E Chef';

test.describe.configure({ mode: 'serial' });

test('un login refusé affiche Identifiants invalides, pas une réponse auth invalide', async ({
  page,
}) => {
  await page.route('**/api/auth/login', async (route) => {
    const headers = { ...route.request().headers(), 'x-forwarded-for': '198.51.100.21' };
    await route.continue({ headers });
  });
  await page.goto('/login');
  await expect(async () => {
    await page.getByRole('textbox', { name: /^email$/i }).fill('nobody@example.com');
    await page.getByRole('textbox', { name: /mot de passe/i }).fill('NotThePassword1!');
    await expect(page.getByRole('textbox', { name: /^email$/i })).toHaveValue('nobody@example.com');
  }).toPass({ timeout: 10_000, intervals: [200, 400, 800] });
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /se connecter|log in/i }).click();
  expect((await loginResponse).status()).toBe(401);
  await expect(page.getByText(/identifiants invalides/i)).toBeVisible();
  await expect(page.getByText(/réponse d'authentification invalide/i)).toHaveCount(0);
});

test(
  'admin se connecte et les listes chargent sans erreur de format',
  { timeout: 120_000 },
  async ({ page }) => {
    await submitLogin(page, accounts.admin, password, '198.51.100.31');
    await expect(page).toHaveURL(/\/dashboard/);

    for (const route of [
      '/dashboard/tasks',
      '/dashboard/backlog',
      '/dashboard/sprints',
      '/dashboard/timesheets',
      '/dashboard/admin/sharepoint',
    ]) {
      await gotoStable(page, route);
      await expect(page).toHaveURL(new RegExp(route.replaceAll('/', '\\/')));
      await page
        .locator('.animate-spin')
        .first()
        .waitFor({ state: 'hidden', timeout: 20_000 })
        .catch(() => {});
      await expect(page.getByText(FORMAT_ERROR)).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Application error');
    }

    await expectHealthyPage(page, /configuration sharepoint/i);
    const sharepointConfig = await page.request.get('/api/sharepoint/config');
    expect(
      sharepointConfig.ok(),
      `GET /api/sharepoint/config ${sharepointConfig.status()}`
    ).toBeTruthy();
    const sharepointJson = await sharepointConfig.json();
    expect(sharepointJson.config).toBeDefined();
    expect(sharepointJson.config.client_secret).toBe('');
  }
);

test('le chef voit son projet et le membre du roster', async ({ page }) => {
  await submitLogin(page, accounts.chef, password, '198.51.100.32');
  await page.goto('/dashboard/projects');
  await expect(page.getByText(PROJECT_NAME)).toBeVisible();
  await page.getByText(PROJECT_NAME).first().click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[a-f0-9]{24}/);
  await expect(page.getByRole('button', { name: /ajouter un membre/i })).toBeVisible();
  await expect(page.getByText('Membre Test')).toBeVisible();
  await expect(page.getByText("L'équipe n'a pas encore de membres assignés.")).toHaveCount(0);
});

test('le membre voit la tâche qui lui est assignée', async ({ page }) => {
  await submitLogin(page, accounts.membre, password, '198.51.100.33');
  await expect(page.getByRole('link', { name: /suivi des tâches/i })).toBeVisible();
  await page.goto('/dashboard/tasks');
  await expect(page.getByText(TASK_TITLE)).toBeVisible();
});

test(
  'le chef recrute un membre, crée une tâche et démarre un sprint',
  { timeout: 90_000 },
  async ({ page }) => {
    await submitLogin(page, accounts.chef, password, '198.51.100.34');

    await page.goto('/dashboard/projects');
    await expect(page.getByText(PROJECT_NAME)).toBeVisible();
    await page.getByText(PROJECT_NAME).first().click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/[a-f0-9]{24}/);

    await page.getByRole('button', { name: /ajouter un membre/i }).click();
    const memberDialog = page.getByRole('dialog');
    await expect(memberDialog.getByText(/ajouter un membre au projet/i)).toBeVisible();
    await memberDialog.getByText('Sélectionnez un utilisateur').click();
    await page.getByRole('option', { name: /recrue e2e/i }).click();
    await memberDialog.getByText('Sélectionnez un rôle pour le projet').click();
    await page.getByRole('option', { name: /membre équipe/i }).click();
    await memberDialog.getByRole('button', { name: /ajouter le membre/i }).click();
    await expect(page.getByText('Recrue E2E')).toBeVisible({ timeout: 20_000 });

    await page.goto('/dashboard/tasks');
    await expect(page.getByRole('button', { name: /nouvelle tâche/i })).toBeVisible();
    await page.getByRole('button', { name: /nouvelle tâche/i }).click();
    const taskDialog = page.getByRole('dialog');
    await taskDialog.getByPlaceholder(/quelle action/i).fill(CREATED_TASK_TITLE);
    const assigneeTrigger = taskDialog.getByText(/en attente d'attribution/i);
    if (await assigneeTrigger.isVisible()) {
      await assigneeTrigger.click();
      await page.getByRole('option', { name: /membre test/i }).click();
    }
    await taskDialog.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(CREATED_TASK_TITLE)).toBeVisible({ timeout: 20_000 });

    await page.goto('/dashboard/sprints');
    await page
      .getByRole('button', { name: /planifier une période/i })
      .first()
      .click();
    const sprintDialog = page.getByRole('dialog');
    await expect(sprintDialog.getByText(/planifier une nouvelle période/i)).toBeVisible();
    await sprintDialog.getByPlaceholder(/semaine 1|sprint 1/i).fill(SPRINT_NAME);
    await sprintDialog.getByText('Sélectionnez le projet').click();
    await page.getByRole('option', { name: PROJECT_NAME }).click();
    const today = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const iso = (date) => date.toISOString().slice(0, 10);
    const dateInputs = sprintDialog.locator('input[type="date"]');
    await dateInputs.nth(0).fill(iso(today));
    await dateInputs.nth(1).fill(iso(nextWeek));
    await sprintDialog.getByRole('button', { name: /valider et planifier/i }).click();
    await expect(page.getByText(SPRINT_NAME)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /lancer la période/i }).click();
    await expect(page.getByText(/sprint démarré avec succès/i)).toBeVisible({ timeout: 20_000 });
  }
);
