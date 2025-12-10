# PM - Gestion de Projets Agile

<div align="center">

![Logo](https://img.shields.io/badge/PM-Gestion_de_Projets-4f46e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0yMiAxOUgybS0yIDBoNGw0LTEwIDQgNSA0LTkgNiAxNHoiLz48L3N2Zz4=)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Plateforme complète de gestion de projets Agile avec support Scrum, Kanban et gestion budgétaire en FCFA**

[Démarrage Rapide](#-démarrage-rapide) •
[Fonctionnalités](#-fonctionnalités) •
[Documentation](#-documentation) •
[API](#-api-reference)

</div>

---

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** 18+ ([télécharger](https://nodejs.org/))
- **MongoDB** 6+ ([télécharger](https://www.mongodb.com/try/download/community))
- **Yarn** (recommandé) : `npm install -g yarn`

### Installation en 5 minutes

```bash
# 1️⃣ Cloner le repository
git clone https://github.com/votre-username/pm-gestion-projets.git
cd pm-gestion-projets

# 2️⃣ Installer les dépendances
yarn install

# 3️⃣ Configurer l'environnement
cp .env.example .env
# Éditez .env avec vos paramètres (voir section Configuration)

# 4️⃣ Lancer MongoDB (si pas déjà en cours)
mongod --dbpath /chemin/vers/data

# 5️⃣ Démarrer l'application
yarn dev
```

### Premier Lancement

1. Ouvrez **http://localhost:3000**
2. Vous serez redirigé vers `/first-admin`
3. Créez le compte **Super Administrateur** :
   - Nom complet
   - Email
   - Mot de passe (min. 8 caractères avec chiffres)
4. Connectez-vous et commencez à utiliser l'application !

---

## ✨ Fonctionnalités

### Modules Principaux

| Module | Description | Statut |
|--------|-------------|--------|
| 🏠 **Dashboard** | Vue d'ensemble, stats, accès rapide | ✅ 100% |
| 📁 **Projets** | CRUD, templates, progression | ✅ 100% |
| 📋 **Kanban** | Drag & drop, colonnes, filtres | ✅ 100% |
| 📚 **Backlog** | Epic → Story → Task, story points | ✅ 100% |
| 🏃 **Sprints** | Planification, démarrage, clôture | ✅ 100% |
| 📊 **Roadmap** | Gantt, timeline, zoom | ✅ 100% |
| ✅ **Tâches** | CRUD, priorités, assignation | ✅ 100% |
| 📂 **Fichiers** | Upload, dossiers, preview | ✅ 100% |
| 💬 **Commentaires** | @mentions, activité | ✅ 100% |
| ⏱️ **Timesheets** | Saisie temps, historique | ✅ 100% |
| 💰 **Budget** | FCFA, dépenses, alertes | ✅ 100% |
| 📈 **Rapports** | PDF, Excel, CSV | ✅ 100% |
| 🔔 **Notifications** | In-app, filtres | ✅ 100% |
| 🛡️ **Rôles** | 8 rôles, 22 permissions | ✅ 100% |
| 👥 **Utilisateurs** | CRUD, statuts | ✅ 100% |
| 📝 **Templates** | Modèles projets | ✅ 100% |
| 📋 **Livrables** | Types, workflows | ✅ 100% |
| ☁️ **SharePoint** | Config Azure AD | ✅ UI prête |
| ⚙️ **Paramètres** | Général, sécurité, apparence | ✅ 100% |
| 🔧 **Maintenance** | Mode maintenance | ✅ 100% |

### Rôles et Permissions

**8 Rôles prédéfinis :**
- Super Admin • Administrateur • Chef de Projet • Responsable Équipe
- Développeur Senior • Développeur • Testeur QA • Observateur

**22 Permissions atomiques** configurables via une matrice visuelle.

---

## 💻 Installation Détaillée

### Option 1 : Développement Local

```bash
# Cloner
git clone https://github.com/votre-username/pm-gestion-projets.git
cd pm-gestion-projets

# Installer
yarn install

# Configurer
cp .env.example .env
nano .env  # ou code .env

# Lancer en mode dev (hot reload)
yarn dev
```

### Option 2 : Production

```bash
# Build
yarn build

# Lancer en production
yarn start
```

### Option 3 : Docker (bientôt)

```bash
docker-compose up -d
```

---

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine :

```env
# 🗄️ BASE DE DONNÉES (OBLIGATOIRE)
MONGO_URL=mongodb://localhost:27017/pm_gestion

# 🌐 APPLICATION (OBLIGATOIRE)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 🔐 SÉCURITÉ (OBLIGATOIRE - CHANGEZ CETTE VALEUR !)
# Générez avec : openssl rand -base64 32
JWT_SECRET=votre-secret-jwt-super-securise

# ☁️ SHAREPOINT (OPTIONNEL)
SHAREPOINT_ENABLED=false
SHAREPOINT_TENANT_ID=
SHAREPOINT_CLIENT_ID=
SHAREPOINT_CLIENT_SECRET=
SHAREPOINT_SITE_ID=
```

### Configuration MongoDB

**Local :**
```bash
# Installer MongoDB Community
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb
sudo systemctl start mongodb

# Windows
# Téléchargez depuis mongodb.com et installez
```

**MongoDB Atlas (Cloud) :**
1. Créez un compte sur [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Créez un cluster gratuit
3. Copiez l'URL de connexion dans `.env`

---

## 📖 Guide d'Utilisation

### Première Connexion

1. **Créer l'administrateur** : `/first-admin`
2. **Se connecter** : `/login`
3. **Explorer le dashboard** : `/dashboard`

### Créer un Projet

1. Menu **Projets** → **+ Nouveau Projet**
2. Choisissez un template ou "Projet Vierge"
3. Remplissez : nom, description, dates, responsable
4. Cliquez **Créer**

### Utiliser le Kanban

1. Menu **Kanban** → Sélectionnez un projet
2. **Glissez-déposez** les tâches entre colonnes
3. **+ Tâche** pour créer rapidement

### Gérer le Budget

1. Menu **Budget** → Sélectionnez un projet
2. Cliquez sur **Budget Total** pour modifier
3. **+ Ajouter une dépense** pour enregistrer
4. Suivez les alertes (>80% orange, >100% rouge)

### Générer des Rapports

1. Menu **Rapports**
2. Choisissez le type et le projet
3. Cliquez **PDF**, **Excel** ou **CSV**

### Administrer les Rôles

1. Menu **Admin** → **Rôles & Permissions**
2. Cliquez sur un rôle pour voir/modifier
3. **+ Nouveau Rôle** pour créer un rôle personnalisé
4. Cochez les 22 permissions souhaitées

---

## 📚 API Reference

### Authentification

Toutes les routes (sauf `/api/check` et `/api/auth/*`) nécessitent un token JWT :

```bash
curl -H "Authorization: Bearer VOTRE_TOKEN" http://localhost:3000/api/users
```

### Endpoints Principaux

<details>
<summary><strong>Authentification</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/first-admin` | Créer le premier admin |
| `POST` | `/api/auth/login` | Connexion |
| `POST` | `/api/auth/first-login-reset` | Reset mot de passe |
| `GET` | `/api/auth/me` | Profil utilisateur |

</details>

<details>
<summary><strong>Projets</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/projects` | Liste des projets |
| `POST` | `/api/projects` | Créer un projet |
| `GET` | `/api/projects/:id` | Détail projet |
| `PUT` | `/api/projects/:id` | Modifier projet |
| `DELETE` | `/api/projects/:id` | Supprimer projet |

</details>

<details>
<summary><strong>Tâches</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/tasks` | Liste des tâches |
| `POST` | `/api/tasks` | Créer une tâche |
| `PUT` | `/api/tasks/:id` | Modifier tâche |
| `PUT` | `/api/tasks/:id/move` | Déplacer (Kanban) |
| `DELETE` | `/api/tasks/:id` | Supprimer tâche |

</details>

<details>
<summary><strong>Sprints</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/sprints` | Liste des sprints |
| `POST` | `/api/sprints` | Créer un sprint |
| `PUT` | `/api/sprints/:id/start` | Démarrer sprint |
| `PUT` | `/api/sprints/:id/complete` | Terminer sprint |
| `DELETE` | `/api/sprints/:id` | Supprimer sprint |

</details>

<details>
<summary><strong>Utilisateurs & Rôles</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/users` | Liste utilisateurs |
| `POST` | `/api/users` | Créer utilisateur |
| `PUT` | `/api/users/:id` | Modifier utilisateur |
| `GET` | `/api/roles` | Liste rôles |
| `POST` | `/api/roles` | Créer rôle |
| `PUT` | `/api/roles/:id` | Modifier rôle |
| `DELETE` | `/api/roles/:id` | Supprimer rôle |

</details>

<details>
<summary><strong>Fichiers</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/files` | Liste fichiers |
| `POST` | `/api/files/upload` | Upload fichier |
| `POST` | `/api/files/folder` | Créer dossier |
| `GET` | `/api/files/:id/download` | Télécharger |
| `DELETE` | `/api/files/:id` | Supprimer |

</details>

<details>
<summary><strong>Paramètres</strong></summary>

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/settings` | Paramètres système |
| `PUT` | `/api/settings` | Modifier paramètres |
| `GET` | `/api/settings/maintenance` | État maintenance |
| `PUT` | `/api/settings/maintenance` | Toggle maintenance |

</details>

---

## 🏗️ Architecture

```
pm-gestion-projets/
├── app/                          # Next.js App Router
│   ├── api/[[...path]]/          # API Backend (70+ routes)
│   ├── dashboard/                # 17 pages frontend
│   │   ├── admin/                # Administration (4 pages)
│   │   ├── kanban/
│   │   ├── backlog/
│   │   ├── sprints/
│   │   └── ...
│   ├── login/
│   ├── first-admin/
│   └── first-login-reset/
├── components/                   # Composants React
│   ├── ui/                       # shadcn/ui
│   └── kanban/                   # Composants Kanban
├── models/                       # 14 modèles Mongoose
├── lib/                          # Utilitaires
├── public/                       # Assets statiques
└── .env                          # Configuration
```

### Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| **Backend** | Next.js API Routes, JWT |
| **Base de données** | MongoDB, Mongoose |
| **UI/UX** | Lucide Icons, Recharts, @dnd-kit |
| **Export** | jsPDF, xlsx, papaparse |

---

## 🧪 Tests

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3000/api/check
# Réponse attendue: {"message":"PM - Gestion de Projets API","hasAdmin":false,"needsFirstAdmin":true}

# Tester la création du premier admin
curl -X POST http://localhost:3000/api/auth/first-admin \
  -H "Content-Type: application/json" \
  -d '{"nom_complet":"Admin Test","email":"admin@test.com","password":"Password123!","password_confirm":"Password123!"}'
```

---

## 🛠️ Scripts Disponibles

```bash
yarn dev          # Développement avec hot reload
yarn build        # Build de production
yarn start        # Lancer en production
yarn lint         # Vérifier le code
```

---

## 🤝 Contribution

1. Fork le projet
2. Créez une branche : `git checkout -b feature/ma-feature`
3. Committez : `git commit -m 'Ajout ma feature'`
4. Push : `git push origin feature/ma-feature`
5. Ouvrez une Pull Request

---

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

---

## 📞 Support

- 🐛 **Bugs** : [GitHub Issues](https://github.com/votre-username/pm-gestion-projets/issues)
- 💬 **Questions** : [Discussions](https://github.com/votre-username/pm-gestion-projets/discussions)

---

<div align="center">

**Fait avec ❤️ pour les équipes Agile**

⭐ Star ce repo si vous l'aimez !

</div>
