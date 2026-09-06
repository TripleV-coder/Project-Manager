/**
 * Regression coverage for the jsPDF 3 -> 4 / jspdf-autotable upgrade
 * (dependency security fix). reportExportService.generatePDF ends with
 * doc.save(fileName), a browser-only download trigger jsdom doesn't
 * implement (no URL.createObjectURL) — so this test exercises the same
 * jsPDF + jspdf-autotable API surface the service uses (construction,
 * drawing primitives, autoTable) via doc.output(), which is what actually
 * needed to keep working across the major-version bump.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

describe('jsPDF + jspdf-autotable (post-upgrade smoke test)', () => {
  test('constructs a document and reports page dimensions', () => {
    const doc = new jsPDF();
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(0);
    expect(doc.internal.pageSize.getHeight()).toBeGreaterThan(0);
  });

  test('drawing primitives used by reportExportService do not throw', () => {
    const doc = new jsPDF();
    expect(() => {
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 200, 40, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Rapport', 14, 20);
    }).not.toThrow();
  });

  test('autoTable renders a table into the document', () => {
    const doc = new jsPDF();
    expect(() => {
      autoTable(doc, {
        startY: 50,
        head: [['Tâche', 'Statut', 'Assigné à']],
        body: [
          ['Corriger le bug X', 'Terminé', 'Alice'],
          ['Écrire les tests', 'En cours', 'Bob'],
        ],
      });
    }).not.toThrow();
    // autoTable attaches lastAutoTable metadata to the doc on success.
    expect(doc.lastAutoTable).toBeTruthy();
    expect(doc.lastAutoTable.finalY).toBeGreaterThan(50);
  });

  test('produces non-empty binary output', () => {
    const doc = new jsPDF();
    doc.text('Test', 10, 10);
    const buffer = doc.output('arraybuffer');
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
