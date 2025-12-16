'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, FileText, Cloud, Activity, Settings, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('pm_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          router.push('/login');
          return;
        }

        const userData = await response.json();

        // Client-side guard: redirect if not admin
        if (!userData.role?.permissions?.adminConfig) {
          router.push('/dashboard');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Erreur:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const adminSections = [
    {
      title: 'Gestion des Rôles',
      description: 'Configurez les rôles système et leurs 23 permissions atomiques',
      icon: Shield,
      href: '/dashboard/admin/roles',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      title: 'Audit & Logs',
      description: 'Consultez l\'historique des activités et les logs de sécurité',
      icon: Activity,
      href: '/dashboard/admin/audit',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Types de Livrables',
      description: 'Gérez les types de livrables disponibles pour les projets',
      icon: FileText,
      href: '/dashboard/admin/deliverable-types',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Modèles de Projets',
      description: 'Créez et gérez les modèles de projets réutilisables',
      icon: Settings,
      href: '/dashboard/admin/templates',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Configuration SharePoint',
      description: 'Intégrez SharePoint pour la gestion centralisée des fichiers',
      icon: Cloud,
      href: '/dashboard/admin/sharepoint',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Utilisateurs',
      description: 'Gérez les utilisateurs et leurs accès au système',
      icon: Users,
      href: '/dashboard/users',
      color: 'bg-pink-100 text-pink-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Administration</h1>
        <p className="text-gray-600">Gérez les paramètres système et la configuration de l'application</p>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-indigo-600 group-hover:underline">
                  Accéder
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
