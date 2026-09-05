# Plan de Corrections Complètes — PM Gestion de Projets

> **Contexte** : Application Next.js 14 + MongoDB, gestion de projets Agile.
> **État actuel** : 72/100 — fonctionnalités complètes, sécurité partiellement corrigée, architecture à refactorer.
> **Objectif** : Amener l'application à un état production-ready (~90/100).

---

## Table des matières

1. [Phase 1 — Migration complète vers cookies httpOnly](#phase-1)
2. [Phase 2 — Éclatement du monolithe API](#phase-2)
3. [Phase 3 — Rate limiting Socket.io](#phase-3)
4. [Phase 4 — Validation centralisée des entrées API](#phase-4)
5. [Phase 5 — Couverture de tests réelle](#phase-5)
6. [Phase 6 — Nettoyage final](#phase-6)

---

## Phase 1 — Migration complète vers cookies httpOnly {#phase-1}

### Problème

Le token JWT est encore lu depuis `localStorage.getItem('pm_token')` dans **102 occurrences / 34 fichiers**. L'infrastructure backend httpOnly existe déjà (`lib/authCookie.js`, `lib/requestAuth.js`, `lib/client-auth.js`) mais le frontend n'a pas migré.

### Ce qui existe déjà

**Backend (prêt, ne pas toucher) :**

- `lib/authCookie.js` — Set/get/clear cookie `auth_token`, config par env (dev: Lax, prod: Strict + Secure)
- `lib/requestAuth.js` — `getTokenFromRequest()` accepte déjà header OU cookie. `authenticateRequest()` fait le dual mode. `attachAuthCookie()` et `clearAuthCookies()` gèrent la réponse.
- `lib/client-auth.js` — Pose un marqueur `pm_token = 'cookie-authenticated'` dans localStorage (PAS le vrai token). Fonctions : `markAuthSession()`, `clearAuthSession()`, `hasAuthSessionMarker()`.
- `middleware.js` — Vérifie déjà le cookie `auth_token` pour les routes frontend. Redirige vers `/login` si absent.
- `requestAuth.js` ligne 12-17 — Le Bearer `'cookie-authenticated'` est dans `INVALID_BEARER_VALUES` et est ignoré côté serveur.

**Conséquence** : Le serveur accepte déjà les cookies. Il suffit de migrer le frontend.

### Étape 1.1 — Créer le hook `useAuthFetch`

Créer `hooks/useAuthFetch.js` :

```javascript
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { clearAuthSession, hasAuthSessionMarker } from '@/lib/client-auth';

export function useAuthFetch() {
  const router = useRouter();

  const authFetch = useCallback(
    async (url, options = {}) => {
      if (!hasAuthSessionMarker()) {
        router.push('/login');
        return null;
      }

      const response = await fetch(url, {
        ...options,
        credentials: 'same-origin', // envoie le cookie auth_token automatiquement
        headers: {
          ...options.headers,
          // PAS de Authorization header — le cookie suffit
        },
      });

      if (response.status === 401) {
        clearAuthSession();
        router.push('/login');
        return null;
      }

      return response;
    },
    [router]
  );

  return { authFetch };
}
```

### Étape 1.2 — Migrer chaque fichier

Remplacer le pattern :

```javascript
// AVANT (102 occurrences)
const token = localStorage.getItem('pm_token');
if (!token) {
  router.push('/login');
  return;
}
const response = await fetch('/api/xxx', {
  headers: { Authorization: `Bearer ${token}` },
});
```

Par :

```javascript
// APRÈS
const { authFetch } = useAuthFetch();
const response = await authFetch('/api/xxx');
if (!response) return;
```

**Liste exhaustive des 34 fichiers à migrer :**

| Fichier                                           | Occurrences |
| ------------------------------------------------- | ----------- |
| `app/dashboard/sprints/page.js`                   | 8           |
| `app/dashboard/budget/page.js`                    | 7           |
| `app/dashboard/projects/[id]/page.js`             | 6           |
| `app/dashboard/admin/sharepoint/page.js`          | 5           |
| `app/dashboard/admin/templates/page.js`           | 5           |
| `app/dashboard/files/page.js`                     | 5           |
| `app/dashboard/admin/deliverable-types/page.js`   | 4           |
| `app/dashboard/admin/roles/page.js`               | 4           |
| `app/dashboard/comments/page.js`                  | 4           |
| `app/dashboard/notifications/page.js`             | 4           |
| `components/TwoFactorSetup.js`                    | 4           |
| `app/dashboard/admin/audit/page.js`               | 3           |
| `app/dashboard/backlog/page.js`                   | 3           |
| `app/dashboard/maintenance/page.js`               | 3           |
| `app/dashboard/timesheets/page.js`                | 3           |
| `app/dashboard/admin/audit/user/[userId]/page.js` | 2           |
| `app/dashboard/kanban/page.js`                    | 2           |
| `app/dashboard/projects/page.js`                  | 2           |
| `app/dashboard/profile/page.js`                   | 2           |
| `app/dashboard/settings/page.js`                  | 2           |
| `app/dashboard/tasks/page.js`                     | 2           |
| `hooks/useItemFormData.js`                        | 2           |
| `hooks/usePushNotifications.js`                   | 2           |
| `app/dashboard/admin/page.js`                     | 1           |
| `app/dashboard/page.js`                           | 1           |
| `app/dashboard/reports/page.js`                   | 1           |
| `app/dashboard/roadmap/page.js`                   | 1           |
| `app/maintenance/page.js`                         | 1           |
| `components/ItemFormDialog.jsx`                   | 1           |
| `components/TaskStatusWorkflow.jsx`               | 1           |
| `components/WorkflowStatusBadge.jsx`              | 1           |
| `contexts/AppSettingsContext.js`                  | 1           |

**Ne PAS toucher** : `lib/client-auth.js` (contient `getLegacyAuthMarker()` qui lit pm_token pour le marqueur, c'est voulu).

### Étape 1.3 — Migrer les composants non-page

Pour `components/TwoFactorSetup.js`, `components/ItemFormDialog.jsx`, `components/TaskStatusWorkflow.jsx`, `components/WorkflowStatusBadge.jsx` : ces composants ne peuvent pas utiliser `useRouter` directement. Leur passer `authFetch` en prop depuis la page parente, ou créer une version du fetch sans redirect :

```javascript
// lib/auth-fetch.js (utilitaire pur, pas de hook)
import { clearAuthSession, hasAuthSessionMarker } from '@/lib/client-auth';

export async function authFetch(url, options = {}) {
  if (typeof window !== 'undefined' && !hasAuthSessionMarker()) {
    return null;
  }
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
  });
  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuthSession();
    window.location.href = '/login';
    return null;
  }
  return response;
}
```

### Étape 1.4 — Migrer les hooks

Pour `hooks/useItemFormData.js`, `hooks/usePushNotifications.js` : utiliser le hook `useAuthFetch` directement (ces hooks sont des React hooks, pas des composants).

### Étape 1.5 — Vérifier la page de login

Vérifier que `app/login/page.js` :

1. Appelle `POST /api/auth/login` avec `credentials: 'same-origin'`
2. Le serveur répond avec `Set-Cookie: auth_token=...` (déjà fait dans le route handler)
3. Après succès, appelle `markAuthSession(user)` de `lib/client-auth.js`
4. Ne stocke PAS le vrai JWT dans localStorage

### Étape 1.6 — Vérifier le logout

Vérifier que `app/api/auth/logout/route.js` (déjà extrait) :

1. Appelle `clearAuthCookies(response)` — ✅ déjà fait
2. Le frontend appelle `clearAuthSession()` — vérifier

### Étape 1.7 — Supprimer les traces

Une fois tout migré, `grep -rn "localStorage.getItem('pm_token')" --include="*.js" --include="*.jsx"` ne doit retourner QUE `lib/client-auth.js` (1 occurrence pour le marqueur).

### Critère de succès

```bash
grep -rn "Authorization.*Bearer" --include="*.js" --include="*.jsx" app/ components/ hooks/ contexts/
# Doit retourner 0 résultats (hors lib/ et tests/)
```

---

## Phase 2 — Éclatement du monolithe API {#phase-2}

### Problème

`app/api/[[...path]]/route.js` fait **5 971 lignes**. Impossible à maintenir, tester ou reviewer.

### Stratégie

Next.js App Router supporte les routes fichier. Créer un fichier `route.js` par domaine sous `app/api/`.

### Routes déjà extraites (ne pas toucher)

- `app/api/init/route.js`
- `app/api/auth/me/route.js`
- `app/api/auth/logout/route.js`
- `app/api/health/route.js`
- `app/api/projects/route.js`
- `app/api/socket/route.js`

### Plan d'extraction

Créer ces fichiers, en extrayant le code correspondant du monolithe :

| Nouveau fichier                              | Endpoints à extraire                         | Lignes estimées |
| -------------------------------------------- | -------------------------------------------- | --------------- |
| `app/api/auth/login/route.js`                | POST `/api/auth/login`                       | ~80             |
| `app/api/auth/first-admin/route.js`          | POST `/api/auth/first-admin`                 | ~100            |
| `app/api/auth/first-login-reset/route.js`    | POST `/api/auth/first-login-reset`           | ~60             |
| `app/api/auth/2fa/setup/route.js`            | POST `/api/auth/2fa/setup`                   | ~40             |
| `app/api/auth/2fa/verify/route.js`           | POST `/api/auth/2fa/verify`                  | ~40             |
| `app/api/auth/2fa/verify-setup/route.js`     | POST `/api/auth/2fa/verify-setup`            | ~40             |
| `app/api/auth/2fa/disable/route.js`          | POST `/api/auth/2fa/disable`                 | ~30             |
| `app/api/auth/2fa/regenerate-codes/route.js` | POST `/api/auth/2fa/regenerate-codes`        | ~30             |
| `app/api/auth/2fa/status/route.js`           | GET `/api/auth/2fa/status`                   | ~30             |
| `app/api/users/route.js`                     | GET/POST `/api/users`                        | ~200            |
| `app/api/users/[id]/route.js`                | GET/PUT/DELETE `/api/users/:id`              | ~150            |
| `app/api/users/profile/route.js`             | POST `/api/users/profile`                    | ~80             |
| `app/api/roles/route.js`                     | GET/POST `/api/roles`                        | ~150            |
| `app/api/roles/[id]/route.js`                | PUT/DELETE `/api/roles/:id`                  | ~100            |
| `app/api/tasks/route.js`                     | GET/POST `/api/tasks`                        | ~200            |
| `app/api/tasks/[id]/route.js`                | GET/PUT/DELETE `/api/tasks/:id`              | ~200            |
| `app/api/tasks/[id]/move/route.js`           | PUT `/api/tasks/:id/move`                    | ~80             |
| `app/api/sprints/route.js`                   | GET/POST `/api/sprints`                      | ~150            |
| `app/api/sprints/[id]/route.js`              | PUT/DELETE `/api/sprints/:id`                | ~200            |
| `app/api/timesheets/route.js`                | GET/POST/PUT/DELETE `/api/timesheets`        | ~200            |
| `app/api/expenses/route.js`                  | GET/POST/PUT/DELETE `/api/expenses`          | ~200            |
| `app/api/notifications/route.js`             | GET/PUT/DELETE `/api/notifications`          | ~150            |
| `app/api/notifications/read-all/route.js`    | POST `/api/notifications/read-all`           | ~30             |
| `app/api/comments/route.js`                  | GET/POST `/api/comments`                     | ~150            |
| `app/api/comments/[id]/route.js`             | PUT/DELETE `/api/comments/:id`               | ~80             |
| `app/api/files/route.js`                     | GET/DELETE `/api/files`                      | ~100            |
| `app/api/files/upload/route.js`              | POST `/api/files/upload`                     | ~100            |
| `app/api/files/folder/route.js`              | POST `/api/files/folder`                     | ~50             |
| `app/api/deliverables/route.js`              | GET/POST/PUT `/api/deliverables`             | ~200            |
| `app/api/deliverable-types/route.js`         | GET/POST/PUT/DELETE `/api/deliverable-types` | ~150            |
| `app/api/project-templates/route.js`         | GET/POST/PUT/DELETE `/api/project-templates` | ~150            |
| `app/api/settings/route.js`                  | GET/PUT `/api/settings`                      | ~80             |
| `app/api/settings/maintenance/route.js`      | GET `/api/settings/maintenance`              | ~30             |
| `app/api/admin/maintenance/route.js`         | POST `/api/admin/maintenance`                | ~50             |
| `app/api/audit/route.js`                     | GET `/api/audit`                             | ~100            |
| `app/api/audit/stats/route.js`               | GET `/api/audit/stats`                       | ~50             |
| `app/api/audit/export/route.js`              | GET `/api/audit/export`                      | ~80             |
| `app/api/audit/actions/route.js`             | GET `/api/audit/actions`                     | ~30             |
| `app/api/audit/summary/route.js`             | GET `/api/audit/summary`                     | ~50             |
| `app/api/activity/route.js`                  | GET `/api/activity`                          | ~50             |
| `app/api/sharepoint/config/route.js`         | GET/PUT `/api/sharepoint/config`             | ~80             |
| `app/api/sharepoint/test/route.js`           | POST `/api/sharepoint/test`                  | ~40             |
| `app/api/sharepoint/sync/route.js`           | POST `/api/sharepoint/sync`                  | ~60             |

### Méthode d'extraction pour chaque route

1. **Identifier** le bloc dans le monolithe (chercher `path === '/api/xxx'`)
2. **Copier** le handler dans le nouveau fichier
3. **Importer** les dépendances nécessaires :
   - `authenticateRequest` de `@/lib/requestAuth`
   - `attachAuthCookie`, `clearAuthCookies` de `@/lib/requestAuth`
   - Les modèles Mongoose nécessaires
   - Les helpers partagés (extraire dans `lib/api-helpers.js` si besoin)
4. **Exporter** les fonctions `GET`, `POST`, `PUT`, `DELETE` selon Next.js App Router
5. **Supprimer** le bloc du monolithe
6. **Tester** que la route répond correctement

### Helpers à extraire dans `lib/api-helpers.js`

Les fonctions helper actuellement dans le monolithe (lignes 48-300) doivent être extraites :

- `createSecureErrorResponse()` → `lib/api-helpers.js`
- `createNotification()` → `lib/api-helpers.js`
- `createBatchNotifications()` → `lib/api-helpers.js`
- `updateSprintBurndown()` → `lib/api-helpers.js`
- CORS helpers → `lib/cors.js`

### Critère de succès

Le fichier `app/api/[[...path]]/route.js` doit être **vide ou supprimé**. Toutes les routes doivent être dans des fichiers dédiés.

---

## Phase 3 — Rate limiting Socket.io {#phase-3}

### Problème

Le serveur Socket.io (`scripts/socket-server.js`, 413 lignes) n'a aucun rate limiting. Un client malveillant peut spammer des connexions ou des événements.

### Correction dans `scripts/socket-server.js`

Ajouter après la configuration CORS du serveur Socket :

```javascript
// Rate limiting per socket
const socketRateLimit = new Map();
const SOCKET_RATE_LIMIT = { windowMs: 1000, maxEvents: 20 };

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const now = Date.now();
  const record = socketRateLimit.get(ip) || { count: 0, resetAt: now + SOCKET_RATE_LIMIT.windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + SOCKET_RATE_LIMIT.windowMs;
  }

  record.count++;
  socketRateLimit.set(ip, record);

  if (record.count > SOCKET_RATE_LIMIT.maxEvents) {
    return next(new Error('Rate limit exceeded'));
  }
  next();
});

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of socketRateLimit) {
    if (now > record.resetAt + 60000) socketRateLimit.delete(ip);
  }
}, 60000);
```

Ajouter aussi un rate limit par événement sur chaque socket connecté :

```javascript
io.on('connection', (socket) => {
  let eventCount = 0;
  const MAX_EVENTS_PER_SECOND = 10;

  const originalEmit = socket.emit;
  const resetInterval = setInterval(() => {
    eventCount = 0;
  }, 1000);

  socket.onAny(() => {
    eventCount++;
    if (eventCount > MAX_EVENTS_PER_SECOND) {
      socket.disconnect(true);
    }
  });

  socket.on('disconnect', () => clearInterval(resetInterval));
  // ... reste du code existant
});
```

### Limitation de taille des messages

Ajouter dans la config du serveur Socket.io :

```javascript
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e6, // 1MB max par message
  // ... reste de la config existante
});
```

---

## Phase 4 — Validation centralisée des entrées API {#phase-4}

### Problème

La validation des entrées est dispersée et inconsistante. Certaines routes vérifient les champs requis, d'autres non. Aucune n'utilise Zod systématiquement (bien que Zod soit installé dans package.json).

### Solution

Créer `lib/schemas.js` avec les schémas Zod pour chaque entité :

```javascript
import { z } from 'zod';

// Réutilisable
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID invalide');

export const schemas = {
  // Auth
  login: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
    twoFactorCode: z.string().optional(),
  }),

  firstAdmin: z.object({
    nom_complet: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
  }),

  // Users
  createUser: z.object({
    nom_complet: z.string().min(2).max(100),
    email: z.string().email(),
    role_id: objectId,
  }),

  updateUser: z.object({
    nom_complet: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role_id: objectId.optional(),
    status: z.enum(['Actif', 'Désactivé', 'Suspendu']).optional(),
  }),

  // Projects
  createProject: z.object({
    nom: z.string().min(1).max(200),
    description: z.string().optional(),
    priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
    date_début: z.string().datetime().optional(),
    date_fin_prévue: z.string().datetime().optional(),
    template_id: objectId.optional(),
    product_owner: objectId.optional(),
  }),

  // Tasks
  createTask: z.object({
    titre: z.string().min(1).max(300),
    projet_id: objectId,
    type: z.enum(['Épic', 'Story', 'Tâche', 'Bug']).optional(),
    statut: z.enum(['Backlog', 'À faire', 'En cours', 'Review', 'Terminé']).optional(),
    priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
    story_points: z.number().int().min(0).max(100).optional(),
    estimation_heures: z.number().min(0).optional(),
    assigné_à: objectId.optional(),
    sprint_id: objectId.optional(),
    parent_id: objectId.optional(),
    description: z.string().optional(),
  }),

  // Sprints
  createSprint: z.object({
    nom: z.string().min(1).max(200),
    projet_id: objectId,
    objectif: z.string().optional(),
    date_début: z.string(),
    date_fin: z.string(),
    capacité_équipe: z.number().min(0).optional(),
  }),

  // Expenses
  createExpense: z.object({
    projet_id: objectId,
    description: z.string().min(1),
    montant: z.number().min(0),
    catégorie: z.string().optional(),
    date: z.string().optional(),
  }),

  // Comments
  createComment: z.object({
    entity_type: z.enum(['project', 'task', 'projet', 'tâche']),
    entity_id: objectId,
    contenu: z.string().min(1).max(5000),
    parent_id: objectId.optional(),
    mentions: z.array(objectId).optional(),
  }),

  // Timesheets
  createTimesheet: z.object({
    projet_id: objectId,
    tâche_id: objectId.optional(),
    date: z.string(),
    heures: z.number().min(0.1).max(24),
    description: z.string().optional(),
  }),

  // Deliverables
  createDeliverable: z.object({
    nom: z.string().min(1),
    projet_id: objectId,
    type_id: objectId.optional(),
    description: z.string().optional(),
    assigné_à: objectId.optional(),
    date_échéance: z.string().optional(),
  }),

  // Query params
  paginationQuery: z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    skip: z.coerce.number().int().min(0).default(0),
    projet_id: objectId.optional(),
  }),
};
```

### Créer `lib/validate.js` - helper de validation

```javascript
import { ZodError } from 'zod';

export function validate(schema, data) {
  try {
    return { data: schema.parse(data), error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { data: null, error: message };
    }
    return { data: null, error: 'Données invalides' };
  }
}
```

### Usage dans chaque route extraite

```javascript
import { schemas } from '@/lib/schemas';
import { validate } from '@/lib/validate';

export async function POST(request) {
  const body = await request.json();
  const { data, error } = validate(schemas.createTask, body);
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }
  // data est maintenant typé et validé
}
```

---

## Phase 5 — Couverture de tests réelle {#phase-5}

### Problème

18 fichiers de tests existent mais la couverture est faible. Les tests d'intégration ne font pas de vraies requêtes HTTP.

### Tests à écrire

**Priorité 1 — Sécurité (auth, permissions)**

| Fichier test                         | Ce qu'il teste                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `tests/api/auth-login.test.js`       | Login valide retourne cookie httpOnly, login invalide retourne 401, verrouillage après 5 tentatives, 2FA requis si activé |
| `tests/api/auth-permissions.test.js` | Chaque rôle ne peut accéder qu'à ses routes autorisées (matrice RBAC)                                                     |
| `tests/api/token-revocation.test.js` | Après changement de tokenVersion, les anciens tokens sont refusés                                                         |
| `tests/lib/userSecurity.test.js`     | `generateTemporaryPassword()` produit des mots de passe conformes aux règles                                              |

**Priorité 2 — CRUD endpoints**

| Fichier test                   | Ce qu'il teste                                                              |
| ------------------------------ | --------------------------------------------------------------------------- |
| `tests/api/projects.test.js`   | CRUD projet, filtrage par membre, permission creerProjet                    |
| `tests/api/tasks.test.js`      | CRUD tâche, workflow statut (pas de En cours → Terminé direct), dépendances |
| `tests/api/sprints.test.js`    | Création, démarrage, clôture, burndown                                      |
| `tests/api/timesheets.test.js` | Saisie, soumission, validation, incrémentation temps_réel                   |

**Priorité 3 — Validation**

| Fichier test                         | Ce qu'il teste                                  |
| ------------------------------------ | ----------------------------------------------- |
| `tests/lib/schemas.test.js`          | Chaque schéma Zod rejette les données invalides |
| `tests/api/input-validation.test.js` | Les routes refusent les payloads malformés      |

### Setup recommandé

Utiliser `mongodb-memory-server` (déjà installé) pour les tests d'intégration :

```javascript
// tests/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongoServer.getUri();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

---

## Phase 6 — Nettoyage final {#phase-6}

### 6.1 — Console.log restants

Retirer tous les `console.log` dans le code de production. Remplacer par un logger conditionnel si nécessaire :

```javascript
// lib/logger.js
const isDev = process.env.NODE_ENV !== 'production';
export const logger = {
  info: (...args) => isDev && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
```

Rechercher et nettoyer :

```bash
grep -rn "console.log" --include="*.js" --include="*.jsx" app/ lib/ components/ hooks/ contexts/
```

### 6.2 — ESLint manquant

Installer les dépendances ESLint manquantes :

```bash
yarn add -D @eslint/js eslint
```

Puis lancer `yarn lint` et corriger tous les warnings.

### 6.3 — Vérification exhaustive des imports

Après la Phase 2 (éclatement API), vérifier qu'aucun import ne pointe vers le monolithe supprimé :

```bash
grep -rn "from.*\[\[\.\.\.path\]\]" --include="*.js"
```

### 6.4 — Mettre à jour la documentation

- Mettre à jour le `README.md` section Architecture avec la nouvelle structure de routes
- Mettre à jour le `GUIDE_UTILISATEUR.md` si nécessaire
- Mettre à jour `docs/REALTIME_SYNC.md` si la config socket a changé

### 6.5 — Version bump

Après toutes les corrections, dans `package.json` :

```json
"version": "2.0.0"
```

---

## Ordre d'exécution recommandé

```
Phase 1 (cookies httpOnly)     ████████████████████ ~4h
  ↓
Phase 4 (validation Zod)       ████████████         ~2h
  ↓
Phase 2 (éclatement API)       ████████████████████████████████ ~8h
  ↓
Phase 3 (rate limit socket)    ████                 ~30min
  ↓
Phase 5 (tests)                ████████████████     ~4h
  ↓
Phase 6 (nettoyage)            ████████             ~1h
```

**Total estimé : ~20h de travail**

---

## Critères de validation finale

| Check                      | Commande                                                                                         | Résultat attendu                |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- |
| Plus de localStorage token | `grep -rn "localStorage.getItem('pm_token')" --include="*.js" app/ components/ hooks/ contexts/` | 0 résultats                     |
| Plus de monolithe          | `wc -l app/api/[[...path]]/route.js`                                                             | Fichier supprimé ou < 50 lignes |
| Socket rate limité         | Lire `scripts/socket-server.js`                                                                  | Rate limit middleware présent   |
| Validation centralisée     | `ls lib/schemas.js lib/validate.js`                                                              | Les 2 fichiers existent         |
| Tests passent              | `yarn test`                                                                                      | 0 failures                      |
| Lint propre                | `yarn lint`                                                                                      | 0 errors                        |
| Build réussit              | `yarn build`                                                                                     | Exit code 0                     |
| Docker fonctionne          | `docker compose up --build`                                                                      | Tous les services healthy       |
