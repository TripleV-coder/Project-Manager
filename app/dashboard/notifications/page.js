'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('pm_token');
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, lu: true } : n
      ));
      toast.success('Notification marquée comme lue');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(notifications.map(n => ({ ...n, lu: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const token = localStorage.getItem('pm_token');
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(notifications.filter(n => n._id !== notificationId));
      toast.success('Notification supprimée');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getNotificationIcon = (type) => {
    return <Bell className="w-5 h-5 text-indigo-600" />;
  };

  const getNotificationColor = (type) => {
    const colors = {
      'info': 'bg-blue-100 text-blue-800',
      'success': 'bg-green-100 text-green-800',
      'warning': 'bg-yellow-100 text-yellow-800',
      'error': 'bg-red-100 text-red-800'
    };
    return colors[type] || colors['info'];
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.lu;
    if (filter === 'read') return n.lu;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.lu).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Aucune nouvelle notification'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <Check className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Toutes ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Non lues ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Lues ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune notification</h3>
              <p className="text-gray-600">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, idx) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.lu ? 'bg-white' : 'bg-indigo-50 border-indigo-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{notification.titre}</span>
                        {!notification.lu && (
                          <Badge className="bg-indigo-600 text-white">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{new Date(notification.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!notification.lu && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(notification._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
