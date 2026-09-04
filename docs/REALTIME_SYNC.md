# Real-time Synchronization with Socket.io

Cette documentation explique comment utiliser le système de synchronisation en temps réel avec Socket.io.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes                         │
│         (app/api/[[...path]]/route.js)                │
│              ↓                                          │
│    emit socket events via HTTP POST                    │
│              ↓                                          │
├─────────────────────────────────────────────────────────┤
│      Standalone Socket.io Server                       │
│       (scripts/socket-server.js)                       │
│  Port 4000 by default                                  │
│              ↓                                          │
│  Handles WebSocket/Polling connections                │
│  Filters events by RBAC permissions                    │
└─────────────────────────────────────────────────────────┘
         ↓
    ↙   ↓   ↘
  Client 1, Client 2, Client 3...
  (React App with Socket.io Client)
```

## Setup

### 1. Configuration des variables d'environnement

Ajouter à `.env.local`:

```env
# Socket.io server URL
SOCKET_SERVER_URL=http://localhost:4000

# Pour une autre machine
# SOCKET_SERVER_URL=http://socket-server.example.com:4000
```

### 2. Lancer le serveur Socket.io

**En développement (terminal séparé):**

```bash
npm run socket
```

**Ou avec concurrently (dans un seul terminal):**

```bash
npm install --save-dev concurrently
npm run dev:socket
```

Le serveur écoute sur le port 4000 par défaut. Pour changer:

```bash
SOCKET_PORT=5000 npm run socket
```

### 3. Déploiement

Pour la production, vous devez:

1. **Option A: Serveur Socket.io séparé**
   - Déployer `scripts/socket-server.js` sur un serveur Node.js
   - Exposer le port 4000 (ou custom) publiquement
   - Configurer `SOCKET_SERVER_URL` pointant vers le serveur public

2. **Option B: Intégration dans le même serveur Next.js**
   - Utiliser une solution comme Vercel Socket.io ou
   - Utiliser un reverse proxy (nginx) pour router WebSocket

3. **Option C: Utiliser un service managé**
   - Supabase Realtime
   - Firebase Realtime Database
   - Pusher ou similaire

## Utilisation

### Dans les composants React

#### 1. Écouter les événements de tâche

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useTaskSync } from '@/hooks/useTaskSync';

export default function TasksPage({ projectId }) {
  const [tasks, setTasks] = useState([]);

  // Setup real-time synchronization
  useTaskSync(projectId, {
    onTaskCreated: (data) => {
      setTasks((prev) => [...prev, data.task]);
    },
    onTaskUpdated: (data) => {
      setTasks((prev) => prev.map((t) => (t._id === data.task._id ? data.task : t)));
    },
    onTaskDeleted: (data) => {
      setTasks((prev) => prev.filter((t) => t._id !== data.taskId));
    },
  });

  return (
    <div>
      {tasks.map((task) => (
        <div key={task._id}>{task.titre}</div>
      ))}
    </div>
  );
}
```

#### 2. Écouter les commentaires

```javascript
import { useCommentSync } from '@/hooks/useCommentSync';

export default function CommentsSection({ projectId }) {
  const [comments, setComments] = useState([]);

  useCommentSync(projectId, {
    onCommentCreated: (data) => {
      setComments((prev) => [...prev, data.comment]);
    },
    onCommentUpdated: (data) => {
      setComments((prev) => prev.map((c) => (c._id === data.comment._id ? data.comment : c)));
    },
    onCommentDeleted: (data) => {
      setComments((prev) => prev.filter((c) => c._id !== data.commentId));
    },
  });

  return (
    <div>
      {comments.map((comment) => (
        <div key={comment._id}>{comment.contenu}</div>
      ))}
    </div>
  );
}
```

#### 3. Écouter les notifications

```javascript
import { useNotificationSync } from '@/hooks/useNotificationSync';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useNotificationSync({
    onNotificationCreated: (data) => {
      setUnreadCount((prev) => prev + 1);
      showToast(data.notification.titre);
    },
  });

  return <Bell badge={unreadCount} />;
}
```

#### 4. Utiliser le hook `useSocket` directement

```javascript
import { useSocket } from '@/contexts/SocketContext';

export default function MyComponent() {
  const { on, off, emit, joinProject, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Listen for custom events
    const handler = (data) => console.log('Event:', data);
    on('my:custom:event', handler);

    return () => off('my:custom:event', handler);
  }, [isConnected, on, off]);

  return <div>Socket connecté: {isConnected ? '✓' : '✗'}</div>;
}
```

## Événements disponibles

### Tâches

- `task:created` - Tâche créée
- `task:updated` - Tâche modifiée
- `task:deleted` - Tâche supprimée
- `task:moved` - Tâche déplacée (Kanban)
- `task:assigned` - Tâche assignée

### Commentaires

- `comment:created` - Commentaire créé
- `comment:updated` - Commentaire modifié
- `comment:deleted` - Commentaire supprimé

### Notifications

- `notification:created` - Notification reçue
- `notification:read` - Notification marquée comme lue

### Projets

- `project:created` - Projet créé
- `project:updated` - Projet modifié
- `project:deleted` - Projet supprimé
- `project:members_changed` - Membres du projet changés

### Sprints

- `sprint:created` - Sprint créé
- `sprint:updated` - Sprint modifié
- `sprint:started` - Sprint démarré
- `sprint:completed` - Sprint terminé

### Présence utilisateur

- `user:online` - Utilisateur connecté
- `user:offline` - Utilisateur déconnecté
- `user:viewing` - Utilisateur consulte une page

## Filtrage par permissions

Les événements sont **automatiquement filtrés** par le serveur Socket.io selon les permissions et le rôle de l'utilisateur:

1. **Authentification**: Chaque client doit envoyer un token JWT valide
2. **Rôle et permissions**: Le serveur vérifie les permissions associées
3. **Accès au projet**: L'utilisateur ne voit que les événements des projets dont il est membre

**Exemple:**

- Un utilisateur avec permission `deplacerTaches: true` verra les événements `task:moved`
- Un utilisateur sans permission `modifierBudget: false` ne verra pas les événements `budget:updated`

## Émission d'événements depuis l'API

Les événements sont émis automatiquement après chaque action:

```javascript
// Dans app/api/[[...path]]/route.js

// Après création de tâche
await emitToProject(projectId, SOCKET_EVENTS.TASK_CREATED, {
  task: {
    /* données */
  },
  createdBy: {
    /* utilisateur */
  },
});

// Après modification
await emitToProject(projectId, SOCKET_EVENTS.TASK_UPDATED, {
  task: {
    /* données */
  },
  updatedBy: {
    /* utilisateur */
  },
});

// Notification personnelle
await emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_CREATED, {
  notification: {
    /* données */
  },
});

// Broadcast global
await emitToAll(SOCKET_EVENTS.PROJECT_CREATED, {
  project: {
    /* données */
  },
});
```

## Dépannage

### Le serveur Socket.io ne démarre pas

```bash
# Vérifier la variable d'environnement MONGO_URL
echo $MONGO_URL

# Lancer avec logs détaillés
NODE_DEBUG=* npm run socket
```

### Les événements ne sont pas reçus

```javascript
// Vérifier la connexion Socket
const { isConnected } = useSocket();
console.log('Socket connecté:', isConnected);

// Vérifier les logs du serveur Socket.io
// Terminal où vous avez lancé "npm run socket"
```

### Performance: trop d'événements

- Implémenter le debouncing côté client
- Limiter la fréquence d'émission
- Utiliser un système de queue pour les événements critiques

## Architecture de sécurité

✅ **Points forts:**

- Authentification JWT obligatoire
- Filtrage des événements par permissions RBAC
- Validation du membership du projet
- Logs d'audit de toutes les actions

⚠️ **À implémenter en production:**

- Rate limiting sur le serveur Socket.io
- Monitoring et alerting pour anomalies
- Chiffrement SSL/TLS pour les connexions
- Backup et disaster recovery

## Exemple complet: Liste de tâches avec sync temps réel

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useRouter } from 'next/navigation';

export default function KanbanBoard({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Charger les tâches initiales
  useEffect(() => {
    const fetchTasks = async () => {
      const token = localStorage.getItem('pm_token');
      const res = await fetch(`/api/tasks?projet_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(data.tasks || []);
      setLoading(false);
    };

    fetchTasks();
  }, [projectId]);

  // Setup real-time sync
  useTaskSync(projectId, {
    onTaskCreated: (data) => {
      console.log('📌 Nouvelle tâche:', data.task.titre);
      setTasks((prev) => [...prev, data.task]);
    },
    onTaskUpdated: (data) => {
      console.log('✏️  Tâche modifiée:', data.task.titre);
      setTasks((prev) => prev.map((t) => (t._id === data.task._id ? data.task : t)));
    },
    onTaskDeleted: (data) => {
      console.log('🗑️ Tâche supprimée');
      setTasks((prev) => prev.filter((t) => t._id !== data.taskId));
    },
  });

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      {['Backlog', 'À faire', 'En cours', 'Terminé'].map((column) => (
        <div key={column} className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-4">{column}</h3>
          {tasks
            .filter((t) => t.statut === column)
            .map((task) => (
              <div key={task._id} className="bg-white p-3 rounded mb-2">
                {task.titre}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
```

## Support

Pour de l'aide:

- Consultez les logs: `npm run socket` (terminal)
- Vérifiez les variables d'environnement
- Testez la connexion: vérifiez la console du navigateur (DevTools)
