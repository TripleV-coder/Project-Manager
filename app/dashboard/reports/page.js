'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Calendar, BarChart3, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function ReportsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('all');
  const [reportType, setReportType] = useState('global');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
  }, [projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [projectsRes, tasksRes, usersRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();
      const usersData = await usersRes.json();

      setProjects(projectsData.projects || []);
      setTasks(tasksData.tasks || []);
      setUsers(usersData.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let yPosition = 20;

    // Header professionnel
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('PM - RAPPORT DE GESTION', margin, 18);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, margin, 28);

    yPosition = 45;

    if (reportType === 'global') {
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('RAPPORT GLOBAL', margin, yPosition);
      yPosition += 8;

      // Statistiques clés
      const stats = [
        ['Nombre de projets', projects.length.toString()],
        ['Projets actifs', projects.filter(p => p.statut === 'Actif').length.toString()],
        ['Nombre de tâches', tasks.length.toString()],
        ['Tâches terminées', tasks.filter(t => t.statut === 'Terminé').length.toString()],
        ['Nombre d\'utilisateurs', users.length.toString()]
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Métrique', 'Valeur']],
        body: stats,
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11
        },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50 } },
        margin: { left: margin, right: margin }
      });

      yPosition = doc.lastAutoTable.finalY + 12;

      doc.setTextColor(79, 70, 229);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('LISTE DES PROJETS', margin, yPosition);
      yPosition += 6;

      doc.autoTable({
        startY: yPosition,
        head: [['Projet', 'Statut', 'Date début', 'Date fin']],
        body: projects.map(p => [
          p.nom,
          p.statut,
          new Date(p.date_début).toLocaleDateString('fr-FR'),
          new Date(p.date_fin).toLocaleDateString('fr-FR')
        ]),
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        margin: { left: margin, right: margin }
      });
    } else if (reportType === 'projet') {
      const projet = projects.find(p => p._id === selectedProject);
      if (projet) {
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(`RAPPORT PROJET : ${projet.nom}`, margin, yPosition);
        yPosition += 6;

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Statut: ${projet.statut} | Dates: ${new Date(projet.date_début).toLocaleDateString('fr-FR')} à ${new Date(projet.date_fin).toLocaleDateString('fr-FR')}`, margin, yPosition + 4);
        yPosition += 12;

        const projectTasks = tasks.filter(t => t.projet_id === selectedProject);

        doc.autoTable({
          startY: yPosition,
          head: [['Tâche', 'Statut', 'Priorité', 'Assigné à']],
          body: projectTasks.map(t => [
            t.titre,
            t.statut,
            t.priorité,
            users.find(u => u._id === t.assigné_à?.toString())?.nom_complet || 'Non assigné'
          ]),
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          bodyStyles: { textColor: [60, 60, 60], fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          margin: { left: margin, right: margin }
        });
      }
    } else if (reportType === 'performance') {
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('RAPPORT PERFORMANCE', margin, yPosition);
      yPosition += 6;

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Analyse de la performance de l'équipe au ${new Date().toLocaleDateString('fr-FR')}`, margin, yPosition + 4);
      yPosition += 10;

      const userStats = users.map(user => {
        const userTasks = tasks.filter(t => t.assigné_à?.toString() === user._id);
        const completedTasks = userTasks.filter(t => t.statut === 'Terminé');
        return [
          user.nom_complet,
          userTasks.length.toString(),
          completedTasks.length.toString(),
          userTasks.length > 0 ? ((completedTasks.length / userTasks.length) * 100).toFixed(0) + '%' : '0%'
        ];
      });

      doc.autoTable({
        startY: yPosition,
        head: [['Utilisateur', 'Tâches totales', 'Tâches terminées', 'Taux de complétion']],
        body: userStats,
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        margin: { left: margin, right: margin }
      });
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    const fileName = `Rapport_${reportType}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  const generateExcel = () => {
    const wb = XLSX.utils.book_new();
    const headerStyle = {
      fill: { fgColor: { rgb: 'FF4F46E5' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };

    const cellStyle = {
      border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
      alignment: { vertical: 'center', wrapText: true }
    };

    if (reportType === 'global') {
      const projectsData = projects.map(p => ({
        'Nom': p.nom,
        'Statut': p.statut,
        'Date début': new Date(p.date_début).toLocaleDateString('fr-FR'),
        'Date fin': new Date(p.date_fin).toLocaleDateString('fr-FR'),
        'Budget': p.budget?.budget_total || 0
      }));
      const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
      projectsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];

      Object.keys(projectsSheet).forEach(key => {
        if (key.match(/^[A-Z]\d+$/)) {
          projectsSheet[key].s = cellStyle;
        }
      });

      XLSX.utils.book_append_sheet(wb, projectsSheet, 'Projets');

      const tasksData = tasks.map(t => ({
        'Titre': t.titre,
        'Statut': t.statut,
        'Priorité': t.priorité,
        'Projet': projects.find(p => p._id === t.projet_id)?.nom || 'N/A',
        'Assigné à': users.find(u => u._id === t.assigné_à?.toString())?.nom_complet || 'Non assigné'
      }));
      const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
      tasksSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];

      Object.keys(tasksSheet).forEach(key => {
        if (key.match(/^[A-Z]\d+$/)) {
          tasksSheet[key].s = cellStyle;
        }
      });

      XLSX.utils.book_append_sheet(wb, tasksSheet, 'Tâches');
    } else if (reportType === 'projet') {
      const projet = projects.find(p => p._id === selectedProject);
      const projectTasks = tasks.filter(t => t.projet_id === selectedProject);

      const projectData = projectTasks.map(t => ({
        'Tâche': t.titre,
        'Statut': t.statut,
        'Priorité': t.priorité,
        'Assigné à': users.find(u => u._id === t.assigné_à?.toString())?.nom_complet || 'Non assigné'
      }));
      const sheet = XLSX.utils.json_to_sheet(projectData);
      sheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 20 }];

      Object.keys(sheet).forEach(key => {
        if (key.match(/^[A-Z]\d+$/)) {
          sheet[key].s = cellStyle;
        }
      });

      const sheetName = projet?.nom ? projet.nom.substring(0, 31) : 'Projet';
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    } else if (reportType === 'performance') {
      const userStats = users.map(user => {
        const userTasks = tasks.filter(t => t.assigné_à?.toString() === user._id);
        const completedTasks = userTasks.filter(t => t.statut === 'Terminé');
        return {
          'Utilisateur': user.nom_complet,
          'Tâches totales': userTasks.length,
          'Tâches terminées': completedTasks.length,
          'Taux de complétion': userTasks.length > 0 ? ((completedTasks.length / userTasks.length) * 100).toFixed(0) + '%' : '0%'
        };
      });
      const performanceSheet = XLSX.utils.json_to_sheet(userStats);
      performanceSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];

      Object.keys(performanceSheet).forEach(key => {
        if (key.match(/^[A-Z]\d+$/)) {
          performanceSheet[key].s = cellStyle;
        }
      });

      XLSX.utils.book_append_sheet(wb, performanceSheet, 'Performance');
    }

    const fileName = `Rapport_${reportType}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const generateCSV = () => {
    let csvData = [];
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('fr-FR');
    const timeFormatted = now.toLocaleTimeString('fr-FR');

    // En-têtes informatifs
    const headers = [
      `"PM - RAPPORT ${reportType.toUpperCase()}"`,
      `"Généré le: ${dateFormatted} à ${timeFormatted}"`,
      `"Version: 1.0"`,
      '',
      ''
    ];

    if (reportType === 'global') {
      csvData = projects.map(p => ({
        'Nom Projet': p.nom,
        'Statut': p.statut,
        'Date début': new Date(p.date_début).toLocaleDateString('fr-FR'),
        'Date fin': new Date(p.date_fin).toLocaleDateString('fr-FR'),
        'Nombre de tâches': tasks.filter(t => t.projet_id === p._id).length,
        'Budget': p.budget?.budget_total || 0
      }));
    } else if (reportType === 'projet') {
      const projet = projects.find(p => p._id === selectedProject);
      headers[0] = `"PM - RAPPORT PROJET: ${projet?.nom || 'INCONNU'}"`;
      const projectTasks = tasks.filter(t => t.projet_id === selectedProject);
      csvData = projectTasks.map(t => ({
        'Tâche': t.titre,
        'Statut': t.statut,
        'Priorité': t.priorité,
        'Assigné à': users.find(u => u._id === t.assigné_à?.toString())?.nom_complet || 'Non assigné',
        'Description': t.description || ''
      }));
    } else if (reportType === 'performance') {
      csvData = users.map(user => {
        const userTasks = tasks.filter(t => t.assigné_à?.toString() === user._id);
        const completedTasks = userTasks.filter(t => t.statut === 'Terminé');
        return {
          'Utilisateur': user.nom_complet,
          'Tâches totales': userTasks.length,
          'Tâches terminées': completedTasks.length,
          'Tâches en cours': userTasks.length - completedTasks.length,
          'Taux de complétion': userTasks.length > 0 ? ((completedTasks.length / userTasks.length) * 100).toFixed(0) + '%' : '0%',
          'Statut': userTasks.length === 0 ? 'Inactif' : (completedTasks.length === userTasks.length ? 'Complété' : 'En cours')
        };
      });
    }

    const csv = Papa.unparse(csvData, { header: true, dynamicTyping: false });
    const headerStr = headers.join('\n');
    const fullCsv = headerStr + '\n' + csv;

    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = `Rapport_${reportType}_${dateFormatted.replace(/\//g, '-')}.csv`;
    link.download = fileName;
    link.click();
  };

  const handleGenerateReport = async () => {
    setGenerating(true);

    try {
      if (exportFormat === 'pdf') {
        generatePDF();
      } else if (exportFormat === 'excel') {
        generateExcel();
      } else if (exportFormat === 'csv') {
        generateCSV();
      }

      toast.success(`Rapport ${exportFormat.toUpperCase()} généré avec succès !`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors de la génération: ${error.message}`);
    } finally {
      setGenerating(false);
    }
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
        <p className="text-gray-600">Créez des rapports personnalisés et exportez-les en PDF, Excel ou CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <SelectItem value="pdf">PDF (Professionnel)</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (Données)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={handleGenerateReport}
            disabled={generating || (reportType === 'projet' && !selectedProject)}
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Génération...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Générer et télécharger
              </>
            )}
          </Button>
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Aperçu du contenu</CardTitle>
            <CardDescription>Ce qui sera inclus dans le rapport</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportType === 'global' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium">Statistiques globales</div>
                      <p className="text-sm text-gray-600">{projects.length} projets, {tasks.length} tâches, {users.length} utilisateurs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium">Liste des projets</div>
                      <p className="text-sm text-gray-600">Tous les projets avec statut et dates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium">Répartition des tâches</div>
                      <p className="text-sm text-gray-600">Tâches par statut et priorité</p>
                    </div>
                  </div>
                </>
              )}
              {reportType === 'projet' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium">Informations projet</div>
                      <p className="text-sm text-gray-600">Détails, dates, budget</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium">Liste des tâches</div>
                      <p className="text-sm text-gray-600">Toutes les tâches du projet</p>
                    </div>
                  </div>
                </>
              )}
              {reportType === 'performance' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <div className="font-medium">Statistiques par utilisateur</div>
                      <p className="text-sm text-gray-600">Tâches complétées et taux</p>
                    </div>
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
