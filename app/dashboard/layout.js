'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  LogOut,
  Menu,
  X,
  Settings,
  ChevronDown,
  ChevronRight,
  Bell,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useConfirmation } from '@/hooks/useConfirmation';
import { getAvailableMenus } from '@/lib/menuConfig';
import { usePreferences } from '@/contexts/PreferencesContext';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarCompact } = usePreferences();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  useConfirmation(); // Initialize confirmation hook

  // Synchroniser sidebarOpen avec la préférence sidebarCompact
  useEffect(() => {
    setSidebarOpen(!sidebarCompact);
  }, [sidebarCompact]);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Load user with timeout
      const userResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      });

      if (!userResponse.ok) {
        localStorage.removeItem('pm_token');
        router.push('/login');
        return;
      }

      let userData = await userResponse.json();

      // Vérifier le mode maintenance
      try {
        const maintenanceResponse = await fetch('/api/settings/maintenance', {
          signal: AbortSignal.timeout(5000)
        });
        if (maintenanceResponse.ok) {
          const maintenanceData = await maintenanceResponse.json();
          if (maintenanceData.data?.enabled && !userData.role?.permissions?.adminConfig) {
            // Mode maintenance actif et utilisateur non-admin
            router.push('/maintenance');
            return;
          }
        }
      } catch (e) {
        // En cas d'erreur, continuer normalement
        console.error('Erreur vérification maintenance:', e);
      }

      // Auto-migrate Administrateur to Super Administrateur if needed
      if (userData.role?.nom === 'Administrateur') {
        try {
          const migrateRes = await fetch('/api/migrate-admin-role', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (migrateRes.ok) {
            const migrateData = await migrateRes.json();
            userData = {
              ...userData,
              role: migrateData.user.role
            };
            console.log('[OK] Admin role migrated to Super Administrateur');
          }
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }

      setUser(userData);
      setLoading(false);

      // Load notifications in background (non-blocking)
      fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.notifications) {
            setUnreadNotifications(data.notifications.filter(n => !n.lu).length);
          }
        })
        .catch(() => {
          // Silently handle notification fetch errors
        });
    } catch (error) {
      console.error('Layout error:', error);
      if (error.name !== 'AbortError') {
        setLoading(false);
        setUser(null);
      }
    }
  }, [router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Écouter les mises à jour du compteur de notifications
  useEffect(() => {
    const handleNotificationsUpdate = (event) => {
      if (event.detail && typeof event.detail.unreadCount === 'number') {
        setUnreadNotifications(event.detail.unreadCount);
      }
    };

    window.addEventListener('notifications-updated', handleNotificationsUpdate);
    return () => {
      window.removeEventListener('notifications-updated', handleNotificationsUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    toast.success('Déconnexion réussie');
    router.push('/login');
  };

  // Obtenir les menus filtrés selon les permissions de l'utilisateur
  // Ceci utilise les permissions système. Les pages project-specific
  // doivent vérifier les permissions fusionnées (système + projet)
  const availableMenus = user ? getAvailableMenus(user) : {
    mainMenuItems: [],
    adminMenuItems: [],
    notificationsMenu: null
  };

  const mainMenuItems = availableMenus.mainMenuItems;
  const adminMenuItems = availableMenus.adminMenuItems;
  const notificationsMenu = availableMenus.notificationsMenu;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header Mobile */}
          <div className="h-16 flex items-center justify-between px-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">PM Gestion</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 dark:text-gray-300" />
            </button>
          </div>

          {/* Menu Mobile */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {mainMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  pathname === item.href
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {/* Notifications */}
            {notificationsMenu && (
              <Link
                href={notificationsMenu.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  pathname === notificationsMenu.href
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <div className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </div>
                <span className="font-medium">{notificationsMenu.label}</span>
              </Link>
            )}

            {/* Section Admin */}
            {adminMenuItems.length > 0 && (
              <div className="pt-4 mt-4 border-t dark:border-gray-700">
                <p className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase">Administration</p>
                {adminMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      pathname === item.href
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* User Mobile */}
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold">
                  {user?.nom_complet?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm dark:text-white">{user?.nom_complet}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role?.nom}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full text-red-600 dark:text-red-400 dark:border-gray-600" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Sidebar Desktop */}
      <aside className={`hidden lg:block fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-all duration-300 z-30 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b dark:border-gray-700">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 dark:text-white">PM Gestion</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Projets Agile</p>
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Menu Desktop */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {mainMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  pathname === item.href
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            ))}

            {/* Notifications */}
            {notificationsMenu && (
              <Link
                href={notificationsMenu.href}
                title={notificationsMenu.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  pathname === notificationsMenu.href
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </div>
                {sidebarOpen && <span className="font-medium text-sm">{notificationsMenu.label}</span>}
              </Link>
            )}

            {/* Section Admin */}
            {adminMenuItems.length > 0 && (
              <div className="pt-4 mt-4 border-t dark:border-gray-700">
                {sidebarOpen && (
                  <p className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase">Administration</p>
                )}

                {sidebarOpen ? (
                  <>
                    <button
                      onClick={() => setAdminOpen(!adminOpen)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${
                        pathname.includes('/dashboard/admin') || pathname === '/dashboard/users'
                          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5" />
                        <span className="font-medium text-sm">Admin</span>
                      </div>
                      {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {adminOpen && (
                      <div className="mt-1 ml-2 space-y-1">
                        {adminMenuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                              pathname === item.href
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    {adminMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`flex items-center justify-center p-3 rounded-xl transition-all ${
                          pathname === item.href
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* User Desktop */}
          <div className="p-3 border-t dark:border-gray-700">
            {sidebarOpen ? (
              <div className="space-y-3">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                >
                  <Avatar>
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold">
                      {user?.nom_complet?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate dark:text-white">{user?.nom_complet}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role?.nom}</p>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:border-gray-600"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/dashboard/profile"
                  className="flex justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                      {user?.nom_complet?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            {/* Desktop toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:block">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {pathname === '/dashboard' ? 'Tableau de bord' :
                 pathname.includes('/admin/roles') ? 'Rôles & Permissions' :
                 pathname.includes('/admin/sharepoint') ? 'Configuration SharePoint' :
                 pathname.includes('/admin/templates') ? 'Templates Projets' :
                 pathname.split('/').pop()?.charAt(0).toUpperCase() + pathname.split('/').pop()?.slice(1) || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
            <Link
              href="/dashboard/profile"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hidden sm:flex"
            >
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
