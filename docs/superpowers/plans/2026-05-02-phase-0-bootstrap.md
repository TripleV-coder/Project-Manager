# Phase 0 — Bootstrap (0.5 j)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réinstaller les dépendances, capturer baselines (lint, typecheck, audit, tests), créer la branche dédiée et le fichier `CONTEXT.md` qui pilotera les phases suivantes.

**Architecture:** Travail purement opérationnel — aucun code applicatif modifié. Pré-requis dur des phases 1-6.

---

## File Structure

| Fichier                                             | Action | Responsabilité                                            |
| --------------------------------------------------- | ------ | --------------------------------------------------------- |
| `docs/superpowers/baselines/lint_baseline.txt`      | Create | snapshot lint au 2026-05-02                               |
| `docs/superpowers/baselines/typecheck_baseline.txt` | Create | snapshot tsc                                              |
| `docs/superpowers/baselines/audit_baseline.json`    | Create | snapshot npm audit                                        |
| `docs/superpowers/baselines/coverage_baseline.txt`  | Create | snapshot coverage Jest                                    |
| `CONTEXT.md`                                        | Create | tracker inter-sessions des phases (cf. CLAUDE.md du repo) |

---

## Tasks

### Task 0.1 : Vérifier l'état git

- [ ] **Step 1 :** Vérifier qu'aucun travail en cours n'est perdu

  ```bash
  git status
  ```

  Le projet a beaucoup de fichiers `M` mais zéro `??` non listé : commit en attente sur `main` à valider avec l'utilisateur **avant** Phase 0.

- [ ] **Step 2 :** Si l'utilisateur valide, snapshot des modifications en cours

  ```bash
  git stash push -u -m "pre-phase-0 snapshot 2026-05-02"
  ```

  Sinon, l'utilisateur doit committer ou décrire ce qu'il faut faire.

- [ ] **Step 3 :** Créer la branche

  ```bash
  git checkout -b feat/quality-upgrade-9
  ```

- [ ] **Step 4 :** Pop le stash sur la nouvelle branche (si stashé en step 2)
  ```bash
  git stash pop
  ```

---

### Task 0.2 : Installer les dépendances

- [ ] **Step 1 :** Installation

  ```bash
  npm install
  ```

  Attendu : `node_modules/` créé. Aucune erreur. Warnings de peer-deps acceptables.

- [ ] **Step 2 :** Vérifier que les binaires CLI sont présents
  ```bash
  ls node_modules/.bin/eslint node_modules/.bin/jest node_modules/.bin/next node_modules/.bin/tsc
  ```

---

### Task 0.3 : Capturer les baselines

- [ ] **Step 1 :** Créer le dossier

  ```bash
  mkdir -p docs/superpowers/baselines
  ```

- [ ] **Step 2 :** Lint

  ```bash
  npm run lint > docs/superpowers/baselines/lint_baseline.txt 2>&1 || true
  ```

  Noter le total de problèmes (errors + warnings) en bas du fichier.

- [ ] **Step 3 :** Typecheck

  ```bash
  npm run typecheck > docs/superpowers/baselines/typecheck_baseline.txt 2>&1 || true
  ```

- [ ] **Step 4 :** Audit npm

  ```bash
  npm audit --json > docs/superpowers/baselines/audit_baseline.json 2>&1 || true
  ```

- [ ] **Step 5 :** Coverage initiale
  ```bash
  npm run test:coverage -- --silent > docs/superpowers/baselines/coverage_baseline.txt 2>&1 || true
  ```

---

### Task 0.4 : Initialiser `CONTEXT.md`

- [ ] **Step 1 :** Créer `CONTEXT.md` à la racine :

  ```markdown
  # Project-Manager — Quality Upgrade Tracker

  Branche : `feat/quality-upgrade-9` · Démarrée le 2026-05-02

  ## Baseline (Phase 0)

  - Lint : <REMPLIR — total problèmes>
  - Typecheck : <PASS / FAIL nb>
  - Tests : <PASS, coverage XX%>
  - Audit npm : <0 high / X moderate>

  ## Phase 1 — Quick Wins + Sécurité critique

  Status : 🟡 todo
  Plan : `docs/superpowers/plans/2026-05-02-phase-1-quickwins-security.md`

  ## Phase 2 — Architecture API + Soft Deletes

  Status : 🟡 todo
  Plan : `docs/superpowers/plans/2026-05-02-phase-2-api-architecture.md`

  ## Phase 3 — TypeScript + DB

  Status : 🟡 todo
  Plan : `docs/superpowers/plans/2026-05-02-phase-3-typescript-db.md`

  ## Phase 4 — Tests E2E + Coverage 70%

  Status : 🟡 todo
  Plan : `docs/superpowers/plans/2026-05-02-phase-4-tests.md`

  ## Phase 5 — Observabilité + Performance

  Status : 🟡 todo
  Plan : `docs/superpowers/plans/2026-05-02-phase-5-observability-perf.md`

  ## Phase 6 — DevOps + Doc + Features

  Status : 🟡 todo
  Plan : `docs/superpowers/plans/2026-05-02-phase-6-devops-docs-features.md`

  ## Score actuel : 6.8 / 10
  ```

- [ ] **Step 2 :** Compléter avec les chiffres de Task 0.3.

---

### Task 0.5 : Commit bootstrap

- [ ] **Step 1 :** Commit

  ```bash
  git add docs/superpowers/baselines CONTEXT.md
  git commit -m "phase-0: install deps, capture baselines, init CONTEXT.md"
  ```

- [ ] **Step 2 :** Tag
  ```bash
  git tag phase-0-complete
  ```

---

## Critères d'acceptation Phase 0

- [ ] Branche `feat/quality-upgrade-9` créée et active
- [ ] `node_modules/` installé sans erreur
- [ ] 4 fichiers baseline présents dans `docs/superpowers/baselines/`
- [ ] `CONTEXT.md` créé avec les chiffres
- [ ] Commit `phase-0: ...` présent

---

## Self-review

✅ Spec coverage : tous les éléments du master plan Phase 0 mappés (install, baselines, branche, CONTEXT.md).
✅ Placeholder scan : aucun TBD ; les `<REMPLIR>` sont des points de remplissage explicites avec source claire.
✅ Type consistency : noms cohérents (branche `feat/quality-upgrade-9` partout).
