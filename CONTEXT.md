# CONTEXT — Project-Manager

Working-context file for future sessions. Not a full audit — see
`.superpowers/sdd/2026-09-04-security-hardening-deploy-ready/` for the plan
and per-task reports that produced this state.

## Stack

Next.js 14.2.35 App Router (`experimental.instrumentationHook: true` required —
see Env validation below) · React 18 · Mongoose 8 / MongoDB · jose (JWT HS256)
· Jest (670 tests) + Playwright · Pino · Sentry (`@sentry/nextjs` v10, optional
— see Sentry section below).

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
- **Token refresh** (`app/api/auth/refresh/route.js`): public at the middleware
  layer (authenticates via the separate `refresh_token` cookie, not the access
  token — it must be reachable precisely when the access token has already
  expired). Client-side, `lib/auth-fetch.js`'s `fetchWithRefresh` (shared by
  both `authFetch` and `hooks/useAuthFetch.js` — don't reintroduce a second,
  divergent wrapper) does refresh-and-retry on a 401, with a module-level
  in-flight-promise dedup so concurrent 401s don't each call refresh
  independently (the refresh token is single-use/rotated; a second concurrent
  call would be treated as reuse and revoke the session the first call just
  obtained). Own rate-limit preset (`RATE_LIMIT_CONFIG.refresh`, 60/15min —
  not the tighter `auth` preset shared with `first-login-reset`).
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

## Sentry

Optional — `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` unset means it fully no-ops
(no runtime cost beyond the bundle size below). Init lives in
`instrumentation.js` (server + edge) and `instrumentation-client.js`
(browser) — this is the v10 pattern; there is deliberately no
`sentry.server.config.js`/`sentry.client.config.js` (deprecated pre-v8
pattern, the SDK warns if it finds those files). `next.config.js` wraps with
`withSentryConfig` from `@sentry/nextjs/config` (not the deprecated
`@sentry/nextjs` top-level import). Full details, including the measured
bundle-size cost, in `docs/DEPLOYMENT.md`.

## Known follow-ups (not blocking deploy)

- **Next.js itself needs a major-version upgrade (14 → 16)** to clear 5 known
  CVEs (DoS, request smuggling, cache poisoning, CSP-nonce XSS, SSRF) in
  `next`/`postcss` — deliberately not attempted same-day as a launch; needs
  its own migration pass with full regression testing. See "Dependency
  health" in `docs/DEPLOYMENT.md`.
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
- `TRUSTED_PROXY_COUNT=0` (explicit "no reverse proxy") degrades to a single
  shared rate-limit bucket for every client, not per-client fail-closed —
  Next.js Route Handlers/Middleware have no raw socket access to fall back
  to. This app assumes a reverse proxy is always present in production; see
  "Reverse proxy" in `docs/DEPLOYMENT.md`.
- e2e (Playwright) has not been run against this exact codebase state in this
  environment (no Docker daemon available for the `docker-compose.yml`
  MongoDB service) — see whether a `mongodb-memory-server`-backed run
  happened after this note was written, or run it yourself before a real
  launch if not.
