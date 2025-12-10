'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderKanban, 
  ListTodo, 
  Calendar, 
  Users, 
  FileText, 
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
  Layers,
  ChevronDown,
  ChevronRight,
  Cloud,
  BarChart3,
  Files,
  User,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Fermer le menu mobile lors d'un changement de page
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Ouvrir automatiquement le sous-menu admin si on est sur une page admin
    if (pathname.includes('/dashboard/admin')) {
      setAdminOpen(true);
    }
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
      setUser(userData);

      // Charger notifications
      try {
        const notifResponse = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const notifData = await notifResponse.json();
        setUnreadNotifications((notifData.notifications || []).filter(n => !n.lu).length);
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
    localStorage.removeItem('pm_user');
    toast.success('Déconnexion réussie');
    router.push('/login');
  };

  // Vérifier les permissions
  const hasPermission = (permKey) => {
    return user?.role_id?.permissions?.[permKey] === true;
  };

  const isAdmin = hasPermission('adminConfig');

  // Menu principal
  const mainMenuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', alwaysVisible: true },
    { icon: FolderKanban, label: 'Projets', href: '/dashboard/projects', alwaysVisible: true },
    { icon: Layers, label: 'Kanban', href: '/dashboard/kanban', permission: 'deplacerTaches' },
    { icon: ListTodo, label: 'Backlog', href: '/dashboard/backlog', permission: 'prioriserBacklog' },
    { icon: Calendar, label: 'Sprints', href: '/dashboard/sprints', permission: 'gererSprints' },
    { icon: TrendingUp, label: 'Roadmap', href: '/dashboard/roadmap', alwaysVisible: true },
    { icon: CheckCircle2, label: 'Tâches', href: '/dashboard/tasks', permission: 'gererTaches' },
    { icon: Files, label: 'Fichiers', href: '/dashboard/files', permission: 'gererFichiers' },
    { icon: MessageSquare, label: 'Commentaires', href: '/dashboard/comments', permission: 'commenter' },
    { icon: Clock, label: 'Timesheets', href: '/dashboard/timesheets', permission: 'saisirTemps' },
    { icon: Wallet, label: 'Budget', href: '/dashboard/budget', permission: 'voirBudget' },
    { icon: BarChart3, label: 'Rapports', href: '/dashboard/reports', permission: 'genererRapports' },
  ];

  // Sous-menu Administration
  const adminMenuItems = [
    { icon: Shield, label: 'Rôles & Permissions', href: '/dashboard/admin/roles' },
    { icon: Users, label: 'Utilisateurs', href: '/dashboard/users' },
    { icon: Layers, label: 'Templates Projets', href: '/dashboard/admin/templates' },
    { icon: FileText, label: 'Types de Livrables', href: '/dashboard/admin/deliverable-types' },
    { icon: Cloud, label: 'SharePoint', href: '/dashboard/admin/sharepoint' },
    { icon: Settings, label: 'Paramètres', href: '/dashboard/admin' },
  ];

  const isMenuVisible = (item) => {
    if (item.alwaysVisible) return true;
    if (item.permission) return hasPermission(item.permission);
    return true;
  };

  const NavItem = ({ item, collapsed = false }) => {
    const isActive = pathname === item.href;
    return (
      <button
        onClick={() => router.push(item.href)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
            : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
        {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
      </button>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = ({ mobile = false }) => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className={`h-16 flex items-center justify-between px-4 border-b border-gray-100 ${mobile ? '' : ''}`}>
        {(sidebarOpen || mobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PM Gestion</h1>
              <p className="text-xs text-gray-500">Projets Agile</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center mx-auto shadow-lg">
            <FolderKanban className="w-6 h-6 text-white" />
          </div>
        )}
        {mobile && (
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Main Menu */}
        {mainMenuItems.filter(isMenuVisible).map((item, idx) => (
          <NavItem key={idx} item={item} collapsed={!sidebarOpen && !mobile} />
        ))}

        {/* Notifications */}
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
            pathname === '/dashboard/notifications'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
              : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5 flex-shrink-0" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </div>
          {(sidebarOpen || mobile) && <span className="font-medium text-sm">Notifications</span>}
        </button>

        {/* Admin Section */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            {(sidebarOpen || mobile) && (
              <p className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
            )}
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    pathname.includes('/dashboard/admin') || pathname === '/dashboard/users'
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {(sidebarOpen || mobile) && <span className="font-medium text-sm">Admin</span>}
                  </div>
                  {(sidebarOpen || mobile) && (
                    adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 ml-2">
                {adminMenuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      pathname === item.href
                        ? 'bg-indigo-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {(sidebarOpen || mobile) && <span className="text-sm">{item.label}</span>}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-100">
        {(sidebarOpen || mobile) ? (
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/dashboard/profile')}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                  {user?.nom_complet?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm truncate text-gray-900">{user?.nom_complet}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role_id?.nom || 'Utilisateur'}</p>
              </div>
            </button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <button 
              onClick={() => router.push('/dashboard/profile')}
              className="w-full p-2 rounded-lg hover:bg-gray-100 flex justify-center"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                  {user?.nom_complet?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full p-2 rounded-lg hover:bg-red-50 flex justify-center text-red-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent mobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-30 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 lg:${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {/* Desktop sidebar toggle */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:block">
              <p className="text-sm text-gray-500">
                {pathname === '/dashboard' ? 'Accueil' : 
                 pathname.split('/').slice(2).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <button 
              onClick={() => router.push('/dashboard/notifications')}
              className="relative p-2 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            <button 
              onClick={() => router.push('/dashboard/profile')}
              className="p-2 hover:bg-gray-100 rounded-lg hidden sm:flex"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
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
