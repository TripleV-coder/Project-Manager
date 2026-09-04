/**
 * Push Notification Service
 * Service de notifications push pour le navigateur
 * Utilise l'API Web Push et Service Workers
 */

// VAPID keys doivent être générés et stockés dans .env
// Générer avec: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@pm-gestion.com';

/**
 * Vérifier si les notifications push sont configurées
 */
export const isPushConfigured = () => {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
};

/**
 * Obtenir la clé publique VAPID pour le client
 */
export const getVapidPublicKey = () => {
  return VAPID_PUBLIC_KEY;
};

/**
 * Convertir la clé VAPID en Uint8Array pour le client
 */
export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Envoyer une notification push (côté serveur)
 * @param {Object} subscription - Subscription push du client
 * @param {Object} payload - Contenu de la notification
 */
export const sendPushNotification = async (subscription, payload) => {
  if (!isPushConfigured()) {
    console.warn('Push notifications not configured');
    return { success: false, error: 'Push not configured' };
  }

  try {
    // Dynamic import pour éviter les erreurs côté client
    const webpush = await import('web-push');

    webpush.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const result = await webpush.default.sendNotification(subscription, JSON.stringify(payload));

    return { success: true, result };
  } catch (error) {
    console.error('Push notification error:', error);

    // Si la subscription est expirée ou invalide
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, error: 'subscription_expired', shouldRemove: true };
    }

    return { success: false, error: error.message };
  }
};

/**
 * Types de notifications push
 */
export const pushNotificationTypes = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  COMMENT_ADDED: 'comment_added',
  MENTION: 'mention',
  SPRINT_STARTED: 'sprint_started',
  SPRINT_ENDED: 'sprint_ended',
  DEADLINE_REMINDER: 'deadline_reminder',
  BUDGET_ALERT: 'budget_alert',
};

/**
 * Créer le payload de notification
 * @param {string} type - Type de notification
 * @param {Object} data - Données de la notification
 */
export const createNotificationPayload = (type, data) => {
  const basePayload = {
    timestamp: Date.now(),
    type,
    data,
  };

  switch (type) {
    case pushNotificationTypes.TASK_ASSIGNED:
      return {
        ...basePayload,
        title: 'Nouvelle tâche assignée',
        body: `Vous avez été assigné à la tâche "${data.taskTitle}" dans le projet ${data.projectName}.`,
        icon: '/icons/task-icon.png',
        badge: '/icons/badge.png',
        tag: `task-${data.taskId}`,
        actions: [
          { action: 'view', title: 'Voir les détails' },
          { action: 'dismiss', title: 'Plus tard' },
        ],
        data: {
          url: `/dashboard/tasks?id=${data.taskId}`,
        },
      };

    case pushNotificationTypes.COMMENT_ADDED:
      return {
        ...basePayload,
        title: 'On parle de votre travail !',
        body: `${data.authorName} a laissé un petit mot : "${data.preview}"`,
        icon: '/icons/comment-icon.png',
        badge: '/icons/badge.png',
        tag: `comment-${data.commentId}`,
        actions: [
          { action: 'view', title: 'Lire le message' },
          { action: 'reply', title: 'Répondre' },
        ],
        data: {
          url: `/dashboard/comments?id=${data.commentId}`,
        },
      };

    case pushNotificationTypes.MENTION:
      return {
        ...basePayload,
        title: "Quelqu'un vous appelle !",
        body: `${data.authorName} vous a mentionné dans ${data.context}. On a besoin de votre expertise !`,
        icon: '/icons/mention-icon.png',
        badge: '/icons/badge.png',
        tag: `mention-${data.id}`,
        requireInteraction: true,
        data: {
          url: data.url,
        },
      };

    case pushNotificationTypes.SPRINT_STARTED:
      return {
        ...basePayload,
        title: "C'est parti pour un nouveau Sprint !",
        body: `Le sprint "${data.sprintName}" vient de commencer dans ${data.projectName}. On y va ?`,
        icon: '/icons/sprint-icon.png',
        badge: '/icons/badge.png',
        tag: `sprint-${data.sprintId}`,
        data: {
          url: `/dashboard/sprints`,
        },
      };

    case pushNotificationTypes.DEADLINE_REMINDER:
      return {
        ...basePayload,
        title: 'Petit rappel amical',
        body: `L'échéance pour "${data.taskTitle}" approche à grands pas (dans ${data.daysRemaining} jour(s)). Vous avez ça en main !`,
        icon: '/icons/warning-icon.png',
        badge: '/icons/badge.png',
        tag: `deadline-${data.taskId}`,
        requireInteraction: true,
        actions: [{ action: 'view', title: 'Ouvrir la tâche' }],
        data: {
          url: `/dashboard/tasks?id=${data.taskId}`,
        },
      };

    case pushNotificationTypes.BUDGET_ALERT:
      return {
        ...basePayload,
        title: 'Point vigilance budget',
        body: `Attention, ${data.percentage}% du budget pour "${data.projectName}" a déjà été utilisé. Un petit coup d'œil s'impose.`,
        icon: '/icons/budget-icon.png',
        badge: '/icons/badge.png',
        tag: `budget-${data.projectId}`,
        requireInteraction: true,
        data: {
          url: `/dashboard/budget?project=${data.projectId}`,
        },
      };

    default:
      return {
        ...basePayload,
        title: data.title || 'Notification',
        body: data.body || '',
        icon: '/icons/default-icon.png',
        badge: '/icons/badge.png',
      };
  }
};

/**
 * Service Worker pour gérer les notifications push (code client)
 * À mettre dans public/sw.js
 */
export const serviceWorkerCode = `
// Service Worker pour les notifications push
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge.png',
      tag: data.tag,
      data: data.data,
      actions: data.actions,
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Si une fenêtre est déjà ouverte, la focus
        for (let client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
`;

export default {
  isPushConfigured,
  getVapidPublicKey,
  urlBase64ToUint8Array,
  sendPushNotification,
  pushNotificationTypes,
  createNotificationPayload,
  serviceWorkerCode,
};
