# CONTEXT — Project-Manager

Working-context file for future sessions. Not a full audit — see
`.superpowers/sdd/2026-09-04-security-hardening-deploy-ready/` for the plan
and per-task reports that produced this state.

## Stack

Next.js 14.2.35 App Router (`experimental.instrumentationHook: true` required —
see Env validation below) · React 18 · Mongoose 8 / MongoDB · jose (JWT HS256)
· Jest (639 tests) + Playwright · Pino.

## Auth model (post security-hardening 2026-09)

- Session = HttpOnly `auth_token` cookie (15-min access JWT, `ACCESS_TOKEN_TTL_MIN`)
  - `refresh_token` cookie (7-day, rotating, reuse-detected via `currentRefreshJti` —
    `lib/auth/refresh.js`, `app/api/auth/refresh/route.js`). Reuse of a stale jti
    bumps `tokenVersion`, invalidating all outstanding tokens for that user.
- **Step-up tokens** (`lib/auth/stepUp.js`): scoped (`STEP_UP_SCOPE.TWO_FACTOR` /
  `PASSWORD_CHANGE`), short-lived, carry `stepUp: true`. `authenticateRequest`
  and `verifyRequestToken` (`lib/requestAuth.js`) both reject them — they are
  NOT sessions and can't be replayed as one.
  - Login with 2FA → `2fa` step-up token (5 min TTL) → `POST /api/auth/2fa/verify` → session.
  - Login with must-change → `pwd` step-up token (15 min TTL) → `POST /api/auth/first-login-reset` → session.
  - `first-login-reset` is the only self-service password-change route in the app; it
    checks `isPasswordReused()` (`lib/auth.js`) against the last 5 password hashes.
- Route protection: `withApiProtection()` (`lib/withApiProtection.js`) —
  size check → IP-only rate limit → auth → permission check → per-user rate
  limit → handler.
- RBAC: system role (`models/Role.js`, 23 permissions) ∩ project role
  (`models/ProjectRole.js`), most-restrictive merge (`lib/permissions.js`).
  Destructive user ops (reset password, role/status change, delete) additionally
  guarded by `canActorManageTarget()` (`lib/userManagement.js`): blocks a
  non-admin actor from managing an `adminConfig` target, and blocks
  self-management via this path. Wired into
  `app/api/users/[id]/reset-password/route.js` and `app/api/users/[id]/route.js`
  (PUT + DELETE).

## Rate limiting

`withApiProtection` runs a genuine two-pass limit:

1. **Pass 1 (every request, pre-auth)**: IP-only, plain preset config —
   `applyRateLimit(request, null, config)`. Closes the unauthenticated /
   failed-auth flood gap.
2. **Pass 2 (post-auth only)**: per-user-only via `applyUserRateLimit()`
   (`lib/apiMiddleware.js`), which does not re-touch the IP-keyed counter (no
   double counting). Net effect: an authenticated caller's real per-IP ceiling
   is now 1x the preset max, not 2x as it briefly was mid-branch — see Known
   follow-ups.

`getClientIP` (`lib/rateLimit.js`) trusts `X-Forwarded-For` only `TRUSTED_PROXY_COUNT`
hops from the right, in production (default 1). Dev/test trusts the leftmost
value as-is, for e2e spoofing. In-memory limiter is per-instance; set
`REDIS_URL` to switch to the distributed limiter (`lib/rateLimitRedis.js`) for
multi-instance deployments.

## CSP — script-src is `'unsafe-inline'`, not nonce-based

A per-request nonce + `'strict-dynamic'` CSP was investigated and found
non-functional for this app: Next 14's own script-nonce mechanism only fires
during a live per-request render, but almost every route here is statically
prerendered at build time (confirmed empirically: 0 `nonce` attributes across
hundreds of `<script>` tags in the real build output). With `'strict-dynamic'`
present, every un-nonced script — including the framework's own hydration
payload — would be blocked, breaking the app on nearly every route. Production
`script-src` is therefore `'self' 'unsafe-inline'`, the same trade-off already
in place for `style-src` (Tailwind/Radix inline styles). See the full
rationale in the code comment at the top of the CSP section in `middleware.js`.

## Secrets

`SECRETS_ENCRYPTION_KEY` (AES-256-GCM, `lib/crypto/secrets.js`) is required in
production (env validation). `decryptSecret(token, { strict })` throws on
legacy plaintext input instead of silently accepting it when `strict: true`;
both real outbound-secret-read call sites (`lib/services/sharepointService.js`,
`models/SharePointConfig.js`'s `getConfig(includeSecret)`) pass
`{ strict: process.env.NODE_ENV === 'production' }`. See `docs/DEPLOYMENT.md`
for the one-time migration implication.

## JWT / tokens

`JWT_REFRESH_SECRET` (≥32 chars) is required in production, checked at module
load (`lib/auth/refresh.js` throws if missing/short); falls back to
`JWT_SECRET + '_refresh'` in dev/test only, with a warning. `generateJti()`
uses `crypto.randomBytes`, not `Math.random()`. `signTokenWithMinutes`'s floor
is 1 minute (was 30) — step-up tokens genuinely expire at their requested TTL.

## Env validation

`lib/envValidation.js` + root `instrumentation.js`
(`next.config.js`'s `experimental.instrumentationHook: true` — required on
this Next version, 14.2.35; stabilizes as default-on only in Next 15).
Production hard-requires `SECRETS_ENCRYPTION_KEY`, `JWT_REFRESH_SECRET`, and a
non-localhost `ALLOWED_ORIGINS`, checked at real server boot (does not run
during `next build`). **On failure the process does not crash** — it logs the
error and every request 500s afterward. Don't expect "server won't start" on a
misconfigured deploy; expect a health check failing on 500s.

## Middleware header handling

`x-user-id` / `x-user-role` are forwarded to route handlers via
`NextResponse.next({ request: { headers } })`, built before that call (headers
set after would silently not forward), and are not present on the
client-visible response. `X-XSS-Protection` is `0` (was the deprecated
`1; mode=block`).

## Data model cleanup

Login uses `User.incLoginAttempts()` / `resetLoginAttempts()` model methods
(`models/User.js`) instead of hand-rolled field writes; dead `loginAttempts` /
`lastLoginAt` schema fields are fully removed.

## Known follow-ups (not blocking deploy)

- `@ts-nocheck` still on several `lib/` modules (ticket S2-#11) — a later task
  in this plan (6.6) narrows it on a few specifically, not all.
- CSP `style-src` still needs `'unsafe-inline'` (Tailwind/Radix inline styles) —
  same trade-off as `script-src` now.
- `password_history` push/cap logic exists independently in two places
  (`app/api/auth/first-login-reset/route.js` and `lib/userSecurity.js`) with no
  shared helper — a future `pushPasswordHistory(user, hash)` would remove the
  duplication.
- Authenticated traffic's real per-IP rate-limit ceiling is now 1x the preset
  max (was effectively 2x before rate-limiting moved ahead of auth) — worth
  watching 429 rates on high-traffic authenticated endpoints post-deploy.
