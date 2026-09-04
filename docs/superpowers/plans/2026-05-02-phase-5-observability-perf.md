# Phase 5 — Observabilité + Performance (3 j)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Passer de logs `console.log` non corrélés à un système d'observabilité production-ready (pino structured logs + Sentry + correlation IDs). Côté perf : Redis cache, query filters, pagination cursor, bundle ≤ 250 KB.

**Architecture:** `pino` pour logs JSON, propagation d'un `requestId` (UUID) en middleware → `request.headers.set('x-request-id')` → injecté dans chaque log via child logger. Sentry intercepte exceptions API + UI (browser SDK + server SDK). Redis (ioredis) sert de cache primaire avec fallback `node-cache`. Query filters via un middleware `parseQueryFilters` qui mappe les query params autorisés vers un objet Mongo. Pagination cursor base64 sur `_id` (stable, indexé).

**Tech Stack:** pino 9.x · @sentry/nextjs 8.x · ioredis 5.x · @next/bundle-analyzer 14.x · autocannon (bench).

**Pré-requis :** Phases 0-4 complètes.

---

## File Structure

| Fichier                                  | Action | Responsabilité                                                              |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `lib/logger.ts`                          | Modify | pino logger avec child loggers (module, requestId, userId)                  |
| `lib/requestId.ts`                       | Create | génération + extraction du requestId                                        |
| `middleware.js`                          | Modify | génère `x-request-id` si absent                                             |
| `lib/withApiHandler.ts`                  | Modify | injecte requestId dans le child logger passé au handler                     |
| `instrumentation.ts`                     | Create | hook Sentry init (Next.js 14.2 pattern)                                     |
| `sentry.client.config.ts`                | Create | Sentry browser                                                              |
| `sentry.server.config.ts`                | Create | Sentry node                                                                 |
| `sentry.edge.config.ts`                  | Create | Sentry edge (middleware)                                                    |
| `lib/cache.ts`                           | Modify | wrapper ioredis + fallback node-cache (existant)                            |
| `lib/cacheKeys.ts`                       | Create | constantes des clés (sécurité)                                              |
| `lib/queryFilters.ts`                    | Create | parseQueryFilters(searchParams, allowedFields)                              |
| `lib/__tests__/queryFilters.test.ts`     | Create | tests                                                                       |
| `lib/cursorPagination.ts`                | Create | encodeCursor/decodeCursor (base64) + helper paginate                        |
| `lib/__tests__/cursorPagination.test.ts` | Create | tests                                                                       |
| `app/api/tasks/route.js`                 | Modify | utilise `parseQueryFilters` + cursor                                        |
| `app/api/projects/route.js`              | Modify | idem                                                                        |
| `app/api/sprints/route.js`               | Modify | idem                                                                        |
| `next.config.js`                         | Modify | wrap avec `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })` |
| `package.json`                           | Modify | scripts `analyze`, `bench`                                                  |

---

## Tasks

### Task 5.1 : Logger structuré pino + correlation IDs

- [ ] **Step 1 :** Installer

  ```bash
  npm install pino pino-pretty
  ```

- [ ] **Step 2 :** `lib/requestId.ts`

  ```ts
  import { randomUUID } from 'crypto';
  export const REQUEST_ID_HEADER = 'x-request-id';
  export function generateRequestId(): string {
    return randomUUID();
  }
  export function getRequestId(req: Request | { headers: Headers }): string {
    return req.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  }
  ```

- [ ] **Step 3 :** Modifier `middleware.js` — propager le requestId :

  ```js
  import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/requestId';

  export async function middleware(request) {
    const requestId = request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    // ...rest unchanged
  }
  ```

- [ ] **Step 4 :** Réécrire `lib/logger.ts`

  ```ts
  import pino from 'pino';
  const isDev = process.env.NODE_ENV !== 'production';

  const baseLogger = pino({
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.twoFactorSecret'],
      censor: '[REDACTED]',
    },
  });

  export function createLogger(module: string, ctx: Record<string, unknown> = {}) {
    return baseLogger.child({ module, ...ctx });
  }
  export default baseLogger;
  ```

- [ ] **Step 5 :** Modifier `withApiHandler` — injecter un child logger :

  ```ts
  const requestId = getRequestId(request);
  const log = createLogger('api', { requestId, userId: user?._id?.toString() });
  // passer log à handler dans context
  ```

- [ ] **Step 6 :** Remplacer `console.log/error` restants par `log.info/error`. Recherche :

  ```bash
  grep -rn "console\." app/api lib/services lib/services lib/auditService.ts lib/*.ts
  ```

- [ ] **Step 7 :** Test manuel : démarrer le serveur, faire un appel curl avec et sans `-H "X-Request-Id: test-abc"`. Vérifier dans les logs.

- [ ] **Step 8 :** Commit
  ```bash
  git add lib/logger.ts lib/requestId.ts middleware.js lib/withApiHandler.ts
  git commit -m "phase-5: structured pino logs + correlation IDs"
  ```

---

### Task 5.2 : Sentry — error tracking

- [ ] **Step 1 :** Installer + wizard

  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```

  Le wizard crée `instrumentation.ts`, `sentry.client.config.ts`, etc. Si pas de DSN dispo : skipper, ajouter manuellement.

- [ ] **Step 2 :** Configurer `sentry.client.config.ts`

  ```ts
  import * as Sentry from '@sentry/nextjs';
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  });
  ```

- [ ] **Step 3 :** `sentry.server.config.ts` et `sentry.edge.config.ts` similaires (avec DSN serveur).

- [ ] **Step 4 :** Modifier `withApiHandler` — wrap toute exception non-APIError dans Sentry :

  ```ts
  import * as Sentry from '@sentry/nextjs';
  // dans le catch :
  if (!(err instanceof APIError)) {
    Sentry.captureException(err, { tags: { requestId, route: request.url } });
  }
  ```

- [ ] **Step 5 :** Test :
  - Créer une route `/api/_test/throw` qui throw → vérifier dans Sentry dashboard
  - Côté UI : ajouter un bouton dev-only qui throw → Sentry capture

- [ ] **Step 6 :** Commit
  ```bash
  git add instrumentation.ts sentry.*.config.ts next.config.js lib/withApiHandler.ts
  git commit -m "phase-5: Sentry error tracking (client + server + edge)"
  ```

---

### Task 5.3 : Redis cache wrapper

- [ ] **Step 1 :** Installer

  ```bash
  npm install ioredis
  ```

- [ ] **Step 2 :** `lib/cacheKeys.ts`

  ```ts
  export const CACHE_KEYS = {
    translations: (locale: string) => `i18n:${locale}`,
    userPermissions: (userId: string) => `perm:user:${userId}`,
    projectMeta: (id: string) => `proj:${id}:meta`,
    appSettings: () => 'app:settings',
  } as const;
  ```

- [ ] **Step 3 :** Réécrire `lib/cache.ts` (étend l'existant) :

  ```ts
  import Redis from 'ioredis';
  import NodeCache from 'node-cache';
  import { createLogger } from './logger';

  const log = createLogger('cache');
  const useRedis = !!process.env.REDIS_URL;
  const redis = useRedis ? new Redis(process.env.REDIS_URL!) : null;
  const local = new NodeCache({ stdTTL: 60, checkperiod: 120 });

  export async function get<T>(key: string): Promise<T | null> {
    try {
      if (redis) {
        const v = await redis.get(key);
        return v ? (JSON.parse(v) as T) : null;
      }
      return local.get<T>(key) ?? null;
    } catch (e) {
      log.error({ err: e, key }, 'cache get failed');
      return null;
    }
  }

  export async function set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    try {
      if (redis) await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      else local.set(key, value, ttlSeconds);
    } catch (e) {
      log.error({ err: e, key }, 'cache set failed');
    }
  }

  export async function del(key: string): Promise<void> {
    if (redis) await redis.del(key);
    else local.del(key);
  }

  /** Memoize an async loader behind a cache key */
  export async function wrap<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== null) return cached;
    const value = await loader();
    await set(key, value, ttl);
    return value;
  }
  ```

- [ ] **Step 4 :** Brancher dans 3 endroits :
  - `TranslationsContext` : cache des dictionnaires (5 min)
  - `lib/permissions.ts` (la fonction qui résout les permissions effectives) : cache 1 min par user
  - `lib/services/appSettingsService.ts` : cache 30 s

- [ ] **Step 5 :** Invalider sur write (ex : si admin modifie un Role → invalider toutes les permissions des users de ce role).

- [ ] **Step 6 :** Bench rapide

  ```bash
  npx autocannon -c 50 -d 30 -H "Cookie: auth_token=<valid>" http://localhost:3000/api/me
  ```

  Comparer avant/après. Attendu : RPS ↑ ≥ 50 % pour les routes cacheables.

- [ ] **Step 7 :** Commit
  ```bash
  git add lib/cache.ts lib/cacheKeys.ts lib/services/ contexts/TranslationsContext.jsx
  git commit -m "phase-5: ioredis cache wrapper + 3 cache integrations"
  ```

---

### Task 5.4 : Query filters

- [ ] **Step 1 :** TDD `lib/__tests__/queryFilters.test.ts`

  ```ts
  import { parseQueryFilters } from '@/lib/queryFilters';

  test('keeps only allowed fields', () => {
    const sp = new URLSearchParams('status=done&secret=xxx&assignee=u1');
    const r = parseQueryFilters(sp, ['status', 'assignee']);
    expect(r).toEqual({ status: 'done', assignee: 'u1' });
  });
  test('handles date range with since/until', () => {
    const sp = new URLSearchParams('since=2026-01-01&until=2026-12-31');
    const r = parseQueryFilters(sp, [
      { name: 'created_at', kind: 'dateRange', sinceParam: 'since', untilParam: 'until' },
    ]);
    expect(r.created_at.$gte).toEqual(new Date('2026-01-01'));
    expect(r.created_at.$lte).toEqual(new Date('2026-12-31'));
  });
  test('csv values become $in', () => {
    const sp = new URLSearchParams('status=done,inprogress');
    const r = parseQueryFilters(sp, [{ name: 'status', kind: 'csv' }]);
    expect(r.status).toEqual({ $in: ['done', 'inprogress'] });
  });
  ```

- [ ] **Step 2 :** Implémentation

  ```ts
  type FilterField =
    | string
    | { name: string; kind: 'csv' }
    | { name: string; kind: 'dateRange'; sinceParam: string; untilParam: string };

  export function parseQueryFilters(sp: URLSearchParams, allowed: FilterField[]) {
    const out: Record<string, unknown> = {};
    for (const f of allowed) {
      if (typeof f === 'string') {
        const v = sp.get(f);
        if (v != null) out[f] = v;
      } else if (f.kind === 'csv') {
        const v = sp.get(f.name);
        if (v != null) out[f.name] = { $in: v.split(',').filter(Boolean) };
      } else if (f.kind === 'dateRange') {
        const since = sp.get(f.sinceParam);
        const until = sp.get(f.untilParam);
        if (since || until) {
          out[f.name] = {};
          if (since) (out[f.name] as any).$gte = new Date(since);
          if (until) (out[f.name] as any).$lte = new Date(until);
        }
      }
    }
    return out;
  }
  ```

- [ ] **Step 3 :** Brancher dans `app/api/tasks/route.js`

  ```js
  import { parseQueryFilters } from '@/lib/queryFilters';
  // ...
  const filters = parseQueryFilters(searchParams, [
    { name: 'statut', kind: 'csv' },
    'assigné_à',
    'projet_id',
    { name: 'created_at', kind: 'dateRange', sinceParam: 'since', untilParam: 'until' },
  ]);
  const query = { ...query, ...filters };
  ```

- [ ] **Step 4 :** Idem `projects` et `sprints`.

- [ ] **Step 5 :** Tests + commit
  ```bash
  npm test -- queryFilters
  git add lib/queryFilters.ts lib/__tests__/queryFilters.test.ts app/api/
  git commit -m "phase-5: query filters middleware (status, assignee, date range)"
  ```

---

### Task 5.5 : Pagination cursor

- [ ] **Step 1 :** TDD `lib/__tests__/cursorPagination.test.ts`

  ```ts
  import { encodeCursor, decodeCursor, paginateByCursor } from '@/lib/cursorPagination';
  test('encode/decode roundtrip', () => {
    const c = encodeCursor({ _id: 'abc', created_at: '2026-01-01' });
    expect(decodeCursor(c)).toEqual({ _id: 'abc', created_at: '2026-01-01' });
  });
  test('paginateByCursor adds gt clause', () => {
    const sort = { _id: 1 } as const;
    const q = paginateByCursor({}, sort, encodeCursor({ _id: '5' }));
    expect(q._id).toEqual({ $gt: '5' });
  });
  ```

- [ ] **Step 2 :** Implémentation

  ```ts
  export type Cursor = Record<string, unknown>;
  export function encodeCursor(c: Cursor): string {
    return Buffer.from(JSON.stringify(c)).toString('base64url');
  }
  export function decodeCursor(s: string | null | undefined): Cursor | null {
    if (!s) return null;
    try {
      return JSON.parse(Buffer.from(s, 'base64url').toString());
    } catch {
      return null;
    }
  }
  export function paginateByCursor<Q extends Record<string, unknown>>(
    query: Q,
    sort: Record<string, 1 | -1>,
    cursorStr: string | null
  ): Q & Record<string, unknown> {
    const c = decodeCursor(cursorStr);
    if (!c) return query;
    const out: any = { ...query };
    for (const [k, dir] of Object.entries(sort)) {
      if (k in c) out[k] = dir === 1 ? { $gt: c[k] } : { $lt: c[k] };
    }
    return out;
  }
  ```

- [ ] **Step 3 :** Wrapper helper qui retourne `{ items, nextCursor, hasMore }` :

  ```ts
  export async function fetchPage(
    model: any,
    baseQuery: any,
    sort: any,
    cursor: string | null,
    limit = 20
  ) {
    const q = paginateByCursor(baseQuery, sort, cursor);
    const items = await model
      .find(q)
      .sort(sort)
      .limit(limit + 1)
      .lean();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(Object.fromEntries(Object.keys(sort).map((k) => [k, last[k]])))
        : null;
    return { items, nextCursor, hasMore };
  }
  ```

- [ ] **Step 4 :** Brancher dans `app/api/tasks/route.js` (et ne pas casser le `?page=` legacy — supporter les deux pendant 6 mois) :

  ```js
  const cursor = searchParams.get('cursor');
  if (cursor !== null) {
    const r = await fetchPage(Task, query, { _id: -1 }, cursor, limit);
    return APIResponse.success(r.items, null, 200, {
      nextCursor: r.nextCursor,
      hasMore: r.hasMore,
      limit,
    });
  }
  // sinon : pagination legacy ?page=
  ```

- [ ] **Step 5 :** Tester via curl

  ```bash
  curl 'http://localhost:3000/api/tasks?cursor=&limit=5' -H "Cookie: auth_token=..."
  ```

- [ ] **Step 6 :** Commit
  ```bash
  git add lib/cursorPagination.ts lib/__tests__/cursorPagination.test.ts app/api/
  git commit -m "phase-5: cursor pagination on tasks/projects/sprints (legacy ?page= still supported)"
  ```

---

### Task 5.6 : Bundle analyzer + lazy-loading

- [ ] **Step 1 :** Installer

  ```bash
  npm install --save-dev @next/bundle-analyzer
  ```

- [ ] **Step 2 :** `next.config.js`

  ```js
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
  module.exports = withBundleAnalyzer(nextConfig);
  ```

- [ ] **Step 3 :** Run + identifier les gros morceaux

  ```bash
  ANALYZE=true npm run build
  # un fichier HTML s'ouvre dans .next/analyze
  ```

- [ ] **Step 4 :** Lazy-load les routes coûteuses :
  - `app/dashboard/reports/page.js` : `dynamic(() => import('./ReportContent'), { ssr: false })`
  - `jspdf` et `exceljs` : import dynamique uniquement quand l'utilisateur clique sur "Export"
  - `recharts` : `dynamic` pour les graphes

  Exemple :

  ```js
  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    // ...
  };
  ```

- [ ] **Step 5 :** Re-run analyze, viser First Load JS ≤ 250 KB sur `/dashboard`. Si toujours au-dessus, identifier la dépendance suivante.

- [ ] **Step 6 :** Commit
  ```bash
  git add next.config.js app/dashboard/
  git commit -m "phase-5: bundle analyzer + dynamic imports for heavy modules"
  ```

---

### Task 5.7 : Verification gate Phase 5

- [ ] Logs production en JSON (curl + `head -1` du log → JSON parsable)
- [ ] Sentry capture une erreur volontaire
- [ ] Bench `autocannon` montre RPS amélioré pour routes cacheables
- [ ] First Load JS ≤ 250 KB dans `.next/analyze/client.html`
- [ ] Tous tests verts
- [ ] Update CONTEXT.md
- [ ] Tag : `git tag phase-5-complete`

---

## Self-review

✅ Spec coverage : structured logging, Sentry, Redis, query filters, cursor pagination, bundle analyzer.
✅ Placeholder scan : aucun TBD ; chaque step fournit code complet ou commande.
✅ Type consistency : `requestId` partout, `parseQueryFilters` cohérent, `encodeCursor`/`decodeCursor` types stables.
