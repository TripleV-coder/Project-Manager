'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour gérer les notifications push côté client
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier le support des notifications push
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        // Vérifier si déjà abonné
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();

          if (existingSubscription) {
            setSubscription(existingSubscription);
            setIsSubscribed(true);
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      }

      setLoading(false);
    };

    checkSupport();
  }, []);

  // Enregistrer le Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      setError(err.message);
      return null;
    }
  }, [isSupported]);

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications not supported');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Demander la permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Permission denied');
        setLoading(false);
        return null;
      }

      // Enregistrer le SW si nécessaire
      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await registerServiceWorker();
      }

      if (!registration) {
        throw new Error('Service Worker not available');
      }

      // Obtenir la clé VAPID publique
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/push/vapid-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to get VAPID key');
      }

      const { publicKey } = await response.json();

      if (!publicKey) {
        throw new Error('VAPID key not configured');
      }

      // Convertir la clé
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // S'abonner
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Envoyer l'abonnement au serveur
      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pushSubscription.toJSON())
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription');
      }

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      setLoading(false);

      return pushSubscription;
    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [isSupported, registerServiceWorker]);

  // Se désabonner des notifications push
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    setLoading(true);
    setError(null);

    try {
      // Supprimer l'abonnement du serveur
      const token = localStorage.getItem('pm_token');
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      // Se désabonner localement
      await subscription.unsubscribe();

      setSubscription(null);
      setIsSubscribed(false);
      setLoading(false);

      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [subscription]);

  return {
    isSupported,
    isSubscribed,
    subscription,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    registerServiceWorker
  };
}

// Utilitaire pour convertir la clé VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePushNotifications;
