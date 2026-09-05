# Deployment checklist

See `CONTEXT.md` for the architecture/auth-model summary this checklist assumes.

## Required environment variables (production)

Source of truth: `lib/envValidation.js` (`requiredEnvVars` + `productionRequired`)
and `.env.example`. `assertEnvValid()` runs at real server boot
(`instrumentation.js`, gated by `next.config.js`'s
`experimental.instrumentationHook: true` — required on this Next version,
14.2.35) and is production-strict for the vars marked below.

| Var                                                       | Required in prod   | Notes                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                                              | yes (all envs)     | ≥32 chars. `openssl rand -base64 32`                                                                                                                                                                           |
| `JWT_REFRESH_SECRET`                                      | **yes**            | ≥32 chars, distinct from `JWT_SECRET`. Dev/test falls back to `JWT_SECRET + '_refresh'` with a warning — prod throws at boot if missing/short. `openssl rand -base64 48`                                       |
| `SECRETS_ENCRYPTION_KEY`                                  | **yes**            | AES-256-GCM key for DB-stored secrets (SharePoint client secret, etc). 64 hex chars (32 bytes) or a ≥32-char passphrase (scrypt-derived). `openssl rand -hex 32`                                               |
| `ALLOWED_ORIGINS`                                         | **yes**            | Comma-separated CORS allowlist. Must NOT contain `localhost` in production — enforced both by env validation and by `middleware.js`'s CORS check                                                               |
| `MONGO_URL`                                               | yes (all envs)     | `mongodb://` or `mongodb+srv://`                                                                                                                                                                               |
| `TRUSTED_PROXY_COUNT`                                     | no (defaults to 1) | Number of reverse-proxy hops in front of the app that append to `X-Forwarded-For` (Vercel = 1, single nginx = 1, nginx-behind-CDN = 2). Only consulted in production — see `getClientIP` in `lib/rateLimit.js` |
| `REDIS_URL`                                               | no                 | Required if running >1 instance — switches rate limiting from the in-memory `Map` to the distributed limiter (`lib/rateLimitRedis.js`)                                                                         |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_SERVER_URL`    | no (warns)         | Should be production URLs; a `localhost` value only warns, doesn't fail boot                                                                                                                                   |
| `ACCESS_TOKEN_TTL_MIN`, `REFRESH_TOKEN_TTL_DAYS`          | no                 | Default 15 min / 7 days                                                                                                                                                                                        |
| SMTP\_\*, `SOCKET_EMIT_SECRET`, VAPID\_\*, SHAREPOINT\_\* | no (feature-gated) | As used — see `.env.example` for the full optional list                                                                                                                                                        |

Note: `.env.example`'s own `NODE_ENV`/`ALLOWED_ORIGINS`/`SOCKET_PORT` entries
are convenience defaults for local dev, not production values — don't copy
them into a production `.env` verbatim.

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

## Env validation: fails closed via 500s, not a boot crash

`assertEnvValid()` throwing inside `instrumentation.js`'s `register()` does
**not** crash or exit the process. In practice: the error is logged, and the
app keeps "running" but every subsequent request 500s. If a health check or
monitor is watching for "process exited" or "server didn't start," it will
miss this — watch for a spike in 500s / failed health checks right after
deploy instead, and treat that as equivalent to a failed boot.

## Pre-deploy gate

- [ ] `npm run ci` green (`lint:strict` + `typecheck` + `test:ci`) — 639 tests as of this branch; confirm the actual current count when you run it
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` green against a staging deploy
- [ ] First-admin bootstrap tested on an empty DB
- [ ] 2FA enroll + login round-trip tested (login → `2fa` step-up → `/api/auth/2fa/verify` → session)
- [ ] must-change-password round-trip tested (login → `pwd` step-up → `/api/auth/first-login-reset` → session)
- [ ] Legacy plaintext SharePoint secrets re-saved (see Secrets note above), or confirmed none exist
- [ ] CSP: no console violations on dashboard load (expected: `'unsafe-inline'` script/style, no nonce — see CSP note above)
- [ ] `TRUSTED_PROXY_COUNT` matches the real number of reverse-proxy hops in front of the app (wrong value = spoofable rate-limit bypass or false-positive blocking)
- [ ] Backups configured for MongoDB
- [ ] Post-deploy: watch 500 rate / health checks for a few minutes — a misconfigured required env var fails closed (500s), not a boot crash (see Env validation note above)
