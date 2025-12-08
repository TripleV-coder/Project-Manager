'use client';

import { useRouter } from 'next/navigation';
import { Shield, FileText, Settings, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const router = useRouter();

  const adminSections = [
    {
      title: 'Gestion des Rôles',
      description: 'Configurez les rôles et leurs 22 permissions',
      icon: Shield,
      href: '/dashboard/admin/roles',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Templates de Projets',
      description: 'Créez des templates avec champs dynamiques',
      icon: FileText,
      href: '/dashboard/admin/templates',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Types de Livrables',
      description: 'Définissez les types et workflows de validation',
      icon: FileText,
      href: '/dashboard/admin/deliverable-types',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Configuration Système',
      description: 'SharePoint, sécurité, et paramètres globaux',
      icon: Settings,
      href: '/dashboard/settings',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Administration</h1>
        <p className="text-gray-600">Configurez votre application PM - Gestion de Projets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section, idx) => (
          <Card 
            key={idx} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(section.href)}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${section.bgColor}`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Accéder
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            État du Système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Base de données MongoDB</span>
              <span className="text-sm text-green-600 font-medium">Connectée ✓</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">API Backend</span>
              <span className="text-sm text-green-600 font-medium">Opérationnel ✓</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Authentification JWT</span>
              <span className="text-sm text-blue-600 font-medium">Actif ✓</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Audit Trail</span>
              <span className="text-sm text-blue-600 font-medium">Enregistrement actif ✓</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
