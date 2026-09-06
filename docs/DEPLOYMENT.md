# Deployment checklist

See `CONTEXT.md` for the architecture/auth-model summary this checklist assumes.

## Required environment variables (production)

Source of truth: `lib/envValidation.js` (`requiredEnvVars` + `productionRequired`)
and `.env.example`. `assertEnvValid()` runs at real server boot
(`instrumentation.js`, gated by `next.config.js`'s
`experimental.instrumentationHook: true` — required on this Next version,
14.2.35) and is production-strict for the vars marked below.

| Var                                                       | Required in prod   | Notes                                                                                                                                                                                                                                                         |
| --------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                                              | yes (all envs)     | ≥32 chars. `openssl rand -base64 32`                                                                                                                                                                                                                          |
| `JWT_REFRESH_SECRET`                                      | **yes**            | ≥32 chars, distinct from `JWT_SECRET`. Dev/test falls back to `JWT_SECRET + '_refresh'` with a warning — prod throws at boot if missing/short. `openssl rand -base64 48`                                                                                      |
| `SECRETS_ENCRYPTION_KEY`                                  | **yes**            | AES-256-GCM key for DB-stored secrets (SharePoint client secret, etc). 64 hex chars (32 bytes) or a ≥32-char passphrase (scrypt-derived). `openssl rand -hex 32`                                                                                              |
| `ALLOWED_ORIGINS`                                         | **yes**            | Comma-separated CORS allowlist. Must NOT contain `localhost` in production — enforced both by env validation and by `middleware.js`'s CORS check                                                                                                              |
| `MONGO_URL`                                               | yes (all envs)     | `mongodb://` or `mongodb+srv://`                                                                                                                                                                                                                              |
| `TRUSTED_PROXY_COUNT`                                     | no (defaults to 1) | Number of reverse-proxy hops in front of the app that append to `X-Forwarded-For` (Vercel = 1, single nginx = 1, nginx-behind-CDN = 2). Only consulted in production — see `getClientIP` in `lib/rateLimit.js`                                                |
| `REDIS_URL`                                               | no                 | Required if running >1 instance — switches rate limiting from the in-memory `Map` to the distributed limiter (`lib/rateLimitRedis.js`)                                                                                                                        |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_SERVER_URL`    | no (warns)         | Should be production URLs; a `localhost` value only warns, doesn't fail boot                                                                                                                                                                                  |
| `ACCESS_TOKEN_TTL_MIN`, `REFRESH_TOKEN_TTL_DAYS`          | no                 | Default 15 min / 7 days                                                                                                                                                                                                                                       |
| SMTP\_\*, `SOCKET_EMIT_SECRET`, VAPID\_\*, SHAREPOINT\_\* | no (feature-gated) | As used — see `.env.example` for the full optional list                                                                                                                                                                                                       |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                    | no (warns)         | Error monitoring + performance tracing. Without it the app runs identically, just with no Sentry telemetry — `instrumentation.js`/`instrumentation-client.js` no-op when unset. Warns (doesn't fail boot) if unset in production. See "Sentry" section below. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`       | no                 | Build-time only — source map upload. Skipped (with a console notice) if `SENTRY_AUTH_TOKEN` is unset; doesn't fail the build.                                                                                                                                 |

Note: `.env.example`'s own `NODE_ENV`/`ALLOWED_ORIGINS`/`SOCKET_PORT` entries
are convenience defaults for local dev, not production values — don't copy
them into a production `.env` verbatim.

## Reverse proxy: required for correct rate limiting

`getClientIP` (`lib/rateLimit.js`) can only trust `X-Forwarded-For`/`X-Real-IP`
if something in front of the app actually sets them from the real connecting
IP — a reverse proxy or CDN (nginx, Caddy, Traefik, Cloudflare, a cloud load
balancer). **This app has no working fallback for a fully direct, no-proxy
deployment**: Next.js Route Handlers and Middleware never expose the raw TCP
socket address (no Node `http.IncomingMessage` access), so with
`TRUSTED_PROXY_COUNT=0` (explicitly "no proxy") the app falls back to a
shared `'unknown'` bucket for every client — all rate limits (login,
2FA, refresh, etc.) collapse into one shared budget across every visitor,
which is a real functional degradation, not just a security nuance.

**Action required before launch:** confirm the actual production topology and
set `TRUSTED_PROXY_COUNT` to match (1 for a single proxy — the default; 2 if
there's a CDN in front of that proxy). If deploying `docker-compose.yml` as-is
with no reverse proxy in front, add one (even a minimal Caddy/nginx container
terminating TLS and forwarding to the `app`/`socket` services) before
launch — don't run this app fully exposed with no reverse proxy.

## CSP note

Production `script-src` is `'self' 'unsafe-inline'`, not nonce-based. A
per-request-nonce + `'strict-dynamic'` CSP was tried and found unworkable:
Next 14's built-in script-nonce mechanism only engages during a live
per-request render, but nearly every route in this app is statically
prerendered at build time, so no nonce is ever available to attach — and with
`'strict-dynamic'` present, every un-nonced script (including the framework's
own hydration payload) would be blocked outright, breaking the app on almost
every page. This was confirmed against real build output before the CSP was
relaxed. See the full write-up in the code comment above the CSP block in
`middleware.js`. This still blocks loading arbitrary third-party script
origins; it does not protect against inline-script injection. `style-src`
carries the same `'unsafe-inline'` trade-off, for Tailwind/Radix inline
styles.

## Secrets: legacy plaintext migration

`decryptSecret()` now runs in `strict` mode in production for both real
outbound-secret-read call sites (`lib/services/sharepointService.js`,
`models/SharePointConfig.js`). Any `client_secret` still stored as legacy
plaintext (pre-encryption) in the database **will start throwing on first
read** in production immediately after this deploys — not before. It self-heals
on next save (the model's existing save hook re-encrypts on write), but until
then, SharePoint sync will fail hard for that config instead of degrading
silently. Action: before or immediately after this deploy, re-save every
`SharePointConfig` document once (e.g. open + save it in the admin UI) to
force re-encryption, or confirm no legacy plaintext secrets remain.

## Sentry (error monitoring + performance tracing)

Set up: create a project at sentry.io, set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`
(same value — server and client both need it) and, for readable stack traces
in production, `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` (an
auth token with `project:write` scope, used only at build time to upload
source maps).

Init lives in `instrumentation.js` (server + edge runtime) and
`instrumentation-client.js` (browser) — this is the modern
`@sentry/nextjs` v10 pattern; there is deliberately no `sentry.server.config.js`/
`sentry.client.config.js` (the SDK itself warns if it finds those — they're
the deprecated pre-v8 pattern). `next.config.js` wraps the config with
`withSentryConfig` (imported from `@sentry/nextjs/config`, not the deprecated
top-level import) for build-time instrumentation and source-map upload.

`tracesSampleRate` is `1.0` outside production, `0.1` in production (10% of
requests traced) — adjust in `instrumentation.js`/`instrumentation-client.js`
if your traffic volume needs a different sample rate.

**Bundle size cost, measured on this app**: enabling Sentry (error capture +
performance tracing) roughly doubles the shared client JS (87.9 kB → 165 kB)
and quadruples the Middleware bundle (31.6 kB → 120 kB), since Sentry
auto-instruments `middleware.js` for request tracing. This is the accepted
cost of full monitoring for this app — noted here so it isn't mistaken for a
regression if someone diffs bundle sizes later. If this ever becomes a
problem, the lighter alternative is dropping performance tracing (set
`tracesSampleRate: 0` in both instrumentation files) and keeping only error
capture, which carries a much smaller bundle cost.

## Dependency health

`npm audit` as of this deploy: 5 known vulnerabilities (3 moderate, 2 high),
all in the transitive dependency tree of **Next.js itself** (`next` + its
`postcss` dependency) — DoS via Image Optimizer, HTTP request smuggling in
rewrites, cache poisoning, CSP-nonce XSS, SSRF in Server Actions, and others.
The fix requires a Next.js 14 → 16 major-version upgrade, which is a real,
separate migration effort (routing/rendering/config changes across this
whole App Router codebase) — **not attempted in this pass**, deliberately,
to avoid destabilizing a freshly-hardened app hours before launch. Track
this as a required near-term follow-up (the `vercel:next-upgrade`-style
migration-guide-and-codemods approach, with a full regression pass — this
whole test suite plus a manual smoke pass — before merging).

Two other dependency issues were fixed as part of getting Sentry to load at
all: an unused `@builder.io/dev-tools` devDependency was pulling in a
conflicting old Sentry v9/OpenTelemetry v1 tree, and `package.json` declared
a nonexistent `typescript@^6.0.3` (real installed/working version is 5.x),
which made a clean `npm install` fail outright. Both fixed; a full clean
reinstall now succeeds and the previously-critical `jspdf` and high-severity
`nodemailer` CVEs are patched (3.0.4 → 4.2.1, 7.0.11 → 10.0.0 respectively).

## Env validation: fails closed via 500s, not a boot crash

`assertEnvValid()` throwing inside `instrumentation.js`'s `register()` does
**not** crash or exit the process. In practice: the error is logged, and the
app keeps "running" but every subsequent request 500s. If a health check or
monitor is watching for "process exited" or "server didn't start," it will
miss this — watch for a spike in 500s / failed health checks right after
deploy instead, and treat that as equivalent to a failed boot.

## Pre-deploy gate

- [ ] `npm run ci` green (`lint:strict` + `typecheck` + `test:ci`) — 670 tests as of this branch; confirm the actual current count when you run it
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` green against a staging deploy
- [ ] First-admin bootstrap tested on an empty DB
- [ ] 2FA enroll + login round-trip tested (login → `2fa` step-up → `/api/auth/2fa/verify` → session)
- [ ] must-change-password round-trip tested (login → `pwd` step-up → `/api/auth/first-login-reset` → session)
- [ ] Session refresh tested: let an access token expire (15 min) with the tab open, confirm the app transparently refreshes and keeps working rather than logging out
- [ ] Legacy plaintext SharePoint secrets re-saved (see Secrets note above), or confirmed none exist
- [ ] CSP: no console violations on dashboard load (expected: `'unsafe-inline'` script/style, no nonce — see CSP note above)
- [ ] Reverse proxy confirmed in front of the app in production (see "Reverse proxy" note above), and `TRUSTED_PROXY_COUNT` matches its actual hop count (wrong value = spoofable rate-limit bypass, or every visitor sharing one rate-limit bucket)
- [ ] `npm audit` reviewed — 5 known issues as of this deploy, all requiring the deferred Next.js 14→16 upgrade (see "Dependency health" above); confirm no new criticals were introduced by any dependency changes since
- [ ] Sentry DSN configured (or explicitly decided against for this launch — see "Sentry" section above)
- [ ] Backups configured for MongoDB
- [ ] Post-deploy: watch 500 rate / health checks for a few minutes — a misconfigured required env var fails closed (500s), not a boot crash (see Env validation note above)
