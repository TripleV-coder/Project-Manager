# 🚀 Guide de Lancement - PM Gestion de Projets

## Option 1️⃣ : Lancement automatisé (Recommandé)

### Windows
```bash
npm run start:local
```
Ou en double-cliquant sur: `scripts/start-dev.bat`

### macOS / Linux
```bash
npm run start:local
```
Ou en ligne de commande:
```bash
bash scripts/start-dev.sh
```

Ce script fait **tout automatiquement**:
- ✅ Vérifie MongoDB
- ✅ Crée les répertoires de données
- ✅ Démarre MongoDB
- ✅ Configure `.env`
- ✅ Installe les dépendances
- ✅ Démarre l'application

---

## Option 2️⃣ : Lancement manuel (Pas à pas)

### **Étape 1: Installer les dépendances**
```bash
npm install
```

### **Étape 2: Vérifier MongoDB**
Assurez-vous que MongoDB est installé:
```bash
mongod --version
```

**Installer MongoDB:**
- **macOS**: `brew install mongodb-community`
- **Linux (Ubuntu)**: `sudo apt-get install -y mongodb`
- **Windows**: https://www.mongodb.com/try/download/community

### **Étape 3: Créer le répertoire de données**
```bash
mkdir -p data/db
```

### **Étape 4: Démarrer MongoDB** (dans un terminal séparé)

**macOS / Linux:**
```bash
mongod --dbpath ./data/db
```

**Windows:**
```bash
mongod --dbpath "data\db"
```

### **Étape 5: Configurer `.env`**
Créer fichier `.env` à la racine avec:
```env
MONGO_URL=mongodb://localhost:27017/project-manager
JWT_SECRET=your-super-secret-key-min-32-chars-long-change-in-prod
NEXT_PUBLIC_BUILDER_API_KEY=995e44ebc86544ad9c736e6e81532e68
NODE_ENV=development
```

### **Étape 6: Lancer l'application**
```bash
npm run dev
```

Ouvrir: **http://localhost:3000**

---

## ✨ Première utilisation

1. L'app redirige vers `/first-admin`
2. Créer le compte administrateur:
   - **Nom**: Votre nom
   - **Email**: admin@example.com
   - **Mot de passe**: Min 8 caractères + chiffres + symboles
3. Cliquer **"Créer le compte administrateur"**
4. Se connecter

---

## 🛑 Arrêter l'application

**Appuyer sur `Ctrl+C`** dans le terminal

Le script arrête automatiquement:
- ✓ L'application Next.js
- ✓ MongoDB

---

## 📋 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run start:local` | **Lancement automatisé complet** |
| `npm run dev` | Lancer juste l'app (MongoDB doit être démarré) |
| `npm run build` | Générer la version production |
| `npm start` | Lancer la version production |
| `npm run lint` | Vérifier la qualité du code |
| `npm run lint:fix` | Corriger automatiquement |

---

## 🐛 Dépannage

### MongoDB ne démarre pas
```bash
# Vérifier si le port 27017 est utilisé
# macOS/Linux:
lsof -i :27017

# Windows:
netstat -ano | findstr :27017

# Tuer le processus
# macOS/Linux:
pkill mongod

# Windows:
taskkill /IM mongod.exe /F
```

### Erreur: "MONGO_URL not defined"
- Vérifier que `.env` existe
- Relancer l'app: `npm run dev`

### Port 3000 déjà utilisé
```bash
# Utiliser un port différent
PORT=3001 npm run dev
```

### Effacer la base de données
```bash
rm -rf data/db
mkdir -p data/db
```

---

## 📝 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | Connexion MongoDB |
| `JWT_SECRET` | Clé pour signer les tokens |
| `NEXT_PUBLIC_BUILDER_API_KEY` | Clé Builder.io (optionnel) |
| `NODE_ENV` | `development` ou `production` |

---

## 🚀 Prêt à déployer?

Voir: **DEPLOYMENT.md** (à créer)

Pour plus d'aide: https://www.builder.io/c/docs/projects
