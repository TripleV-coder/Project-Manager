# Security Hardening & Deployment-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every security finding from the 2026-09-04 code analysis and bring the working tree to a committed, verified, deployment-ready state.

**Architecture:** The app is a Next.js 14 (App Router) + Mongoose/MongoDB project-manager. Auth is JWT (jose, HS256) in an HttpOnly cookie, with a 15-min access token + 7-day rotating refresh token. Route handlers are wrapped by `withApiProtection()` (size → auth → permission → rate-limit). This plan introduces a **scoped step-up token** (`lib/auth/stepUp.js`) so that "2FA pending" and "must change password" states can no longer be used as full sessions, fixes the client-IP trust boundary in the rate limiter, corrects the token-TTL clamp, adds a role-privilege guard on destructive user operations, and finishes the half-done schema-convention refactor. Each phase is independently shippable and committable.

**Tech Stack:** Next.js 14, React 18, Mongoose 8, `jose` 5, `bcryptjs`, `otplib`, `zod`, Jest 29 (`next/jest`, jsdom), Playwright, Pino logger.

**Spec:** This plan is derived from the conversational deep-analysis of 2026-09-04 (no separate spec file). The findings it implements, verbatim by severity:

- 🔴 HIGH — 2FA is bypassable: the login `tempToken` is a full access token accepted on every protected route; `must_change_password` + 2FA skips 2FA entirely and issues full cookies.
- 🟠 MED — Rate-limiting bypass via spoofed `X-Forwarded-For` (`getClientIP` trusts the leftmost, client-controlled value).
- 🟠 MED — `withApiProtection` applies the rate limit _after_ rejecting unauthenticated requests, so unauthenticated floods to protected routes are never limited.
- 🟡 MED — "must change password" session is fully privileged (enforcement is client-side redirect only).
- 🟡 MED — `reset-password` uses OR permissions and has no role-rank guard (a user-manager can reset a Super Admin).
- 🟡 LOW — Access token lives 30 min not 15 (`signTokenWithMinutes` floor); the 2FA temp token requested at 5 min is also 30 min.
- 🟡 LOW — `middleware.js` writes `x-user-id`/`x-user-role` onto the _response_ (leaks to browser, not forwarded to handlers); `X-XSS-Protection: 1; mode=block` is deprecated.
- 🟡 LOW — `generateJti()` uses `Math.random()`; `JWT_REFRESH_SECRET` falls back to `JWT_SECRET + '_refresh'`.
- 🟡 LOW — `validateRequestSize` only checks `content-length` (bypassed by chunked encoding).
- 🟡 LOW — `decryptSecret` silently returns unknown input as plaintext.
- BUG — Schema-convention refactor unfinished: login writes non-schema fields `loginAttempts`, `lastLoginAt` (silently dropped); model methods `incLoginAttempts`/`resetLoginAttempts` unused; the `must_change_password || mustChangePassword || first_login` triple-check is copy-pasted; `password_history` is stored but reuse is never blocked.
- DEBT — `tests/api/auth-flow.test.js` is largely `expect(true).toBe(true)` stubs; stray server-side `console.*`; `<img>` in `app/dashboard/files/page.js`; no `CONTEXT.md`; `envValidation.js` does not require `SECRETS_ENCRYPTION_KEY`/`JWT_REFRESH_SECRET`/prod `ALLOWED_ORIGINS` and `assertEnvValid` is never called.
- REPO — 337 uncommitted files (≈40 API routes, 117 tests, husky, CI, CLAUDE.md) — the git history does not reflect what runs.

## Global Constraints

- **Node:** `>=20.0.0` (package.json `engines`). Do not use APIs newer than Node 20.
- **TypeScript:** `strictNullChecks` + `noImplicitAny` are on; tests are excluded from `tsc`. New non-test `.js` files that are not security-critical may stay JS; new security modules get `// @ts-check` and must pass `npx tsc --noEmit` with zero new errors. Do **not** add `// @ts-nocheck` to any new file.
- **Verification gate (every task ends green):** `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 errors; `npx jest --ci` → all pass. The repo baseline today is: tsc 0, eslint 0 errors / 2 warnings, jest 575/575.
- **Commits:** Conventional Commits. End every commit message body with:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- **Language:** User-facing strings in French, matching existing copy (`Identifiants invalides`, `Accès refusé`, …). Code comments in English or French, matching the file being edited.
- **No new runtime dependencies** without calling it out in the task. Everything in this plan uses packages already in `package.json` (`jose`, `crypto`, `zod`).
- **Branch:** Do all phases on a branch off `main` (e.g. `security/hardening-deploy-ready`), never commit directly to `main`.

---

## File Structure

New files:

| File                                  | Responsibility                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lib/auth/stepUp.js`                  | Sign/verify short-lived **scoped** step-up tokens (`2fa`, `pwd`). Never accepted as a session. `// @ts-check`.              |
| `lib/userState.js`                    | Tiny pure helpers about user account state: `mustChangePassword(user)`. `// @ts-check`.                                     |
| `lib/userManagement.js`               | Authorization helper `canActorManageTarget(actor, target)` — role-privilege guard for destructive user ops. `// @ts-check`. |
| `tests/lib/stepUp.test.js`            | Unit tests for `lib/auth/stepUp.js`.                                                                                        |
| `tests/lib/userState.test.js`         | Unit tests for `lib/userState.js`.                                                                                          |
| `tests/lib/userManagement.test.js`    | Unit tests for `lib/userManagement.js`.                                                                                     |
| `tests/lib/getClientIP.test.js`       | Unit tests for the `getClientIP` trust boundary.                                                                            |
| `tests/api/two-factor-bypass.test.js` | Regression tests: step-up token rejected as a session; 2FA not skippable.                                                   |
| `CONTEXT.md`                          | Long-session working context (project constraint).                                                                          |
| `docs/DEPLOYMENT.md`                  | Pre-deployment checklist + required env vars.                                                                               |

Modified files: `lib/auth.js`, `lib/requestAuth.js`, `lib/withApiProtection.js`, `lib/apiMiddleware.js`, `lib/rateLimit.js`, `lib/auth/refresh.js`, `lib/crypto/secrets.js`, `lib/envValidation.js`, `middleware.js`, `app/api/auth/login/route.js`, `app/api/auth/2fa/verify/route.js`, `app/api/auth/first-login-reset/route.js`, `app/api/users/[id]/reset-password/route.js`, `models/User.js`, `app/login/page.js`, `app/first-login/page.js`, `app/dashboard/files/page.js`, `.env.example`, `tests/api/auth-flow.test.js`.

---

## Phase 0 — Version-control baseline

**Rationale:** Nothing else is safe to do while 337 files sit uncommitted. Land the working tree in coherent, individually-building commits on a fresh branch so every later task has a real rollback point.

### Task 0.1: Branch and commit the working tree in coherent batches

**Files:**

- No source changes. Git operations only.

**Interfaces:**

- Produces: a clean `git status` (nothing uncommitted) on branch `security/hardening-deploy-ready`, with `npx jest --ci` green at the final commit.

- [ ] **Step 1: Confirm the current baseline is green**

Run:

```bash
npx tsc --noEmit && npx eslint . && npx jest --ci
```

Expected: tsc 0 errors, eslint 0 errors, `Tests: 575 passed`. If not green, STOP and report — the working tree is broken and batching commits will bury the break.

- [ ] **Step 2: Create the working branch**

```bash
git checkout -b security/hardening-deploy-ready
```

- [ ] **Step 3: Commit tooling & config first**

```bash
git add .husky .github .prettierrc .prettierignore .nvmrc .dockerignore Dockerfile CLAUDE.md .cursorrules eslint.config.mjs jest.config.js jest.setup.js tsconfig.json components.json
git commit -m "chore: check in tooling, CI, and editor config

Husky hooks, GitHub Actions, Prettier/ESLint/Jest/TS config, Dockerfile,
and agent instruction files that were present in the working tree but
never committed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Commit the `lib/` layer**

```bash
git add lib
git commit -m "refactor(lib): consolidate services, auth, and rate-limit modules

Brings the committed lib/ tree in line with the running code: service
layer (lib/services/*), step-up/refresh auth split, Redis rate limiter,
crypto/secrets, and the schema-convention reconciliation started earlier.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Commit models and components**

```bash
git add models components contexts hooks types
git commit -m "refactor(models,ui): sync models, components, and hooks with running code

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Commit the API routes**

```bash
git add app/api middleware.js next.config.js next.config.sentry.js
git commit -m "feat(api): decompose monolith into dedicated route handlers

~40 route.js handlers (admin, audit, budget, notifications, push,
timesheets, 2FA, sharepoint sync/test, project sub-resources) plus the
security middleware. The catch-all now only 404s.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Commit the app pages and remaining app/ files**

```bash
git add app
git commit -m "feat(dashboard): sync dashboard pages and auth screens with running code

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Commit tests**

```bash
git add tests app/api/__tests__ lib/__tests__ lib/services/__tests__ hooks/__tests__
git commit -m "test: check in the full jest + playwright suite (575 tests)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Commit docs and scripts, then whatever is left**

```bash
git add docs scripts GUIDE_UTILISATEUR.md README.md PLAN_CORRECTIONS.md "Project Manager sprints.txt" .emergent .gitignore .gitconfig package.json package-lock.json public data playwright.config.js docker-compose.yml
git commit -m "chore: check in docs, scripts, seed data, and lockfile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git status --porcelain
```

- [ ] **Step 10: Sweep any remaining untracked/modified files**

Run `git status --porcelain`. For each remaining path, decide: source → add to the most relevant commit above via `git add` + `git commit --amend --no-edit` is NOT allowed (history already shared expectations); instead `git add <path> && git commit -m "chore: check in <path>"`. Build artifacts (`.next/`, `.swc/`, `coverage/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`, `build.log`, `.env*`) must NOT be committed — verify they are covered by `.gitignore` (they are) and leave them.

- [ ] **Step 11: Final verification**

Run:

```bash
git status --porcelain   # expect: empty (only ignored files remain)
npx tsc --noEmit && npx eslint . && npx jest --ci
```

Expected: clean tree, tsc 0, eslint 0 errors, jest 575 passed.

- [ ] **Step 12: No commit needed — the batches above are the deliverable.**

---

## Phase 1 — Close the 2FA bypass (🔴 HIGH)

**Rationale:** The login `tempToken` is indistinguishable from a real access token, so 2FA is enforced only in the browser. Introduce a scoped, non-session step-up token and make `authenticateRequest` reject it everywhere except the endpoint that consumes it.

### Task 1.1: Scoped step-up token module

**Files:**

- Create: `lib/auth/stepUp.js`
- Test: `tests/lib/stepUp.test.js`

**Interfaces:**

- Produces:
  - `STEP_UP_SCOPE` — `{ TWO_FACTOR: '2fa', PASSWORD_CHANGE: 'pwd' }` (frozen).
  - `createStepUpToken(user: { _id, tokenVersion? }, scope: '2fa'|'pwd', ttlMinutes: number): Promise<string>` — HS256 JWT with claims `{ userId, scope, stepUp: true, tokenVersion }`, `exp` = now + `max(1, floor(ttlMinutes))` minutes.
  - `verifyStepUpToken(token: string, expectedScope: '2fa'|'pwd'): Promise<{ userId: string, scope: string, tokenVersion: number } | null>` — returns `null` unless the signature is valid AND `stepUp === true` AND `scope === expectedScope` AND `userId` is a string.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/stepUp.test.js`:

```js
import { createStepUpToken, verifyStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const user = { _id: 'u1', tokenVersion: 3 };

describe('lib/auth/stepUp', () => {
  test('createStepUpToken embeds scope, stepUp flag, userId and tokenVersion', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 5);
    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.stepUp).toBe(true);
    expect(payload.scope).toBe('2fa');
    expect(payload.userId).toBe('u1');
    expect(payload.tokenVersion).toBe(3);
    expect(payload.exp - payload.iat).toBe(5 * 60);
  });

  test('verifyStepUpToken accepts a matching scope', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.PASSWORD_CHANGE, 10);
    const result = await verifyStepUpToken(token, STEP_UP_SCOPE.PASSWORD_CHANGE);
    expect(result).toEqual({ userId: 'u1', scope: 'pwd', tokenVersion: 3 });
  });

  test('verifyStepUpToken rejects a scope mismatch', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 5);
    expect(await verifyStepUpToken(token, STEP_UP_SCOPE.PASSWORD_CHANGE)).toBeNull();
  });

  test('verifyStepUpToken rejects a plain access token (no stepUp claim)', async () => {
    const { SignJWT } = await import('jose');
    const plain = await new SignJWT({ userId: 'u1', scope: '2fa' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(SECRET);
    expect(await verifyStepUpToken(plain, STEP_UP_SCOPE.TWO_FACTOR)).toBeNull();
  });

  test('verifyStepUpToken rejects a garbage / expired token', async () => {
    expect(await verifyStepUpToken('not.a.jwt', STEP_UP_SCOPE.TWO_FACTOR)).toBeNull();
  });

  test('ttl below 1 minute is floored to 1 minute', async () => {
    const token = await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 0);
    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.exp - payload.iat).toBe(60);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/stepUp.test.js`
Expected: FAIL — `Cannot find module '@/lib/auth/stepUp'`.

- [ ] **Step 3: Implement `lib/auth/stepUp.js`**

```js
// @ts-check
/**
 * Scoped, short-lived "step-up" tokens.
 *
 * A step-up token proves the user cleared *one* gate (password OK, awaiting
 * 2FA — or password-change required) but has NOT completed authentication.
 * It carries `stepUp: true` and a `scope`, and is only ever accepted by the
 * single endpoint that consumes that scope. `authenticateRequest` rejects it,
 * so it can never be used as a session.
 */
import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is required for step-up tokens');
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/** @type {{ readonly TWO_FACTOR: '2fa', readonly PASSWORD_CHANGE: 'pwd' }} */
export const STEP_UP_SCOPE = Object.freeze({
  TWO_FACTOR: /** @type {'2fa'} */ ('2fa'),
  PASSWORD_CHANGE: /** @type {'pwd'} */ ('pwd'),
});

/**
 * @param {{ _id: unknown, tokenVersion?: number }} user
 * @param {'2fa' | 'pwd'} scope
 * @param {number} ttlMinutes
 * @returns {Promise<string>}
 */
export async function createStepUpToken(user, scope, ttlMinutes) {
  const minutes = Math.max(1, Math.floor(ttlMinutes));
  return new SignJWT({
    userId: String(user._id),
    scope,
    stepUp: true,
    tokenVersion: user.tokenVersion ?? 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(SECRET);
}

/**
 * @param {string} token
 * @param {'2fa' | 'pwd'} expectedScope
 * @returns {Promise<{ userId: string, scope: string, tokenVersion: number } | null>}
 */
export async function verifyStepUpToken(token, expectedScope) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.stepUp !== true) return null;
    if (payload.scope !== expectedScope) return null;
    if (typeof payload.userId !== 'string') return null;
    return {
      userId: payload.userId,
      scope: payload.scope,
      tokenVersion: typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest tests/lib/stepUp.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck the new file**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add lib/auth/stepUp.js tests/lib/stepUp.test.js
git commit -m "feat(auth): scoped step-up token module (2fa / pwd)

Short-lived tokens that prove one auth gate was cleared without being a
session. Carries stepUp:true + scope; only the consuming endpoint accepts it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 1.2: `authenticateRequest` rejects step-up tokens

**Files:**

- Modify: `lib/requestAuth.js` (`authenticateRequest` ~L127-147, `verifyRequestToken` ~L154-170)
- Test: `tests/lib/requestAuth.test.js` (add cases)

**Interfaces:**

- Consumes: `verifyToken` from `lib/auth` (returns decoded payload or null).
- Produces: `authenticateRequest` and `verifyRequestToken` return `null` for any token whose payload has `stepUp === true`, before any DB lookup.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/requestAuth.test.js` inside `describe('requestAuth', ...)`:

```js
test('authenticateRequest rejects a step-up token even with a valid signature', async () => {
  verifyToken.mockResolvedValue({ userId: 'user-1', tokenVersion: 0, stepUp: true, scope: '2fa' });

  const request = {
    headers: { get: (name) => (name === 'authorization' ? 'Bearer a.b.c' : null) },
  };

  const user = await authenticateRequest(request);

  expect(user).toBeNull();
  expect(User.findById).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/requestAuth.test.js -t "step-up token"`
Expected: FAIL — `authenticateRequest` currently calls `User.findById` and returns the user.

- [ ] **Step 3: Implement the guard**

In `lib/requestAuth.js`, in `authenticateRequest`, immediately after the block that resolves `payload` and before `if (!payload?.userId)`:

```js
if (payload?.stepUp === true) {
  return null;
}

if (!payload?.userId) {
  return null;
}
```

Make the identical insertion in `verifyRequestToken`, right before `return payload || null;`:

```js
if (payload?.stepUp === true) {
  return null;
}

return payload || null;
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx jest tests/lib/requestAuth.test.js`
Expected: PASS (all existing + new).

- [ ] **Step 5: Full suite (this file is imported widely)**

Run: `npx jest --ci`
Expected: 576 passed (575 baseline + 1).

- [ ] **Step 6: Commit**

```bash
git add lib/requestAuth.js tests/lib/requestAuth.test.js
git commit -m "fix(auth): reject step-up tokens in authenticateRequest / verifyRequestToken

A stepUp:true token must never resolve to a session, on any route.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 1.3: `mustChangePassword` helper

**Files:**

- Create: `lib/userState.js`
- Test: `tests/lib/userState.test.js`

**Interfaces:**

- Produces: `mustChangePassword(user: { must_change_password?: boolean, first_login?: boolean } | null | undefined): boolean` — `true` iff `user` is truthy and (`must_change_password === true` OR `first_login === true`). The non-schema `mustChangePassword` camelCase field is intentionally dropped (Mongoose strict mode never populates it).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/userState.test.js`:

```js
import { mustChangePassword } from '@/lib/userState';

describe('mustChangePassword', () => {
  test('true when must_change_password is true', () => {
    expect(mustChangePassword({ must_change_password: true })).toBe(true);
  });
  test('true when first_login is true', () => {
    expect(mustChangePassword({ first_login: true })).toBe(true);
  });
  test('false when both flags are false', () => {
    expect(mustChangePassword({ must_change_password: false, first_login: false })).toBe(false);
  });
  test('false for null / undefined', () => {
    expect(mustChangePassword(null)).toBe(false);
    expect(mustChangePassword(undefined)).toBe(false);
  });
  test('false when flags are absent', () => {
    expect(mustChangePassword({ email: 'a@b.c' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/userState.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/userState.js`**

```js
// @ts-check
/**
 * Pure helpers describing a user account's transient state.
 */

/**
 * Whether the user must set a new password before getting a real session.
 * @param {{ must_change_password?: boolean, first_login?: boolean } | null | undefined} user
 * @returns {boolean}
 */
export function mustChangePassword(user) {
  if (!user) return false;
  return user.must_change_password === true || user.first_login === true;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest tests/lib/userState.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/userState.js tests/lib/userState.test.js
git commit -m "feat(lib): mustChangePassword(user) helper

Single source of truth for the must-change-password check that was
copy-pasted as a triple-OR across login and first-login-reset.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 1.4: Login route — scoped step-up tokens, 2FA before password-change

**Files:**

- Modify: `app/api/auth/login/route.js`
- Test: `tests/api/auth-flow.test.js` (replace the login stubs — see Task 6.1 for the rest; here add the real behavioral cases this task introduces)

**Interfaces:**

- Consumes: `createStepUpToken`, `STEP_UP_SCOPE` (Task 1.1); `mustChangePassword` (Task 1.3); `issueAuthTokens`, `serializeAuthenticatedUser` (`lib/requestAuth`).
- Produces: `POST /api/auth/login` response contract:
  - 2FA enabled (regardless of must-change): `200 { success: true, requires2FA: true, require2FA: true, email, tempToken }` where `tempToken` is a `2fa`-scoped step-up token (5 min). **No cookies set.**
  - must-change, no 2FA: `200 { success: true, requirePasswordChange: true, tempToken, user }` where `tempToken` is a `pwd`-scoped step-up token (15 min). **No cookies set.**
  - normal: `200 { success: true, requirePasswordChange: false, user }` **with** access+refresh cookies via `issueAuthTokens`.
  - `tempToken` field name is kept (client already forwards it as `Authorization: Bearer`).

- [ ] **Step 1: Write the failing test**

Create `tests/api/two-factor-bypass.test.js`:

```js
/**
 * Regression: the login step-up token must not be usable as a session,
 * and 2FA must not be skippable via the must-change-password path.
 */
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true })),
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
}));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/auditNotificationService', () => ({ notifyAboutFailedLogins: jest.fn() }));
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2a$12$x'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/requestAuth', () => ({
  ...jest.requireActual('@/lib/requestAuth'),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((u) => ({ id: u._id, email: u.email })),
}));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findOne: jest.fn() } }));

import { POST as login } from '@/app/api/auth/login/route';
import { issueAuthTokens } from '@/lib/requestAuth';
import { verifyStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import User from '@/models/User';

function mockUser(overrides = {}) {
  return {
    _id: 'u1',
    email: 'a@b.c',
    password: '$2a$12$x',
    status: 'Actif',
    tokenVersion: 0,
    failedLoginAttempts: 0,
    save: jest.fn().mockResolvedValue(undefined),
    role_id: { nom: 'Membre', permissions: {} },
    ...overrides,
  };
}
function req(body) {
  return { headers: { get: () => null }, json: async () => body };
}

beforeEach(() => jest.clearAllMocks());

test('2FA user gets a 2fa-scoped step-up token and NO cookies', async () => {
  User.findOne.mockReturnValue({
    select: () => ({ populate: () => Promise.resolve(mockUser({ twoFactorEnabled: true })) }),
  });
  const res = await login(req({ email: 'a@b.c', password: 'pw' }));
  const data = await res.json();

  expect(data.requires2FA).toBe(true);
  expect(issueAuthTokens).not.toHaveBeenCalled();
  const claims = await verifyStepUpToken(data.tempToken, STEP_UP_SCOPE.TWO_FACTOR);
  expect(claims?.userId).toBe('u1');
});

test('2FA + must-change user still goes through 2FA (no full session)', async () => {
  User.findOne.mockReturnValue({
    select: () => ({
      populate: () =>
        Promise.resolve(mockUser({ twoFactorEnabled: true, must_change_password: true })),
    }),
  });
  const res = await login(req({ email: 'a@b.c', password: 'pw' }));
  const data = await res.json();

  expect(data.requires2FA).toBe(true);
  expect(issueAuthTokens).not.toHaveBeenCalled();
});

test('must-change (no 2FA) gets a pwd-scoped step-up token and NO cookies', async () => {
  User.findOne.mockReturnValue({
    select: () => ({
      populate: () => Promise.resolve(mockUser({ must_change_password: true })),
    }),
  });
  const res = await login(req({ email: 'a@b.c', password: 'pw' }));
  const data = await res.json();

  expect(data.requirePasswordChange).toBe(true);
  expect(issueAuthTokens).not.toHaveBeenCalled();
  const claims = await verifyStepUpToken(data.tempToken, STEP_UP_SCOPE.PASSWORD_CHANGE);
  expect(claims?.userId).toBe('u1');
});

test('normal user gets a full session', async () => {
  User.findOne.mockReturnValue({
    select: () => ({ populate: () => Promise.resolve(mockUser()) }),
  });
  const res = await login(req({ email: 'a@b.c', password: 'pw' }));
  const data = await res.json();

  expect(data.requirePasswordChange).toBe(false);
  expect(issueAuthTokens).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/api/two-factor-bypass.test.js`
Expected: FAIL — current login issues a plain `createUserAccessToken` temp token and calls `issueAuthTokens` on the must-change path.

- [ ] **Step 3: Edit `app/api/auth/login/route.js`**

Change the imports block:

```js
import { issueAuthTokens, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { mustChangePassword } from '@/lib/userState';
```

(Remove `createUserAccessToken` from the `@/lib/requestAuth` import — it is no longer used here.)

Replace the success block (from `// Success, reset attempts` through `await issueAuthTokens(response, user);`) with:

```js
// Success — reset failed-attempt state.
user.failedLoginAttempts = 0;
user.lockUntil = undefined;
user.dernière_connexion = new Date();
await user.save();

// 2FA gate takes precedence over must-change: a 2FA user always proves
// their second factor before anything else.
if (user.twoFactorEnabled) {
  return NextResponse.json({
    success: true,
    requires2FA: true,
    require2FA: true,
    email: user.email,
    tempToken: await createStepUpToken(user, STEP_UP_SCOPE.TWO_FACTOR, 5),
  });
}

// Must-change-password: hand back a pwd-scoped step-up token, NOT a session.
if (mustChangePassword(user)) {
  return NextResponse.json({
    success: true,
    requirePasswordChange: true,
    tempToken: await createStepUpToken(user, STEP_UP_SCOPE.PASSWORD_CHANGE, 15),
    user: serializeAuthenticatedUser(user),
  });
}

const response = NextResponse.json({
  success: true,
  requirePasswordChange: false,
  user: serializeAuthenticatedUser(user),
});

await issueAuthTokens(response, user);
```

Also delete the two dead lines that write non-schema fields in the failed-password branch: `user.loginAttempts = user.failedLoginAttempts;` and the `user.loginAttempts` read fallback — change

```js
user.failedLoginAttempts = (user.failedLoginAttempts || user.loginAttempts || 0) + 1;
user.loginAttempts = user.failedLoginAttempts;
```

to

```js
user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
```

- [ ] **Step 4: Run the new test + the existing auth-flow file**

Run: `npx jest tests/api/two-factor-bypass.test.js tests/api/auth-flow.test.js`
Expected: `two-factor-bypass.test.js` PASS (4 tests); `auth-flow.test.js` still PASS (its login cases are stubs until Task 6.1).

- [ ] **Step 5: Full suite + typecheck + lint**

Run: `npx tsc --noEmit && npx eslint . && npx jest --ci`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/login/route.js tests/api/two-factor-bypass.test.js
git commit -m "fix(auth): login issues scoped step-up tokens; 2FA before password-change

- 2FA users get a 2fa-scoped step-up token (5m), never a session.
- 2FA now takes precedence over must-change-password (was skippable).
- must-change users get a pwd-scoped step-up token (15m), not full cookies.
- Drop dead writes to the removed loginAttempts field.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 1.5: 2FA verify route consumes the `2fa` step-up token

**Files:**

- Modify: `app/api/auth/2fa/verify/route.js`
- Test: `tests/api/two-factor-bypass.test.js` (add cases)

**Interfaces:**

- Consumes: `verifyStepUpToken`, `STEP_UP_SCOPE` (Task 1.1); `getBearerToken` (`lib/requestAuth`); `mustChangePassword` (Task 1.3); `createStepUpToken` (Task 1.1).
- Produces: `POST /api/auth/2fa/verify`:
  - Requires `Authorization: Bearer <2fa step-up token>`. No token / wrong scope / tokenVersion mismatch / inactive user → `401 { success: false, error: 'Session 2FA invalide ou expirée' }`.
  - Valid TOTP/backup + `mustChangePassword(user)` → `200 { success: true, requirePasswordChange: true, tempToken: <pwd step-up 15m>, user }`. **No cookies.**
  - Valid TOTP/backup + no must-change → existing `200 { success: true, user, data: { user, backupCodesRemaining } }` **with** `issueAuthTokens`.
  - Route option becomes `{ requireAuth: false, rateLimitPreset: 'auth' }` (auth is done inside against the step-up token).

- [ ] **Step 1: Write the failing test**

Append to `tests/api/two-factor-bypass.test.js`:

```js
describe('POST /api/auth/2fa/verify', () => {
  jest.mock('@/lib/withApiProtection', () => ({
    withApiProtection: (h) => h,
  }));
  jest.mock('@/lib/twoFactorAuth', () => ({
    verifyTwoFactorToken: jest.fn(() => true),
    verifyBackupCode: jest.fn(() => ({ valid: true, remainingCodes: [] })),
  }));

  const { createStepUpToken, STEP_UP_SCOPE: SCOPE } = require('@/lib/auth/stepUp');

  function twoFAReq(token, body = { token: '123456' }) {
    return {
      method: 'POST',
      url: 'http://localhost/api/auth/2fa/verify',
      headers: { get: (n) => (n === 'authorization' ? `Bearer ${token}` : null) },
      json: async () => body,
    };
  }

  test('rejects a request with no step-up token', async () => {
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq('garbage'));
    expect(res.status).toBe(401);
  });

  test('accepts a valid 2fa step-up token and issues a session', async () => {
    const { issueAuthTokens } = require('@/lib/requestAuth');
    User.findById = jest.fn().mockReturnValue({
      select: () => ({
        populate: () =>
          Promise.resolve({
            _id: 'u1',
            email: 'a@b.c',
            status: 'Actif',
            tokenVersion: 0,
            twoFactorEnabled: true,
            twoFactorSecret: 's',
            save: jest.fn(),
            role_id: { nom: 'Membre', permissions: {} },
          }),
      }),
    });
    const token = await createStepUpToken({ _id: 'u1', tokenVersion: 0 }, SCOPE.TWO_FACTOR, 5);
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(issueAuthTokens).toHaveBeenCalled();
  });

  test('rejects a pwd-scoped token (wrong scope)', async () => {
    const token = await createStepUpToken({ _id: 'u1', tokenVersion: 0 }, SCOPE.PASSWORD_CHANGE, 5);
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));
    expect(res.status).toBe(401);
  });
});
```

> Note: this `describe` re-`require`s the route with fresh mocks; keep it as the **last** block in the file so the module-level `jest.mock` calls hoist cleanly, or split into `tests/api/two-factor-verify.test.js` if the executor finds hoisting fights the earlier `jest.mock('@/models/User')`. A separate file is acceptable and preferred if in doubt.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/api/two-factor-bypass.test.js -t "2fa/verify"`
Expected: FAIL — route currently uses `withApiProtection` default auth (`requireAuth: true`), which now rejects the step-up token (Task 1.2), so every case 401s including the valid one.

- [ ] **Step 3: Rewrite `app/api/auth/2fa/verify/route.js`**

```js
import { NextResponse } from 'next/server';
import User from '@/models/User';
import { withApiProtection } from '@/lib/withApiProtection';
import { getBearerToken, issueAuthTokens, serializeAuthenticatedUser } from '@/lib/requestAuth';
import { verifyStepUpToken, createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { mustChangePassword } from '@/lib/userState';
import { verifyBackupCode, verifyTwoFactorToken } from '@/lib/twoFactorAuth';
import { logActivity } from '@/lib/auditService';

const CHALLENGE_ERROR = 'Session 2FA invalide ou expirée';

export const POST = withApiProtection(
  async (request) => {
    const bearer = getBearerToken(request);
    const challenge = bearer ? await verifyStepUpToken(bearer, STEP_UP_SCOPE.TWO_FACTOR) : null;
    if (!challenge) {
      return NextResponse.json({ success: false, error: CHALLENGE_ERROR }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').replace(/\s/g, '');
    const isBackupCode = Boolean(body.isBackupCode);

    const fresh = await User.findById(challenge.userId)
      .select('+twoFactorSecret +twoFactorBackupCodes')
      .populate('role_id');

    if (
      !fresh ||
      fresh.status !== 'Actif' ||
      (challenge.tokenVersion ?? 0) !== (fresh.tokenVersion ?? 0)
    ) {
      return NextResponse.json({ success: false, error: CHALLENGE_ERROR }, { status: 401 });
    }

    if (!fresh.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: '2FA non activé' }, { status: 400 });
    }

    let backupCodesRemaining;
    if (isBackupCode) {
      const result = verifyBackupCode(token, fresh.twoFactorBackupCodes || []);
      if (!result.valid) {
        return NextResponse.json({ success: false, error: 'Code invalide' }, { status: 401 });
      }
      fresh.twoFactorBackupCodes = result.remainingCodes;
      await fresh.save();
      backupCodesRemaining = result.remainingCodes.length;
    } else if (!verifyTwoFactorToken(token.replace(/\D/g, ''), fresh.twoFactorSecret)) {
      return NextResponse.json({ success: false, error: 'Code invalide' }, { status: 401 });
    }

    // Second factor cleared. If a password change is still owed, hand back a
    // pwd-scoped step-up token instead of a session.
    if (mustChangePassword(fresh)) {
      return NextResponse.json({
        success: true,
        requirePasswordChange: true,
        tempToken: await createStepUpToken(fresh, STEP_UP_SCOPE.PASSWORD_CHANGE, 15),
        user: serializeAuthenticatedUser(fresh),
      });
    }

    const response = NextResponse.json({
      success: true,
      user: serializeAuthenticatedUser(fresh),
      data: { user: serializeAuthenticatedUser(fresh), backupCodesRemaining },
    });

    await issueAuthTokens(response, fresh);

    await logActivity(fresh, 'connexion', 'système', fresh._id, 'Connexion 2FA réussie', {
      request,
      httpMethod: 'POST',
      endpoint: '/auth/2fa/verify',
      httpStatus: 200,
    });

    return response;
  },
  { requireAuth: false, rateLimitPreset: 'auth' }
);
```

- [ ] **Step 4: Run the 2FA verify tests**

Run: `npx jest tests/api/two-factor-bypass.test.js`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck + lint**

Run: `npx tsc --noEmit && npx eslint . && npx jest --ci`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/2fa/verify/route.js tests/api/two-factor-bypass.test.js
git commit -m "fix(auth): 2FA verify consumes the 2fa step-up token, not a session

requireAuth:false + explicit scope check. On success, still routes through
password-change if owed. Closes the 2FA bypass.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 1.6: first-login-reset consumes the `pwd` step-up token; client wiring

**Files:**

- Modify: `app/api/auth/first-login-reset/route.js`
- Modify: `app/login/page.js`, `app/first-login/page.js`
- Test: `tests/api/auth-flow.test.js` (the `first-login-reset` describe — replace stubs with real cases)

**Interfaces:**

- Consumes: `verifyStepUpToken`, `STEP_UP_SCOPE` (Task 1.1); `getBearerToken` (`lib/requestAuth`); `mustChangePassword` (Task 1.3).
- Produces: `POST /api/auth/first-login-reset`:
  - Requires `Authorization: Bearer <pwd step-up token>` **OR** a valid full session cookie (back-compat during rollout — accept both; a full session only reaches here if `mustChangePassword` is still true). Missing both → `401`.
  - Still requires the correct `temporary_password` in the body.
  - On success: sets `must_change_password=false`, `first_login=false`, bumps `tokenVersion`, revokes sessions, then `issueAuthTokens` (full session — now legitimate).
- Client: `app/login/page.js` stores `data.tempToken` from the must-change response into `sessionStorage` under `pm_pwd_stepup` before navigating to `/first-login`; the 2FA path does the same when `data.requirePasswordChange` comes back from `/api/auth/2fa/verify`. `app/first-login/page.js` reads `pm_pwd_stepup` and sends it as `Authorization: Bearer`, clearing it on success.

- [ ] **Step 1: Write the failing test**

In `tests/api/auth-flow.test.js`, replace the `describe('POST /api/auth/first-login-reset ...')` stub block (or add a new file `tests/api/first-login-reset.test.js`) with:

```js
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true })),
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
}));
jest.mock('@/lib/userSecurity', () => ({ revokeUserSessions: jest.fn() }));
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  hashPassword: jest.fn().mockResolvedValue('$2a$12$new'),
}));
jest.mock('@/lib/requestAuth', () => ({
  ...jest.requireActual('@/lib/requestAuth'),
  authenticateRequest: jest.fn().mockResolvedValue(null),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((u) => ({ id: u._id })),
}));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));

import { POST as reset } from '@/app/api/auth/first-login-reset/route';
import { createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { issueAuthTokens } from '@/lib/requestAuth';
import User from '@/models/User';

const strongPw = {
  new_password: 'StrongPass123!',
  new_password_confirm: 'StrongPass123!',
  temporary_password: 'Temp123!',
};

function resetReq(token, body = strongPw) {
  return {
    headers: { get: (n) => (n === 'authorization' && token ? `Bearer ${token}` : null) },
    json: async () => body,
  };
}
function mustChangeUser() {
  return {
    _id: 'u1',
    password: '$2a$12$old',
    must_change_password: true,
    first_login: true,
    tokenVersion: 0,
    password_history: [],
    save: jest.fn().mockResolvedValue(undefined),
    role_id: { nom: 'Membre' },
  };
}

beforeEach(() => jest.clearAllMocks());

test('rejects when neither step-up token nor session is present', async () => {
  const res = await reset(resetReq(null));
  expect(res.status).toBe(401);
});

test('accepts a pwd step-up token + correct temp password and issues a session', async () => {
  User.findById.mockReturnValue({
    select: () => ({ populate: () => Promise.resolve(mustChangeUser()) }),
  });
  const token = await createStepUpToken(
    { _id: 'u1', tokenVersion: 0 },
    STEP_UP_SCOPE.PASSWORD_CHANGE,
    15
  );
  const res = await reset(resetReq(token));
  const data = await res.json();
  expect(data.success).toBe(true);
  expect(issueAuthTokens).toHaveBeenCalled();
});

test('rejects a 2fa-scoped token (wrong scope)', async () => {
  const token = await createStepUpToken(
    { _id: 'u1', tokenVersion: 0 },
    STEP_UP_SCOPE.TWO_FACTOR,
    15
  );
  const res = await reset(resetReq(token));
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/api/first-login-reset.test.js` (or the auth-flow file)
Expected: FAIL — route currently only calls `authenticateRequest` (mocked to `null` here), so the valid-token case 401s.

- [ ] **Step 3: Edit `app/api/auth/first-login-reset/route.js`**

Add imports:

```js
import {
  authenticateRequest,
  getBearerToken,
  issueAuthTokens,
  serializeAuthenticatedUser,
} from '@/lib/requestAuth';
import { verifyStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { mustChangePassword } from '@/lib/userState';
```

Replace the session-resolution block (`const sessionUser = await authenticateRequest(request); if (!sessionUser) {...}` and the following `User.findById(sessionUser._id)`) with:

```js
// Accept either a pwd-scoped step-up token (normal path) or an existing
// full session (back-compat — only reachable while must-change is true).
let userId = null;
const bearer = getBearerToken(request);
const challenge = bearer ? await verifyStepUpToken(bearer, STEP_UP_SCOPE.PASSWORD_CHANGE) : null;
if (challenge) {
  userId = challenge.userId;
} else {
  const sessionUser = await authenticateRequest(request);
  if (sessionUser) userId = sessionUser._id;
}
if (!userId) {
  return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
}

const user = await User.findById(userId).select('+password').populate('role_id');
if (!user) {
  return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
}
```

Replace the inline `const mustChange = ...` computation with `mustChangePassword(user)`:

```js
if (!mustChangePassword(user)) {
  return NextResponse.json(
    { success: false, error: 'Changement de mot de passe non requis' },
    { status: 400 }
  );
}
```

- [ ] **Step 4: Wire the client — `app/login/page.js`**

In `handleSubmit`, in the branch that handles the non-2FA response, before the `setTimeout(...)` redirect, when `data.requirePasswordChange` and `data.tempToken` are present:

```js
if (data.requirePasswordChange && data.tempToken) {
  try {
    sessionStorage.setItem('pm_pwd_stepup', data.tempToken);
  } catch {
    /* ignore */
  }
}
```

In `handle2FASubmit`, after `const data = await response.json();` and the `!response.ok` guard, add:

```js
if (data.requirePasswordChange && data.tempToken) {
  try {
    sessionStorage.setItem('pm_pwd_stepup', data.tempToken);
  } catch {
    /* ignore */
  }
  setLoading(false);
  router.push('/first-login');
  return;
}
```

- [ ] **Step 5: Wire the client — `app/first-login/page.js`**

In `handleSubmit`, read and send the step-up token, and clear it on success:

```js
const stepUp = (() => {
  try {
    return sessionStorage.getItem('pm_pwd_stepup');
  } catch {
    return null;
  }
})();
const response = await fetch('/api/auth/first-login-reset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(stepUp ? { Authorization: `Bearer ${stepUp}` } : {}),
  },
  credentials: 'same-origin',
  body: JSON.stringify(formData),
});
```

After a successful reset (`if (data?.user) { markAuthSession(data.user); }`):

```js
try {
  sessionStorage.removeItem('pm_pwd_stepup');
} catch {
  /* ignore */
}
```

Also relax the `useEffect` guard so the page still loads when there is a step-up token but no session marker yet:

```js
useEffect(() => {
  const hasStepUp = (() => {
    try {
      return !!sessionStorage.getItem('pm_pwd_stepup');
    } catch {
      return false;
    }
  })();
  if (!hasAuthSessionMarker() && !hasStepUp) {
    router.push('/login');
  }
}, [router]);
```

- [ ] **Step 6: Run tests + full gate**

Run: `npx jest tests/api/first-login-reset.test.js && npx tsc --noEmit && npx eslint . && npx jest --ci`
Expected: all green.

- [ ] **Step 7: Manual smoke (documented, not automated here)**

Note for the reviewer: verify by hand against a dev server — (a) new user login → redirected to `/first-login` → set password → lands on `/dashboard`; (b) 2FA user login → code prompt → dashboard; (c) 2FA + new user → code prompt → `/first-login` → dashboard. Record the result in the PR description.

- [ ] **Step 8: Commit**

```bash
git add app/api/auth/first-login-reset/route.js app/login/page.js app/first-login/page.js tests/api/first-login-reset.test.js tests/api/auth-flow.test.js
git commit -m "fix(auth): first-login-reset consumes pwd step-up token; wire client flow

Login no longer hands a full session to must-change users; the pwd
step-up token rides through sessionStorage to /first-login.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 2 — Auth & rate-limit hardening

### Task 2.1: `getClientIP` trust boundary

**Files:**

- Modify: `lib/rateLimit.js` (`getClientIP` ~L124-136)
- Test: `tests/lib/getClientIP.test.js`

**Interfaces:**

- Produces: `getClientIP(request)` behavior:
  - Non-`function` headers → `request.socket?.remoteAddress || 'unknown'` (unchanged).
  - `NODE_ENV !== 'production'`: trust `x-forwarded-for` leftmost as-is (dev/e2e rate-limit tests depend on this), else `x-real-ip`, else socket, else `'unknown'`.
  - `NODE_ENV === 'production'`: real client = `parts[parts.length - TRUSTED_PROXY_COUNT]` where `parts` = trimmed non-empty `x-forwarded-for` entries and `TRUSTED_PROXY_COUNT` (env, default `1`) is how many reverse proxies our infra puts in front. If `parts.length < TRUSTED_PROXY_COUNT` → `x-real-ip` → `'unknown'`. Never returns a client-controlled leftmost value in production.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/getClientIP.test.js`:

```js
const ORIGINAL_ENV = process.env.NODE_ENV;

function reqWith(headers) {
  return { headers: { get: (n) => headers[n.toLowerCase()] ?? null } };
}

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
  delete process.env.TRUSTED_PROXY_COUNT;
  jest.resetModules();
});

test('dev: trusts leftmost x-forwarded-for (e2e helper contract)', () => {
  process.env.NODE_ENV = 'test';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
});

test('prod, 1 proxy: takes the entry our proxy appended, not the spoofed leftmost', () => {
  process.env.NODE_ENV = 'production';
  const { getClientIP } = require('@/lib/rateLimit');
  // attacker sent "1.1.1.1", our proxy appended the real client "198.51.100.7"
  expect(getClientIP(reqWith({ 'x-forwarded-for': '1.1.1.1, 198.51.100.7' }))).toBe('198.51.100.7');
});

test('prod, 2 proxies: TRUSTED_PROXY_COUNT=2 skips both trusted hops', () => {
  process.env.NODE_ENV = 'production';
  process.env.TRUSTED_PROXY_COUNT = '2';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({ 'x-forwarded-for': 'evil, 198.51.100.7, 10.0.0.2' }))).toBe(
    '198.51.100.7'
  );
});

test('prod: too few entries falls back to x-real-ip', () => {
  process.env.NODE_ENV = 'production';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
});

test('prod: nothing usable returns "unknown"', () => {
  process.env.NODE_ENV = 'production';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({}))).toBe('unknown');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/getClientIP.test.js`
Expected: FAIL on the prod cases — current code returns `'1.1.1.1'` (leftmost).

- [ ] **Step 3: Replace `getClientIP` in `lib/rateLimit.js`**

```js
/**
 * Resolve the client IP for rate-limiting.
 *
 * `x-forwarded-for` is attacker-controlled on the left. In production we only
 * trust the rightmost TRUSTED_PROXY_COUNT hops (added by our own infra) and
 * read the client as the hop just before them. In dev/test we trust the
 * leftmost value as-is so e2e rate-limit tests can spoof it.
 */
export function getClientIP(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== 'function') {
    return request?.socket?.remoteAddress || 'unknown';
  }

  const xff = headers.get('x-forwarded-for');
  const parts = xff
    ? xff
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (process.env.NODE_ENV !== 'production') {
    if (parts.length > 0) return parts[0];
    return headers.get('x-real-ip') || request?.socket?.remoteAddress || 'unknown';
  }

  const trusted = Number.parseInt(process.env.TRUSTED_PROXY_COUNT ?? '1', 10) || 1;
  if (parts.length >= trusted) {
    return parts[parts.length - trusted] || 'unknown';
  }

  return headers.get('x-real-ip') || 'unknown';
}
```

- [ ] **Step 4: Run the test + full suite**

Run: `npx jest tests/lib/getClientIP.test.js && npx jest --ci`
Expected: PASS; full suite green.

- [ ] **Step 5: Document the env var** — add to `.env.example` under a `# Rate limiting` section:

```
# Number of reverse proxies in front of the app that append to X-Forwarded-For.
# Vercel = 1, a single nginx = 1, nginx-behind-CDN = 2. Only used in production.
TRUSTED_PROXY_COUNT=1
```

- [ ] **Step 6: Commit**

```bash
git add lib/rateLimit.js tests/lib/getClientIP.test.js .env.example
git commit -m "fix(security): trust boundary for X-Forwarded-For in getClientIP

Production no longer trusts the client-controlled leftmost XFF value;
reads the client from behind TRUSTED_PROXY_COUNT trusted hops. Restores
brute-force protection on the login limiter.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 2.2: Rate-limit before auth in `withApiProtection`

**Files:**

- Modify: `lib/withApiProtection.js` (`protectedHandler` body ~L56-99)
- Test: `tests/lib/withApiProtection.test.js` (create if absent; check first — `lib/__tests__/` may hold protection tests)

**Interfaces:**

- Produces: `withApiProtection` runs, in order: `connectDB` → request-size check → **rate limit** → auth → permission → handler. An unauthenticated request that exceeds the IP limit gets `429` (was: `401`, unlimited).

- [ ] **Step 1: Locate existing coverage**

Run: `ls lib/__tests__ && grep -rl "withApiProtection" lib/__tests__ tests`
If a test file exists, add to it; otherwise create `tests/lib/withApiProtection.test.js`.

- [ ] **Step 2: Write the failing test**

`tests/lib/withApiProtection.test.js` (or appended):

```js
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/requestAuth', () => ({ authenticateRequest: jest.fn() }));
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(),
  handleRateLimitError: jest.fn(() => new Response(null, { status: 429 })),
  validateRequestSize: jest.fn(async () => ({ valid: true })),
}));

import { withApiProtection } from '@/lib/withApiProtection';
import { authenticateRequest } from '@/lib/requestAuth';
import { applyRateLimit } from '@/lib/apiMiddleware';

const baseReq = { method: 'GET', url: 'http://x/api/things', headers: { get: () => null } };

beforeEach(() => jest.clearAllMocks());

test('rate limit is checked before authentication', async () => {
  applyRateLimit.mockResolvedValue({ allowed: false, resetTime: 60 });
  const handler = jest.fn();
  const wrapped = withApiProtection(handler, { requireAuth: true });

  const res = await wrapped(baseReq, {});

  expect(res.status).toBe(429);
  expect(authenticateRequest).not.toHaveBeenCalled();
  expect(handler).not.toHaveBeenCalled();
});

test('authenticated request still rate-limited per user after auth passes', async () => {
  applyRateLimit.mockResolvedValueOnce({ allowed: true });
  authenticateRequest.mockResolvedValue({ _id: 'u1', role_id: { permissions: {} } });
  const handler = jest.fn(async () => new Response('ok'));
  const wrapped = withApiProtection(handler, { requireAuth: true });

  await wrapped(baseReq, {});

  expect(applyRateLimit).toHaveBeenCalled();
  expect(handler).toHaveBeenCalled();
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx jest tests/lib/withApiProtection.test.js`
Expected: FAIL on case 1 — `authenticateRequest` is called before the rate limit today.

- [ ] **Step 4: Reorder `protectedHandler` in `lib/withApiProtection.js`**

Move the rate-limit block to run right after the request-size check and before authentication. The `userId` for the per-user limit is only known after auth, so do a **two-part** limit: an IP-only pass before auth, then (if authenticated) the combined pass after auth. Replace the body from the size check onward with:

```js
// Request size validation for mutation methods
if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
  const sizeCheck = await validateRequestSize(request, maxBodySize);
  if (!sizeCheck.valid) {
    return APIResponse.error(sizeCheck.error, 413, null, 'PAYLOAD_TOO_LARGE');
  }
}

const rateLimitConfig = RATE_LIMIT_CONFIG[rateLimitPreset] || RATE_LIMIT_CONFIG.global;

// Pass 1: IP-only limit — applies to EVERY request, including
// unauthenticated ones, before we do any auth work.
const ipLimit = await applyRateLimit(request, null, rateLimitConfig);
if (!ipLimit.allowed) {
  return handleRateLimitError(ipLimit);
}

// Authentication
let user = null;
if (requireAuth) {
  user = await authenticateRequest(request);
  if (!user) {
    return APIResponse.unauthorized();
  }

  const hasPermSpec =
    (Array.isArray(requiredPermissions) && requiredPermissions.length > 0) ||
    (typeof requiredPermissions === 'object' && requiredPermissions !== null) ||
    typeof requiredPermissions === 'string';
  if (hasPermSpec) {
    const perms = user.role_id?.permissions || {};
    if (!evaluatePermissions(perms, requiredPermissions)) {
      return APIResponse.forbidden();
    }
  }

  // Pass 2: combined IP + per-user limit for authenticated traffic.
  const userLimit = await applyRateLimit(request, user._id.toString(), rateLimitConfig);
  if (!userLimit.allowed) {
    return handleRateLimitError(userLimit);
  }
}

return await handler(request, { ...context, user });
```

> Trade-off noted in a comment: authenticated requests now increment the IP counter twice per request. That is acceptable — the IP preset is already doubled for authenticated callers (`applyRateLimit` uses `max * 2` for the IP side when a `userId` is passed) — but bump the pass-1 config's headroom by using `{ ...rateLimitConfig, max: Math.ceil(rateLimitConfig.max * 2) }` for the pass-1 call so a normal authenticated session is never rate-limited by its own double-count:
>
> ```js
> const ipLimit = await applyRateLimit(request, null, {
>   ...rateLimitConfig,
>   max: Math.ceil(rateLimitConfig.max * 2),
> });
> ```
>
> Apply that refinement in this step.

- [ ] **Step 5: Run tests + full suite**

Run: `npx jest tests/lib/withApiProtection.test.js && npx jest --ci`
Expected: PASS; full suite green (watch `tests/api/__tests__/advancedApiSecurity.test.js` and `tests/security/*` — if any asserts the old ordering, update the assertion, not the behavior).

- [ ] **Step 6: Commit**

```bash
git add lib/withApiProtection.js tests/lib/withApiProtection.test.js
git commit -m "fix(security): rate-limit unauthenticated requests in withApiProtection

Two-pass limit: IP-only before auth (covers unauthenticated floods),
combined IP+user after auth.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 2.3: Remove the 30-minute floor from `signTokenWithMinutes`

**Files:**

- Modify: `lib/auth.js` (`signTokenWithMinutes` ~L66-74, and its JSDoc ~L60-65)
- Test: `tests/lib/auth.test.js` (add cases)

**Interfaces:**

- Produces: `signTokenWithMinutes(payload, minutes)` clamps to `[1, 10080]` (was `[30, 10080]`). `issueAuthTokens` now really issues a 15-minute access token; a 5-minute request really lasts 5 minutes.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/auth.test.js`:

```js
describe('signTokenWithMinutes TTL', () => {
  const { signTokenWithMinutes } = require('@/lib/auth');
  const { jwtVerify } = require('jose');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  test('honours a 15-minute request', async () => {
    const token = await signTokenWithMinutes({ userId: 'u1' }, 15);
    const { payload } = await jwtVerify(token, secret);
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  test('honours a 5-minute request', async () => {
    const token = await signTokenWithMinutes({ userId: 'u1' }, 5);
    const { payload } = await jwtVerify(token, secret);
    expect(payload.exp - payload.iat).toBe(5 * 60);
  });

  test('floors sub-minute values to 1 minute and caps at 7 days', async () => {
    const secret2 = new TextEncoder().encode(process.env.JWT_SECRET);
    const lo = await signTokenWithMinutes({ userId: 'u1' }, 0);
    const hi = await signTokenWithMinutes({ userId: 'u1' }, 99999);
    const { payload: p1 } = await jwtVerify(lo, secret2);
    const { payload: p2 } = await jwtVerify(hi, secret2);
    expect(p1.exp - p1.iat).toBe(60);
    expect(p2.exp - p2.iat).toBe(10080 * 60);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/auth.test.js -t "signTokenWithMinutes TTL"`
Expected: FAIL — 15 and 5 min both come back as 1800s.

- [ ] **Step 3: Edit `lib/auth.js`**

Change:

```js
const minutes = Math.min(Math.max(expirationMinutes, 30), 10080);
```

to:

```js
const minutes = Math.min(Math.max(Math.floor(expirationMinutes), 1), 10080);
```

Update the JSDoc line `@param {number} [expirationMinutes=30] - Token lifetime in minutes (clamped 30..10080)` → `(clamped 1..10080)` and the default in the signature comment stays 30 (callers always pass a value).

- [ ] **Step 4: Run the test + full suite**

Run: `npx jest tests/lib/auth.test.js && npx jest --ci`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.js tests/lib/auth.test.js
git commit -m "fix(auth): drop the 30-minute floor on signTokenWithMinutes

Access tokens now really live 15 minutes; short-lived tokens honour
their requested TTL. Floor is 1 minute.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 2.4: Mandatory `JWT_REFRESH_SECRET` + crypto-secure `generateJti`

**Files:**

- Modify: `lib/auth/refresh.js` (~L1-16, `generateJti` ~L74-76)
- Test: `tests/lib/refresh.test.js` (create if absent; check `tests/lib/` first)

**Interfaces:**

- Produces:
  - Module load throws `FATAL: JWT_REFRESH_SECRET is required` when `process.env.JWT_REFRESH_SECRET` is missing/short (`< 32` chars) **in production**; in dev/test it falls back to `JWT_SECRET + '_refresh'` with a `console.warn`.
  - `generateJti()` returns a 32-hex-char string from `crypto.randomBytes(16)`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/refresh.test.js`:

```js
import { generateJti } from '@/lib/auth/refresh';

test('generateJti returns 32 hex chars', () => {
  const a = generateJti();
  const b = generateJti();
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(a).not.toBe(b);
});
```

> The env-throw behavior is verified in `tests/lib/envValidation.test.js` in Task 6.4; testing a module-load `throw` in isolation is brittle under Jest's module cache, so this task only unit-tests `generateJti` and relies on Task 6.4 for the env contract.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/refresh.test.js`
Expected: FAIL — current `generateJti` returns `<base36>-<base36>` (contains a `-`, not 32 hex).

- [ ] **Step 3: Edit `lib/auth/refresh.js`**

Replace the top secret-resolution block:

```js
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is required for refresh tokens');
}

const isProd = process.env.NODE_ENV === 'production';
const refreshSecretRaw = process.env.JWT_REFRESH_SECRET;

if (isProd && (!refreshSecretRaw || refreshSecretRaw.length < 32)) {
  throw new Error(
    'FATAL: JWT_REFRESH_SECRET (min 32 chars) is required in production. ' +
      'Generate one with: openssl rand -base64 48'
  );
}
if (!isProd && !refreshSecretRaw) {
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_REFRESH_SECRET not set — deriving from JWT_SECRET (dev only)');
}

const REFRESH_SECRET = new TextEncoder().encode(
  refreshSecretRaw || process.env.JWT_SECRET + '_refresh'
);
```

Replace `generateJti`:

```js
/**
 * Generate a unique, unpredictable JWT ID for a refresh token (rotation tracking).
 * @returns {string}
 */
export function generateJti() {
  return randomBytes(16).toString('hex');
}
```

- [ ] **Step 4: Run the test + full suite**

Run: `npx jest tests/lib/refresh.test.js && npx jest --ci`
Expected: PASS; full suite green (`tests/api/auth-flow.test.js` refresh cases are stubs; `tests/lib/requestAuth.test.js` mocks refresh).

- [ ] **Step 5: Add to `.env.example`** under `# Auth`:

```
# Dedicated secret for refresh tokens (min 32 chars). REQUIRED in production.
# openssl rand -base64 48
JWT_REFRESH_SECRET=
```

- [ ] **Step 6: Commit**

```bash
git add lib/auth/refresh.js tests/lib/refresh.test.js .env.example
git commit -m "fix(auth): require JWT_REFRESH_SECRET in prod; crypto-secure generateJti

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 2.5: `validateRequestSize` rejects unbounded bodies

**Files:**

- Modify: `lib/apiMiddleware.js` (`validateRequestSize` ~L105-117)
- Test: `tests/lib/apiMiddleware.test.js` (create if absent)

**Interfaces:**

- Produces: `validateRequestSize(request, maxSize)`:
  - `content-length` present and `> maxSize` → `{ valid: false, error }` (unchanged).
  - `content-length` absent AND a body is implied (method in POST/PUT/PATCH AND `transfer-encoding` present, or neither header present) → `{ valid: false, error: 'Longueur du corps de requête requise' }`.
  - Otherwise `{ valid: true }`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/apiMiddleware.test.js`:

```js
import { validateRequestSize } from '@/lib/apiMiddleware';

function req(method, headers) {
  return { method, headers: { get: (n) => headers[n.toLowerCase()] ?? null } };
}

test('accepts a body within the limit', async () => {
  const r = await validateRequestSize(req('POST', { 'content-length': '500' }), 1000);
  expect(r.valid).toBe(true);
});

test('rejects a body over the limit', async () => {
  const r = await validateRequestSize(req('POST', { 'content-length': '5000' }), 1000);
  expect(r.valid).toBe(false);
});

test('rejects a chunked POST with no content-length', async () => {
  const r = await validateRequestSize(req('POST', { 'transfer-encoding': 'chunked' }), 1000);
  expect(r.valid).toBe(false);
});

test('allows a GET with no content-length', async () => {
  const r = await validateRequestSize(req('GET', {}), 1000);
  expect(r.valid).toBe(true);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/apiMiddleware.test.js`
Expected: FAIL on the chunked-POST case.

- [ ] **Step 3: Edit `validateRequestSize` in `lib/apiMiddleware.js`**

```js
export async function validateRequestSize(request, maxSize = 1024 * 1024) {
  const contentLength = request.headers.get('content-length');
  const method = (request.method || 'GET').toUpperCase();
  const bodyMethod = method === 'POST' || method === 'PUT' || method === 'PATCH';

  if (contentLength) {
    if (Number.parseInt(contentLength, 10) > maxSize) {
      return { valid: false, error: `Corps de requête trop volumineux (max ${maxSize} octets)` };
    }
    return { valid: true };
  }

  // No content-length. Reject a mutation that streams its body — we can't
  // bound it here, so refuse rather than pass an unbounded request through.
  if (bodyMethod && request.headers.get('transfer-encoding')) {
    return { valid: false, error: 'Longueur du corps de requête requise' };
  }

  return { valid: true };
}
```

- [ ] **Step 4: Run the test + full suite**

Run: `npx jest tests/lib/apiMiddleware.test.js && npx jest --ci`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/apiMiddleware.js tests/lib/apiMiddleware.test.js
git commit -m "fix(security): reject chunked mutation bodies with no content-length

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 3 — Authorization: role-privilege guard

### Task 3.1: `canActorManageTarget` + guard on reset-password and role change

**Files:**

- Create: `lib/userManagement.js`
- Test: `tests/lib/userManagement.test.js`
- Modify: `app/api/users/[id]/reset-password/route.js`
- Modify: `app/api/users/[id]/route.js` (the role-change / update handler — inspect it first)

**Interfaces:**

- Produces: `canActorManageTarget(actor, target): boolean` — `false` when `target.role_id.permissions.adminConfig === true` and `actor.role_id.permissions.adminConfig !== true`; also `false` when `String(actor._id) === String(target._id)` for destructive ops (an admin cannot reset/disable themselves via this path). Otherwise `true`. Both args are populated user docs (`role_id` populated).
- Consumed by: `reset-password` PUT and the user-update/role-change handler — a `403 APIResponse.forbidden('Action non autorisée sur ce compte')` when it returns `false`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/userManagement.test.js`:

```js
import { canActorManageTarget } from '@/lib/userManagement';

const admin = { _id: 'a', role_id: { permissions: { adminConfig: true } } };
const userMgr = { _id: 'm', role_id: { permissions: { gererUtilisateurs: true } } };
const member = { _id: 'x', role_id: { permissions: {} } };

test('user-manager cannot manage an adminConfig target', () => {
  expect(canActorManageTarget(userMgr, admin)).toBe(false);
});
test('user-manager can manage a normal member', () => {
  expect(canActorManageTarget(userMgr, member)).toBe(true);
});
test('admin can manage another admin', () => {
  expect(
    canActorManageTarget(admin, { _id: 'b', role_id: { permissions: { adminConfig: true } } })
  ).toBe(true);
});
test('nobody can manage themselves through this path', () => {
  expect(canActorManageTarget(admin, { ...admin })).toBe(false);
});
test('missing role data denies', () => {
  expect(canActorManageTarget(userMgr, { _id: 'z' })).toBe(true); // no adminConfig → allowed
  expect(canActorManageTarget({ _id: 'm' }, admin)).toBe(false);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/userManagement.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/userManagement.js`**

```js
// @ts-check
/**
 * Authorization guard for destructive operations on a user account
 * (password reset, deactivate, role change).
 */

/**
 * @param {{ _id: unknown, role_id?: { permissions?: Record<string, boolean> } }} actor
 * @param {{ _id: unknown, role_id?: { permissions?: Record<string, boolean> } }} target
 * @returns {boolean}
 */
export function canActorManageTarget(actor, target) {
  if (!actor || !target) return false;
  if (String(actor._id) === String(target._id)) return false;

  const targetIsAdmin = target.role_id?.permissions?.adminConfig === true;
  const actorIsAdmin = actor.role_id?.permissions?.adminConfig === true;

  if (targetIsAdmin && !actorIsAdmin) return false;
  return true;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx jest tests/lib/userManagement.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Guard `reset-password`**

In `app/api/users/[id]/reset-password/route.js`: add import

```js
import { canActorManageTarget } from '@/lib/userManagement';
```

The target lookup must populate the role:

```js
const targetUser = await User.findById(targetUserId).populate('role_id');
```

After the `if (!targetUser)` 404 check, add:

```js
if (!canActorManageTarget(user, targetUser)) {
  return NextResponse.json(
    { success: false, error: 'Action non autorisée sur ce compte' },
    { status: 403 }
  );
}
```

- [ ] **Step 6: Guard the user-update / role-change handler**

Run `cat "app/api/users/[id]/route.js"`. For each mutating handler (`PUT`/`PATCH`/`DELETE`) that can change `role_id`, `status`, or delete the user: load the target with `.populate('role_id')` and add the same `canActorManageTarget(user, targetUser)` → `403` guard immediately after the target-exists check. If the file delegates to `lib/services/userService.js`, add the guard in the route handler (not the service) so `context.user` is available.

- [ ] **Step 7: Add a regression test for the route guard**

Create `tests/api/reset-password-guard.test.js`:

```js
jest.mock('@/lib/withApiProtection', () => ({ withApiProtection: (h) => h }));
jest.mock('@/lib/userSecurity', () => ({
  assignTemporaryPassword: jest.fn().mockResolvedValue('Temp123!'),
  sendTemporaryPasswordEmail: jest.fn(),
  revokeUserSessions: jest.fn(),
}));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));

import { PUT } from '@/app/api/users/[id]/reset-password/route';
import User from '@/models/User';

test('a user-manager cannot reset an adminConfig account', async () => {
  User.findById.mockReturnValue({
    populate: () => Promise.resolve({ _id: 't', role_id: { permissions: { adminConfig: true } } }),
  });
  const req = { headers: { get: () => null }, url: 'http://x' };
  const ctx = {
    user: { _id: 'm', role_id: { permissions: { gererUtilisateurs: true } } },
    params: { id: 't' },
  };

  const res = await PUT(req, ctx);
  expect(res.status).toBe(403);
});
```

- [ ] **Step 8: Run tests + full gate**

Run: `npx jest tests/lib/userManagement.test.js tests/api/reset-password-guard.test.js && npx tsc --noEmit && npx eslint . && npx jest --ci`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add lib/userManagement.js tests/lib/userManagement.test.js tests/api/reset-password-guard.test.js "app/api/users/[id]/reset-password/route.js" "app/api/users/[id]/route.js"
git commit -m "feat(security): role-privilege guard on destructive user operations

A non-admin can no longer reset the password, change the role, disable,
or delete an adminConfig account; nobody can do so to their own account
via this path.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 4 — Middleware & response headers

### Task 4.1: Forward identity to handlers, stop leaking it to the browser; fix XSS header

**Files:**

- Modify: `middleware.js` (~L92-95 headers, ~L189-213 API auth block)
- Test: `tests/middleware.test.js` (create if absent; check `tests/` first)

**Interfaces:**

- Produces:
  - The API-auth branch returns `NextResponse.next({ request: { headers } })` with `x-user-id` / `x-user-role` set on the **forwarded request** headers (available to route handlers), and those two headers are **not** present on the response to the client.
  - `X-XSS-Protection` header is set to `0` (was `1; mode=block`).
  - All other security headers unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/middleware.test.js`:

```js
import { middleware } from '@/middleware';

jest.mock('jose', () => ({
  jwtVerify: jest.fn(async () => ({ payload: { userId: 'u1', role: 'Admin' } })),
}));
jest.mock('@/lib/authCookie', () => ({ getTokenFromRequest: () => 'tok' }));

function apiRequest(pathname) {
  const url = `http://localhost${pathname}`;
  return {
    nextUrl: { pathname },
    url,
    method: 'GET',
    headers: { get: (n) => (n === 'origin' ? null : null) },
    cookies: { get: () => ({ value: 'tok' }) },
  };
}

test('X-XSS-Protection is disabled', async () => {
  const res = await middleware(apiRequest('/api/projects'));
  expect(res.headers.get('X-XSS-Protection')).toBe('0');
});

test('x-user-id is not exposed on the response to the client', async () => {
  const res = await middleware(apiRequest('/api/projects'));
  expect(res.headers.get('x-user-id')).toBeNull();
  expect(res.headers.get('x-user-role')).toBeNull();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/middleware.test.js`
Expected: FAIL — `X-XSS-Protection` is `1; mode=block`, and `x-user-id` is set on the response.

- [ ] **Step 3: Edit `middleware.js`**

Change:

```js
response.headers.set('X-XSS-Protection', '1; mode=block');
```

to:

```js
// Deprecated header; modern guidance is to disable the legacy auditor.
response.headers.set('X-XSS-Protection', '0');
```

In the API-auth block, replace the success tail (`response.headers.set('x-user-id', ...)` / `x-user-role` / `return response;`) with a forwarded-header response:

```js
// Forward identity to the route handler on the REQUEST (not the response —
// that would leak it to the browser and it wouldn't reach the handler).
const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-user-id', decoded.userId || decoded.sub || '');
requestHeaders.set('x-user-role', decoded.role || 'user');

const authedResponse = NextResponse.next({ request: { headers: requestHeaders } });
// Re-apply the security headers we set on `response` onto the new response.
response.headers.forEach((value, key) => authedResponse.headers.set(key, value));
return authedResponse;
```

> Note for the executor: `response` was created with `NextResponse.next()` at the top of `middleware`. The cleanest refactor is to build `requestHeaders` once near the top and create the single `NextResponse.next({ request: { headers: requestHeaders } })` there, then set all security headers on it, removing the need to copy headers. Prefer that if it doesn't balloon the diff; the copy-loop above is the low-risk fallback.

- [ ] **Step 4: Run the test + full suite**

Run: `npx jest tests/middleware.test.js && npx jest --ci`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add middleware.js tests/middleware.test.js
git commit -m "fix(security): forward x-user-* to handlers, not to the client; disable X-XSS-Protection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 4.2: Verify the CSP nonce is actually wired

**Files:**

- Modify (if needed): `app/layout.js`, `middleware.js`
- Test: manual + `tests/middleware.test.js` (nonce presence assertion)

**Interfaces:**

- Produces: documented confirmation that either (a) the per-request `x-nonce` is consumed by `app/layout.js` (read via `headers()` and passed to `<Script nonce>` / `next/script`), so production `script-src 'nonce-… strict-dynamic'` works; or (b) if Next 14's framework bootstrap scripts can't be nonced in this setup, the CSP is relaxed to a working, still-meaningful policy and the limitation is recorded in `docs/DEPLOYMENT.md`.

- [ ] **Step 1: Inspect**

Run:

```bash
grep -n "nonce\|headers()\|next/script\|<Script" app/layout.js app/dashboard/layout.js
grep -rn "x-nonce" app lib
```

- [ ] **Step 2: Add a nonce-presence assertion**

Append to `tests/middleware.test.js`:

```js
test('a per-request nonce is emitted and referenced in the CSP', async () => {
  const res = await middleware(apiRequest('/dashboard'));
  const nonce = res.headers.get('x-nonce');
  expect(nonce).toBeTruthy();
  expect(res.headers.get('Content-Security-Policy')).toContain(`'nonce-${nonce}'`);
});
```

> `/dashboard` (not `/api/...`) exercises the frontend branch. Adjust `apiRequest` helper or add a `pageRequest` helper with `cookies.get('auth_token')` returning a value so the middleware doesn't redirect to `/login`.

- [ ] **Step 3: Decide and act**

- If `app/layout.js` already reads `headers().get('x-nonce')` and applies it → no code change; just confirm `npm run build` produces no CSP console errors when run against a dev server (manual check, record in PR).
- If NOT wired and wiring is small (read nonce in `app/layout.js`, pass to a `<Script>` or set on `next/script`) → do it here.
- If Next's inline bootstrap can't take the nonce in this version/config → change the production `scriptSrc` in `middleware.js` to `script-src 'self' 'nonce-${nonce}'` **without** `'strict-dynamic'` only if that's what works, OR keep `strict-dynamic` and accept `'unsafe-inline'` is ignored — and write the exact situation into `docs/DEPLOYMENT.md` (Task 6.5). Do **not** silently leave a broken CSP.

- [ ] **Step 4: Run tests + build**

Run: `npx jest tests/middleware.test.js && npm run build`
Expected: tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add middleware.js app/layout.js tests/middleware.test.js
git commit -m "chore(security): verify/wire CSP nonce for production script-src

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 5 — Data-model cleanup & password history

### Task 5.1: Retire dead login-attempt fields; use model methods

**Files:**

- Modify: `app/api/auth/login/route.js` (failed-attempt + success branches)
- Modify: `models/User.js` (drop `select: false`? no — just confirm `incLoginAttempts`/`resetLoginAttempts` are used or remove them)
- Test: `tests/api/two-factor-bypass.test.js` already covers login success; add a failed-attempt case

**Interfaces:**

- Produces: the login route no longer references `user.loginAttempts` or `user.lastLoginAt` anywhere. Failed attempts go through `user.failedLoginAttempts` only. `models/User.js` methods `incLoginAttempts`/`resetLoginAttempts` are either wired into the login route OR deleted (pick wiring — it centralizes lockout config). If wired: the login route calls `await user.incLoginAttempts()` on bad password and `await user.resetLoginAttempts()` on success, and stops hand-rolling `lockUntil`.

- [ ] **Step 1: Write the failing test**

Append to `tests/api/two-factor-bypass.test.js` (or a `login-lockout.test.js`):

```js
test('a wrong password increments failedLoginAttempts via the model method', async () => {
  const { verifyPassword } = require('@/lib/auth');
  verifyPassword.mockResolvedValueOnce(false);
  const inc = jest.fn().mockResolvedValue(undefined);
  User.findOne.mockReturnValue({
    select: () => ({
      populate: () => Promise.resolve(mockUser({ failedLoginAttempts: 2, incLoginAttempts: inc })),
    }),
  });

  const res = await login(req({ email: 'a@b.c', password: 'wrong' }));
  expect(res.status).toBe(401);
  expect(inc).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest -t "increments failedLoginAttempts via the model method"`
Expected: FAIL — login hand-rolls the increment.

- [ ] **Step 3: Edit the failed-password branch in `app/api/auth/login/route.js`**

```js
if (!isValid) {
  await user.incLoginAttempts();
  const willLock = (user.failedLoginAttempts || 0) + 1 >= 5;
  if (willLock) {
    const ip = getClientIP(request) || 'unknown';
    notifyAboutFailedLogins(user._id, (user.failedLoginAttempts || 0) + 1, ip).catch(() => {});
  }
  await settleAtLeast(startedAt, MIN_LOGIN_DURATION_MS);
  return NextResponse.json({ success: false, error: GENERIC_AUTH_ERROR }, { status: 401 });
}
```

And the success branch — replace the manual `user.failedLoginAttempts = 0; user.lockUntil = undefined; user.dernière_connexion = new Date(); await user.save();` with:

```js
await user.resetLoginAttempts();
```

> `resetLoginAttempts` already sets `failedLoginAttempts: 0`, `dernière_connexion`, and `$unset lockUntil`. Keep the subsequent `user.twoFactorEnabled` / `mustChangePassword(user)` checks — those read fields already loaded on the doc.

- [ ] **Step 4: Run tests + full suite**

Run: `npx jest tests/api && npx jest --ci`
Expected: green. Fix any auth-flow stub that assumed the old field writes.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.js tests/api/two-factor-bypass.test.js
git commit -m "refactor(auth): login uses User.incLoginAttempts/resetLoginAttempts

Removes the last references to the deleted loginAttempts/lastLoginAt fields
and the hand-rolled lockout arithmetic.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5.2: Enforce password history (no reuse)

**Files:**

- Modify: `lib/auth.js` — add `isPasswordReused(plain, history)`
- Modify: `app/api/auth/first-login-reset/route.js` and any `app/api/users/profile` / change-password handler (inspect: `grep -rln "hashPassword\|new_password\|password_history" app/api`)
- Test: `tests/lib/auth.test.js` (add), plus a route case

**Interfaces:**

- Produces: `isPasswordReused(plain: string, history: Array<{ hash: string }>): Promise<boolean>` — `true` if `bcrypt.compare(plain, entry.hash)` matches any of the last 5 entries. Password-change handlers call it and return `422 { success: false, error: 'Ce mot de passe a déjà été utilisé récemment' }` on reuse, and push the new hash onto `password_history` (cap 5) on success.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/auth.test.js`:

```js
describe('isPasswordReused', () => {
  const { isPasswordReused, hashPassword } = require('@/lib/auth');

  test('detects a reused password', async () => {
    const h = await hashPassword('OldPass123!');
    expect(await isPasswordReused('OldPass123!', [{ hash: h }])).toBe(true);
  });
  test('passes a fresh password', async () => {
    const h = await hashPassword('OldPass123!');
    expect(await isPasswordReused('BrandNew456!', [{ hash: h }])).toBe(false);
  });
  test('handles empty / missing history', async () => {
    expect(await isPasswordReused('x', [])).toBe(false);
    expect(await isPasswordReused('x', undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/auth.test.js -t isPasswordReused`
Expected: FAIL — not exported.

- [ ] **Step 3: Add to `lib/auth.js`**

```js
/**
 * Whether a plaintext password matches any recent hash in the user's history.
 * @param {string} plain
 * @param {Array<{ hash?: string }> | undefined | null} history
 * @returns {Promise<boolean>}
 */
export async function isPasswordReused(plain, history) {
  const recent = (history || []).slice(0, 5);
  for (const entry of recent) {
    if (entry?.hash && (await bcrypt.compare(plain, entry.hash))) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: Enforce in `first-login-reset`**

In `app/api/auth/first-login-reset/route.js`, after the `validatePassword` check and after loading `user` (with `.select('+password')`), before hashing the new password:

```js
if (await isPasswordReused(new_password, user.password_history)) {
  return NextResponse.json(
    { success: false, error: 'Ce mot de passe a déjà été utilisé récemment' },
    { status: 422 }
  );
}
```

After `user.password = await hashPassword(new_password);`:

```js
user.password_history = [
  { hash: user.password, date: new Date() },
  ...(user.password_history || []).slice(0, 4),
];
```

Add `isPasswordReused` to the `@/lib/auth` import.

- [ ] **Step 5: Apply the same to any other change-password route**

Run `grep -rln "new_password\|hashPassword" app/api/users`. For each handler that sets a new password (e.g. `app/api/users/profile/route.js`), add the same reuse check + history push. If none exists, note that in the commit body.

- [ ] **Step 6: Route regression test**

Add to `tests/api/first-login-reset.test.js`:

```js
test('rejects reuse of a password in history', async () => {
  const { hashPassword } = jest.requireActual('@/lib/auth');
  const reusedHash = await hashPassword('StrongPass123!');
  User.findById.mockReturnValue({
    select: () => ({
      populate: () =>
        Promise.resolve({ ...mustChangeUser(), password_history: [{ hash: reusedHash }] }),
    }),
  });
  // verifyPassword mock returns true for the temp password check
  const token = await createStepUpToken(
    { _id: 'u1', tokenVersion: 0 },
    STEP_UP_SCOPE.PASSWORD_CHANGE,
    15
  );
  const res = await reset(resetReq(token, strongPw));
  expect(res.status).toBe(422);
});
```

> This needs the real `isPasswordReused`; adjust the `jest.mock('@/lib/auth', ...)` in that file to `...jest.requireActual('@/lib/auth')` with only `verifyPassword` overridden.

- [ ] **Step 7: Run tests + full gate**

Run: `npx tsc --noEmit && npx eslint . && npx jest --ci`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add lib/auth.js app/api/auth/first-login-reset/route.js app/api/users tests/lib/auth.test.js tests/api/first-login-reset.test.js
git commit -m "feat(security): block password reuse against the last 5 hashes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5.3: Strict mode for `decryptSecret`

**Files:**

- Modify: `lib/crypto/secrets.js` (`decryptSecret` ~L59-78)
- Test: `tests/lib/cryptoSecrets.test.js` (add a case)

**Interfaces:**

- Produces: `decryptSecret(token, { strict = false } = {})` — when `strict: true` and `token` is a non-empty string that is not `enc:v1:`-prefixed, throws `Error('Expected an encrypted secret')` instead of returning it verbatim. Default behavior unchanged (back-compat for legacy plaintext rows). Callers that read secrets for outbound use (SharePoint client secret, SMTP password) pass `{ strict: process.env.NODE_ENV === 'production' }`.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/cryptoSecrets.test.js`:

```js
test('strict mode rejects unencrypted input', () => {
  const { decryptSecret } = require('@/lib/crypto/secrets');
  expect(() => decryptSecret('plaintext-value', { strict: true })).toThrow(/encrypted secret/i);
});
test('non-strict still returns legacy plaintext', () => {
  const { decryptSecret } = require('@/lib/crypto/secrets');
  expect(decryptSecret('plaintext-value')).toBe('plaintext-value');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/cryptoSecrets.test.js -t "strict mode"`
Expected: FAIL.

- [ ] **Step 3: Edit `decryptSecret`**

```js
export function decryptSecret(token, options = {}) {
  const { strict = false } = options;
  if (token === null || token === undefined || token === '') return '';
  if (typeof token !== 'string') {
    throw new TypeError('decryptSecret expects a string');
  }
  if (!isEncrypted(token)) {
    if (strict) throw new Error('Expected an encrypted secret');
    return token;
  }
  // ... unchanged decrypt path ...
}
```

Update the JSDoc `@param` list to include `options`.

- [ ] **Step 4: Wire strict at the read sites**

Run `grep -rn "decryptSecret" lib app`. For SharePoint / SMTP secret reads, pass `{ strict: process.env.NODE_ENV === 'production' }`.

- [ ] **Step 5: Run tests + full gate**

Run: `npx tsc --noEmit && npx jest --ci`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add lib/crypto/secrets.js tests/lib/cryptoSecrets.test.js lib
git commit -m "feat(security): optional strict mode for decryptSecret

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 6 — Test hardening & deployment readiness

### Task 6.1: Replace stub tests in `tests/api/auth-flow.test.js`

**Files:**

- Modify: `tests/api/auth-flow.test.js`

**Interfaces:**

- Produces: every `test(...)` in `auth-flow.test.js` makes a real assertion against the route it names (login success, wrong password, unknown email = same message, lockout after 5, timing floor, 2FA path, logout clears cookies + bumps tokenVersion, refresh happy path + reuse detection). No `expect(true).toBe(true)`.

- [ ] **Step 1: Inventory the stubs**

Run: `grep -n "expect(true).toBe(true)" tests/api/auth-flow.test.js`
Expected: a list of ~15 lines.

- [ ] **Step 2: Rewrite one describe block at a time**

For each block, follow the mocking pattern already established at the top of the file and in `tests/api/two-factor-bypass.test.js`. Example — the login "wrong password" + "unknown email" cases:

```js
test('rejette un mot de passe incorrect avec le message générique', async () => {
  verifyPassword.mockResolvedValue(false);
  User.findOne.mockReturnValue({
    select: () => ({
      populate: () =>
        Promise.resolve({
          _id: 'u1',
          email: 'a@b.c',
          password: '$2a$12$x',
          status: 'Actif',
          failedLoginAttempts: 0,
          incLoginAttempts: jest.fn(),
          role_id: { permissions: {} },
        }),
    }),
  });
  const res = await login({
    headers: { get: () => null },
    json: async () => ({ email: 'a@b.c', password: 'nope' }),
  });
  const data = await res.json();
  expect(res.status).toBe(401);
  expect(data.error).toBe('Identifiants invalides');
});

test('email inexistant renvoie le même message et statut', async () => {
  User.findOne.mockReturnValue({ select: () => ({ populate: () => Promise.resolve(null) }) });
  const res = await login({
    headers: { get: () => null },
    json: async () => ({ email: 'ghost@b.c', password: 'x' }),
  });
  const data = await res.json();
  expect(res.status).toBe(401);
  expect(data.error).toBe('Identifiants invalides');
});
```

Do the equivalent for lockout (assert `incLoginAttempts` called; when `failedLoginAttempts >= 4`, assert `notifyAboutFailedLogins` fired), logout (assert `Set-Cookie` clears both cookies), and refresh (import `POST` from `@/app/api/auth/refresh/route`, mock `verifyRefreshToken` + `User.findById`, assert reuse of a stale `jti` bumps `tokenVersion` and 401s).

- [ ] **Step 3: Run it**

Run: `npx jest tests/api/auth-flow.test.js`
Expected: PASS, and `grep -c "expect(true).toBe(true)" tests/api/auth-flow.test.js` → `0`.

- [ ] **Step 4: Full suite**

Run: `npx jest --ci`
Expected: green, test count up.

- [ ] **Step 5: Commit**

```bash
git add tests/api/auth-flow.test.js
git commit -m "test(auth): replace auth-flow stub assertions with real coverage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6.2: `<img>` → `next/image` in the files page

**Files:**

- Modify: `app/dashboard/files/page.js` (lines ~534, ~746)

**Interfaces:**

- Produces: `npx eslint .` → **0 warnings** (currently 2).

- [ ] **Step 1: Confirm the warnings**

Run: `npx eslint app/dashboard/files/page.js`
Expected: 2 `@next/next/no-img-element` warnings.

- [ ] **Step 2: Inspect the two `<img>` uses**

Run: `sed -n '525,545p;738,752p' app/dashboard/files/page.js`
Decide per case: if it's a file-type thumbnail/preview of user-uploaded content with unknown dimensions and arbitrary host, `next/image` needs `remotePatterns` config and known sizing — for an internal admin tool this is often not worth it. Acceptable resolutions, in order of preference:

1. Replace with `next/image` using `fill` + a sized wrapper if the source is same-origin/`/api/files/...`.
2. If the source is genuinely arbitrary, add a scoped disable with a reason: `{/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded preview, arbitrary dimensions/host */}`.

- [ ] **Step 3: Apply and verify**

Run: `npx eslint .`
Expected: `0 problems`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/files/page.js
git commit -m "chore(lint): resolve no-img-element warnings in files page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6.3: Route server-side `console.*` through the logger

**Files:**

- Modify: `app/api/health/route.js`, `app/api/[[...path]]/route.js` (and any other `app/api/**` or non-`__tests__` `lib/**` hit)

**Interfaces:**

- Produces: `grep -rn "console\.\(log\|warn\|error\|info\)" app/api lib --include="*.js" | grep -v __tests__ | grep -v "lib/logger.js"` → empty. Client components under `app/dashboard/**` and `app/*/page.js` keep their `console.*` (browser-side, out of scope).

- [ ] **Step 1: List the hits**

Run: `grep -rn "console\.\(log\|warn\|error\|info\)" app/api lib --include="*.js" | grep -v __tests__ | grep -v "lib/logger.js"`

- [ ] **Step 2: Replace each**

Per file: `import { createLogger } from '@/lib/logger';` then `const log = createLogger('<area>');`, and `console.error('msg', e)` → `log.error('msg', e)` (the logger wraps an `Error` as `{ err }` automatically). For `app/api/[[...path]]/route.js` the `console.warn` of unknown routes → `log.warn(...)`.

- [ ] **Step 3: Verify + full gate**

Run: the grep from Step 1 (expect empty) then `npx eslint . && npx jest --ci`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add app/api lib
git commit -m "chore(logging): route server-side console.* through the pino logger

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6.4: Complete env validation and wire it into startup

**Files:**

- Modify: `lib/envValidation.js`
- Modify: `next.config.js` (call `assertEnvValid()` at config load) OR create `instrumentation.js` (Next 14 `register()` hook)
- Modify: `.env.example`
- Test: `tests/lib/envValidation.test.js` (add cases)

**Interfaces:**

- Produces: `validateEnv()` treats these as **required in production**: `JWT_SECRET` (≥32), `MONGO_URL`, `SECRETS_ENCRYPTION_KEY` (≥32 or 64-hex), `JWT_REFRESH_SECRET` (≥32), `ALLOWED_ORIGINS` (set, no `localhost`). In non-production they are warnings, not errors. `assertEnvValid()` runs once at server startup (via `instrumentation.js` `register()` or `next.config.js`), logging warnings and throwing on errors.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/envValidation.test.js`:

```js
describe('production required vars', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
    jest.resetModules();
  });

  test('missing SECRETS_ENCRYPTION_KEY is an error in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
    process.env.MONGO_URL = 'mongodb://localhost/x';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    delete process.env.SECRETS_ENCRYPTION_KEY;
    const { validateEnv } = require('@/lib/envValidation');
    const r = validateEnv();
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/SECRETS_ENCRYPTION_KEY/);
  });

  test('all prod vars present → valid', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
    process.env.SECRETS_ENCRYPTION_KEY = 'z'.repeat(32);
    process.env.MONGO_URL = 'mongodb+srv://h/x';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    const { validateEnv } = require('@/lib/envValidation');
    expect(validateEnv().valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/lib/envValidation.test.js -t "production required vars"`
Expected: FAIL — `SECRETS_ENCRYPTION_KEY` / `JWT_REFRESH_SECRET` / prod `ALLOWED_ORIGINS` are not in `requiredEnvVars`.

- [ ] **Step 3: Edit `lib/envValidation.js`**

Add a production-only required set evaluated inside `validateEnv()`:

```js
const productionRequired = [
  {
    name: 'SECRETS_ENCRYPTION_KEY',
    description: 'AES-256 key for stored DB secrets (64 hex chars or ≥32 char passphrase)',
    validator: (v) => v && (/^[0-9a-f]{64}$/i.test(v) || v.length >= 32),
  },
  {
    name: 'JWT_REFRESH_SECRET',
    description: 'Dedicated refresh-token secret (min 32 chars)',
    validator: (v) => v && v.length >= 32,
  },
  {
    name: 'ALLOWED_ORIGINS',
    description: 'Explicit CORS allowlist (no localhost in production)',
    validator: (v) => v && !v.includes('localhost'),
  },
];
```

In `validateEnv()`, after the existing required loop:

```js
if (process.env.NODE_ENV === 'production') {
  for (const envVar of productionRequired) {
    const value = process.env[envVar.name];
    if (!value) {
      errors.push(`Missing required (production) env var: ${envVar.name} - ${envVar.description}`);
    } else if (envVar.validator && !envVar.validator(value)) {
      errors.push(`Invalid value for ${envVar.name}: ${envVar.description}`);
    }
  }
} else {
  for (const envVar of productionRequired) {
    if (!process.env[envVar.name]) {
      warnings.push(`${envVar.name} not set — required before a production deploy`);
    }
  }
}
```

Swap the `console.*` in `assertEnvValid()` for `createLogger('env')` calls (keeps Task 6.3's invariant).

- [ ] **Step 4: Wire startup**

Create `instrumentation.js` at the repo root:

```js
// Next.js runs register() once when the server boots.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnvValid } = await import('@/lib/envValidation');
    assertEnvValid();
  }
}
```

If `next.config.js` needs `experimental.instrumentationHook = true` for Next 14.2 — check the installed Next version (`npx next --version`) and add it only if required.

- [ ] **Step 5: Run tests + build**

Run: `npx jest tests/lib/envValidation.test.js && npx jest --ci && npm run build`
Expected: green; build still succeeds (dev/CI env has `JWT_SECRET`/`MONGO_URL` via `jest.setup.js` / `.env`).

- [ ] **Step 6: Sync `.env.example`**

Ensure `.env.example` documents every required var with a generation command comment. Group: `# Auth`, `# Database`, `# Secrets`, `# CORS`, `# Rate limiting`, `# Email`, `# SharePoint`, `# Push`.

- [ ] **Step 7: Commit**

```bash
git add lib/envValidation.js instrumentation.js next.config.js .env.example tests/lib/envValidation.test.js
git commit -m "feat(ops): require prod secrets in env validation; run it at startup

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6.5: `CONTEXT.md` and `docs/DEPLOYMENT.md`

**Files:**

- Create: `CONTEXT.md`
- Create: `docs/DEPLOYMENT.md`

**Interfaces:**

- Produces: `CONTEXT.md` (project constraint from `CLAUDE.md`) summarizing architecture, the auth model after this plan, and open follow-ups. `docs/DEPLOYMENT.md` with a pre-deploy checklist.

- [ ] **Step 1: Write `CONTEXT.md`**

```markdown
# CONTEXT — Project-Manager

## Stack

Next.js 14 App Router · React 18 · Mongoose 8 / MongoDB · jose (JWT HS256) · Jest + Playwright · Pino.

## Auth model (post security-hardening 2026-09)

- Session = HttpOnly `auth_token` cookie (15-min access JWT) + `refresh_token` cookie
  (7-day, rotating, reuse-detected — `lib/auth/refresh.js`).
- **Step-up tokens** (`lib/auth/stepUp.js`): scoped (`2fa` / `pwd`), short-lived,
  carry `stepUp:true`. `authenticateRequest` rejects them — they are NOT sessions.
  - Login with 2FA → `2fa` step-up token → `POST /api/auth/2fa/verify` → session.
  - Login with must-change → `pwd` step-up token → `POST /api/auth/first-login-reset` → session.
- Route protection: `withApiProtection()` — size → IP rate-limit → auth → permission →
  per-user rate-limit → handler.
- RBAC: system role (`models/Role.js`, 23 permissions) ∩ project role
  (`models/ProjectRole.js`), most-restrictive merge (`lib/permissions.js`).
  Destructive user ops guarded by `lib/userManagement.js`.

## Client IP / rate limiting

`getClientIP` trusts `X-Forwarded-For` only behind `TRUSTED_PROXY_COUNT` hops in
production. In-memory limiter is per-instance; set `REDIS_URL` for multi-instance.

## Known follow-ups (not blocking deploy)

- `@ts-nocheck` still on several lib modules (ticket S2-#11) — narrowed, not cleared.
- CSP style-src still needs `'unsafe-inline'` (Tailwind/Radix inline styles).
```

- [ ] **Step 2: Write `docs/DEPLOYMENT.md`**

```markdown
# Deployment checklist

## Required environment variables (production)

| Var                                                    | Notes                                           |
| ------------------------------------------------------ | ----------------------------------------------- |
| `JWT_SECRET`                                           | ≥32 chars. `openssl rand -base64 48`            |
| `JWT_REFRESH_SECRET`                                   | ≥32 chars, distinct from JWT_SECRET             |
| `SECRETS_ENCRYPTION_KEY`                               | 64 hex chars or ≥32 char passphrase             |
| `MONGO_URL`                                            | `mongodb+srv://…`                               |
| `ALLOWED_ORIGINS`                                      | comma-separated, no `localhost`                 |
| `TRUSTED_PROXY_COUNT`                                  | reverse proxies in front (Vercel/nginx = 1)     |
| `REDIS_URL`                                            | required if running >1 instance (rate limiting) |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_SERVER_URL` | production URLs                                 |
| SMTP + SharePoint + web-push vars                      | as used                                         |

`assertEnvValid()` runs at boot (`instrumentation.js`) and refuses to start if any
required var is missing or invalid.

## Pre-deploy gate

- [ ] `npm run ci` green (lint:strict + typecheck + test:ci)
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` green against a staging deploy
- [ ] First-admin bootstrap tested on an empty DB
- [ ] 2FA enroll + login round-trip tested
- [ ] must-change-password round-trip tested
- [ ] CSP: no console violations on dashboard load (see CONTEXT.md note)
- [ ] Backups configured for MongoDB
```

- [ ] **Step 3: Commit**

```bash
git add CONTEXT.md docs/DEPLOYMENT.md
git commit -m "docs: add CONTEXT.md and deployment checklist

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 6.6: Narrow `@ts-nocheck` on the security modules this plan touched

**Files:**

- Modify: `lib/requestAuth.js`, `lib/rateLimit.js`, `lib/apiMiddleware.js` (remove `// @ts-nocheck`, add `// @ts-check`, fix resulting errors) — **only these three**, only if it stays contained.

**Interfaces:**

- Produces: those three files pass `npx tsc --noEmit` under `// @ts-check` with zero errors. `withApiProtection.js` and `stepUp.js` are already checked. Everything else keeps its `@ts-nocheck` + `TODO(S2-#11)` — out of scope.

- [ ] **Step 1: Flip one file**

In `lib/rateLimit.js`, replace `// @ts-nocheck -- TODO(S2-#11): ...` with `// @ts-check`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep rateLimit.js`
Expected: a list of errors (likely: implicit-any on `entry`, `config`, Map generics).

- [ ] **Step 3: Fix minimally**

Add JSDoc `@type`/`@param` annotations and a typed Map: `const rateLimitStore = new Map();` → `/** @type {Map<string, { count: number, resetTime: number }>} */ const rateLimitStore = new Map();`. Annotate exported function params against the `RateLimitConfig` / `RateLimitResult` typedefs already in the file.

- [ ] **Step 4: Repeat for `lib/apiMiddleware.js` then `lib/requestAuth.js`**

If any single file's errors exceed ~15 or need real refactors, **stop on that file**, restore its `// @ts-nocheck`, and note it in the commit body as deferred to S2-#11. Partial progress is fine.

- [ ] **Step 5: Full gate**

Run: `npx tsc --noEmit && npx eslint . && npx jest --ci`
Expected: 0 tsc errors, 0 eslint errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/rateLimit.js lib/apiMiddleware.js lib/requestAuth.js
git commit -m "chore(ts): type-check the rate-limit and requestAuth modules

Removes @ts-nocheck from the three security modules reworked in this
branch. Remaining @ts-nocheck files stay tracked under S2-#11.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Phase 7 — Final verification

### Task 7.1: Full deployment-readiness gate

**Files:**

- No source changes unless the gate fails.

**Interfaces:**

- Produces: a green `npm run ci`, a successful `npm run build`, an updated PR description with the manual-smoke results.

- [ ] **Step 1: Clean install + full CI**

```bash
rm -rf .next .next-prod
npm run ci
```

Expected: `lint:strict` 0 warnings, `typecheck` 0 errors, `test:ci` all pass.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: build completes, no CSP/`headers()` errors, route table printed.

- [ ] **Step 3: E2E smoke (if a runner is available)**

```bash
npm run seed:e2e && npm run test:e2e
```

Expected: pass. If the environment can't run Playwright, note it and rely on the manual smoke from Task 1.6 Step 7.

- [ ] **Step 4: Security regression sweep**

```bash
npx jest tests/security tests/api/two-factor-bypass.test.js tests/api/reset-password-guard.test.js tests/lib/getClientIP.test.js tests/lib/stepUp.test.js
```

Expected: all pass.

- [ ] **Step 5: Confirm the tree is clean and push the branch**

```bash
git status --porcelain   # empty
git log --oneline main..HEAD
git push -u origin security/hardening-deploy-ready
```

- [ ] **Step 6: Open the PR**

```bash
gh pr create --base main --title "Security hardening & deployment readiness" --body "$(cat <<'EOF'
Implements docs/superpowers/plans/2026-09-04-security-hardening-deploy-ready.md.

## Security
- Close 2FA bypass — scoped step-up tokens (2fa/pwd), rejected as sessions
- X-Forwarded-For trust boundary in getClientIP
- Rate-limit unauthenticated requests in withApiProtection
- must-change-password no longer grants a full session
- Access token really 15 min (was 30); short-lived tokens honour their TTL
- Role-privilege guard on destructive user operations
- Mandatory JWT_REFRESH_SECRET in prod; crypto-secure jti
- Reject chunked mutation bodies with no content-length
- Password reuse blocked against last 5 hashes
- x-user-* forwarded to handlers, not leaked to the browser; X-XSS-Protection: 0

## Cleanup / ops
- Schema-convention refactor finished (dead fields removed, model methods wired)
- envValidation requires prod secrets + runs at startup
- CONTEXT.md, docs/DEPLOYMENT.md
- Stub auth-flow tests replaced with real coverage
- 0 eslint warnings; @ts-nocheck narrowed on 3 security modules

## Verification
`npm run ci` green · `npm run build` green · manual smoke: <fill in>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 7: No commit — the PR is the deliverable.**

---

## Self-Review

**1. Spec coverage** — every finding maps to a task:

| Finding                                        | Task               |
| ---------------------------------------------- | ------------------ |
| 2FA bypass (tempToken = session)               | 1.1, 1.2, 1.4, 1.5 |
| 2FA skipped via must-change                    | 1.4, 1.5           |
| X-Forwarded-For spoof                          | 2.1                |
| Rate-limit after auth-reject                   | 2.2                |
| must-change session fully privileged           | 1.4, 1.6           |
| reset-password no role rank                    | 3.1                |
| Access token 30min vs 15                       | 2.3                |
| x-user-\* on response / X-XSS-Protection       | 4.1                |
| generateJti Math.random / JWT_REFRESH_SECRET   | 2.4                |
| validateRequestSize chunked bypass             | 2.5                |
| decryptSecret plaintext passthrough            | 5.3                |
| CSP nonce wiring unverified                    | 4.2                |
| dead loginAttempts/lastLoginAt, unused methods | 5.1                |
| mustChange triple-check copy-paste             | 1.3                |
| password_history not enforced                  | 5.2                |
| stub auth-flow tests                           | 6.1                |
| server-side console.\*                         | 6.3                |
| `<img>` in files page                          | 6.2                |
| no CONTEXT.md                                  | 6.5                |
| envValidation incomplete / not called          | 6.4                |
| @ts-nocheck on security modules                | 6.6 (narrowed)     |
| 337 uncommitted files                          | 0.1                |
| final deploy gate                              | 7.1                |

**2. Placeholder scan** — code steps carry real code; `<fill in>` appears only in the PR body where a human records manual-smoke results, and Task 1.6 Step 7 / Task 4.2 Step 3 deliberately leave a human decision point (documented, with the decision criteria spelled out). Task 3.1 Step 6 and 5.2 Step 5 require inspecting a file first (`app/api/users/[id]/route.js`, profile change-password) because its exact shape wasn't read during planning — the instruction says what to add and where.

**3. Type consistency** — `createStepUpToken(user, scope, ttlMinutes)` / `verifyStepUpToken(token, expectedScope)` / `STEP_UP_SCOPE.{TWO_FACTOR,PASSWORD_CHANGE}` used identically in Tasks 1.1, 1.4, 1.5, 1.6. `mustChangePassword(user)` (Task 1.3) used in 1.4, 1.5, 1.6, 5.1. `canActorManageTarget(actor, target)` (Task 3.1) used only in 3.1. `isPasswordReused(plain, history)` (Task 5.2) used in 5.2. `getClientIP` signature unchanged. Response field name `tempToken` kept across login / 2fa-verify / client (1.4, 1.5, 1.6) to minimize client churn.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-04-security-hardening-deploy-ready.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Phases 1–7 have ~24 tasks; each ends green and committed, so review checkpoints are natural.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**
