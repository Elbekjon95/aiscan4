/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getTranslation } from './translations';

/**
 * Shriftni CDN dan yuklash funksiyasi
 */
async function loadRobotoFont() {
  try {
    const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
    const arrayBuffer = await response.arrayBuffer();
    // ArrayBuffer ni Base64 ga o'tkazish
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Font fetch failed:', error);
    return null;
  }
}

export const exportToPDF = async (data: any, lang: string) => {
  const doc = new jsPDF();
  const t = (key: string) => getTranslation(lang, key);

  // 1. Shriftni yuklash va registratsiya qilish
  const robotoBase64 = await loadRobotoFont();
  let fontLoaded = false;

  if (robotoBase64) {
    try {
      doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
      // Hack: Register the same font for both styles
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold'); 
      doc.setFont('Roboto', 'normal');
      fontLoaded = true;
    } catch (e) {
      console.warn('Font add failed:', e);
    }
  }

  if (!fontLoaded) {
    doc.setFont('helvetica', 'normal');
  }

  const currentFont = fontLoaded ? 'Roboto' : 'helvetica';
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- HEADER SECTION ---
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont(currentFont, 'bold');
  doc.setFontSize(22);
  doc.text('AISCAN', 15, 20);
  
  doc.setFont(currentFont, 'normal');
  doc.setFontSize(9);
  doc.text('AI-POWERED PROCUREMENT AUDIT SYSTEM', 15, 27);
  
  doc.setFontSize(8);
  const dateStr = `${t('table_date')}: ${new Date().toLocaleString()}`;
  doc.text(dateStr, pageWidth - 15, 20, { align: 'right' });
  
  const shortId = data.request_id ? String(data.request_id).substring(0, 10).toUpperCase() : 'N/A';
  doc.text(`ID: #${shortId}`, pageWidth - 15, 27, { align: 'right' });

  // --- MAIN TITLE ---
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont(currentFont, 'bold');
  doc.text(t('label_main').toUpperCase(), 15, 52);

  // --- DOCUMENT TITLE ---
  const docTitleValue = data.document_title || data.file_name || 'N/A';
  
  autoTable(doc, {
    startY: 58,
    margin: { left: 15, right: 15 },
    body: [[`${t('table_file')}:`, docTitleValue]],
    theme: 'plain',
    styles: { font: currentFont, fontSize: 10, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 30 }, 
      1: { cellWidth: 'auto' } 
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;
  const tableMargin = { top: 60, bottom: 45, left: 15, right: 15 };

  // --- CONTENT SECTION ---
  autoTable(doc, {
    startY: currentY,
    margin: tableMargin,
    head: [[t('table_metrics').toUpperCase(), t('table_score').toUpperCase()]],
    body: [
      [t('total_score'), `${data.total_score || data.score || 0}%`],
      [t('compliance_score'), `${data.compliance_score || 0}%`],
      [t('favoritism_score'), `${data.favoritism_score || 0}%`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
    styles: { font: currentFont, fontSize: 10 },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  if (data.audit_basis && data.audit_basis.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: tableMargin,
      head: [[t('audit_basis_title').toUpperCase()]],
      body: data.audit_basis.map((b: string) => [`• ${b}`]),
      theme: 'plain',
      headStyles: { textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 10 },
      styles: { font: currentFont, fontSize: 9, cellPadding: 2 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  if (data.sections) {
    data.sections.forEach((section: any) => {
      if (currentY > pageHeight - 65) {
        doc.addPage();
        currentY = 45;
      }
      
      autoTable(doc, {
        startY: currentY,
        margin: tableMargin,
        head: [[section.title.toUpperCase()]],
        body: [
          [section.content],
          ...(section.details ? section.details.map((d: string) => [`- ${d}`]) : [])
        ],
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
        styles: { font: currentFont, fontSize: 10 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // --- FOOTER & STAMP ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(0, pageHeight - 15, pageWidth, pageHeight - 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const pageStr = `${t('page')} ${i} / ${totalPages}`;
    doc.text(pageStr, pageWidth / 2, pageHeight - 7, { align: 'center' });

    const stampX = pageWidth - 55;
    const stampY = pageHeight - 40;
    doc.setDrawColor(30, 58, 138); 
    doc.setLineWidth(0.6);
    doc.roundedRect(stampX, stampY, 40, 22, 1, 1, 'D');
    doc.setLineWidth(0.2);
    doc.roundedRect(stampX + 1, stampY + 1, 38, 20, 0.5, 0.5, 'D');

    doc.setTextColor(30, 58, 138);
    doc.setFont(currentFont, 'bold');
    doc.setFontSize(11);
    doc.text('AISCAN', stampX + 20, stampY + 8, { align: 'center' });
    doc.setFontSize(11);
    doc.text('AISCAN', stampX + 20, stampY + 8, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont(currentFont, 'normal');
    doc.text('ELECTRONIC AUDIT', stampX + 20, stampY + 13, { align: 'center' });
    doc.text('VERIFIED SYSTEM', stampX + 20, stampY + 17, { align: 'center' });
    doc.text(new Date().toLocaleDateString(), stampX + 20, stampY + 20, { align: 'center' });
  }

  doc.save(`AISCAN_AUDIT_${data.request_id || 'REPORT'}.pdf`);
};
