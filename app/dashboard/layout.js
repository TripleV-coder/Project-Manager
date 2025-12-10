'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home,
  FolderKanban, 
  Layers, 
  ListTodo, 
  Calendar, 
  Users, 
  Clock, 
  Wallet, 
  MessageSquare, 
  Bell, 
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  CheckCircle2,
  Shield,
  ChevronDown,
  ChevronRight,
  Cloud,
  BarChart3,
  Files,
  FileText,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        localStorage.removeItem('pm_token');
        router.push('/login');
        return;
      }

      const userData = await response.json();
      console.log('User data:', userData);
      setUser(userData);
      setLoading(false);

      // Charger notifications
      try {
        const notifResponse = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (notifResponse.ok) {
          const notifData = await notifResponse.json();
          setUnreadNotifications((notifData.notifications || []).filter(n => !n.lu).length);
        }
      } catch (e) {
        console.log('Notifications error:', e);
      }
    } catch (error) {
      console.error('Erreur:', error);
      router.push('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pm_token');
    toast.success('Déconnexion réussie');
    router.push('/login');
  };

  // Vérifier les permissions - utiliser user.role (pas role_id)
  const hasPermission = (permKey) => {
    return user?.role?.permissions?.[permKey] === true;
  };

  const isAdmin = hasPermission('adminConfig');

  // Menu principal - tous les éléments visibles pour simplifier
  const mainMenuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: FolderKanban, label: 'Projets', href: '/dashboard/projects' },
    { icon: Layers, label: 'Kanban', href: '/dashboard/kanban' },
    { icon: ListTodo, label: 'Backlog', href: '/dashboard/backlog' },
    { icon: Calendar, label: 'Sprints', href: '/dashboard/sprints' },
    { icon: TrendingUp, label: 'Roadmap', href: '/dashboard/roadmap' },
    { icon: CheckCircle2, label: 'Tâches', href: '/dashboard/tasks' },
    { icon: Files, label: 'Fichiers', href: '/dashboard/files' },
    { icon: MessageSquare, label: 'Commentaires', href: '/dashboard/comments' },
    { icon: Clock, label: 'Timesheets', href: '/dashboard/timesheets' },
    { icon: Wallet, label: 'Budget', href: '/dashboard/budget' },
    { icon: BarChart3, label: 'Rapports', href: '/dashboard/reports' },
  ];

  // Sous-menu Administration
  const adminMenuItems = [
    { icon: Shield, label: 'Rôles & Permissions', href: '/dashboard/admin/roles' },
    { icon: Users, label: 'Utilisateurs', href: '/dashboard/users' },
    { icon: FileText, label: 'Templates Projets', href: '/dashboard/admin/templates' },
    { icon: Layers, label: 'Types Livrables', href: '/dashboard/admin/deliverable-types' },
    { icon: Cloud, label: 'SharePoint', href: '/dashboard/admin/sharepoint' },
    { icon: Settings, label: 'Paramètres', href: '/dashboard/admin' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header Mobile */}
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-gray-900">PM Gestion</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
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
                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {/* Notifications */}
            <Link
              href="/dashboard/notifications"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === '/dashboard/notifications'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
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
              <span className="font-medium">Notifications</span>
            </Link>

            {/* Section Admin */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t">
                <p className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase">Administration</p>
                {adminMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      pathname === item.href
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
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
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">
                  {user?.nom_complet?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user?.nom_complet}</p>
                <p className="text-xs text-gray-500">{user?.role?.nom}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full text-red-600" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Sidebar Desktop */}
      <aside className={`hidden lg:block fixed top-0 left-0 h-full bg-white border-r transition-all duration-300 z-30 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">PM Gestion</h1>
                  <p className="text-xs text-gray-500">Projets Agile</p>
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
                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            ))}

            {/* Notifications */}
            <Link
              href="/dashboard/notifications"
              title="Notifications"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === '/dashboard/notifications'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
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
              {sidebarOpen && <span className="font-medium text-sm">Notifications</span>}
            </Link>

            {/* Section Admin */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t">
                {sidebarOpen && (
                  <p className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase">Administration</p>
                )}
                
                {sidebarOpen ? (
                  <>
                    <button
                      onClick={() => setAdminOpen(!adminOpen)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${
                        pathname.includes('/dashboard/admin') || pathname === '/dashboard/users'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-700 hover:bg-indigo-50'
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
                                : 'text-gray-600 hover:bg-gray-100'
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
                            : 'text-gray-600 hover:bg-gray-100'
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
          <div className="p-3 border-t">
            {sidebarOpen ? (
              <div className="space-y-3">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  <Avatar>
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">
                      {user?.nom_complet?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user?.nom_complet}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.role?.nom}</p>
                  </div>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
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
                  className="flex justify-center p-2 rounded-lg hover:bg-gray-100"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">
                      {user?.nom_complet?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center p-2 rounded-lg hover:bg-red-50 text-red-600"
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
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {/* Desktop toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:block">
              <h2 className="font-semibold text-gray-900">
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
              className="relative p-2 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
            <Link
              href="/dashboard/profile"
              className="p-2 hover:bg-gray-100 rounded-lg hidden sm:flex"
            >
              <User className="w-5 h-5 text-gray-600" />
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
