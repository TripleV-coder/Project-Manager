# Stack Decision Matrix — Ultra Dev Forge

## Règle de Sélection

> "La meilleure stack est celle que l'équipe maîtrise, qui répond aux besoins, et qui n'est pas over-engineered."
> Choisir la stack la plus **simple qui peut scaler**, pas la plus impressionnante.

---

## Frontend

### Framework Principal

| Besoin                     | Choix recommandé            | Alternative           |
| -------------------------- | --------------------------- | --------------------- |
| SaaS / App full-stack      | **Next.js 14 (App Router)** | Remix                 |
| SPA complexe               | **React + Vite**            | Vue 3 + Vite          |
| Site marketing + App       | **Next.js**                 | Astro + React islands |
| Dashboard interne          | **React + Vite**            | Next.js               |
| App mobile-first           | **React Native**            | Expo                  |
| Ultra-performance statique | **Astro**                   | Next.js SSG           |

### State Management

| Complexité       | Choix                     | Éviter               |
| ---------------- | ------------------------- | -------------------- |
| Locale simple    | `useState` + `useContext` | Redux pour ça        |
| Globale légère   | **Zustand**               | Redux                |
| Globale complexe | **Zustand + Immer**       | MobX                 |
| Server state     | **TanStack Query**        | SWR (moins puissant) |
| Formulaires      | **React Hook Form + Zod** | Formik (lourd)       |

### Styling

| Approche                   | Choix             | Raison                      |
| -------------------------- | ----------------- | --------------------------- |
| Utility-first (recommandé) | **Tailwind CSS**  | Rapidité + cohérence        |
| CSS-in-JS                  | **StyleX** (Meta) | Performance runtime 0       |
| Component library          | **shadcn/ui**     | Headless + fully controlled |
| Animation                  | **Framer Motion** | API excellente              |
| CSS standard               | **CSS Modules**   | Isolation parfaite          |

**Stack UI recommandée** : `Tailwind + shadcn/ui + Framer Motion`

---

## Backend

### Runtime & Framework

| Besoin              | Choix                                   | Alternative   |
| ------------------- | --------------------------------------- | ------------- |
| Full-stack Next.js  | **Next.js API Routes / Server Actions** | tRPC          |
| API REST standalone | **Hono** (ultra-rapide)                 | Fastify       |
| API REST classique  | **Express + TypeScript**                | NestJS        |
| API GraphQL         | **Pothos + Yoga**                       | Apollo Server |
| Type-safe API       | **tRPC**                                | GraphQL       |
| Haute perf / Bun    | **ElysiaJS**                            | Hono          |
| Java / Kotlin       | **Spring Boot 3**                       | Quarkus       |
| Python              | **FastAPI**                             | Django REST   |
| Go                  | **Gin** ou **Echo**                     | Fiber         |

### ORM / Query Builder

| Besoin            | Choix                           | Éviter                  |
| ----------------- | ------------------------------- | ----------------------- |
| TypeScript first  | **Prisma**                      | Sequelize               |
| Ultra-performance | **Drizzle ORM**                 | Prisma si < 10ms requis |
| SQL complex       | **Kysely** (query builder typé) | Knex                    |
| MongoDB           | **Mongoose** + types            | ODM custom              |

---

## Base de Données

### Relationnelle

| Cas                 | Choix           | Raison                              |
| ------------------- | --------------- | ----------------------------------- |
| Production sérieuse | **PostgreSQL**  | Fiabilité, JSON support, extensions |
| SQLite (dev/edge)   | **Turso**       | Serverless, réplication             |
| MySQL nécessaire    | **PlanetScale** | Branching + scale                   |

### Non-relationnelle

| Cas                 | Choix                               |
| ------------------- | ----------------------------------- |
| Documents flexibles | **MongoDB Atlas**                   |
| Cache / sessions    | **Redis** (Upstash pour serverless) |
| Recherche full-text | **Typesense** (OSS) ou Algolia      |
| Vecteurs (AI)       | **Pinecone** ou **pgvector**        |
| Time series         | **InfluxDB** ou Timescale           |

### Backend-as-a-Service (RAD)

| Cas          | Choix                                       |
| ------------ | ------------------------------------------- |
| MVP rapide   | **Supabase** (PostgreSQL + Auth + Realtime) |
| Mobile first | **Firebase**                                |
| Très typé    | **Neon** + Drizzle                          |

---

## Authentification

| Cas                        | Choix                     | Coût                        |
| -------------------------- | ------------------------- | --------------------------- |
| SaaS B2B (MFA, SAML, orgs) | **Clerk**                 | Payant (généreux free tier) |
| OSS fullcontrol            | **Auth.js (NextAuth v5)** | Gratuit                     |
| Auth + DB intégrés         | **Supabase Auth**         | Gratuit/payant              |
| Enterprise SSO             | **Auth0**                 | Payant                      |
| Simple JWT custom          | `jose` + `bcryptjs`       | Gratuit                     |

---

## Paiements

| Cas               | Choix                 | Notes                 |
| ----------------- | --------------------- | --------------------- |
| SaaS global       | **Stripe**            | Standard de facto     |
| Marketplace       | **Stripe Connect**    | Splits automatiques   |
| SaaS + taxes auto | **Paddle**            | Tax compliance inclus |
| Crypto            | **Coinbase Commerce** |                       |

**Règles Stripe immuables** :

- Toujours utiliser les webhooks avec idempotency keys
- Jamais stocker les numéros de carte
- Utiliser Stripe Checkout pour le PCI compliance
- Tester avec les cartes de test avant la prod

---

## Email & Notifications

| Service         | Cas                                 | Prix               |
| --------------- | ----------------------------------- | ------------------ |
| **Resend**      | Transactionnel developer-first      | Free tier généreux |
| **Postmark**    | Fiabilité critique (factures, auth) | Payant             |
| **SendGrid**    | Volume massif                       | Payant             |
| **React Email** | Templates HTML typés                | Gratuit (lib)      |

**Stack recommandée** : `Resend + React Email`

---

## Déploiement

### Frontend / Full-stack

| Cas         | Plateforme                      | Notes                   |
| ----------- | ------------------------------- | ----------------------- |
| Next.js     | **Vercel**                      | Optimisé pour Next      |
| React SPA   | **Netlify** ou Cloudflare Pages |                         |
| Docker      | **Railway**                     | Simple et rapide        |
| Kubernetes  | **GKE / EKS / AKS**             | Pour les grands volumes |
| Self-hosted | **Coolify**                     | OSS Heroku-like         |

### Backend Standalone

| Cas                  | Plateforme                    |
| -------------------- | ----------------------------- |
| Node.js simple       | **Railway** ou **Render**     |
| Serverless functions | **Cloudflare Workers** (Hono) |
| Conteneurs           | **Fly.io**                    |
| Enterprise           | AWS ECS / GCP Cloud Run       |

### Base de Données Managée

| DB         | Service recommandé                    |
| ---------- | ------------------------------------- |
| PostgreSQL | **Neon** (serverless) ou **Supabase** |
| Redis      | **Upstash** (serverless)              |
| MongoDB    | **Atlas**                             |

---

## Monitoring & Observabilité

```
Errors      : Sentry (free tier suffisant pour MVP)
Logs        : Axiom (DX excellente) ou Datadog
Analytics   : PostHog (open source, privacy-first)
Uptime      : Better Uptime ou Checkly
Performance : Vercel Analytics (si Vercel) ou SpeedCurve
```

---

## Stacks Prêtes à l'Emploi

### Stack T3 (TypeScript Full-Stack)

```
Next.js + tRPC + Prisma + PostgreSQL + NextAuth + Tailwind
→ Idéal : SaaS B2C, apps full-stack typées de bout en bout
```

### Stack Superchargée SaaS

```
Next.js 14 + Clerk + Supabase + Prisma + Tailwind + shadcn/ui + Stripe + Resend
→ Idéal : SaaS B2B/B2C complet avec auth, paiements, emails
```

### Stack Edge Ultra-Fast

```
Hono + Cloudflare Workers + Turso (SQLite edge) + Drizzle + React + Vite
→ Idéal : API haute performance, global, latence < 50ms
```

### Stack Enterprise

```
Next.js + NestJS (API standalone) + PostgreSQL + Redis + Kubernetes + Auth0
→ Idéal : Projets enterprise avec équipe > 10, multi-régions
```

### Stack AI-Native

```
Next.js + Vercel AI SDK + OpenAI/Anthropic + Pinecone + PostgreSQL + Supabase
→ Idéal : Apps avec LLM, RAG, agents
```

### Stack Python

```
FastAPI + PostgreSQL + SQLAlchemy + Alembic + Redis + Celery + React/Next.js
→ Idéal : Data science, ML, APIs Python existantes
```
