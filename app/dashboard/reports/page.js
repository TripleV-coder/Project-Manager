'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, BarChart3, TrendingUp, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

export default function ReportsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('all');
  const [reportType, setReportType] = useState('global');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);

  // RBAC: Check permission to generate reports
  const permissions = useRBACPermissions(user);
  const canGenerateReports = permissions.hasPermission('genererRapports') || permissions.hasPermission('adminConfig');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first project on initial load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === 'all') {
      setSelectedProject(projects[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Load user data first for RBAC
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load user data');
      }

      const userData = await userRes.json();
      setUser(userData);

      // Check if user has permission to view reports
      const userPerms = userData.role?.permissions || {};
      if (!userPerms.genererRapports && !userPerms.adminConfig) {
        setLoading(false);
        return; // Don't load data if no permission
      }

      const [projectsRes, tasksRes, usersRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch('/api/tasks', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
      ]);

      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();
      const usersData = await usersRes.json();

      // API returns { success: true, data: [...] } or legacy format
      setProjects(projectsData.data || projectsData.projects || []);
      setTasks(tasksData.data || tasksData.tasks || []);
      setUsers(usersData.data || usersData.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  // Helper pour formater les dates de manière sécurisée
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
  };

  // Maps pour optimiser les recherches O(1) au lieu de O(n)
  const projectMap = new Map(projects.map(p => [p._id, p]));
  const userMap = new Map(users.map(u => [u._id, u]));

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let yPosition = 20;

      // Header professionnel avec design soigné
      doc.setFillColor(79, 70, 229); // Indigo
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Ligne décorative
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 40, pageWidth, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('PM - RAPPORT DE GESTION', margin, 18);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, margin, 28);

      // Sous-titre avec type de rapport
      doc.setFontSize(12);
      const reportTitle = reportType === 'global' ? 'Rapport Global' : reportType === 'projet' ? 'Rapport Projet' : 'Rapport Performance';
      doc.text(reportTitle.toUpperCase(), margin, 36);

      yPosition = 53;

      if (reportType === 'global') {
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('STATISTIQUES GLOBALES', margin, yPosition);
        yPosition += 8;

        // Statistiques clés avec icônes visuelles
        const completedTasks = tasks.filter(t => t.statut === 'Terminé').length;
        const completionRate = tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(1) : 0;

        const stats = [
          ['Nombre total de projets', projects.length.toString()],
          ['Projets actifs', projects.filter(p => p.statut === 'Actif').length.toString()],
          ['Projets terminés', projects.filter(p => p.statut === 'Terminé').length.toString()],
          ['Nombre total de tâches', tasks.length.toString()],
          ['Tâches terminées', completedTasks.toString()],
          ['Taux de complétion global', `${completionRate}%`],
          ['Nombre d\'utilisateurs', users.length.toString()]
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [['Indicateur', 'Valeur']],
          body: stats,
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11,
            halign: 'left'
          },
          bodyStyles: { textColor: [60, 60, 60], fontSize: 10 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
          tableLineColor: [229, 231, 235],
          tableLineWidth: 0.1
        });

        yPosition = doc.lastAutoTable.finalY + 15;

        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('LISTE DES PROJETS', margin, yPosition);
        yPosition += 8;

        autoTable(doc, {
          startY: yPosition,
          head: [['Projet', 'Statut', 'Priorité', 'Date début', 'Date fin', 'Tâches']],
          body: projects.map(p => {
            const projectTaskCount = tasks.filter(t => t.projet_id === p._id).length;
            return [
              p.nom || 'Sans nom',
              p.statut || 'N/A',
              p.priorité || 'Normale',
              safeFormatDate(p.date_début),
              safeFormatDate(p.date_fin),
              projectTaskCount.toString()
            ];
          }),
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { textColor: [60, 60, 60], fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
      } else if (reportType === 'projet') {
        const projet = projectMap.get(selectedProject);
        if (projet) {
          doc.setTextColor(79, 70, 229);
          doc.setFontSize(16);
          doc.setFont(undefined, 'bold');
          doc.text(`PROJET : ${projet.nom}`, margin, yPosition);
          yPosition += 8;

          // Informations du projet
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.text(`Statut: ${projet.statut || 'N/A'}`, margin, yPosition);
          doc.text(`Période: ${safeFormatDate(projet.date_début)} - ${safeFormatDate(projet.date_fin)}`, margin + 80, yPosition);
          yPosition += 15;

          const projectTasks = tasks.filter(t => t.projet_id === selectedProject);
          const completedProjectTasks = projectTasks.filter(t => t.statut === 'Terminé').length;

          // Mini statistiques projet
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 3, 3, 'F');
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(9);
          doc.text(`Total tâches: ${projectTasks.length}`, margin + 10, yPosition + 12);
          doc.text(`Terminées: ${completedProjectTasks}`, margin + 60, yPosition + 12);
          doc.text(`En cours: ${projectTasks.length - completedProjectTasks}`, margin + 110, yPosition + 12);
          const projRate = projectTasks.length > 0 ? ((completedProjectTasks / projectTasks.length) * 100).toFixed(0) : 0;
          doc.text(`Progression: ${projRate}%`, margin + 155, yPosition + 12);
          yPosition += 28;

          doc.setTextColor(79, 70, 229);
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text('DÉTAIL DES TÂCHES', margin, yPosition);
          yPosition += 6;

          autoTable(doc, {
            startY: yPosition,
            head: [['Tâche', 'Statut', 'Priorité', 'Assigné à', 'Échéance']],
            body: projectTasks.map(t => [
              t.titre || 'Sans titre',
              t.statut || 'N/A',
              t.priorité || 'Normale',
              userMap.get(t.assigné_à?.toString())?.nom_complet || 'Non assigné',
              safeFormatDate(t.date_échéance)
            ]),
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { textColor: [60, 60, 60], fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 25 },
              2: { cellWidth: 25 },
              3: { cellWidth: 40 },
              4: { cellWidth: 25 }
            },
            margin: { left: margin, right: margin }
          });
        }
      } else if (reportType === 'performance') {
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('ANALYSE DE PERFORMANCE', margin, yPosition);
        yPosition += 6;

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Période d'analyse : ${new Date().toLocaleDateString('fr-FR')}`, margin, yPosition + 4);
        yPosition += 12;

        const userStats = users.map(u => {
          const userTasks = tasks.filter(t => t.assigné_à?.toString() === u._id);
          const completedTasks = userTasks.filter(t => t.statut === 'Terminé');
          const inProgressTasks = userTasks.filter(t => t.statut === 'En cours');
          const rate = userTasks.length > 0 ? ((completedTasks.length / userTasks.length) * 100).toFixed(0) : 0;
          return [
            u.nom_complet || 'N/A',
            userTasks.length.toString(),
            completedTasks.length.toString(),
            inProgressTasks.length.toString(),
            `${rate}%`,
            rate >= 80 ? 'Excellent' : rate >= 60 ? 'Bon' : rate >= 40 ? 'Moyen' : 'À améliorer'
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Collaborateur', 'Total', 'Terminées', 'En cours', 'Taux', 'Évaluation']],
          body: userStats,
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { textColor: [60, 60, 60], fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 30, halign: 'center' }
          },
          margin: { left: margin, right: margin },
          didParseCell: function(data) {
            // Colorer la colonne évaluation selon le résultat
            if (data.column.index === 5 && data.section === 'body') {
              const val = data.cell.raw;
              if (val === 'Excellent') data.cell.styles.textColor = [34, 197, 94];
              else if (val === 'Bon') data.cell.styles.textColor = [59, 130, 246];
              else if (val === 'Moyen') data.cell.styles.textColor = [245, 158, 11];
              else data.cell.styles.textColor = [239, 68, 68];
            }
          }
        });
      }

      // Footer professionnel
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Ligne de séparation
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('PM - Gestion de Projets', margin, pageHeight - 8);
        doc.text(`Page ${i}/${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.text('Document confidentiel', pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      const fileName = `Rapport_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  };

  const generateExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PM - Gestion de Projets';
      wb.created = new Date();
      wb.lastModifiedBy = user?.nom_complet || 'Système';

      const headerStyle = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      };

      const dataStyle = {
        border: {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        },
        alignment: { vertical: 'middle', wrapText: true }
      };

      const applyHeaderStyle = (row) => {
        row.height = 25;
        row.eachCell((cell) => {
          cell.fill = headerStyle.fill;
          cell.font = headerStyle.font;
          cell.alignment = headerStyle.alignment;
          cell.border = headerStyle.border;
        });
      };

      const applyDataStyle = (row, isAlternate = false) => {
        row.height = 20;
        row.eachCell((cell) => {
          cell.border = dataStyle.border;
          cell.alignment = dataStyle.alignment;
          if (isAlternate) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      };

      if (reportType === 'global') {
        // Sheet Résumé
        const summarySheet = wb.addWorksheet('Résumé');
        summarySheet.columns = [
          { header: 'Indicateur', key: 'indicateur', width: 35 },
          { header: 'Valeur', key: 'valeur', width: 20 }
        ];
        applyHeaderStyle(summarySheet.getRow(1));

        const completedTasks = tasks.filter(t => t.statut === 'Terminé').length;
        const summaryData = [
          { indicateur: 'Nombre total de projets', valeur: projects.length },
          { indicateur: 'Projets actifs', valeur: projects.filter(p => p.statut === 'Actif').length },
          { indicateur: 'Projets terminés', valeur: projects.filter(p => p.statut === 'Terminé').length },
          { indicateur: 'Nombre total de tâches', valeur: tasks.length },
          { indicateur: 'Tâches terminées', valeur: completedTasks },
          { indicateur: 'Taux de complétion', valeur: tasks.length > 0 ? `${((completedTasks / tasks.length) * 100).toFixed(1)}%` : '0%' },
          { indicateur: 'Nombre d\'utilisateurs', valeur: users.length },
          { indicateur: 'Date du rapport', valeur: new Date().toLocaleDateString('fr-FR') }
        ];
        summaryData.forEach((row, idx) => {
          const r = summarySheet.addRow(row);
          applyDataStyle(r, idx % 2 === 0);
        });

        // Sheet Projets
        const projectsSheet = wb.addWorksheet('Projets');
        projectsSheet.columns = [
          { header: 'Nom du projet', key: 'nom', width: 30 },
          { header: 'Statut', key: 'statut', width: 15 },
          { header: 'Priorité', key: 'priorite', width: 12 },
          { header: 'Date début', key: 'dateDebut', width: 15 },
          { header: 'Date fin', key: 'dateFin', width: 15 },
          { header: 'Nb tâches', key: 'nbTaches', width: 12 },
          { header: 'Budget (FCFA)', key: 'budget', width: 18 }
        ];
        applyHeaderStyle(projectsSheet.getRow(1));

        projects.forEach((p, idx) => {
          const r = projectsSheet.addRow({
            nom: p.nom || 'Sans nom',
            statut: p.statut || 'N/A',
            priorite: p.priorité || 'Normale',
            dateDebut: safeFormatDate(p.date_début),
            dateFin: safeFormatDate(p.date_fin),
            nbTaches: tasks.filter(t => t.projet_id === p._id).length,
            budget: p.budget?.prévisionnel || 0
          });
          applyDataStyle(r, idx % 2 === 0);
        });

        // Sheet Tâches
        const tasksSheet = wb.addWorksheet('Tâches');
        tasksSheet.columns = [
          { header: 'Titre', key: 'titre', width: 35 },
          { header: 'Statut', key: 'statut', width: 12 },
          { header: 'Priorité', key: 'priorite', width: 12 },
          { header: 'Projet', key: 'projet', width: 25 },
          { header: 'Assigné à', key: 'assigneA', width: 22 },
          { header: 'Échéance', key: 'echeance', width: 15 }
        ];
        applyHeaderStyle(tasksSheet.getRow(1));

        tasks.forEach((t, idx) => {
          const r = tasksSheet.addRow({
            titre: t.titre || 'Sans titre',
            statut: t.statut || 'N/A',
            priorite: t.priorité || 'Normale',
            projet: projectMap.get(t.projet_id)?.nom || 'N/A',
            assigneA: userMap.get(t.assigné_à?.toString())?.nom_complet || 'Non assigné',
            echeance: safeFormatDate(t.date_échéance)
          });
          applyDataStyle(r, idx % 2 === 0);
        });

      } else if (reportType === 'projet') {
        const projet = projectMap.get(selectedProject);
        const projectTasks = tasks.filter(t => t.projet_id === selectedProject);
        const sheetName = projet?.nom ? projet.nom.substring(0, 31).replace(/[\\/*?[\]:]/g, '') : 'Projet';

        const sheet = wb.addWorksheet(sheetName);
        sheet.columns = [
          { header: 'Tâche', key: 'tache', width: 40 },
          { header: 'Statut', key: 'statut', width: 15 },
          { header: 'Priorité', key: 'priorite', width: 12 },
          { header: 'Assigné à', key: 'assigneA', width: 25 },
          { header: 'Date échéance', key: 'echeance', width: 15 },
          { header: 'Description', key: 'description', width: 40 }
        ];
        applyHeaderStyle(sheet.getRow(1));

        projectTasks.forEach((t, idx) => {
          const r = sheet.addRow({
            tache: t.titre || 'Sans titre',
            statut: t.statut || 'N/A',
            priorite: t.priorité || 'Normale',
            assigneA: userMap.get(t.assigné_à?.toString())?.nom_complet || 'Non assigné',
            echeance: safeFormatDate(t.date_échéance),
            description: (t.description || '').substring(0, 200)
          });
          applyDataStyle(r, idx % 2 === 0);
        });

      } else if (reportType === 'performance') {
        const performanceSheet = wb.addWorksheet('Performance Équipe');
        performanceSheet.columns = [
          { header: 'Collaborateur', key: 'utilisateur', width: 28 },
          { header: 'Tâches totales', key: 'tachesTotales', width: 15 },
          { header: 'Terminées', key: 'tachesTerminees', width: 12 },
          { header: 'En cours', key: 'tachesEnCours', width: 12 },
          { header: 'Taux complétion', key: 'tauxCompletion', width: 16 },
          { header: 'Évaluation', key: 'evaluation', width: 15 }
        ];
        applyHeaderStyle(performanceSheet.getRow(1));

        users.forEach((u, idx) => {
          const userTasks = tasks.filter(t => t.assigné_à?.toString() === u._id);
          const completed = userTasks.filter(t => t.statut === 'Terminé').length;
          const inProgress = userTasks.filter(t => t.statut === 'En cours').length;
          const rate = userTasks.length > 0 ? ((completed / userTasks.length) * 100).toFixed(0) : 0;

          const r = performanceSheet.addRow({
            utilisateur: u.nom_complet || 'N/A',
            tachesTotales: userTasks.length,
            tachesTerminees: completed,
            tachesEnCours: inProgress,
            tauxCompletion: `${rate}%`,
            evaluation: rate >= 80 ? 'Excellent' : rate >= 60 ? 'Bon' : rate >= 40 ? 'Moyen' : 'À améliorer'
          });
          applyDataStyle(r, idx % 2 === 0);
        });
      }

      // Generate and download the file
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur génération Excel:', error);
      throw new Error(`Erreur lors de la génération Excel: ${error.message}`);
    }
  };

  const generateCSV = () => {
    try {
      let csvData = [];
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('fr-FR');
      const timeFormatted = now.toLocaleTimeString('fr-FR');

      // En-têtes informatifs avec métadonnées
      const reportTitle = reportType === 'global' ? 'RAPPORT GLOBAL' : reportType === 'projet' ? 'RAPPORT PROJET' : 'RAPPORT PERFORMANCE';

      if (reportType === 'global') {
        csvData = projects.map(p => ({
          'Nom Projet': p.nom || 'Sans nom',
          'Statut': p.statut || 'N/A',
          'Priorité': p.priorité || 'Normale',
          'Date début': safeFormatDate(p.date_début),
          'Date fin': safeFormatDate(p.date_fin),
          'Nombre de tâches': tasks.filter(t => t.projet_id === p._id).length,
          'Tâches terminées': tasks.filter(t => t.projet_id === p._id && t.statut === 'Terminé').length,
          'Budget (FCFA)': p.budget?.prévisionnel || 0
        }));
      } else if (reportType === 'projet') {
        const projet = projectMap.get(selectedProject);
        const projectTasks = tasks.filter(t => t.projet_id === selectedProject);
        csvData = projectTasks.map(t => ({
          'Tâche': t.titre || 'Sans titre',
          'Statut': t.statut || 'N/A',
          'Priorité': t.priorité || 'Normale',
          'Assigné à': userMap.get(t.assigné_à?.toString())?.nom_complet || 'Non assigné',
          'Date échéance': safeFormatDate(t.date_échéance),
          'Description': (t.description || '').replace(/[\n\r]/g, ' ').substring(0, 200)
        }));

        // Ajouter info projet en commentaire
        if (projet) {
          csvData.unshift({
            'Tâche': `# Projet: ${projet.nom}`,
            'Statut': `Statut: ${projet.statut}`,
            'Priorité': `Début: ${safeFormatDate(projet.date_début)}`,
            'Assigné à': `Fin: ${safeFormatDate(projet.date_fin)}`,
            'Date échéance': '',
            'Description': ''
          });
        }
      } else if (reportType === 'performance') {
        csvData = users.map(u => {
          const userTasks = tasks.filter(t => t.assigné_à?.toString() === u._id);
          const completed = userTasks.filter(t => t.statut === 'Terminé').length;
          const inProgress = userTasks.filter(t => t.statut === 'En cours').length;
          const rate = userTasks.length > 0 ? ((completed / userTasks.length) * 100).toFixed(0) : 0;

          return {
            'Collaborateur': u.nom_complet || 'N/A',
            'Email': u.email || 'N/A',
            'Tâches totales': userTasks.length,
            'Tâches terminées': completed,
            'Tâches en cours': inProgress,
            'Taux de complétion': `${rate}%`,
            'Évaluation': rate >= 80 ? 'Excellent' : rate >= 60 ? 'Bon' : rate >= 40 ? 'Moyen' : 'À améliorer'
          };
        });
      }

      // Vérifier qu'il y a des données
      if (csvData.length === 0) {
        if (reportType === 'global' && projects.length === 0) {
          throw new Error('Aucun projet disponible pour générer le rapport');
        } else if (reportType === 'projet') {
          const projectTasks = tasks.filter(t => t.projet_id === selectedProject);
          if (projectTasks.length === 0) {
            throw new Error('Ce projet ne contient aucune tâche');
          }
        } else if (reportType === 'performance' && users.length === 0) {
          throw new Error('Aucun utilisateur disponible pour le rapport de performance');
        }
        throw new Error('Aucune donnée à exporter');
      }

      const csv = Papa.unparse(csvData, { header: true, dynamicTyping: false });

      // Header avec métadonnées
      const metaHeader = [
        `# PM - ${reportTitle}`,
        `# Généré le: ${dateFormatted} à ${timeFormatted}`,
        `# Nombre d'enregistrements: ${csvData.length}`,
        `# Généré par: ${user?.nom_complet || 'Système'}`,
        ''
      ].join('\n');

      // BOM UTF-8 pour compatibilité Excel
      const BOM = '\uFEFF';
      const fullCsv = BOM + metaHeader + csv;

      const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Erreur génération CSV:', error);
      throw new Error(`Erreur lors de la génération CSV: ${error.message}`);
    }
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

  // RBAC: Show access denied if user doesn't have permission
  if (!canGenerateReports) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-900 mb-2">Accès refusé</h2>
                <p className="text-red-700">
                  Vous n'avez pas la permission de générer des rapports.
                  Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
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
