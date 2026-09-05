# Context Management & Credits Guide

## Pourquoi gérer le contexte ?

Un projet full-stack complet génère entre 50k et 500k tokens de conversation.
Sans gestion, on perd les décisions architecturales, on régénère du code déjà fait,
et la qualité dégrade en fin de session.

---

## Estimation des Budgets par Phase

| Phase                             | Tokens estimés    | Notes                        |
| --------------------------------- | ----------------- | ---------------------------- |
| Phase 0 — Intake                  | 2k–5k             | Questions + réponses + brief |
| Phase 1 — ADRs                    | 5k–15k            | 10 ADRs × 1k-1.5k chacun     |
| Phase 2 — Design System           | 8k–20k            | Tokens + composants de base  |
| Phase 3 — Auth complet            | 10k–25k           | Schema + API + UI            |
| Phase 3 — Feature métier simple   | 5k–15k            | CRUD + UI                    |
| Phase 3 — Feature métier complexe | 15k–40k           | Logique + intégrations + UI  |
| Phase 4-5 — Reviews               | 2k–5k par feature |                              |
| Phase 6 — Scoring                 | 1k–3k par feature |                              |
| Phase 7 — Documentation finale    | 10k–20k           |                              |

**Total projet simple (MVP)** : ~100k–200k tokens
**Total projet complet (SaaS)** : ~300k–600k tokens

---

## Stratégies d'Optimisation par Environnement

### Claude.ai (claude.ai/chat)

- Fenêtre de contexte : ~200k tokens
- **Stratégie** : Checkpoints fréquents, snapshots condensés
- À 150k tokens : générer le Handoff Document et créer une nouvelle conversation
- Utiliser les artifacts pour le code (réduit le contexte inline)

### Claude Code (CLI)

- Fenêtre de contexte : variable selon --max-tokens
- **Stratégie** : Utiliser `/clear` + context file entre les sprints
- Sauvegarder l'état dans `CONTEXT.md` à la racine du projet
- Relancer avec : `claude -p "Lis CONTEXT.md et continue"`

### Cursor / Windsurf

- Contexte : géré par l'IDE, souvent fenêtres glissantes
- **Stratégie** : Maintenir un fichier `DEVLOG.md` dans le projet
- Ouvrir les fichiers pertinents avant de demander du travail dessus
- Utiliser `@file` pour référencer sans recharger tout le contexte

### API directe / Autre

- **Stratégie** : Inclure l'état du projet dans le system prompt
- Maintenir un fichier `PROJECT_STATE.json` mis à jour après chaque session

---

## Templates de Gestion de Contexte

### Template : Context Budget Header

```
╔══════════════════════════════════════════════════════════╗
║  📊 CONTEXT BUDGET — Session #[N]                        ║
╠══════════════════════════════════════════════════════════╣
║  Projet        : [nom]                                   ║
║  Environment   : [claude.ai / cursor / windsurf / ...]   ║
║  Phase actuelle: [N - nom]                               ║
║  Sprint        : [N]/[total estimé]                      ║
║  Features      : [done] / [total] ([%])                  ║
║  Tokens utilisés: ~[X]k (estimé)                         ║
║  Budget restant : ~[Y]k (estimé)                         ║
║  Prochain CP   : [Sprint X terminé / Feature Y]          ║
╚══════════════════════════════════════════════════════════╝
```

### Template : Checkpoint Document (générer après chaque sprint)

```markdown
# 🔖 CHECKPOINT — [Projet] — Sprint [N] — [Date]

## État Actuel

**Phase** : [numéro et nom]
**Features terminées** :

- ✅ [feature 1] — Score: [X]/10
- ✅ [feature 2] — Score: [X]/10

**Features en cours** :

- 🔄 [feature 3] — [X]% complète

**Features restantes (priorisées)** :

1. [feature 4] — Critique
2. [feature 5] — Important
3. [feature 6] — Nice-to-have

## Stack Définitive

- Frontend : [...]
- Backend : [...]
- DB : [...]
- Auth : [...]
- Deploy : [...]

## Décisions Techniques Clés (résumé ADRs)

- ADR-001 : [décision en 1 ligne]
- ADR-002 : [décision en 1 ligne]

## Structure Fichiers Actuels
```

[arborescence courte]

```

## Scores Qualité Actuels
| Dimension | Score |
|-----------|-------|
| Design/UX | /10   |
| Sécurité  | /10   |
| [...]     | /10   |
| **Global**| **/10** |

## Points d'Attention / Tech Debt
- ⚠️ [point 1]
- ⚠️ [point 2]

## Prochaine Action Immédiate
> [Description précise de la première chose à faire au Sprint N+1]

## Commande de Reprise
```

Reprends le projet [NOM]. Voici l'état exact : [coller ce doc]
Reprends au Sprint [N+1] avec la feature [X].

```

```

### Template : Handoff Document (nouvelle session)

```markdown
# 📦 PROJET HANDOFF — [Nom] — v[X]

## TL;DR (30 secondes de lecture)

[App = quoi, pour qui, problème résolu]
[Où on en est = % complété]
[Ce qui reste = les 3 prochaines choses]

## Stack (copier-coller ready)

Frontend: Next.js 14 (App Router) + TypeScript + Tailwind
Backend: Next.js API Routes + Prisma + PostgreSQL
Auth: Clerk
Deploy: Vercel + Supabase

## Fichiers Critiques à Connaître

1. `schema.prisma` — structure de données complète
2. `lib/auth.ts` — logique d'authentification
3. `types/index.ts` — tous les types partagés
4. `app/api/` — tous les endpoints API

## Règles Non Négociables du Projet

- [règle de code spécifique]
- [convention de nommage]
- [pattern architectural choisi]

## Ce Qui Ne Marche Pas Encore

- [ ] [feature non terminée 1]
- [ ] [feature non terminée 2]

## Reprendre Maintenant

> "Continue le développement. Commence par [ACTION PRÉCISE]."
```

---

## Règles de Densité Maximale

### Code

- **Pas de boilerplate commenté** — si on commente c'est pour le WHY, jamais le WHAT
- **Grouper les fichiers liés** dans le même bloc de génération
- **Marquer [INCHANGÉ]** plutôt que de régénérer les fichiers non modifiés
- **Templates paramétrés** pour les structures répétitives (CRUD controllers)

### Contexte

- **Résumer** les échanges passés en 3 lignes plutôt que les relire
- **Indexer** les décisions ("ADR-003 : PostgreSQL") plutôt que les ré-expliquer
- **Forward reference** : "Voir Checkpoint Sprint 2 pour les détails de l'auth"

### Régénération Intelligente

Avant de réécrire un fichier, se demander :

1. Le fichier a-t-il besoin de changements ? Si non → `[SKIP - déjà fait et validé ✅]`
2. Le changement est-il partiel ? Si oui → str_replace ciblé, pas de réécriture complète
3. Le pattern est-il répétitif ? Si oui → générer le pattern + indiquer les N variantes

---

## Signaux d'Alerte Contexte

🔴 **CRITIQUE** : "Je dois générer un Handoff Document maintenant car je sens que le contexte approche sa limite"
🟡 **ATTENTION** : "Je résume les décisions passées avant de continuer pour rester cohérent"
🟢 **NOMINAL** : "Budget contexte suffisant, on continue"
