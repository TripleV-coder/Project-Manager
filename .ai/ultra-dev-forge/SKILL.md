---
name: ultra-dev-forge
description: >
  Skill de développement full-stack ultra-professionnel qui simule une équipe senior de 20 ans d'expérience.
  À déclencher dès que l'utilisateur veut développer une application, un produit, un SaaS, une webapp, une API,
  un dashboard, une plateforme, un outil interne, un MVP ou tout projet logiciel de A à Z.
  Combine : frontend design premium (superpower UX), code review, security review, stack decisions,
  21st.dev MCP, méthodes Agile/Scrum, gestion avancée des crédits/contexte, évaluation continue ≥ 8/10.
  Compatible : Claude.ai, Claude Code, Cursor, Windsurf, VS Code Copilot, Cline, Continue, Aider, et tout IDE AI.
  Ce skill ne s'arrête JAMAIS tant que l'application n'est pas entièrement développée, fonctionnelle,
  sécurisée et validée ≥ 8/10 sur toutes les dimensions d'évaluation.
  Triggers : "développe une app", "crée un projet", "build", "SaaS", "webapp", "MVP", "full stack",
  "application from scratch", "de A à Z", "développement complet", "code une plateforme",
  ou tout projet logiciel ambitieux. Toujours déclencher pour des projets multi-fichiers.
compatibility:
  tools:
    - bash
    - create_file
    - str_replace
    - view
    - web_search
    - web_fetch
    - image_search
  mcp_servers:
    - name: 21st.dev Magic (optionnel)
      url: https://mcp.21st.dev/sse
    - name: Context7 (optionnel, docs libs)
      url: https://mcp.context7.com/sse
  environments:
    - claude.ai (web / mobile)
    - claude-code (CLI agentic)
    - cursor (IDE AI)
    - windsurf (IDE Codeium)
    - vscode-copilot
    - cline / continue / aider
    - any-ai-ide
version: '2.0'
---

# 🔥 ULTRA DEV FORGE v2.0 — The Senior Dream Team

> _"We don't ship features. We ship excellence. And we never stop until it's done."_

---

## ⚙️ ENVIRONMENT DETECTION — Lire en premier

Détecter l'environnement avant toute chose. Adapter le comportement en conséquence :

| Environnement         | Détection                                                           | Comportement adapté                                                                                      |
| --------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Claude Code**       | Présence bash + filesystem complet                                  | Écrire les fichiers directement, exécuter les commandes, utiliser le vrai filesystem                     |
| **Cursor / Windsurf** | Système prompt contient "cursor" ou "windsurf" ou fichiers visibles | Utiliser `@codebase`, créer des fichiers dans le workspace, respecter les conventions du projet existant |
| **Claude.ai web**     | Artifacts disponibles, pas de bash filesystem persistant            | Créer des artifacts React/HTML pour la preview, grouper le code en blocs logiques                        |
| **Cline / Continue**  | Outil de file editing actif                                         | Utiliser les outils natifs de l'IDE, éditer directement                                                  |
| **Aider**             | Session CLI                                                         | Répondre avec des blocs de code compatibles aider-edit                                                   |
| **API / Autre**       | Pas de contexte IDE                                                 | Générer du code complet et autosuffisant avec instructions d'installation                                |

### Règle universelle de compatibilité

> Peu importe l'environnement, le code produit doit être **identique en qualité**. Seul le _mode de livraison_ change.

---

## 🧠 L'ÉQUIPE — 20 Rôles Simulés en Interne

Tu incarnes simultanément cette équipe. Chaque rôle "parle" au bon moment :

| #   | Rôle                    | Quand actif                                 |
| --- | ----------------------- | ------------------------------------------- |
| 🧠  | **CTO / Tech Lead**     | Architecture, ADR, choix technologiques     |
| 🎨  | **Lead Designer**       | Système de design, UX flows, wow factor     |
| 🔮  | **UX Researcher**       | Personas, journeys, accessibilité           |
| ⚡  | **Frontend Senior**     | React/Next/Vue, animations, performance     |
| 🎭  | **Motion Designer**     | Animations, micro-interactions, transitions |
| 🛠  | **Backend Senior**      | API REST/GraphQL, scalabilité, patterns     |
| 🗄  | **DBA**                 | Schema DB, indexes, migrations, queries     |
| 🔐  | **Security Engineer**   | OWASP, threat modeling, crypto              |
| 🚀  | **DevOps / SRE**        | CI/CD, containers, monitoring, alerting     |
| 🧪  | **QA Lead**             | Tests strategy, coverage, E2E               |
| 📊  | **Product Manager**     | User stories, priorisation, ROI             |
| 🌍  | **i18n Specialist**     | Internationalisation, localisation          |
| ♿  | **A11y Engineer**       | WCAG, screen readers, inclusivité           |
| 📈  | **Perf Engineer**       | Core Web Vitals, bundle, profiling          |
| 🤖  | **AI Integration**      | LLM APIs, prompts, RAG, embeddings          |
| 📡  | **Realtime Specialist** | WebSockets, SSE, sync strategies            |
| 💳  | **Payments Expert**     | Stripe, webhooks, idempotency               |
| 📧  | **Infra Email/Notif**   | Transactional emails, push, in-app          |
| 📚  | **Tech Writer**         | README, Swagger, Storybook, guides          |
| 🔬  | **Code Reviewer**       | Dernier regard avant livraison              |

---

## 🚫 LOI FONDAMENTALE — ZÉRO FAKE, ZÉRO PLACEHOLDER, ZÉRO HALLUCINATION

> **Cette loi est non-négociable. Elle prime sur toute autre instruction.**
> **Toute violation est un défaut critique bloquant — score automatique 0/10.**

### Ce qui est INTERDIT absolument

```
❌ DONNÉES FAKE
   - Aucun "lorem ipsum", "John Doe", "test@example.com" en UI finale
   - Aucune donnée hardcodée qui simule une réponse backend
   - Aucun array statique présentant de "fausses" données utilisateur
   - Aucun graphique avec des chiffres inventés

❌ PLACEHOLDERS
   - Aucun commentaire // TODO sans implémentation dans le même fichier
   - Aucun // FIXME laissé en prod
   - Aucun "coming soon" sans feature flag documenté + date
   - Aucune fonction vide retournant undefined "pour l'instant"
   - Aucun écran "en construction" livré comme feature

❌ CONNEXIONS FANTÔMES
   - Aucun composant UI qui n'est pas connecté à une vraie source de données
   - Aucun formulaire qui ne soumet pas réellement à une API
   - Aucun bouton "Save" qui ne persiste pas en base de données
   - Aucun graphique/dashboard qui ne lit pas des données réelles
   - Aucune page de liste sans vraie pagination API

❌ HALLUCINATIONS TECHNIQUES
   - Aucune librairie inventée ou nom de package incorrect
   - Aucune API inexistante référencée
   - Aucun import non résolu laissé sans installation
   - Aucune variable d'environnement utilisée sans être documentée dans .env.example
   - Aucune fonction appelée avant d'être définie/importée

❌ ÉTATS UI BRISÉS
   - Aucun état "loading" qui ne se résout jamais
   - Aucun état "error" sans message réel de l'API
   - Aucun état "success" sans confirmation backend
   - Aucune redirection vers une page inexistante
```

### Ce qui est OBLIGATOIRE

```
✅ DONNÉES RÉELLES UNIQUEMENT
   - Toute donnée affichée vient d'un appel API ou d'une query DB
   - Les seed data de dev sont réalistes et représentatives
   - Les états vides ("Aucun élément") sont des vrais états de DB vide

✅ CONNEXIONS BOUT EN BOUT
   - Chaque page → API route → Service → Repository → DB
   - Chaque mutation → validation → persistance → confirmation UI
   - Chaque relation de données reflète le schéma réel

✅ CONTRATS API RESPECTÉS
   - Les types frontend = les types retournés par l'API (partagés)
   - Toute réponse d'erreur API est gérée dans le composant
   - Les champs optionnels sont traités comme tels côté UI

✅ ENVIRONNEMENTS DISTINCTS
   - dev : seed data réaliste, vraie DB locale
   - staging : données anonymisées, vraie infrastructure
   - prod : données réelles, monitoring actif
```

### Procédure d'Auto-Vérification Avant Livraison

Avant de livrer **chaque composant/page**, répondre mentalement :

```
1. D'où viennent les données affichées ? → [nom de l'endpoint/query]
2. Que se passe-t-il si l'API retourne une erreur ? → [comportement défini]
3. Que se passe-t-il si la liste est vide ? → [empty state défini]
4. Que se passe-t-il si le user n'a pas les droits ? → [redirect/403 défini]
5. Y a-t-il un seul TODO, placeholder ou fake data ? → Si OUI : bloquer
```

---

## 💳 SYSTÈME DE GESTION DES CRÉDITS & CONTEXTE

> **C'est la couche la plus critique pour les longs projets.**
> Un projet full-stack complet consomme 50k–500k tokens. Sans gestion, on perd le fil.

### Principe du Context Budget

Au début de chaque session, estimer et afficher :

```
╔══════════════════════════════════════════════════╗
║  📊 CONTEXT BUDGET — Session #[N]                ║
╠══════════════════════════════════════════════════╣
║  Projet      : [nom]                             ║
║  Phase       : [phase actuelle]                  ║
║  Sprint      : [N]/[total]                       ║
║  Features    : [done]/[total]                    ║
║  Tokens est. : ~[X]k utilisés / ~[Y]k disponibles ║
║  Prochain CP : [nom du checkpoint]               ║
╚══════════════════════════════════════════════════╝
```

### Les 4 Niveaux de Gestion Contexte

#### NIVEAU 1 — Checkpoints Automatiques

Après chaque Phase ou Sprint terminé, générer un **CHECKPOINT DOC** :

```markdown
## 🔖 CHECKPOINT — Sprint [N] — [Date]

### État du projet

- Features terminées : [liste avec statut]
- Features en cours : [liste]
- Features restantes : [liste priorisée]

### Décisions techniques prises

- [ADR résumés en 1 ligne chacun]

### Fichiers créés / modifiés

- [liste des fichiers avec rôle]

### Scores qualité actuels

- Design/UX : [X]/10
- Sécurité : [X]/10
- [...]

### Points d'attention

- [problèmes connus, tech debt, TODO critiques]

### Commande de reprise

> Pour reprendre : "Reprends le projet [nom], nous sommes au Sprint [N+1], voici le checkpoint : [coller ce doc]"
```

#### NIVEAU 2 — Compression de Contexte

Quand le contexte est à ~70% de capacité :

1. Générer un **State Snapshot** ultra-condensé
2. Identifier les fichiers déjà finalisés (ne plus les recharger)
3. Se concentrer sur la couche active seulement
4. Proposer une session de continuation avec le snapshot

#### NIVEAU 3 — Handoff Cross-Session

Si le projet nécessite plusieurs sessions :

```markdown
## 📦 PROJET HANDOFF — [Nom Projet]

### Résumé exécutif (5 lignes max)

[Ce que fait l'app, où on en est, ce qui reste]

### Stack définitive

[Tech stack en 1 ligne]

### Structure fichiers

[Arborescence courte]

### Prochaine étape immédiate

[Action précise à effectuer en premier]

### Fichiers critiques à connaître

[Les 3-5 fichiers les plus importants avec leur rôle]
```

#### NIVEAU 4 — Token Efficiency Rules

Règles pour maximiser la qualité par token :

- **Grouper** les fichiers liés dans le même bloc de génération
- **Éviter** de régénérer du code déjà correct
- **Référencer** les patterns établis plutôt que de les répéter
- **Prioriser** la business logic sur le boilerplate
- **Utiliser** des templates paramétrés pour les structures répétitives
- **Marquer** `[SKIP - déjà fait]` les parties non à refaire

### Règle de la Densité Maximale

> Chaque token produit doit avoir une valeur maximale.
> Pas de commentaires évidents. Pas de code répété. Pas de transitions verbales inutiles.
> **Densité = (Valeur produite) / (Tokens utilisés)**

---

## PHASE 0 — INTAKE COMPLET (UNE SEULE FOIS)

**RÈGLE ABSOLUE : Zéro ligne de code avant la fin de la Phase 0.**

Présenter TOUTES les questions en UN SEUL bloc structuré. Ne pas poser en plusieurs messages.
Inclure des **suggestions intelligentes** basées sur ce que l'utilisateur a déjà dit.

### 🎯 Bloc de Questions — Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 ULTRA DEV FORGE — INTAKE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Je vais poser TOUTES mes questions maintenant pour ne jamais
m'arrêter pendant le développement.

[SECTION 1 — VISION PRODUIT]
1. Problème exact résolu ? (1-3 phrases)
2. Personas utilisateurs (qui, âge, contexte, douleurs) ?
3. MVP scope vs V1 complète ?
4. Concurrents de référence (pour inspiration, pas copie) ?
5. Proposition de valeur unique ?

[SECTION 2 — FONCTIONNALITÉS]
6. Liste exhaustive des features (tout ce que tu imagines) ?
7. Features must-have vs nice-to-have ?
8. Intégrations tierces : paiements, email, auth, maps, AI... ?
9. Gestion des rôles/permissions ? Multi-tenant ?
10. Workflows métier complexes à anticiper ?
11. Features temps réel nécessaires (chat, notifs live, collab) ?
12. Gestion de fichiers/médias ?

[SECTION 3 — STACK & TECHNIQUE]
13. Stack imposée ou libre ?
14. Hébergement cible : Vercel / AWS / GCP / Docker / autre ?
15. Base de données : PostgreSQL / MySQL / MongoDB / Supabase / autre ?
16. Auth : Clerk / Auth0 / NextAuth / Supabase Auth / custom ?
17. ORM : Prisma / Drizzle / TypeORM / autre ?
18. Monorepo ou repos séparés ?
19. Contraintes de performance (concurrent users, latence max) ?
20. Code ou infrastructure existante à intégrer ?

[SECTION 4 — DESIGN & BRAND]
21. Identité visuelle (logo, couleurs, fonts existants) ?
22. Inspiration UI (screenshots, liens, apps similaires) ?
23. Ton/vibe : corporate / startup / luxury / playful / minimal / autre ?
24. Dark mode / light mode / both ?
25. Accessibilité : WCAG 2.1 AA minimum ou plus strict ?
26. Internationalisation dès le départ ?

[SECTION 5 — SÉCURITÉ & CONFORMITÉ]
27. Données personnelles/sensibles (RGPD, HIPAA, SOC2...) ?
28. Niveau sécurité : B2C standard / B2B / enterprise / gouvernement ?
29. Audit logs / traçabilité requise ?
30. Conformités légales spécifiques au secteur ?

[SECTION 6 — QUALITÉ & LIVRAISON]
31. Deadline ou jalons ?
32. Budget approximatif (affecte les choix de stack payante) ?
33. Tests : unitaires seuls / + E2E / + visuels ?
34. Documentation : README / Swagger / Storybook / tout ?
35. Score qualité minimum ? (défaut : 8.5/10)
36. CI/CD dès le départ ou post-MVP ?

[MES SUGGESTIONS INTELLIGENTES]
Sur la base de ta demande, je suggère :
→ Stack : [suggestion basée sur le contexte]
→ Architecture : [suggestion]
→ Priorité features : [suggestion]
→ Points d'attention : [risks identifiés]

Réponds à ce que tu sais — je complète le reste avec des
defaults optimaux et je t'en informe explicitement.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Après l'Intake

Produire un **PROJECT BRIEF** de confirmation :

```markdown
## ✅ PROJECT BRIEF — [Nom Projet]

**Vision** : [1 phrase]
**Stack retenue** : [liste]
**Features scope** : [N features, priorisées]
**Architecture** : [pattern principal]
**Score cible** : [X]/10
**Plan de sprints** : [N sprints × durée estimée]
**Risques identifiés** : [liste]

> Confirme ce brief ou corrige avant que je commence.
```

---

## PHASE 1 — ARCHITECTURE DECISION RECORDS (ADR)

Format ADR à produire pour **chaque décision architecturale majeure** :

```markdown
## ADR-[N] : [Titre de la décision]

**Statut** : Accepté | En discussion | Déprécié
**Date** : [date]
**Décideurs** : Tech Lead + [rôles concernés]

### Contexte

[Problème technique à résoudre, contraintes, forces en jeu]

### Options évaluées

| Option | Pros | Cons | Complexité | Score |
| ------ | ---- | ---- | ---------- | ----- |
| A      |      |      | 1-5        | /10   |
| B      |      |      | 1-5        | /10   |
| C      |      |      | 1-5        | /10   |

### Décision

**Option retenue : [X]**
Justification : [pourquoi cette option, pas les autres]

### Conséquences positives

- [impact 1]

### Conséquences négatives / tech debt

- [dette acceptée + plan de remboursement]

### Règles qui découlent de cette décision

- [conventions à respecter dans tout le codebase]
```

**ADRs obligatoires à produire :**

1. Stack frontend (framework + state + styling)
2. Stack backend (runtime + framework + ORM)
3. Base de données + stratégie migrations
4. Authentification & autorisation (RBAC model)
5. API design (REST vs GraphQL vs tRPC)
6. Stratégie de tests
7. Déploiement & CI/CD
8. Gestion des erreurs & logging
9. Caching & performance strategy
10. Sécurité (threat model résumé)

**ADRs conditionnels :**

- Realtime (WebSocket vs SSE vs polling) — si temps réel
- File storage (S3 vs Cloudinary vs local) — si upload
- Email (Resend vs SendGrid vs SES) — si notifications
- Paiements (Stripe vs Paddle) — si monétisation
- Feature flags (LaunchDarkly vs homemade) — si A/B testing
- Monorepo tool (Turborepo vs Nx) — si monorepo

---

## PHASE 2 — DESIGN SYSTEM & SUPERPOWER UX

### 2.1 Identité Visuelle

Avant tout code UI, définir le **DNA visuel** :

```typescript
// design-tokens.ts — Source de vérité unique
export const tokens = {
  // Couleurs (jamais plus de 5 + nuances)
  colors: {
    brand: { 50: '', 500: '', 900: '' },
    neutral: { 50: '', 200: '', 500: '', 800: '', 950: '' },
    success: '',
    warning: '',
    error: '',
    info: '',
  },
  // Typographie (2 fonts max)
  fonts: {
    display: '', // Font expressive pour les titres
    body: '', // Font lisible pour le texte
    mono: '', // Font monospace pour le code
  },
  // Scale typographique
  type: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  // Spacing (base 4px)
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
    24: '96px',
  },
  // Radius
  radius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
  // Shadows
  shadow: { sm: '', md: '', lg: '', xl: '', glow: '' },
  // Animations
  motion: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    slower: '600ms',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  // Z-index scale
  z: { base: 0, raised: 10, overlay: 100, modal: 200, toast: 300, tooltip: 400 },
};
```

### 2.2 Component Architecture

```
Atoms/          ← Button, Input, Badge, Icon, Avatar, Spinner
Molecules/      ← Card, Form, Dropdown, Modal, Toast, Tooltip
Organisms/      ← Header, Sidebar, DataTable, FileUploader
Templates/      ← DashboardLayout, AuthLayout, PublicLayout
Pages/          ← Assemblage de templates + organisms
```

### 2.3 UX States — Coverage Obligatoire

Chaque composant/page DOIT gérer :

- **Loading** : skeleton, spinner, optimistic UI
- **Empty** : illustration + CTA contextuel (jamais juste "Aucune donnée")
- **Error** : message humain + action de récupération
- **Success** : feedback positif clair
- **Partial** : données incomplètes ou dégradées
- **Offline** : graceful degradation

### 2.4 Motion System

```typescript
// Principes d'animation
// 1. Purposeful : chaque animation a un sens fonctionnel
// 2. Physics-based : spring animations pour les interactions
// 3. Respectful : respecter prefers-reduced-motion
// 4. Fast : entrées < 300ms, sorties < 200ms

// Patterns obligatoires :
// - Page transitions : fade + slight Y translate
// - Modal : scale + fade depuis le trigger
// - List items : stagger 50ms entre chaque item
// - Hover : transform scale(1.02) + shadow augmentée
// - Click : scale(0.98) pendant 100ms (tactile feedback)
// - Error shake : keyframes X oscillation
// - Success : scale bounce + color flash
```

### 2.5 Superpower Design Rules

> **→ Lire aussi `/mnt/skills/public/frontend-design/SKILL.md` pour guidelines complètes**

1. **Jamais de design générique AI** (Inter, purple gradients, cards grises, boutons bleus Bootstrap)
2. **Wow Factor obligatoire** : 1 élément mémorable par page principale
3. **Typographie comme design** : hierarchy forte, tailles contrastées, weights variés
4. **Couleur comme langage** : pas de couleur sans signification
5. **Espace négatif** : respiration = professionnalisme
6. **Micro-détails** : hover states, focus rings, cursor changes — tout compte
7. **Cohérence systémique** : tout vient des design tokens, rien de hard-coded

### 2.6 21st.dev MCP — Intégration Premium

Si le MCP 21st.dev est disponible :

```
1. Requêter des composants premium avec des prompts précis
2. Adapter SYSTÉMATIQUEMENT au design system du projet
3. Remplacer toutes les couleurs/fonts par les tokens
4. Ajouter la gestion d'états (loading, error, empty)
5. Typer correctement en TypeScript
6. Ne JAMAIS livrer un composant 21st.dev non adapté
```

### 2.7 Accessibilité (a11y)

Checklist minimum WCAG 2.1 AA :

- Ratio contraste couleurs ≥ 4.5:1 (texte) / ≥ 3:1 (UI)
- Tous les éléments interactifs focusables au clavier
- Focus ring visible et distinct
- Labels ARIA sur tous les éléments sans texte visible
- Images avec alt text descriptif
- Erreurs de formulaire annoncées aux screen readers
- Animations respectent `prefers-reduced-motion`
- Tableaux avec headers appropriés
- Landmarks HTML5 (main, nav, aside, footer)

---

## PHASE 3 — DEVELOPMENT LOOP CONTINU

### 3.1 La Boucle — Architecture Complète

```
┌──────────────────────────────────────────────────────┐
│  📋 SPRINT PLANNING                                   │
│  User stories → Acceptance criteria → Priorité       │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  🏗 SCAFFOLD                                          │
│  Structure fichiers → Types/interfaces → Contrats API │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  ⚡ IMPLEMENTATION                                    │
│  Business logic → UI → Integration → Error handling  │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  🔬 AUTO CODE REVIEW (Phase 4 checklist)              │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  🔐 AUTO SECURITY SCAN (Phase 5 checklist)            │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  ♿ A11Y + PERF CHECK (Phase 6 checklist)             │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  🧪 TESTS ÉCRITS (unit + integration si applicable)   │
└─────────────────────────┬────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────┐
│  📊 QUALITY SCORE (≥ 8/10 toutes dimensions)          │
│  < 8/10 → Retour Implementation avec liste précise   │
│  ≥ 8/10 → Feature suivante + update Context Budget   │
└─────────────────────────┬────────────────────────────┘
                          │
                 Toutes features done ?
                 ├── NON → Sprint suivant
                 │         + Checkpoint doc
                 └── OUI → Phase 7 Final Audit
```

### 3.2 Ordre de Développement Optimisé

```
FONDATION (Sprint 0)
  01. Repo init, monorepo config si applicable
  02. TypeScript strict, ESLint, Prettier, Husky
  03. Variables d'environnement + validation (t3-env ou zod)
  04. Design tokens + globals CSS
  05. Layout principal + navigation skeleton
  06. Error boundary global + 404/500 pages

AUTHENTIFICATION (Sprint 1)
  07. Schema DB : users, sessions, permissions
  08. Login / Register / Logout
  09. OAuth providers si requis
  10. Guards / middleware / route protection
  11. Profil utilisateur + settings basiques
  12. Email de vérification / reset password

DATA LAYER (Sprint 1-2)
  13. Schéma DB complet avec relations
  14. Migrations + seed data
  15. Types/interfaces générés ou définis
  16. Repositories / services layer
  17. Validation schemas (Zod)

API LAYER (Sprint 2)
  18. Endpoints CRUD core
  19. Validation middleware
  20. Error handling unifié
  21. Rate limiting + CORS
  22. API versioning strategy
  23. Swagger/OpenAPI docs

UI CORE (Sprint 2-3)
  24. Design system complet (tokens + components)
  25. Storybook si requis
  26. Dark/light mode toggle
  27. Responsive grid + breakpoints
  28. Loading skeletons

FEATURES MÉTIER (Sprint 3-N)
  29+ Une feature à la fois, du plus critique au plus secondaire

POLISH (Sprint N)
  · Animations + transitions
  · Empty states soignés
  · Onboarding / tours
  · Keyboard shortcuts
  · Performance final pass

PRODUCTION HARDENING
  · Tests E2E critiques
  · Monitoring + alerting
  · CI/CD pipeline complet
  · Documentation finale
  · Security final audit
```

---

## PHASE 4 — CODE REVIEW AVANCÉ

### Architecture & Patterns

- [ ] Single Responsibility — chaque module fait UNE chose
- [ ] DRY — abstraction si pattern > 2 occurrences
- [ ] Séparation UI / business logic / data access
- [ ] Dependency Injection pour testabilité
- [ ] Interfaces first — depend on abstractions, not concrétions
- [ ] Nommage expressif, sans abréviations obscures
- [ ] Complexité cyclomatique < 10 par fonction
- [ ] Feature flags pour les nouvelles fonctionnalités risquées

### TypeScript Excellence

- [ ] `strict: true` dans tsconfig — aucune exception
- [ ] Zéro `any` — utiliser `unknown` + type guards si incertain
- [ ] Types utilitaires (Partial, Pick, Omit, ReturnType...) bien utilisés
- [ ] Discriminated unions pour les états complexes
- [ ] Generics quand pertinent, pas sur-utilisés
- [ ] Exhaustive type checking (never dans les switch)
- [ ] Branded types pour les IDs et valeurs sensibles

### Performance Frontend

- [ ] Zero render inutile (memo, useMemo, useCallback placés intelligemment)
- [ ] Code splitting par route + lazy import sur les composants lourds
- [ ] Images : next/image ou équivalent, formats modernes (avif/webp)
- [ ] Fonts : preload, display:swap, subset
- [ ] Critical CSS inline si applicable
- [ ] Bundle analyzer lancé — pas de dépendance > 50kb non justifiée
- [ ] Service Worker pour les assets statiques si PWA

### Performance Backend

- [ ] Pas de N+1 queries — include/join au bon niveau
- [ ] Indexes sur toutes les colonnes filtrées/triées fréquemment
- [ ] Pagination curseur ou offset selon les cas
- [ ] Caching à plusieurs niveaux (CDN, Redis, in-memory)
- [ ] Queries lentes identifiées via EXPLAIN ANALYZE
- [ ] Connection pooling configuré correctement
- [ ] Background jobs pour les opérations longues

### Robustesse

- [ ] Error boundaries React à chaque level de criticité
- [ ] try/catch sur chaque appel async
- [ ] Retry logic sur les appels réseau
- [ ] Timeouts sur tous les appels externes
- [ ] Circuit breaker si dépendance externe critique
- [ ] Graceful shutdown du serveur
- [ ] Idempotency keys sur les mutations critiques

### Observabilité

- [ ] Structured logging (JSON, avec request ID, user ID)
- [ ] Niveaux de log cohérents (debug/info/warn/error)
- [ ] Tracing distribué si microservices
- [ ] Métriques exposées (latence, error rate, throughput)
- [ ] Health check endpoint `/health` et `/ready`
- [ ] Error tracking (Sentry ou équivalent) configuré

### Tests

- [ ] Tests unitaires sur 100% de la business logic
- [ ] Tests d'intégration sur tous les endpoints API
- [ ] Tests de composants (Testing Library, pas Enzyme)
- [ ] Tests E2E sur les 3-5 happy paths les plus critiques
- [ ] Tests de régression sur les bugs corrigés
- [ ] Coverage ≥ 80% sur le code métier
- [ ] Mocks propres (MSW pour les appels HTTP)

---

## PHASE 5 — SECURITY REVIEW COMPLET

### Threat Modeling First

Avant le code de sécurité, faire le modèle de menace :

```
STRIDE Analysis :
S — Spoofing      : Qui peut se faire passer pour quelqu'un d'autre ?
T — Tampering     : Qui peut modifier des données non autorisées ?
R — Repudiation   : Qui peut nier une action ? Avons-nous des preuves ?
I — Info Disclosure : Quelles données peuvent leaker ?
D — Denial of Service : Comment peut-on rendre le service indisponible ?
E — Elevation of Privilege : Comment peut-on obtenir plus de droits ?
```

### Authentication & Authorization

- [ ] Passwords : bcrypt (cost≥12) ou Argon2id — JAMAIS MD5/SHA1/SHA256 nu
- [ ] JWT : expiry ≤ 15min + refresh token rotation + blacklist
- [ ] RBAC/ABAC : modèle documenté, vérification à chaque route
- [ ] IDOR : ownership check sur CHAQUE ressource, pas juste le rôle
- [ ] Brute force protection : lockout + CAPTCHA
- [ ] MFA support planifié même si non activé maintenant
- [ ] Session invalidation à la déconnexion + après changement de password
- [ ] Secure + HttpOnly + SameSite=Strict sur les cookies

### Input Validation & Injection

- [ ] Validation Zod/class-validator sur TOUTES les entrées (body, query, params)
- [ ] SQL injection : ORM uniquement ou prepared statements
- [ ] NoSQL injection : sanitisation des queries MongoDB/Mongoose
- [ ] Command injection : pas de shell exec avec input utilisateur
- [ ] Path traversal : validation des chemins de fichiers
- [ ] XML injection : désactiver external entities
- [ ] ReDoS : regex testées sur les inputs pathologiques

### API Security

- [ ] Rate limiting : par IP + par user + par endpoint sensible
- [ ] CORS : origines whitelistées explicitement, jamais `*` en prod
- [ ] Headers de sécurité : CSP, HSTS, X-Frame-Options, Permissions-Policy
- [ ] API keys hashées en BDD, jamais en clair
- [ ] Pagination forcée — jamais de "get all" sans limite
- [ ] Logging des accès refusés pour détection d'intrusion

### Data Protection

- [ ] PII chiffrée au repos (AES-256-GCM ou libsodium)
- [ ] Secrets dans vault ou env variables — JAMAIS dans le code
- [ ] .env dans .gitignore vérifié
- [ ] Logs sans données sensibles (masquer emails, tokens, passwords)
- [ ] Backup chiffré si données critiques
- [ ] Politique de rétention des données définie
- [ ] Droit à l'effacement (RGPD Art.17) implémentable

### Frontend Security

- [ ] XSS : dangerouslySetInnerHTML → toujours DOMPurify avant
- [ ] CSRF : tokens sur les mutations POST/PUT/DELETE
- [ ] Pas de secrets dans le bundle client (env NEXT*PUBLIC* avec précaution)
- [ ] Subresource Integrity (SRI) pour les CDN externes
- [ ] npm audit clean — 0 vulnérabilité critique/high
- [ ] Content Security Policy testée en mode report-only d'abord

### Infrastructure & Déploiement

- [ ] HTTPS forcé — redirection HTTP→HTTPS
- [ ] Pas de ports inutiles ouverts
- [ ] Principe du moindre privilège sur les credentials de BDD
- [ ] Secrets en variables d'environnement dans CI/CD
- [ ] Images Docker non-root
- [ ] Dépendances lockées (package-lock.json ou yarn.lock commité)

### OWASP Top 10 — 2023

```
A01 Broken Access Control   → IDOR + RBAC checks
A02 Cryptographic Failures  → TLS + chiffrement données
A03 Injection               → Validation + ORM
A04 Insecure Design         → Threat modeling
A05 Security Misconfiguration → Headers + CORS + defaults
A06 Vulnerable Components   → npm audit + Dependabot
A07 Auth Failures           → bcrypt + JWT + MFA
A08 Software Data Integrity → SRI + signed artifacts
A09 Logging/Monitoring      → Structured logs + alerting
A10 SSRF                    → Validation des URLs appelées
```

---

## PHASE 6 — PERFORMANCE & OBSERVABILITÉ

### Core Web Vitals Targets

| Métrique                       | Cible           | Critique |
| ------------------------------ | --------------- | -------- |
| LCP (Largest Contentful Paint) | ≤ 2.5s          | > 4s     |
| FID / INP                      | ≤ 100ms         | > 300ms  |
| CLS (Cumulative Layout Shift)  | ≤ 0.1           | > 0.25   |
| TTFB                           | ≤ 800ms         | > 1.8s   |
| Bundle JS initial              | ≤ 200kb gzipped | > 500kb  |

### Checklist Performance

- [ ] Lighthouse score ≥ 90 en prod
- [ ] Bundle analyzer : pas de dépendance surprise
- [ ] Images : WebP/AVIF + dimensions explicites + lazy loading
- [ ] Fonts : preload + font-display: swap + subset
- [ ] API responses : compression gzip/brotli activée
- [ ] Stale-While-Revalidate sur les données non critiques
- [ ] Prefetch des routes probablement visitées
- [ ] Tree shaking vérifié sur les grandes librairies (lodash, date-fns...)

### Observabilité Production

```typescript
// Stack recommandée
Logging    : Pino (Node) / Winston → Axiom / Datadog / Loki
Errors     : Sentry (frontend + backend)
Metrics    : Prometheus + Grafana OU Datadog
Tracing    : OpenTelemetry
Uptime     : Better Uptime / Checkly
Analytics  : PostHog (privacy-first) ou Plausible
```

---

## PHASE 7 — QUALITY SCORING MATRIX (12 Dimensions)

Évaluer sur **12 dimensions** après chaque feature et en final :

| #   | Dimension             | Poids | Critères                                                                    | Score /10 |
| --- | --------------------- | ----- | --------------------------------------------------------------------------- | --------- |
| 1   | 🎨 **Design/UX**      | 15%   | Cohérence tokens, wow factor, accessibilité, responsive, micro-interactions | \_\_      |
| 2   | ⚡ **Performance**    | 12%   | Core Web Vitals, bundle, queries, caching                                   | \_\_      |
| 3   | 🔐 **Sécurité**       | 15%   | OWASP coverage, auth solidité, data protection                              | \_\_      |
| 4   | 🧱 **Architecture**   | 12%   | Patterns, scalabilité, maintenabilité, couplage                             | \_\_      |
| 5   | 🧪 **Tests**          | 10%   | Coverage, pertinence, CI, types de tests                                    | \_\_      |
| 6   | 📖 **Code Quality**   | 10%   | Lisibilité, DRY, typage TS strict, conventions                              | \_\_      |
| 7   | ♿ **Accessibilité**  | 8%    | WCAG 2.1 AA, keyboard nav, ARIA, contraste                                  | \_\_      |
| 8   | 📚 **Documentation**  | 8%    | README, API docs, ADRs, commentaires                                        | \_\_      |
| 9   | 🚀 **Prod Ready**     | 5%    | Error handling, logging, deploy config, health checks                       | \_\_      |
| 10  | 🌍 **Scalabilité**    | 5%    | Peut gérer 10x le volume sans refactoring                                   | \_\_      |
| 11  | 🧹 **Maintenabilité** | 5%    | Onboarding facile, conventions claires, tech debt maîtrisé                  | \_\_      |
| 12  | 💡 **Innovation**     | 5%    | Solutions élégantes, DX excellente, beyond the obvious                      | \_\_      |

**Score global pondéré = Σ(score × poids)**

### Règles de Validation

- Score pondéré **< 8.0** → Boucle d'amélioration obligatoire avec liste des points à corriger
- Toute dimension **< 7.0** → Correction prioritaire bloquante avant avancement
- Score **≥ 8.5** → Feature validée avec mention "Excellence"
- Score **≥ 9.0** → Mention "Shipable by FAANG standards"
- Score pondéré **≥ 8.0 sur toutes dimensions** → Livraison autorisée ✅

### Auto-Scoring Prompt Interne

```
Pour chaque dimension, se poser :
"Est-ce que un SDE3 de Google / Staff Engineer de Stripe
 serait fier de ce code/design/test ?"
Si OUI → 8+/10
Si "Pas sûr" → 6-7/10 → améliorer
Si NON → < 6/10 → refaire
```

---

## PHASE 8 — FINAL DELIVERY PACKAGE

### Structure de Livraison Complète

```
[project-name]/
├── README.md              ← Guide complet (voir template ci-dessous)
├── ARCHITECTURE.md        ← Vue d'ensemble + ADRs
├── SECURITY.md            ← Threat model + mesures
├── CHANGELOG.md           ← Historique des versions
├── .env.example           ← Toutes les vars commentées
├── docker-compose.yml     ← Dev environment complet
├── Makefile               ← Commandes fréquentes
├── docs/
│   ├── api/               ← Swagger ou Postman collection
│   ├── deployment/        ← Guide de déploiement
│   └── adr/               ← Architecture Decision Records
└── [code source]
```

### README.md Production-Grade — Template

```markdown
<div align="center">
  <h1>[App Name]</h1>
  <p>[Tagline en 1 ligne]</p>
  <img src="[screenshot]" alt="Screenshot" width="800"/>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
  [![Tests](https://img.shields.io/badge/tests-passing-green)]()
  [![Coverage](https://img.shields.io/badge/coverage-87%25-green)]()
</div>

## ✨ Features

[Liste des features principales]

## 🚀 Quick Start

\`\`\`bash
git clone [repo]
cd [project]
cp .env.example .env
npm install
npm run db:migrate
npm run dev
\`\`\`

## 📋 Prerequisites

[Node, DB, etc.]

## ⚙️ Configuration

[Table de toutes les variables d'environnement avec description + exemple]

## 🏗 Architecture

[Diagram ASCII ou Mermaid + explication]

## 📡 API Reference

[Lien Swagger ou endpoints clés]

## 🧪 Tests

\`\`\`bash
npm run test # Unit tests
npm run test:e2e # E2E tests
npm run test:coverage # Coverage report
\`\`\`

## 🔒 Security

[Mesures de sécurité principales]

## 🚀 Deployment

[Guide étape par étape]

## 📊 Performance

[Benchmarks et métriques]

## 🗺 Roadmap

[Prochaines features planifiées]
```

### Checklist Finale de Livraison

```
QUALITÉ
  [ ] Score pondéré ≥ 8.0/10 sur les 12 dimensions
  [ ] Aucune dimension < 7.0/10
  [ ] 0 TypeScript error en strict mode
  [ ] 0 ESLint error (warnings acceptés si documentés)
  [ ] Tests passent à 100%
  [ ] Coverage ≥ 80% sur le code métier

SÉCURITÉ
  [ ] OWASP Top 10 vérifié
  [ ] npm audit : 0 vulnérabilité critical/high
  [ ] Secrets hors du code
  [ ] .env.example fourni sans vraies valeurs
  [ ] Headers de sécurité configurés
  [ ] Rate limiting actif

PERFORMANCE
  [ ] Lighthouse ≥ 90 en prod
  [ ] Bundle analysé, pas de bloat
  [ ] Images optimisées
  [ ] Caching configuré

PRODUCTION
  [ ] Health check endpoint opérationnel
  [ ] Logging structuré configuré
  [ ] Error tracking configuré (Sentry ou équivalent)
  [ ] Variables d'environnement documentées
  [ ] CI/CD pipeline fonctionnel
  [ ] Déploiement testé dans l'env cible

DOCUMENTATION
  [ ] README complet
  [ ] API documentée
  [ ] ADRs écrits
  [ ] .env.example commenté
  [ ] Guide de déploiement

ACCESSIBILITÉ
  [ ] WCAG 2.1 AA vérifié
  [ ] Navigation clavier testée
  [ ] Contraste des couleurs vérifié
  [ ] Screen reader basique testé
```

---

## MÉTA-RÈGLES DU SKILL

### Ce que tu DOIS faire

- ✅ **Intake complet en Phase 0** — AUCUN code avant les réponses
- ✅ **Checkpoint doc** après chaque sprint complet
- ✅ **Context budget** affiché en en-tête de chaque session
- ✅ **Sprint announcement** avant chaque groupe de features
- ✅ **Auto-review** sur chaque fichier avant livraison
- ✅ **Score affiché** après chaque feature
- ✅ **Continuer sans demander** si score ≥ 8.0/10
- ✅ **TypeScript strict** par défaut
- ✅ **ADR écrit** pour chaque décision architecturale
- ✅ **Suggestions proactives** même si non demandées

### Ce que tu NE DOIS PAS faire

- ❌ Coder avant Phase 0 terminée
- ❌ `any` TypeScript sans justification documentée
- ❌ Oublier error handling, loading states, edge cases
- ❌ Design générique AI-slop
- ❌ S'arrêter et demander confirmation pour continuer (sauf changement de scope)
- ❌ Livrer sans documentation
- ❌ Avancer avec un score < 8.0/10
- ❌ Ignorer les warnings de sécurité même "mineurs"
- ❌ Oublier de mettre à jour le Context Budget

### Signaux Visuels Standards

```
🔴 SECURITY ALERT    — Problème de sécurité critique, bloquant
🟡 WARNING           — Point d'attention, non bloquant
🟢 VALIDATED         — Critère validé
⚡ PERFORMANCE NOTE  — Impact sur les performances
♿ A11Y NOTE         — Point d'accessibilité
📊 SCORE             — Résultat d'évaluation
🔖 CHECKPOINT        — Sauvegarde d'état du projet
🏃 SPRINT [N]        — Annonce de sprint
✅ DONE              — Feature terminée
🔄 ITERATING         — En boucle d'amélioration
```

### Ton de Communication

- Tech Lead senior : direct, précis, sans bullshit
- Expliquer le WHY en 2 lignes max quand non évident
- Alertes de sécurité immédiates, jamais minimisées
- Progression toujours visible ("Feature 4/11 ✅")
- Optimisme réaliste : dire quand quelque chose est complexe

---

## PHASE 9 — AI / LLM INTEGRATION LAYER

> Lire `references/ai-llm.md` pour les patterns détaillés.

Obligatoire dès qu'une feature utilise un LLM (résumé, chat, génération, classification...).

### Règles Non-Négociables AI

- **Streaming UI réel** : chaque token affiché vient du stream HTTP, jamais simulé
- **Coût tracké** : chaque appel LLM logge (model, prompt_tokens, completion_tokens, cost_usd)
- **Fallback défini** : si LLM timeout/error → comportement sans AI documenté
- **Prompt versioning** : les prompts sont dans des fichiers versionés, jamais inline
- **PII scrubbing** : données personnelles supprimées avant envoi au LLM

### Architecture AI Obligatoire

```typescript
// Structure minimale pour tout module AI
interface AIRequest {
  prompt: string;
  userId: string; // Pour audit et rate limiting
  featureKey: string; // Pour tracking des coûts par feature
  maxTokens: number; // Toujours borné, jamais illimité
}

interface AIResponse<T> {
  data: T;
  usage: { promptTokens: number; completionTokens: number; costUsd: number };
  model: string;
  latencyMs: number;
}
```

### Patterns AI à Implémenter

- **Streaming avec Server-Sent Events** : `ReadableStream` → `TextDecoder` → UI update
- **RAG (Retrieval Augmented Generation)** : embed → store → retrieve → augment prompt
- **Tool Calling** : définir les outils, parser le JSON, exécuter, retourner le résultat
- **Rate Limiting AI** : quota par user/jour, graceful degradation si dépassé
- **Prompt injection defense** : sanitiser les inputs user avant injection dans le prompt
- **Structured Output** : Zod schema + instruction JSON mode → validation stricte

---

## PHASE 10 — MULTI-TENANCY

> Lire `references/multitenancy.md` pour les patterns détaillés.

Obligatoire dès qu'il y a des "organisations", "workspaces", "équipes" ou "comptes".

### Choix d'Isolation — Décision ADR Obligatoire

| Modèle                       | Isolation                       | Complexité | Cas d'usage            |
| ---------------------------- | ------------------------------- | ---------- | ---------------------- |
| **Row-Level Security (RLS)** | Par colonne `tenant_id`         | Faible     | B2C SaaS, MVP          |
| **Schema isolation**         | Un schema PostgreSQL par tenant | Moyenne    | B2B mid-market         |
| **DB isolation**             | Une DB par tenant               | Haute      | Enterprise, compliance |

### Règles Multi-Tenant Strictes

```typescript
// TOUTE query doit inclure le tenant_id — sans exception
// Utiliser RLS PostgreSQL pour garantir l'isolation au niveau DB

// Middleware obligatoire sur toutes les routes
async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'No tenant context' });

  // Injecter dans le contexte de la request
  req.tenantId = tenantId;

  // Si Prisma : utiliser un client scopé au tenant
  req.db = db.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
  next();
}
```

### Features Multi-Tenant à Implémenter

- Invitation membres (email + token signé, expiration 48h)
- Rôles par workspace (owner, admin, member, viewer)
- Quotas par plan (nb users, storage, appels API)
- Subdomain routing (`acme.app.com` → tenant "acme")
- Audit log par tenant (qui a fait quoi, quand)
- Billing par tenant (Stripe Customer = Tenant)

---

## PHASE 11 — EVENT-DRIVEN ARCHITECTURE

> Lire `references/event-driven.md` pour les patterns CQRS et Event Sourcing.

À utiliser dès que le système a des effets de bord complexes ou des microservices.

### Event Bus — Implémentation Minimale

```typescript
// Typage fort des events — jamais d'any
type AppEvent =
  | { type: 'user.registered'; payload: { userId: string; email: string } }
  | { type: 'payment.succeeded'; payload: { userId: string; amount: number; planId: string } }
  | {
      type: 'document.created';
      payload: { documentId: string; tenantId: string; authorId: string };
    }
  | { type: 'subscription.cancelled'; payload: { userId: string; reason: string } };

// Publish
await eventBus.emit('user.registered', { userId: user.id, email: user.email });

// Subscribe
eventBus.on('user.registered', async ({ userId, email }) => {
  await mailer.sendWelcome(email); // handler 1
  await analytics.track('user_registered', { userId }); // handler 2
  await onboarding.initSequence(userId); // handler 3
});
```

### Règles Event-Driven

- Events nommés `noun.past_verb` (user.registered, payment.failed)
- Payload immutable : jamais modifier un event après émission
- Handlers idempotents : même event traité 2x = même résultat
- Dead letter queue pour les handlers en échec
- Event store si audit complet requis (append-only, immuable)

### CQRS Simplifié

```
Commands (mutations) → Validation → Aggregate → Event emis → Projections mises à jour
Queries (lectures)   → Read model optimisé → Réponse directe (pas de joins complexes)
```

---

## PHASE 12 — USER ONBOARDING & ACTIVATION

> Chaque user qui arrive sans onboarding est un user perdu.

### Métriques d'Activation à Définir en Phase 0

- **Aha Moment** : L'action qui transforme un visiteur en user actif (ex : "créer sa première X")
- **Activation Rate** : % users qui atteignent l'aha moment dans les 7 premiers jours
- **Time to Value** : temps médian entre inscription et premier succès

### Checklist Onboarding Obligatoire

- [ ] Barre de progression d'onboarding connectée à des actions réelles en DB
- [ ] Chaque étape a un statut `completed` stocké en base (jamais dérivé du localStorage)
- [ ] Email de bienvenue envoyé à J+0 (contenu réel, pas template vide)
- [ ] Email de relance à J+3 si aha moment non atteint (data réelle)
- [ ] Checklist visible dans l'app jusqu'à completion (état lu depuis API)
- [ ] Skip possible mais tracké analytiquement
- [ ] Tooltips contextuels sur les features-clés (état "seen" persisté en DB)

### Empty States Stratégiques

```typescript
// Chaque empty state doit avoir : illustration + titre + description + CTA primaire
// Le CTA doit lancer une action RÉELLE, jamais une modale vide

// Exemple — Liste de projets vide
<EmptyState
  icon={<FolderPlusIcon />}
  title="Votre premier projet vous attend"
  description="Créez un projet pour inviter votre équipe et commencer à collaborer."
  action={{
    label: "Créer un projet",
    onClick: () => router.push('/projects/new'),  // Route RÉELLE qui existe
  }}
/>
```

### Séquence Email Onboarding (toutes connectées à des données réelles)

```
J+0 : Welcome → lien vers dashboard réel, nom user réel depuis DB
J+1 : "Voici comment [feature clé]" → si aha moment non atteint (vérifié en DB)
J+3 : Social proof → si account inactif (vérifié en DB)
J+7 : Résumé d'activité → données réelles (nb actions, dernière connexion)
J+14: Feature discovery → features non utilisées (dérivé de l'usage réel)
```

---

## PHASE 13 — SEO & METADATA LAYER

Obligatoire pour tout projet public (landing, SaaS public, marketplace).

### Metadata Dynamique — Next.js App Router

```typescript
// app/[slug]/page.tsx — metadata générée depuis la DB
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await db.page.findUnique({ where: { slug: params.slug } });
  if (!page) return { title: 'Not Found' };

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      images: [{ url: page.ogImage ?? '/og-default.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
    },
    robots: page.isPublished ? 'index,follow' : 'noindex,nofollow',
  };
}
```

### Checklist SEO Obligatoire

- [ ] `<title>` unique par page (jamais dupliqué), venant de la DB ou config
- [ ] `<meta description>` ≤ 160 chars, unique par page
- [ ] OG Image générée dynamiquement (Vercel OG ou équivalent)
- [ ] `robots.txt` configuré (index public / noindex privé)
- [ ] `sitemap.xml` auto-généré depuis les routes publiques DB
- [ ] `canonical` URL sur chaque page
- [ ] JSON-LD structured data (Organization, Article, Product selon le cas)
- [ ] Core Web Vitals verts (Lighthouse ≥ 90)
- [ ] Pas de contenu dupliqué (pagination avec `?page=` → noindex sauf page 1)

---

## PHASE 14 — ANALYTICS & EVENT TAXONOMY

> Des analytics sans taxonomie = du bruit. Une taxonomie sans données réelles = du vide.

### Taxonomie des Events — Convention Stricte

```
Format : [objet]_[verbe_passé]
Objets : user, project, document, payment, invite, feature...
Verbes : created, deleted, updated, viewed, clicked, started, completed, failed...

Exemples CORRECTS :
  project_created         → user crée un projet
  document_shared         → user partage un document
  payment_failed          → paiement échoue
  onboarding_completed    → onboarding terminé

Exemples INCORRECTS :
  click_button            → trop générique
  action                  → sans signification
  test_event              → ne doit jamais être en prod
```

### Implémentation PostHog (ou équivalent) — Obligatoire

```typescript
// lib/analytics.ts — wrapper typé, jamais d'appel direct dans les composants
type AnalyticsEvent = {
  project_created: { projectId: string; templateUsed: boolean };
  document_shared: { documentId: string; shareMethod: 'link' | 'email' };
  payment_failed: { planId: string; errorCode: string };
  // ... tous les events typés
};

export const analytics = {
  track<K extends keyof AnalyticsEvent>(event: K, properties: AnalyticsEvent[K], userId?: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics]', event, properties);
      return;
    }
    posthog.capture(event, { ...properties, $user_id: userId });
  },

  identify(userId: string, traits: Record<string, unknown>) {
    posthog.identify(userId, traits);
  },

  page(pageName: string) {
    posthog.capture('$pageview', { page: pageName });
  },
};
```

### Funnels à Définir en Phase 0

- Funnel d'activation (signup → aha moment)
- Funnel de conversion (trial → paid)
- Funnel feature adoption (feature discovery → repeated use)

---

## PHASE 15 — WEBHOOK SYSTEM (Outbound)

Obligatoire pour tout SaaS B2B qui s'intègre avec des outils tiers.

### Architecture Webhook Production-Grade

```typescript
// Chaque webhook = event DB + signature HMAC + retry avec backoff
interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signature: string; // HMAC-SHA256 du payload
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number; // Max 5 tentatives
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
}

// Signature vérifiable côté client
function signPayload(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

// Backoff exponentiel : 1min, 5min, 30min, 2h, 8h
function nextRetryDelay(attempt: number): number {
  return Math.min(60 * Math.pow(5, attempt - 1), 8 * 60 * 60) * 1000;
}
```

### Features Webhook Obligatoires

- [ ] Portal d'administration des endpoints (CRUD + test)
- [ ] Logs de livraison avec statut HTTP réel et body de réponse
- [ ] Bouton "Retry" manuel sur les livraisons échouées
- [ ] Test de webhook avec payload exemple réel
- [ ] Rotation de secret sans downtime (grace period 48h double-validation)
- [ ] Filtre par type d'event par endpoint

---

## PHASE 16 — ADMIN PANEL

> L'admin panel n'est pas optionnel. Tout SaaS en a besoin en production.

### Règle Admin Panel

- **Toutes les opérations admin sont auditées** : qui, quoi, quand, avant, après
- **Aucune action admin sans confirmation** : modale de confirmation avec conséquences explicites
- **Soft delete par défaut** : jamais de DELETE physique sans processus de validation
- **Impersonation avec trace** : si admin peut se connecter en tant qu'user → log immutable

### Schema DB Admin Minimum

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  adminId     String
  action      String   // 'user.ban', 'subscription.cancel', etc.
  targetType  String   // 'User', 'Project', etc.
  targetId    String
  before      Json?    // État avant
  after       Json?    // État après
  ipAddress   String
  userAgent   String
  createdAt   DateTime @default(now())

  admin       User     @relation(fields: [adminId], references: [id])
  @@index([adminId])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

### Pages Admin Obligatoires (toutes connectées à la DB)

- **Dashboard** : métriques temps réel (MRR, DAU, signups/jour, erreurs récentes)
- **Users** : liste paginée + filtres + actions (ban, impersonate, reset password)
- **Subscriptions** : état abonnements, MRR breakdown, churn récent
- **Audit Logs** : timeline des actions admin avec recherche
- **Feature Flags** : activation/désactivation par tenant ou % rollout
- **Jobs** : statut des background jobs, retry des failed

---

## PHASE 17 — MONOREPO ARCHITECTURE

> À utiliser si le projet a : plusieurs apps (web + mobile + api) ou packages partagés.

### Structure Turborepo Recommandée

```
apps/
  web/          ← Next.js principal
  api/          ← API standalone (si découplée)
  mobile/       ← React Native (si applicable)
  admin/        ← Admin panel séparé
packages/
  @app/ui/      ← Composants design system partagés
  @app/types/   ← Types TypeScript partagés (SSOT)
  @app/utils/   ← Utilitaires partagés (validations, formatters)
  @app/config/  ← Configs partagées (eslint, tsconfig, tailwind)
  @app/db/      ← Prisma client + types générés
turbo.json      ← Pipeline de build optimisé
```

### Règles Monorepo

- `@app/types` est la **source de vérité unique** pour tous les types partagés
- Jamais de copier-coller de types entre packages — toujours importer
- Les changements breaking dans un package déclenchent le test de toutes les apps dépendantes
- Versioning des packages internes en `0.0.0` (workspace protocol, pas publié)

---

## PHASE 18 — TESTING PYRAMID COMPLET

> Complément à la Phase 4 — Ajoute les couches manquantes.

### Tests Visuels (Regression)

```typescript
// Chromatic (Storybook) ou Playwright screenshot comparison
// Chaque composant de design system a une story
// CI bloque si diff visuel > 0.1%

// stories/Button.stories.tsx
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Delete</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
}
```

### Tests de Contrat API (Consumer-Driven)

```typescript
// Pact.js — le frontend définit le contrat, le backend le vérifie
// Empêche les breaking changes non détectés

// consumer (frontend) — définit ce qu'il attend
const userEndpoint = {
  state: 'user 123 exists',
  uponReceiving: 'a GET request for user 123',
  withRequest: { method: 'GET', path: '/api/users/123' },
  willRespondWith: {
    status: 200,
    body: { id: '123', email: like('user@example.com'), name: like('John') },
  },
};
```

### Tests de Charge (k6)

```javascript
// k6 run --vus 100 --duration 30s load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes < 500ms
    http_req_failed: ['rate<0.01'], // < 1% d'erreurs
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/projects`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Tests de Mutation (Qualité des Tests)

```bash
# Stryker Mutant Testing — vérifie que les tests détectent vraiment les bugs
npx stryker run
# Mutation score cible : > 70%
# Un test qui passe même si le code est cassé = un test inutile
```

---

## PHASE 19 — PWA LAYER

> Optionnel mais recommandé pour les apps mobile-heavy.

### Checklist PWA

- [ ] `manifest.json` complet (name, icons 192+512, theme_color, display: standalone)
- [ ] Service Worker enregistré (Workbox ou next-pwa)
- [ ] Stratégie de cache définie : Network-first pour les API, Cache-first pour les assets
- [ ] Offline fallback page : "Vous êtes hors ligne" avec dernières données cachées
- [ ] Install prompt géré (beforeinstallprompt event)
- [ ] Icônes splash screen iOS (apple-touch-icon)
- [ ] Background sync pour les mutations offline (si critique)

### Stratégies de Cache par Ressource

```javascript
// via Workbox (next-pwa)
// Statique : Cache-first, 30 jours
// API critique (user, auth) : Network-first, fallback cache 5min
// API non-critique (suggestions, feed) : Stale-while-revalidate
// Images : Cache-first, 7 jours, max 50 entries
```

---

## PHASE 20 — I18N SYSTÈME COMPLET

> Dès que l'app vise plus d'un marché ou une langue.

### Règles i18n Strictes

- **JAMAIS de string hardcodée dans le JSX** — tout passe par la fonction `t()`
- **Clés hiérarchiques** : `auth.login.title`, pas `loginTitle`
- **Pluralisation correcte** : utiliser ICU message format
- **Dates/nombres formatés** selon la locale active (jamais `.toLocaleDateString()` sans locale)
- **RTL support** : `dir={locale === 'ar' ? 'rtl' : 'ltr'}` sur le `<html>`

```typescript
// next-intl — configuration type-safe
// messages/fr.json
{
  "projects": {
    "count": "{count, plural, =0 {Aucun projet} =1 {1 projet} other {{count} projets}}",
    "empty": { "title": "Commencez votre premier projet" }
  }
}

// Usage — jamais de string en dur
const t = useTranslations('projects')
<p>{t('count', { count: projects.length })}</p>
```

---

## PHASE 21 — DISASTER RECOVERY & RÉSILIENCE

### Runbook Obligatoire (à créer dans `docs/runbooks/`)

```markdown
# Runbook : [Incident Type]

## Sévérité : P0 / P1 / P2

## Impact : [quels users, quelles features]

## Détection : [quelle alerte a déclenché]

## Diagnostic (< 5 min)

1. Vérifier le dashboard [lien]
2. Vérifier les logs [commande exacte]
3. Vérifier la DB [requête exacte]

## Mitigation (< 15 min)

1. [Action immédiate 1]
2. [Action immédiate 2]

## Resolution

[Étapes de résolution permanente]

## Post-Mortem

- Timeline des événements
- Root cause
- Actions préventives
```

### Objectifs RTO/RPO à Définir en Phase 0

| Tier | Service              | RTO (temps de reprise) | RPO (perte de données max) |
| ---- | -------------------- | ---------------------- | -------------------------- |
| P0   | Auth + paiements     | < 15 min               | 0 secondes                 |
| P1   | Core features        | < 1h                   | < 5 min                    |
| P2   | Features secondaires | < 4h                   | < 1h                       |

### Checklist Résilience

- [ ] Health check `/health` répond en < 100ms même si DB est lente
- [ ] Circuit breaker sur les dépendances externes (Stripe, email, LLM)
- [ ] Graceful shutdown : drainer les requêtes en cours avant de s'arrêter
- [ ] Retry automatique avec backoff exponentiel sur les erreurs transitoires
- [ ] Backups DB testés : restore testé au moins 1x/mois (documenté)
- [ ] Alertes définies : error rate > 1%, latence p95 > 1s, DB connections > 80%

---

## PHASE 22 — LEGAL & COMPLIANCE LAYER

> Un produit sans conformité légale est un risque, pas un produit.

### RGPD — Checklist Minimum

- [ ] **Consentement explicite** : cookies analytics opt-in (pas opt-out)
- [ ] **Politique de confidentialité** complète et lisible (pas copiée-collée)
- [ ] **Droit à l'effacement** : endpoint qui purge toutes les données utilisateur
- [ ] **Export des données** : endpoint qui retourne un ZIP avec toutes les données
- [ ] **Registre des traitements** : document interne listant chaque traitement de données
- [ ] **DPA** avec tous les sous-processeurs (Stripe, Resend, Vercel, AWS...)
- [ ] **Breach notification** : procédure documentée (72h max pour notifier la CNIL)

### Cookie Consent Technique

```typescript
// Jamais de cookie analytics avant consentement
// Consentement stocké en cookie first-party (pas localStorage)
// Granularité : necessary | analytics | marketing

const consent = getCookieConsent();
if (consent.analytics) {
  posthog.opt_in_capturing();
} else {
  posthog.opt_out_capturing();
}
```

### Mentions Légales Obligatoires (selon juridiction)

```
Pages obligatoires :
  /privacy     → Politique de confidentialité (RGPD Art.13)
  /terms       → Conditions générales d'utilisation
  /cookies     → Politique cookies + gestionnaire
  /legal       → Mentions légales (France : LCEN)

Pied de page :
  © [Année] [Société] — Tous droits réservés
  [Liens vers les 4 pages ci-dessus]
```

### Data Retention Policy

```typescript
// Chaque type de donnée a une durée de rétention définie et appliquée automatiquement
const retentionPolicy = {
  audit_logs: 365, // jours
  session_data: 90,
  deleted_user_data: 30, // après soft delete
  payment_records: 365 * 7, // 7 ans (obligation légale France)
  error_logs: 30,
  analytics_events: 365 * 2,
};
// Cron job quotidien qui purge les données expirées
```

---

## PHASE 23 — TECHNICAL DEBT REGISTER

> La dette technique non gérée tue les projets. La tracker = la maîtriser.

### Format Standard — `TECH_DEBT.md`

```markdown
# Technical Debt Register

## Méthode d'évaluation

- **Effort** : estimation en jours
- **Impact** : 1 (cosmétique) → 5 (bloque la croissance)
- **Risque** : 1 (négligeable) → 5 (risque sécurité/data)
- **Priorité** = Impact × Risque ÷ Effort

| ID     | Description           | Effort | Impact | Risque | Priorité | Sprint cible |
| ------ | --------------------- | ------ | ------ | ------ | -------- | ------------ |
| TD-001 | [Description précise] | 2j     | 3      | 2      | 3.0      | Sprint 8     |

## Règles

- Jamais de dette ajoutée sans être enregistrée ici
- Dette de priorité > 4 : traiter dans les 2 sprints suivants
- Revue mensuelle obligatoire (supprimer les dettes résolues)
- Jamais créer de dette pour les features de sécurité
```

---

## RÉFÉRENCES EXTERNES

→ **Design guidelines avancées** : `/mnt/skills/public/frontend-design/SKILL.md`
→ **Stack decisions matrix** : `references/stacks.md`
→ **Context management guide** : `references/context-management.md`
→ **Environment-specific guide** : `references/environments.md`
→ **Advanced patterns** : `references/patterns.md`
→ **AI/LLM integration patterns** : `references/ai-llm.md`
→ **Multi-tenancy patterns** : `references/multitenancy.md`
→ **Event-driven & CQRS** : `references/event-driven.md`
→ **Testing pyramid avancé** : `references/testing-advanced.md`
→ **21st.dev MCP** : si connecté, `@21st-dev/magic` pour composants UI premium
→ **Context7 MCP** : si connecté, pour la documentation des librairies à jour

---

_Ultra Dev Forge v3.0 — Zero fake. Zero placeholder. Zero compromise. Never stops._
_Compatible : Claude.ai · Claude Code · Cursor · Windsurf · VS Code · Cline · Continue · Aider · Any AI IDE_
