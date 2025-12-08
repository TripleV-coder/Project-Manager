'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

export default function ReportsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [reportType, setReportType] = useState('global');
  const [exportFormat, setExportFormat] = useState('pdf');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjects(data.projects || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    toast.success(`Rapport ${reportType} généré en ${exportFormat.toUpperCase()}`);
  };

  const reportTypes = [
    {
      id: 'global',
      name: 'Rapport Global',
      description: 'Vue d\'ensemble de tous les projets',
      icon: BarChart3
    },
    {
      id: 'projet',
      name: 'Rapport Projet',
      description: 'Détails complets d\'un projet spécifique',
      icon: FileText
    },
    {
      id: 'performance',
      name: 'Rapport Performance',
      description: 'Équipe et vélocité',
      icon: TrendingUp
    },
    {
      id: 'budget',
      name: 'Rapport Budget',
      description: 'Dépenses et prévisions',
      icon: Calendar
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Générateur de Rapports</h1>
        <p className="text-gray-600">Créez des rapports personnalisés et exportez-les</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Type de rapport</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={reportType} onValueChange={setReportType}>
                <div className="space-y-3">
                  {reportTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <div key={type.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value={type.id} id={type.id} />
                        <label htmlFor={type.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium">{type.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportType === 'projet' && (
                <div className="space-y-2">
                  <Label>Sélectionner un projet</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Format d'export</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={handleGenerateReport}
          >
            <Download className="w-4 h-4 mr-2" />
            Générer et télécharger
          </Button>
        </div>

        {/* Aperçu */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Aperçu du rapport</CardTitle>
            <CardDescription>Le rapport contiendra les sections suivantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportType === 'global' && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Vue d'ensemble</div>
                    <p className="text-sm text-gray-600">Statistiques globales de tous les projets</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Projets actifs</div>
                    <p className="text-sm text-gray-600">Liste et statut de chaque projet</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Équipes</div>
                    <p className="text-sm text-gray-600">Répartition et charge de travail</p>
                  </div>
                </>
              )}
              {reportType === 'projet' && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Informations projet</div>
                    <p className="text-sm text-gray-600">Détails, dates, budget</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Tâches et sprints</div>
                    <p className="text-sm text-gray-600">Progression et vélocité</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Équipe</div>
                    <p className="text-sm text-gray-600">Membres et contributions</p>
                  </div>
                </>
              )}
              {reportType === 'performance' && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Vélocité</div>
                    <p className="text-sm text-gray-600">Évolution par sprint</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Temps passé</div>
                    <p className="text-sm text-gray-600">Répartition par équipe et projet</p>
                  </div>
                </>
              )}
              {reportType === 'budget' && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Budgets</div>
                    <p className="text-sm text-gray-600">Prévisionnel vs Réalisé</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Dépenses</div>
                    <p className="text-sm text-gray-600">Détail par catégorie</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
