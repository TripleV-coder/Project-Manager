const { test, expect } = require('@playwright/test');
const {
  password,
  accounts,
  PROJECT_NAME,
  TASK_TITLE,
  FORMAT_ERROR,
  submitLogin,
  collectApiFailures,
  expectHealthyPage,
  visitPages,
  selectProjectIfNeeded,
  gotoStable,
} = require('./helpers');

test.describe.configure({ mode: 'serial', timeout: 180_000, retries: 1 });

const CORE_PAGES = [
  { path: '/dashboard', heading: /vue d'ensemble/i },
  { path: '/dashboard/projects', heading: /vos projets/i },
  { path: '/dashboard/kanban', heading: /tableau par étapes/i },
  { path: '/dashboard/backlog', heading: /réserve & tâches à planifier/i },
  { path: '/dashboard/sprints', heading: /objectifs & périodes de travail/i },
  { path: '/dashboard/roadmap', heading: /planning & calendrier/i },
  { path: '/dashboard/tasks', heading: /pilotage des activités/i },
  { path: '/dashboard/files', heading: /documents & livrables/i },
  { path: '/dashboard/comments', heading: /commentaires & activité/i },
  { path: '/dashboard/timesheets', heading: /suivi du temps/i },
  { path: '/dashboard/notifications', heading: /centre de notifications/i },
  { path: '/dashboard/profile', heading: /votre espace personnel/i },
];

const CHEF_EXTRA_PAGES = [
  { path: '/dashboard/budget', heading: /gestion du budget/i },
  { path: '/dashboard/reports', heading: /bilan de performance/i },
];

const ADMIN_PAGES = [
  ...CORE_PAGES,
  ...CHEF_EXTRA_PAGES,
  { path: '/dashboard/admin', heading: /^administration$/i },
  { path: '/dashboard/admin/roles', heading: /gestion des rôles/i },
  { path: '/dashboard/users', heading: /gestion des collaborateurs/i },
  { path: '/dashboard/admin/templates', heading: /modèles de projets/i },
  { path: '/dashboard/admin/deliverable-types', heading: /types de livrables/i },
  { path: '/dashboard/admin/sharepoint', heading: /configuration sharepoint/i },
  { path: '/dashboard/admin/audit', heading: /journal d'audit/i },
  { path: '/dashboard/settings', heading: /configuration de l'espace/i },
  { path: '/dashboard/maintenance', heading: /mode maintenance/i },
];

test(
  'admin : toutes les pages métier et admin chargent',
  { timeout: 180_000 },
  async ({ page }) => {
    await submitLogin(page, accounts.admin, password, '198.51.100.50');
    await visitPages(page, ADMIN_PAGES);
  }
);

test(
  'chef : pages métier, kanban, commentaire, temps, fichier, budget, rapport',
  { timeout: 180_000 },
  async ({ page }) => {
    await submitLogin(page, accounts.chef, password, '198.51.100.51');
    await visitPages(page, [...CORE_PAGES, ...CHEF_EXTRA_PAGES]);

    await gotoStable(page, '/dashboard/kanban');
    await expectHealthyPage(page, /tableau par étapes/i);
    await expect(page.getByText(TASK_TITLE).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/à faire/i).first()).toBeVisible();

    await gotoStable(page, '/dashboard/comments');
    await expectHealthyPage(page, /commentaires & activité/i);
    await selectProjectIfNeeded(page, PROJECT_NAME);
    const chefComment = `Commentaire E2E du chef - ${Date.now()}`;
    await page.getByPlaceholder(/écrivez votre commentaire/i).fill(chefComment);
    await page.getByRole('button', { name: /^publier$/i }).click();
    await expect(page.getByText(/commentaire publié/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(chefComment).first()).toBeVisible();

    await gotoStable(page, '/dashboard/timesheets');
    await expectHealthyPage(page, /suivi du temps/i);
    await page.getByRole('button', { name: /déclarer mon temps/i }).click();
    const timeDialog = page.getByRole('dialog');
    await expect(timeDialog).toBeVisible();
    await timeDialog.locator('[role="combobox"]').first().click();
    await page.getByRole('option', { name: PROJECT_NAME }).click();
    await timeDialog.locator('input[type="number"]').fill('2');
    await timeDialog.getByRole('button', { name: /^enregistrer$/i }).click();
    await expect(page.getByText(/temps enregistré/i)).toBeVisible({ timeout: 15_000 });

    await gotoStable(page, '/dashboard/files');
    await expectHealthyPage(page, /documents & livrables/i);
    await page.setInputFiles('input[type="file"]', {
      name: 'e2e-parcours.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('fichier e2e parcours pages'),
    });
    const uploadDialog = page.getByRole('dialog');
    await expect(uploadDialog.getByText(/téléverser des fichiers/i)).toBeVisible();
    await uploadDialog.getByRole('button', { name: /^téléverser$/i }).click();
    await expect(page.getByText(/e2e-parcours\.txt/i).first()).toBeVisible({ timeout: 20_000 });

    await gotoStable(page, '/dashboard/budget');
    await expectHealthyPage(page, /gestion du budget/i);
    await page.getByRole('button', { name: /justifier une dépense/i }).click();
    const expenseDialog = page.getByRole('dialog');
    await expect(expenseDialog.getByText(/déclarer un nouveau règlement/i)).toBeVisible();
    const expenseLabel = `Dépense E2E parcours ${Date.now()}`;
    await expenseDialog.locator('input').first().fill(expenseLabel);
    await expenseDialog.locator('input[type="number"]').fill('15000');
    await expenseDialog.getByRole('button', { name: /^ajouter$|^add$/i }).click();
    await expect(page.getByText(/dépense enregistrée/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(expenseLabel).first()).toBeVisible({ timeout: 20_000 });

    await gotoStable(page, '/dashboard/reports');
    await expectHealthyPage(page, /bilan de performance/i);
    await page.getByRole('button', { name: /générer le bilan/i }).click();
    await expect(page.getByText(/généré avec succès/i)).toBeVisible({ timeout: 20_000 });
  }
);

test(
  'membre : pages autorisées + actions ; admin/budget/rapports refusés proprement',
  { timeout: 180_000 },
  async ({ page }) => {
    await submitLogin(page, accounts.membre, password, '198.51.100.52');
    await visitPages(page, CORE_PAGES);

    await gotoStable(page, '/dashboard/kanban');
    await expectHealthyPage(page, /tableau par étapes/i);
    await expect(page.getByText(TASK_TITLE).first()).toBeVisible({ timeout: 20_000 });

    await gotoStable(page, '/dashboard/comments');
    await expectHealthyPage(page, /commentaires & activité/i);
    await selectProjectIfNeeded(page, PROJECT_NAME);
    const membreComment = `Commentaire E2E du membre - ${Date.now()}`;
    await page.getByPlaceholder(/écrivez votre commentaire/i).fill(membreComment);
    await page.getByRole('button', { name: /^publier$/i }).click();
    await expect(page.getByText(/commentaire publié/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(membreComment).first()).toBeVisible();

    await gotoStable(page, '/dashboard/timesheets');
    await expectHealthyPage(page, /suivi du temps/i);
    await page.getByRole('button', { name: /déclarer mon temps/i }).click();
    const timeDialog = page.getByRole('dialog');
    await expect(timeDialog).toBeVisible();
    await timeDialog.locator('[role="combobox"]').first().click();
    await page.getByRole('option', { name: PROJECT_NAME }).click();
    await timeDialog.locator('input[type="number"]').fill('1.5');
    await timeDialog.getByRole('button', { name: /^enregistrer$/i }).click();
    await expect(page.getByText(/temps enregistré/i)).toBeVisible({ timeout: 15_000 });

    await gotoStable(page, '/dashboard/profile');
    await expectHealthyPage(page, /votre espace personnel/i);
    await page.getByRole('button', { name: /modifier mes informations/i }).click();
    await page.getByPlaceholder(/votre nom/i).fill('Membre Test');
    await page.getByRole('button', { name: /^enregistrer$/i }).click();
    await expect(page.getByText(/profil mis à jour/i)).toBeVisible({ timeout: 15_000 });

    const forbidden = collectApiFailures(page);
    await gotoStable(page, '/dashboard/budget');
    await expect(
      page.getByText(/accès restreint|pas les droits|gestion du budget/i).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FORMAT_ERROR)).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Application error');

    await gotoStable(page, '/dashboard/reports');
    await expect(
      page.getByText(/accès restreint|pas les droits|bilan de performance/i).first()
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(FORMAT_ERROR)).toHaveCount(0);

    await gotoStable(page, '/dashboard/admin/roles');
    await expect(page).not.toHaveURL(/\/dashboard\/admin\/roles$/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText('Application error');
    expect(forbidden, forbidden.join('\n')).toEqual([]);
  }
);
