'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import TablePagination from '@/components/ui/table-pagination';
import { useFormatters, useTranslation } from '@/contexts/AppSettingsContext';

export default function NotificationsPage() {
  const router = useRouter();
  const { formatDate } = useFormatters();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // API returns { success: true, data: [...] } or legacy format
      setNotifications(data.data || data.notifications || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('loadingError'));
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

      const updatedNotifications = notifications.map(n =>
        n._id === notificationId ? { ...n, lu: true } : n
      );
      setNotifications(updatedNotifications);
      toast.success(t('notificationMarkedAsRead'));

      // Émettre un événement pour mettre à jour le compteur dans le layout
      const newUnreadCount = updatedNotifications.filter(n => !n.lu).length;
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: newUnreadCount } }));
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
      toast.success(t('allNotificationsMarkedAsRead'));

      // Émettre un événement pour mettre à jour le compteur dans le layout
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: 0 } }));
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

      const deletedNotification = notifications.find(n => n._id === notificationId);
      const updatedNotifications = notifications.filter(n => n._id !== notificationId);
      setNotifications(updatedNotifications);
      toast.success(t('notificationDeleted'));

      // Si la notification supprimée était non lue, mettre à jour le compteur
      if (deletedNotification && !deletedNotification.lu) {
        const newUnreadCount = updatedNotifications.filter(n => !n.lu).length;
        window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: newUnreadCount } }));
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.lu;
    if (filter === 'read') return n.lu;
    return true;
  });

  // Pagination locale
  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  const unreadCount = notifications.filter(n => !n.lu).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t('notifications')}</h1>
          <p className="text-xs text-gray-500">
            {unreadCount > 0 ? `${unreadCount} ${t('unreadNotifications').toLowerCase()}` : t('noNewNotifications')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
            <Check className="w-4 h-4 mr-1" />
            {t('markAllAsRead')}
          </Button>
        )}
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-3 border-b bg-gray-50/50">
          <Tabs value={filter} onValueChange={(val) => { setFilter(val); setCurrentPage(1); }}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7 px-3">{t('allNotifications')} ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs h-7 px-3">{t('unreadNotifications')} ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read" className="text-xs h-7 px-3">{t('readNotifications')} ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedNotifications.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">{t('noNotifications')}</h3>
              <p className="text-xs text-gray-500">{t('youAreUpToDate')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 transition-colors ${
                    notification.lu ? 'bg-white' : 'bg-indigo-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{notification.titre}</span>
                        {!notification.lu && (
                          <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">{t('new')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(notification.created_at, { includeTime: true })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.lu && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title={t('markAsRead')}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(notification._id)}
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredNotifications.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
