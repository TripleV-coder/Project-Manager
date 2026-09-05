const { expect } = require('@playwright/test');

const password = process.env.E2E_PASSWORD || 'E2eLocal123!';

const accounts = {
  admin: process.env.E2E_EMAIL || 'admin@test.pm',
  chef: process.env.E2E_CHEF_EMAIL || 'chef@test.pm',
  membre: process.env.E2E_MEMBRE_EMAIL || 'membre@test.pm',
};

const PROJECT_NAME = 'Projet E2E Chef';
const TASK_TITLE = 'Tâche E2E assignée au membre';
const FORMAT_ERROR =
  /format de données invalide|petit souci avec le format|erreur de format de données/i;

async function submitLogin(page, userEmail, userPassword, clientIp) {
  await page.unroute('**/api/auth/login').catch(() => {});
  await page.route('**/api/auth/login', async (route) => {
    const headers = { ...route.request().headers(), 'x-forwarded-for': clientIp };
    await route.continue({ headers });
  });
  await gotoStable(page, '/login');
  await expect(page.getByRole('heading', { name: /gestion de projets/i })).toBeVisible();

  const emailBox = page.getByRole('textbox', { name: /^email$/i });
  const passwordBox = page.getByRole('textbox', { name: /mot de passe/i });
  const submitBtn = page.getByRole('button', { name: /se connecter|log in/i });

  await expect(async () => {
    await emailBox.fill(userEmail);
    await passwordBox.fill(userPassword);
    await expect(emailBox).toHaveValue(userEmail);
    await expect(passwordBox).toHaveValue(userPassword);
  }).toPass({ timeout: 15_000, intervals: [200, 400, 800] });

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
    { timeout: 30_000 }
  );

  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();
  const response = await loginResponse;
  const body = await response.json().catch(() => ({}));
  expect(
    response.ok(),
    `Login ${userEmail} HTTP ${response.status()} ${JSON.stringify(body)}`
  ).toBeTruthy();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/first-login/);
  return body;
}

function collectApiFailures(page) {
  const failures = [];
  page.on('response', (res) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    if (url.includes('/api/socket')) return;
    if (res.status() >= 500) {
      failures.push(`${res.status()} ${res.request().method()} ${url}`);
    }
  });
  return failures;
}

async function expectHealthyPage(page, heading) {
  await page
    .locator('.animate-spin')
    .first()
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => {});
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.getByText(FORMAT_ERROR)).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Application error');
}

async function gotoStable(page, path) {
  await expect(async () => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
  }).toPass({ timeout: 45_000, intervals: [1_000, 2_000, 4_000] });
}

async function visitPages(page, routes) {
  const failures = collectApiFailures(page);
  for (const { path, heading } of routes) {
    await gotoStable(page, path);
    await expect(page).toHaveURL(new RegExp(path.replaceAll('/', '\\/')));
    await expectHealthyPage(page, heading);
  }
  expect(failures, failures.join('\n')).toEqual([]);
}

async function selectProjectIfNeeded(page, projectName) {
  const projectCombo = page.locator('[role="combobox"]').first();
  await expect(projectCombo).toBeVisible();
  const label = (await projectCombo.innerText()).trim();
  if (label.includes(projectName)) return;
  await projectCombo.click();
  await page.getByRole('option', { name: projectName }).click();
}

module.exports = {
  password,
  accounts,
  PROJECT_NAME,
  TASK_TITLE,
  FORMAT_ERROR,
  submitLogin,
  collectApiFailures,
  expectHealthyPage,
  gotoStable,
  visitPages,
  selectProjectIfNeeded,
};
