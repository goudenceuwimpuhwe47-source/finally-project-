import jsPDF from 'jspdf';

export type PdfKind = 'about' | 'receipt' | 'report';

export function useDownloadPdf() {
  const download = (kind: PdfKind = 'about') => {
    const doc = new jsPDF({ unit: 'pt' });

    // Header
    doc.setFillColor(27, 86, 226); // blue-600
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 64, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(16);
    doc.text('Chronic Care Connect Well', 32, 40);

    doc.setTextColor('#111111');
    doc.setFontSize(20);
    const title = kind === 'about' ? 'About This Project' : kind === 'receipt' ? 'Download Receipt' : 'Generated Report';
    doc.text(title, 32, 100);

    doc.setFontSize(12);
    const lines: string[] = [];
    if (kind === 'about') {
      lines.push(
        'This is a Final Year Project (FYP) focused on Medication Ordering and Care Coordination.',
        'Student: Byenvenue Fabrice',
        'Program: Information Technology, Year 3',
        'Institution: RP-College Ngoma',
        'Email: medicationorderingsystemforchr@gmail.com',
        'Phone: +250 786 500 175'
      );
    } else {
      lines.push('This PDF was generated from the web application.');
      lines.push('For official records, please contact the project owner.');
    }

    let y = 128;
    const maxWidth = doc.internal.pageSize.getWidth() - 64;
    lines.forEach((t) => {
      const wrapped = doc.splitTextToSize(t, maxWidth);
      doc.text(wrapped, 32, y);
      y += 20 + (wrapped.length - 1) * 14;
    });

    const filename = kind === 'about' ? 'About_Project.pdf' : kind === 'receipt' ? 'Receipt.pdf' : 'Report.pdf';
    doc.save(filename);
  };

  return { download };
}
