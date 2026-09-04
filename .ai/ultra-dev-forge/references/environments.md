# Environment-Specific Guide — Ultra Dev Forge

## Détection de l'Environnement

Au lancement du skill, détecter l'environnement via ces indices :

- Présence d'outils `bash` + filesystem persistant → **Claude Code**
- System prompt contient "cursor" → **Cursor**
- System prompt contient "windsurf" ou "codeium" → **Windsurf**
- System prompt contient "cline" → **Cline**
- System prompt contient "continue" → **Continue**
- Artifacts disponibles + pas de filesystem → **Claude.ai web**
- Aucun outil de fichier → **API ou chat basique**

---

## Claude.ai (Web / Mobile)

### Capacités

- ✅ Artifacts React/HTML avec preview live
- ✅ Artifacts code (tous langages)
- ✅ Persistent storage dans les artifacts
- ✅ Web search
- ✅ Image search
- ⚠️ Pas de filesystem persistant entre sessions
- ⚠️ Pas d'exécution bash persistante

### Comportement Adapté

```
LIVRAISON DU CODE :
- Utiliser les artifacts pour tout le code > 30 lignes
- Grouper les fichiers liés dans un seul artifact quand possible
- Pour les projets multi-fichiers : générer un artifact "bundle"
  ou fournir des instructions d'installation claires

CONTEXT MANAGEMENT :
- Générer des Checkpoint Documents fréquemment
- À ~150k tokens : proposer un Handoff Document et nouvelle session
- Utiliser les titres des artifacts comme index

PREVIEW :
- Toujours fournir un artifact React preview quand applicable
- Démontrer l'UI dans l'artifact avant le code de production
```

### Template de Livraison Claude.ai

```
1. Artifact "Design Preview" → Composant React avec fausses données
2. Artifact "Fichier 1" → Code de production réel
3. Artifact "Fichier 2" → Code de production réel
4. [...]
5. Instructions d'installation en markdown
```

---

## Claude Code (CLI Agentic)

### Capacités

- ✅ Filesystem complet et persistant
- ✅ Exécution bash réelle
- ✅ Git operations
- ✅ Package managers (npm, pip, cargo...)
- ✅ Linting / testing en temps réel
- ✅ Éditeur de fichiers (create_file, str_replace)
- ✅ Lire les fichiers existants du projet

### Comportement Adapté

```
INIT PROJET :
  mkdir -p [project] && cd [project]
  git init
  npm init -y (ou équivalent)

VÉRIFICATION QUALITÉ :
  Exécuter npm run lint après chaque fichier
  Exécuter npm run typecheck après chaque module
  Exécuter npm run test:unit après chaque feature

CONTEXT MANAGEMENT :
  Maintenir CONTEXT.md à la racine
  Mettre à jour après chaque sprint
  git commit --message "checkpoint: sprint N" après chaque sprint

STRUCTURE :
  Créer les fichiers au bon emplacement dès le départ
  Ne jamais créer dans /tmp sans copier dans le projet
```

### Commandes Standards Claude Code

```bash
# Init TypeScript project
npm create t3-app@latest
# ou
npm create next-app@latest --typescript --tailwind --app

# Check & validation
npm run lint && npm run typecheck && npm test

# Base de données
npx prisma migrate dev --name [feature]
npx prisma studio  # Pour visualiser la DB

# Checkpoint git
git add -A && git commit -m "feat: [feature] - sprint [N]"
```

---

## Cursor

### Capacités

- ✅ Éditeur de fichiers dans le workspace
- ✅ `@codebase` pour référencer le code existant
- ✅ `@file` pour référencer un fichier spécifique
- ✅ `@web` pour la recherche web
- ✅ Inline editing avec Cmd+K
- ✅ Chat avec contexte du projet
- ⚠️ Contexte limité à la fenêtre glissante

### Comportement Adapté

```
RÉFÉRENCER LE CONTEXTE :
- Toujours mentionner @file quand on modifie un fichier existant
- Utiliser @codebase pour les questions transversales

ÉDITIONS :
- Faire des edits ciblés (str_replace) plutôt que réécriture complète
- Grouper les changements liés dans le même message

CONTEXT MANAGEMENT :
- Maintenir un fichier DEVLOG.md dans le projet
  (Cursor le lira automatiquement si ouvert dans l'IDE)
- Format court pour les décisions : date + decision + raison

NOUVEAU FICHIER :
- Indiquer le chemin exact et le contenu complet
- Cursor peut créer le fichier directement

RÈGLES .cursorrules :
- Proposer un fichier .cursorrules adapté au projet
  contenant les conventions, stack, et patterns choisis
```

### Template .cursorrules

```
You are a senior developer working on [Project Name].

## Stack
- Frontend: [stack]
- Backend: [stack]
- DB: [stack]

## Code Style
- TypeScript strict mode, no any
- [autres conventions]

## Patterns Used
- [pattern 1]
- [pattern 2]

## File Structure
[structure courte]

## Do Not
- [chose à éviter]
- [chose à éviter]
```

---

## Windsurf (Codeium)

### Capacités

- ✅ Cascade Agent (multi-step tasks)
- ✅ Éditeur de fichiers
- ✅ Terminal intégré
- ✅ Web search via Cascade
- ✅ Mémoire de contexte projet
- ✅ Multi-file editing simultané

### Comportement Adapté

```
AVANTAGE WINDSURF :
- Cascade peut exécuter des séquences de tâches longues
- Idéal pour le Development Loop complet
- Utiliser les tâches multi-étapes de Cascade pour les sprints complets

FORMAT DE DEMANDE OPTIMAL :
"Cascade : crée le module [X].
Étapes :
1. Créer le fichier [path]
2. Écrire le code [description]
3. Créer le test [description]
4. Lancer npm run test
5. Si échec : corriger et relancer"

WINDSURF MEMORIES :
- Windsurf peut sauvegarder des mémoires de projet
- Demander explicitement de sauvegarder les décisions ADR
- "Mémorise que la stack est [X] et que le pattern [Y] est utilisé"
```

---

## VS Code + GitHub Copilot / Continue / Cline

### Capacités Variables

- Cline : Proche de Claude Code, filesystem complet
- Continue : Contexte codebase, chat + inline
- GitHub Copilot : Inline + chat, contexte limité

### Comportement Adapté pour Cline

```
IDENTIQUE À CLAUDE CODE — voir section Claude Code
Cline utilise les mêmes outils (bash, file_write, etc.)
Adapter les chemins de fichiers au workspace actif
```

### Comportement Adapté pour Continue

```
CONTEXTUALISATION :
- Utiliser @codebase, @file, @folder pour le contexte
- Chat mode pour les questions architecturales
- Inline pour les completions et refactors

CONTEXT MANAGEMENT :
- Maintenir CONTEXT.md + .continue/context.yaml
```

---

## API Directe / Intégration Custom

### Comportement Adapté

```
LIVRAISON :
- Tout le code dans des blocs markdown formatés
- Instructions d'installation explicites et complètes
- Structure de répertoires clairement indiquée

FORMAT :
\`\`\`typescript
// path: src/components/Button.tsx
[code complet]
\`\`\`

CONTEXT MANAGEMENT :
- Inclure PROJECT_STATE dans le system prompt des appels suivants
- Générer et retourner le JSON d'état après chaque sprint
```

---

## Règle Universelle

**Peu importe l'environnement :**

1. La qualité du code est identique
2. Le processus (Phase 0 → Phase 8) est identique
3. Les scores d'évaluation sont identiques
4. Seul le _mode de livraison_ change
