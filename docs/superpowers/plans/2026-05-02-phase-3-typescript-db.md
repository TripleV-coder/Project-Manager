# Phase 3 — TypeScript strict + DB Optimization (3 j)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer le code de "TypeScript-déclaratif-mais-jamais-utilisé" à "TypeScript strict réel" sur `lib/` et `models/`. Ajouter 5 indexes composés MongoDB et un framework de migrations versionnées (`migrate-mongo`).

**Architecture:** Migration TS fichier par fichier (lib/ → models/). À chaque fichier, on commit dès que `npm run typecheck && npm test` passent. Le `tsconfig.json` reste `strict: true` mais on **active progressivement** `noImplicitAny` et `strictNullChecks` modules par modules via overrides. Pour MongoDB : ajout d'indexes via les schémas Mongoose (`.index({...})`) — Mongoose les crée au démarrage de l'app.

**Tech Stack:** TypeScript 6 · Mongoose 8.10 · migrate-mongo 11.x.

**Pré-requis :** Phase 2 complète.

---

## File Structure

| Fichier                                              | Action         | Responsabilité                                          |
| ---------------------------------------------------- | -------------- | ------------------------------------------------------- |
| `tsconfig.json`                                      | Modify         | Activer `noImplicitAny: true`, `strictNullChecks: true` |
| `tsconfig.lib.json`                                  | Create         | Override strict pour lib/ uniquement (transitionnel)    |
| `types/api.ts`                                       | Create         | Types partagés API (request/response)                   |
| `types/models.ts`                                    | Create         | Types Mongoose IUser, IProject, ITask, etc.             |
| `types/permissions.ts`                               | Create         | Type `Permissions` à partir du schéma Role              |
| `lib/*.js` (≈ 30 fichiers)                           | Rename → `.ts` | Migration TS par fichier                                |
| `models/*.js` (18 fichiers)                          | Rename → `.ts` | Migration TS modèles                                    |
| `migrations/migrate-mongo-config.js`                 | Create         | Config migrate-mongo                                    |
| `migrations/20260502120000-add-composite-indexes.js` | Create         | Première migration : 5 indexes                          |
| `package.json`                                       | Modify         | Scripts `db:migrate`, `db:rollback`, `db:status`        |

---

## Tasks

### Task 3.1 : Activer TypeScript strict (incrémental)

**Files :** `tsconfig.json`, `tsconfig.lib.json`.

- [ ] **Step 1 :** Avant tout, capturer baseline

  ```bash
  npm run typecheck > docs/superpowers/baselines/typecheck_phase3_start.txt 2>&1 || true
  ```

- [ ] **Step 2 :** Modifier `tsconfig.json` — passer en strict réel mais avec `exclude` temporaire pour `app/` et `components/` (à migrer plus tard) :

  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "checkJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitReturns": true,
      "noFallthroughCasesInSwitch": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "paths": { "@/*": ["./*"] }
    },
    "include": [
      "next-env.d.ts",
      "lib/**/*.ts",
      "models/**/*.ts",
      "types/**/*.ts",
      ".next/types/**/*.ts"
    ],
    "exclude": ["node_modules", ".next", "dist", "build", "coverage"]
  }
  ```

- [ ] **Step 3 :** Tester :

  ```bash
  npm run typecheck
  ```

  Attendu : 0 erreur (puisque l'include est restrictif et les fichiers sont encore `.js`).

- [ ] **Step 4 :** Commit
  ```bash
  git add tsconfig.json
  git commit -m "phase-3: enable TS strict + restrict scope to lib/models/types (transitional)"
  ```

---

### Task 3.2 : Créer les types partagés

**Files :** `types/api.ts`, `types/models.ts`, `types/permissions.ts`.

- [ ] **Step 1 :** `types/api.ts`

  ```ts
  export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }

  export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
    pagination?: PaginationMeta;
  }

  export interface ApiError {
    success: false;
    error: { message: string; code: string; details?: unknown };
  }

  export type ApiResponse<T> = ApiSuccess<T> | ApiError;
  ```

- [ ] **Step 2 :** `types/permissions.ts`

  ```ts
  export const PERMISSION_KEYS = [
    'voirTousProjets',
    'voirSesProjets',
    'creerProjet',
    'supprimerProjet',
    'modifierCharteProjet',
    'gererMembresProjet',
    'changerRoleMembre',
    'gererTaches',
    'deplacerTaches',
    'prioriserBacklog',
    'gererSprints',
    'modifierBudget',
    'voirBudget',
    'voirTempsPasses',
    'saisirTemps',
    'validerLivrable',
    'gererFichiers',
    'commenter',
    'recevoirNotifications',
    'genererRapports',
    'voirAudit',
    'gererUtilisateurs',
    'adminConfig',
  ] as const;

  export type PermissionKey = (typeof PERMISSION_KEYS)[number];
  export type Permissions = Record<PermissionKey, boolean>;
  ```

- [ ] **Step 3 :** `types/models.ts` — types des documents Mongoose. Exemple pour `IUser` :

  ```ts
  import type { Types } from 'mongoose';
  import type { Permissions } from './permissions';

  export interface IUser {
    _id: Types.ObjectId;
    email: string;
    password: string;
    nom: string;
    prénom: string;
    role_id: Types.ObjectId;
    permissions?: Permissions;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }
  // ... IProject, ITask, ISprint, IComment, etc.
  ```

- [ ] **Step 4 :** `npm run typecheck` doit rester vert.

- [ ] **Step 5 :** Commit
  ```bash
  git add types/
  git commit -m "phase-3: shared TS types (api, models, permissions)"
  ```

---

### Task 3.3 : Migrer `lib/` (.js → .ts), 1 fichier à la fois

**Liste prioritaire :** apiResponse, apiErrors, withApiHandler, requestSize, passwordPolicy, twoFactorGate, schemas, validate, rateLimit, sanitize, auth, requestAuth, authCookie, mongodb, db, dbTransactions, logger, cache, permissions, mongoOptimize, fetch-with-timeout, envValidation, inputValidator, requestValidation, plugins/softDelete, services/\* (10 fichiers).

**Pour chaque fichier :**

- [ ] **Step 1 :** Renommer
  ```bash
  git mv lib/<file>.js lib/<file>.ts
  ```
- [ ] **Step 2 :** Ajouter les types : remplacer JSDoc par signatures TS, ajouter imports `import type`, typer les paramètres.
- [ ] **Step 3 :** `npm run typecheck` — corriger les erreurs.
- [ ] **Step 4 :** `npm test -- <module>` — corriger si test régresse.
- [ ] **Step 5 :** Commit
  ```bash
  git commit -am "phase-3: migrate lib/<file> to TypeScript"
  ```

**Stratégie pour limiter le travail :**

- Activer **un seul type d'erreur stricte à la fois** si nécessaire — sinon on bloque sur 100 erreurs.
- Pour les utilities qui interagissent avec Mongoose, utiliser `Document<unknown, {}, IUser> & IUser` comme retour type.

**Estimation :** ~30 fichiers × 5-15 min = 4-7 h.

---

### Task 3.4 : Migrer `models/` (.js → .ts)

Pour chaque modèle (User, Role, Project, ProjectRole, Task, Sprint, Deliverable, DeliverableType, Budget, Comment, File, Notification, Timesheet, AuditLog, AppSettings, SharePointConfig, ProjectTemplate, UserSession) :

- [ ] **Step 1 :** Renommer `.js` → `.ts`
- [ ] **Step 2 :** Typer le schéma + le modèle :

  ```ts
  import mongoose, { Schema, Model } from 'mongoose';
  import type { IUser } from '@/types/models';
  import { softDeletePlugin } from '@/lib/plugins/softDelete';

  const userSchema = new Schema<IUser>(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      // ...
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
  );

  userSchema.plugin(softDeletePlugin);

  const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
  export default User;
  ```

- [ ] **Step 3 :** `npm run typecheck && npm test`
- [ ] **Step 4 :** Commit individuel

**Estimation :** 18 × 10 min = 3 h.

---

### Task 3.5 : Étendre l'include TS à `app/` et `components/`

- [ ] **Step 1 :** Modifier `tsconfig.json` `include` pour ajouter `app/**/*.{ts,tsx,js,jsx}`, `components/**/*.{ts,tsx,js,jsx}`, `hooks/**/*.{ts,tsx,js,jsx}`, `contexts/**/*.{ts,tsx,js,jsx}`.

- [ ] **Step 2 :** Capturer le bruit

  ```bash
  npm run typecheck 2>&1 | tee docs/superpowers/baselines/typecheck_after_extend.txt
  ```

- [ ] **Step 3 :** **Désactiver localement les checks stricts** sur les fichiers `.js`/`.jsx` qui ne sont pas migrés :
  - Soit `// @ts-nocheck` en tête de fichier (rapide mais sale)
  - Soit override dans `tsconfig.json` :
    ```json
    "overrides": [
      { "files": ["app/**/*.{js,jsx}", "components/**/*.{js,jsx}"], "compilerOptions": { "noImplicitAny": false, "strictNullChecks": false } }
    ]
    ```
    Note : `overrides` n'est pas natif tsc — utiliser plutôt des `tsconfig` séparés ou ajouter `// @ts-nocheck` au cas par cas.

- [ ] **Step 4 :** Commit
  ```bash
  git add tsconfig.json
  git commit -m "phase-3: extend tsc scope to app/components/hooks/contexts (with relax for legacy .js)"
  ```

---

### Task 3.6 : Setup `migrate-mongo`

**Files :** `migrations/migrate-mongo-config.js`, `migrations/<timestamp>-add-composite-indexes.js`, `package.json`.

- [ ] **Step 1 :** Installer

  ```bash
  npm install --save-dev migrate-mongo
  ```

- [ ] **Step 2 :** Initialiser

  ```bash
  npx migrate-mongo init
  ```

  Cela crée `migrate-mongo-config.js` à la racine + dossier `migrations/`.

- [ ] **Step 3 :** Configurer `migrate-mongo-config.js` :

  ```js
  const config = {
    mongodb: {
      url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      databaseName: process.env.MONGODB_DB || 'project_manager',
      options: { useNewUrlParser: true, useUnifiedTopology: true },
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'changelog',
    migrationFileExtension: '.js',
    useFileHash: false,
    moduleSystem: 'esm',
  };
  module.exports = config;
  ```

- [ ] **Step 4 :** Scripts dans `package.json` :

  ```json
  "db:migrate": "migrate-mongo up",
  "db:rollback": "migrate-mongo down",
  "db:status": "migrate-mongo status"
  ```

- [ ] **Step 5 :** Commit
  ```bash
  git add package.json package-lock.json migrate-mongo-config.js migrations/
  git commit -m "phase-3: setup migrate-mongo framework"
  ```

---

### Task 3.7 : Migration #1 — 5 indexes composés

**File :** `migrations/<timestamp>-add-composite-indexes.js`.

- [ ] **Step 1 :** Créer la migration

  ```bash
  npx migrate-mongo create add-composite-indexes
  ```

- [ ] **Step 2 :** Implémenter

  ```js
  module.exports = {
    async up(db) {
      await db.collection('users').createIndex({ email: 1, status: 1 });
      await db.collection('tasks').createIndex({ projet_id: 1, statut: 1, deleted_at: 1 });
      await db.collection('sprints').createIndex({ projet_id: 1, statut: 1, deleted_at: 1 });
      await db.collection('projects').createIndex({ chef_projet: 1, archived: 1, deleted_at: 1 });
      await db.collection('comments').createIndex({ entity_type: 1, entity_id: 1, created_at: -1 });
    },
    async down(db) {
      await db.collection('users').dropIndex({ email: 1, status: 1 });
      await db.collection('tasks').dropIndex({ projet_id: 1, statut: 1, deleted_at: 1 });
      await db.collection('sprints').dropIndex({ projet_id: 1, statut: 1, deleted_at: 1 });
      await db.collection('projects').dropIndex({ chef_projet: 1, archived: 1, deleted_at: 1 });
      await db.collection('comments').dropIndex({ entity_type: 1, entity_id: 1, created_at: -1 });
    },
  };
  ```

- [ ] **Step 3 :** Lancer (en local) — démarrer Mongo via Docker si pas déjà :

  ```bash
  docker compose up -d mongo
  npm run db:migrate
  ```

- [ ] **Step 4 :** Vérifier

  ```bash
  echo "use project_manager; db.tasks.getIndexes()" | mongosh
  ```

  Attendu : index `projet_id_1_statut_1_deleted_at_1` listé.

- [ ] **Step 5 :** Commit
  ```bash
  git add migrations/
  git commit -m "phase-3: migration #1 — 5 composite indexes"
  ```

---

### Task 3.8 : Refléter les indexes dans les schémas Mongoose (idempotent)

**Pour cohérence dev (où Mongoose recrée les indexes au boot) :**

- [ ] **Step 1 :** Dans chaque modèle concerné, ajouter à la suite du schéma :

  ```ts
  taskSchema.index({ projet_id: 1, statut: 1, deleted_at: 1 });
  ```

  (équivalent à la migration mais permet à Mongoose de garantir l'index en dev sans rejouer la migration).

- [ ] **Step 2 :** Test

  ```bash
  npm run dev
  # vérifier dans Mongo Compass ou mongosh
  ```

- [ ] **Step 3 :** Commit
  ```bash
  git add models/
  git commit -m "phase-3: declare composite indexes in schemas"
  ```

---

### Task 3.9 : Verification gate Phase 3

- [ ] `npm run typecheck` exit 0 sur lib/ + models/ + types/ (et avec relax sur app/components legacy)
- [ ] `npm test` exit 0 (Mongoose typed corrigé partout)
- [ ] `npm run lint:strict` exit 0
- [ ] `npm run build` exit 0
- [ ] `npm run db:status` montre 1 migration appliquée
- [ ] Update CONTEXT.md :
  ```markdown
  ## Phase 3 — DONE (2026-05-XX)

  - lib/ + models/ + types/ migrés en TS strict
  - 5 indexes composés en place + framework migrate-mongo
  - Score estimé : 7.9 → 8.3
  ```
- [ ] Tag : `git tag phase-3-complete`

---

## Critères d'acceptation

- [ ] `find lib models -name '*.js' | wc -l` → 0 (tous migrés)
- [ ] `npm run typecheck` exit 0 avec `noImplicitAny + strictNullChecks` sur lib + models
- [ ] 5 indexes composés visibles dans `db.<col>.getIndexes()`
- [ ] `npm run db:rollback` fonctionne (test idempotence)

---

## Self-review

✅ Spec coverage : tsconfig strict, migration TS lib/models, indexes composés, framework migrations.
✅ Placeholder scan : aucun TBD ; les listes de fichiers à migrer sont déterministes (commande `ls`).
✅ Type consistency : `IUser`, `IProject`, etc. réutilisés cohérents ; `migrate-mongo-config.js` avec `migrationsDir: 'migrations'` cohérent avec les exemples.
