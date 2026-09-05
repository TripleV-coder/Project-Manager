import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

/**
 * Helper pour formater les dates de manière sécurisée
 */
function safeFormatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('fr-FR');
  } catch {
    return 'N/A';
  }
}

/**
 * Service centralisé pour la génération de rapports (PDF, Excel, CSV).
 * Contient la totalité de la logique d'export, déplacée depuis la page Reports.
 */
export const reportExportService = {
  safeFormatDate,

  // ─── PDF ────────────────────────────────────────────────────────
  generatePDF({ reportType, selectedProject, projects, tasks, users, projectMap, userMap, t }) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let yPosition = 20;

    // Header professionnel
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 40, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text(t('reportsTitle').toUpperCase(), margin, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      margin,
      28
    );

    doc.setFontSize(12);
    const reportTitle =
      reportType === 'global'
        ? t('reportGlobal')
        : reportType === 'projet'
          ? t('reportProject')
          : t('reportPerformance');
    doc.text(reportTitle.toUpperCase(), margin, 36);
    yPosition = 53;

    if (reportType === 'global') {
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(t('engagementIndicators').toUpperCase(), margin, yPosition);
      yPosition += 8;

      const completedTasks = tasks.filter((item) => item.statut === 'Terminé').length;
      const completionRate =
        tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(1) : 0;

      const stats = [
        [t('initiativeVolume'), projects.length.toString()],
        [t('activeInitiatives'), projects.filter((p) => p.statut === 'Actif').length.toString()],
        [t('recordedSuccesses'), projects.filter((p) => p.statut === 'Terminé').length.toString()],
        [t('actionVolume'), tasks.length.toString()],
        [t('finalizedActions'), completedTasks.toString()],
        [t('globalSuccessRate'), `${completionRate}%`],
        [t('mobilizedForces'), users.length.toString()],
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
          halign: 'left',
        },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 10 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
        tableLineColor: [229, 231, 235],
        tableLineWidth: 0.1,
      });

      yPosition = doc.lastAutoTable.finalY + 15;

      doc.setTextColor(79, 70, 229);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(t('initiativesPanorama').toUpperCase(), margin, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [
          [
            t('initiativeVolume'),
            t('engagementIndicators'),
            t('priority'),
            t('projectLaunchDate'),
            t('estimatedDeadline'),
            'Actions',
          ],
        ],
        body: projects.map((p) => {
          const projectTaskCount = tasks.filter((item) => item.projet_id === p._id).length;
          return [
            p.nom || 'Sans nom',
            p.statut || 'N/A',
            p.priorité || 'Normale',
            safeFormatDate(p.date_début),
            safeFormatDate(p.date_fin),
            projectTaskCount.toString(),
          ];
        }),
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: margin, right: margin },
      });
    } else if (reportType === 'projet') {
      const projet = projectMap.get(selectedProject);
      if (projet) {
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(`INITIATIVE : ${projet.nom}`, margin, yPosition);
        yPosition += 8;

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Engagement: ${projet.statut || 'N/A'}`, margin, yPosition);
        doc.text(
          `Période: ${safeFormatDate(projet.date_début)} - ${safeFormatDate(projet.date_fin)}`,
          margin + 80,
          yPosition
        );
        yPosition += 15;

        const projectTasks = tasks.filter((item) => item.projet_id === selectedProject);
        const completedProjectTasks = projectTasks.filter(
          (item) => item.statut === 'Terminé'
        ).length;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 3, 3, 'F');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9);
        doc.text(`Actions totales: ${projectTasks.length}`, margin + 10, yPosition + 12);
        doc.text(`Finalisées: ${completedProjectTasks}`, margin + 60, yPosition + 12);
        doc.text(
          `À réaliser: ${projectTasks.length - completedProjectTasks}`,
          margin + 110,
          yPosition + 12
        );
        const projRate =
          projectTasks.length > 0
            ? ((completedProjectTasks / projectTasks.length) * 100).toFixed(0)
            : 0;
        doc.text(`Progression: ${projRate}%`, margin + 155, yPosition + 12);
        yPosition += 28;

        doc.setTextColor(79, 70, 229);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(t('inventoryActions').toUpperCase(), margin, yPosition);
        yPosition += 6;

        autoTable(doc, {
          startY: yPosition,
          head: [[t('actionSimple'), t('status'), t('priority'), t('assignedTo'), t('dueDate')]],
          body: projectTasks.map((item) => [
            item.titre || 'Sans titre',
            item.statut || 'N/A',
            item.priorité || 'Normale',
            userMap.get(item.assigné_à?.toString())?.nom_complet || 'Non assigné',
            safeFormatDate(item.date_échéance),
          ]),
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          bodyStyles: { textColor: [60, 60, 60], fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 40 },
            4: { cellWidth: 25 },
          },
          margin: { left: margin, right: margin },
        });
      }
    } else if (reportType === 'performance') {
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(t('teamDynamicsTitle').toUpperCase(), margin, yPosition);
      yPosition += 6;

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(
        `${t('reportPeriod')} : ${new Date().toLocaleDateString('fr-FR')}`,
        margin,
        yPosition + 4
      );
      yPosition += 12;

      const userStats = users.map((u) => {
        const userTasks = tasks.filter((item) => item.assigné_à?.toString() === u._id);
        const completedTasks = userTasks.filter((item) => item.statut === 'Terminé');
        const inProgressTasks = userTasks.filter((item) => item.statut === 'En cours');
        const rate =
          userTasks.length > 0 ? ((completedTasks.length / userTasks.length) * 100).toFixed(0) : 0;
        return [
          u.nom_complet || 'N/A',
          userTasks.length.toString(),
          completedTasks.length.toString(),
          inProgressTasks.length.toString(),
          `${rate}%`,
          rate >= 80
            ? t('radiant')
            : rate >= 60
              ? t('greatMomentum')
              : rate >= 40
                ? t('inProgressGrowth')
                : t('needSupport'),
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [
          [
            t('userName'),
            t('actionVolume'),
            t('recordedSuccesses'),
            t('inProgress'),
            t('impactVision'),
            t('teamEnergy'),
          ],
        ],
        body: userStats,
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        didParseCell: function (data) {
          if (data.column.index === 5 && data.section === 'body') {
            const val = data.cell.raw;
            if (val === t('radiant')) data.cell.styles.textColor = [34, 197, 94];
            else if (val === t('greatMomentum')) data.cell.styles.textColor = [59, 130, 246];
            else if (val === t('inProgressGrowth')) data.cell.styles.textColor = [245, 158, 11];
            else if (val === t('needSupport')) data.cell.styles.textColor = [239, 68, 68];
          }
        },
      });
    }

    // Footer professionnel
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('PM - Gestion de Projets', margin, pageHeight - 8);
      doc.text(`Page ${i}/${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text(t('confidentialDocument'), pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    const fileName = `Rapport_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  },

  // ─── EXCEL ──────────────────────────────────────────────────────
  async generateExcel({
    reportType,
    selectedProject,
    projects,
    tasks,
    users,
    projectMap,
    userMap,
    user,
    t,
  }) {
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
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      },
    };

    const dataStyle = {
      border: {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      },
      alignment: { vertical: 'middle', wrapText: true },
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
        { header: t('indicator'), key: 'indicateur', width: 35 },
        { header: t('value'), key: 'valeur', width: 20 },
      ];
      applyHeaderStyle(summarySheet.getRow(1));

      const completedTasks = tasks.filter((item) => item.statut === 'Terminé').length;
      const summaryData = [
        { indicateur: t('totalAdventures'), valeur: projects.length },
        {
          indicateur: t('activeAdventures'),
          valeur: projects.filter((p) => p.statut === 'Actif').length,
        },
        {
          indicateur: t('recordedSuccesses'),
          valeur: projects.filter((p) => p.statut === 'Terminé').length,
        },
        { indicateur: t('totalActions'), valeur: tasks.length },
        { indicateur: t('accomplishedActions'), valeur: completedTasks },
        {
          indicateur: t('successRate'),
          valeur:
            tasks.length > 0 ? `${((completedTasks / tasks.length) * 100).toFixed(1)}%` : '0%',
        },
        { indicateur: t('mobilizedTalents'), valeur: users.length },
        { indicateur: t('reportGeneratedAt'), valeur: new Date().toLocaleDateString('fr-FR') },
      ];
      summaryData.forEach((row, idx) => {
        const r = summarySheet.addRow(row);
        applyDataStyle(r, idx % 2 === 0);
      });

      // Sheet Projets
      const projectsSheet = wb.addWorksheet('Projets');
      projectsSheet.columns = [
        { header: t('adventureName'), key: 'nom', width: 30 },
        { header: t('status'), key: 'statut', width: 15 },
        { header: t('priority'), key: 'priorite', width: 12 },
        { header: t('launchDate'), key: 'dateDebut', width: 15 },
        { header: t('successTarget'), key: 'dateFin', width: 15 },
        { header: t('totalActions'), key: 'nbTaches', width: 12 },
        { header: t('budgetLabel'), key: 'budget', width: 18 },
      ];
      applyHeaderStyle(projectsSheet.getRow(1));

      projects.forEach((p, idx) => {
        const r = projectsSheet.addRow({
          nom: p.nom || 'Sans nom',
          statut: p.statut || 'N/A',
          priorite: p.priorité || 'Normale',
          dateDebut: safeFormatDate(p.date_début),
          dateFin: safeFormatDate(p.date_fin),
          nbTaches: tasks.filter((item) => item.projet_id === p._id).length,
          budget: p.budget?.prévisionnel || 0,
        });
        applyDataStyle(r, idx % 2 === 0);
      });

      // Sheet Tâches
      const tasksSheet = wb.addWorksheet('Tâches');
      tasksSheet.columns = [
        { header: t('actionTitle'), key: 'titre', width: 35 },
        { header: t('status'), key: 'statut', width: 12 },
        { header: t('priority'), key: 'priorite', width: 12 },
        { header: t('project'), key: 'projet', width: 25 },
        { header: t('assignedTo'), key: 'assigneA', width: 22 },
        { header: t('dueDate'), key: 'echeance', width: 15 },
      ];
      applyHeaderStyle(tasksSheet.getRow(1));

      tasks.forEach((item, idx) => {
        const r = tasksSheet.addRow({
          titre: item.titre || 'Sans titre',
          statut: item.statut || 'N/A',
          priorite: item.priorité || 'Normale',
          projet: projectMap.get(item.projet_id)?.nom || 'N/A',
          assigneA: userMap.get(item.assigné_à?.toString())?.nom_complet || 'Non assigné',
          echeance: safeFormatDate(item.date_échéance),
        });
        applyDataStyle(r, idx % 2 === 0);
      });
    } else if (reportType === 'projet') {
      const projet = projectMap.get(selectedProject);
      const projectTasks = tasks.filter((item) => item.projet_id === selectedProject);
      const sheetName = projet?.nom
        ? projet.nom.substring(0, 31).replace(/[\\/*?[\]:]/g, '')
        : 'Projet';

      const sheet = wb.addWorksheet(sheetName);
      sheet.columns = [
        { header: t('actionSimple'), key: 'tache', width: 40 },
        { header: t('status'), key: 'statut', width: 15 },
        { header: t('priority'), key: 'priorite', width: 12 },
        { header: t('assignedTo'), key: 'assigneA', width: 25 },
        { header: t('dueDate'), key: 'echeance', width: 15 },
        { header: t('description'), key: 'description', width: 40 },
      ];
      applyHeaderStyle(sheet.getRow(1));

      projectTasks.forEach((item, idx) => {
        const r = sheet.addRow({
          tache: item.titre || 'Sans titre',
          statut: item.statut || 'N/A',
          priorite: item.priorité || 'Normale',
          assigneA: userMap.get(item.assigné_à?.toString())?.nom_complet || 'Non assigné',
          echeance: safeFormatDate(item.date_échéance),
          description: (item.description || '').substring(0, 200),
        });
        applyDataStyle(r, idx % 2 === 0);
      });
    } else if (reportType === 'performance') {
      const performanceSheet = wb.addWorksheet('Performance Équipe');
      performanceSheet.columns = [
        { header: t('collaborator'), key: 'utilisateur', width: 28 },
        { header: t('totalActions'), key: 'tachesTotales', width: 15 },
        { header: t('victories'), key: 'tachesTerminees', width: 12 },
        { header: t('inProgress'), key: 'tachesEnCours', width: 12 },
        { header: t('successRate'), key: 'tauxCompletion', width: 16 },
        { header: t('evaluationLabel'), key: 'evaluation', width: 15 },
      ];
      applyHeaderStyle(performanceSheet.getRow(1));

      users.forEach((u, idx) => {
        const userTasks = tasks.filter((item) => item.assigné_à?.toString() === u._id);
        const completed = userTasks.filter((item) => item.statut === 'Terminé').length;
        const inProgress = userTasks.filter((item) => item.statut === 'En cours').length;
        const rate = userTasks.length > 0 ? ((completed / userTasks.length) * 100).toFixed(0) : 0;

        const r = performanceSheet.addRow({
          utilisateur: u.nom_complet || 'N/A',
          tachesTotales: userTasks.length,
          tachesTerminees: completed,
          tachesEnCours: inProgress,
          tauxCompletion: `${rate}%`,
          evaluation:
            rate >= 80
              ? t('radiant')
              : rate >= 60
                ? t('greatMomentum')
                : rate >= 40
                  ? t('inProgressGrowth')
                  : t('needSupport'),
        });
        applyDataStyle(r, idx % 2 === 0);
      });
    }

    // Generate and download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapport_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ─── CSV ────────────────────────────────────────────────────────
  generateCSV({
    reportType,
    selectedProject,
    projects,
    tasks,
    users,
    projectMap,
    userMap,
    user,
    t,
  }) {
    let csvData = [];
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('fr-FR');
    const timeFormatted = now.toLocaleTimeString('fr-FR');

    const reportTitle =
      reportType === 'global'
        ? 'RAPPORT GLOBAL'
        : reportType === 'projet'
          ? 'RAPPORT PROJET'
          : 'RAPPORT PERFORMANCE';

    if (reportType === 'global') {
      csvData = projects.map((p) => ({
        [t('adventureName')]: p.nom || 'Sans nom',
        [t('status')]: p.statut || 'N/A',
        [t('priority')]: p.priorité || 'Normale',
        [t('launchDate')]: safeFormatDate(p.date_début),
        [t('successTarget')]: safeFormatDate(p.date_fin),
        [t('totalActions')]: tasks.filter((item) => item.projet_id === p._id).length,
        [t('victories')]: tasks.filter(
          (item) => item.projet_id === p._id && item.statut === 'Terminé'
        ).length,
        [t('budgetLabel')]: p.budget?.prévisionnel || 0,
      }));
    } else if (reportType === 'projet') {
      const projet = projectMap.get(selectedProject);
      const projectTasks = tasks.filter((item) => item.projet_id === selectedProject);
      csvData = projectTasks.map((item) => ({
        [t('actionSimple')]: item.titre || 'Sans titre',
        [t('status')]: item.statut || 'N/A',
        [t('priority')]: item.priorité || 'Normale',
        [t('assignedTo')]: userMap.get(item.assigné_à?.toString())?.nom_complet || 'Non assigné',
        [t('dueDate')]: safeFormatDate(item.date_échéance),
        [t('description')]: (item.description || '').replace(/[\n\r]/g, ' ').substring(0, 200),
      }));

      if (projet) {
        csvData.unshift({
          [t('actionSimple')]: `# Projet: ${projet.nom}`,
          [t('status')]: `Statut: ${projet.statut}`,
          [t('priority')]: `Début: ${safeFormatDate(projet.date_début)}`,
          [t('assignedTo')]: `Fin: ${safeFormatDate(projet.date_fin)}`,
          [t('dueDate')]: '',
          [t('description')]: '',
        });
      }
    } else if (reportType === 'performance') {
      csvData = users.map((u) => {
        const userTasks = tasks.filter((item) => item.assigné_à?.toString() === u._id);
        const completed = userTasks.filter((item) => item.statut === 'Terminé').length;
        const inProgress = userTasks.filter((item) => item.statut === 'En cours').length;
        const rate = userTasks.length > 0 ? ((completed / userTasks.length) * 100).toFixed(0) : 0;

        return {
          [t('collaborator')]: u.nom_complet || 'N/A',
          Email: u.email || 'N/A',
          [t('totalActions')]: userTasks.length,
          [t('victories')]: completed,
          [t('inProgress')]: inProgress,
          [t('successRate')]: `${rate}%`,
          [t('evaluationLabel')]:
            rate >= 80
              ? t('radiant')
              : rate >= 60
                ? t('greatMomentum')
                : rate >= 40
                  ? t('inProgressGrowth')
                  : t('needSupport'),
        };
      });
    }

    // Vérifier qu'il y a des données
    if (csvData.length === 0) {
      if (reportType === 'global' && projects.length === 0) {
        throw new Error('Aucun projet disponible pour générer le rapport');
      } else if (reportType === 'projet') {
        const projectTasks = tasks.filter((item) => item.projet_id === selectedProject);
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
      '',
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
  },
};
