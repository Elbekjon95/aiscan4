/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
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

  const shortId = data.request_id ? String(data.request_id).substring(0, 10).toUpperCase() : 'N/A';
  const auditorName = data.auditor_name || '777';
  const docTitleValue = data.document_title || data.file_name || 'N/A';

  // Construct a concise, high-contrast, instantly scannable QR payload
  const qrPayload = `AISCAN ELECTRONIC AUDIT VERIFIED
Hujjat: ${docTitleValue.substring(0, 45)}
ID: #${shortId}
Auditor: ${auditorName}
Sana: ${new Date().toLocaleDateString()}
Jami Ball: ${data.total_score || data.score || 0}%
Muvofiqlik: ${data.compliance_score || 0}%
Tarafkashlik: ${data.favoritism_score || 0}%`;

  // Generate ultra-clean, high-contrast QR Code Data URL with standard quiet zone
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 2,
      width: 400,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A', // Dark navy black for maximum scanner recognition
        light: '#FFFFFF'  // Pure white background
      }
    });
  } catch (e) {
    console.warn('QR Code generation failed:', e);
  }

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
  
  doc.text(`ID: #${shortId}`, pageWidth - 15, 27, { align: 'right' });
  doc.text(`Auditor: ${auditorName}`, pageWidth - 15, 34, { align: 'right' });

  // --- MAIN TITLE ---
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont(currentFont, 'bold');
  doc.text(t('label_main').toUpperCase(), 15, 52);

  // --- DOCUMENT TITLE ---
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
  const tableMargin = { top: 60, bottom: 50, left: 15, right: 15 };

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
      if (currentY > pageHeight - 70) {
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

  // --- FOOTER & HIGH-CONTRAST SCANNABLE QR BADGE ---
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

    // Official Verification Badge Box
    const stampWidth = 76;
    const stampHeight = 28;
    const stampX = pageWidth - stampWidth - 15;
    const stampY = pageHeight - stampHeight - 18;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 58, 138); 
    doc.setLineWidth(0.6);
    doc.roundedRect(stampX, stampY, stampWidth, stampHeight, 1.5, 1.5, 'FD');
    doc.setLineWidth(0.2);
    doc.roundedRect(stampX + 0.8, stampY + 0.8, stampWidth - 1.6, stampHeight - 1.6, 1, 1, 'D');

    if (qrDataUrl) {
      // 25mm x 25mm crisp QR Code image with proper margin inside
      doc.addImage(qrDataUrl, 'PNG', stampX + stampWidth - 26.5, stampY + 1.5, 25, 25);
    }

    doc.setTextColor(30, 58, 138);
    doc.setFont(currentFont, 'bold');
    doc.setFontSize(10);
    doc.text('AISCAN', stampX + 3.5, stampY + 7);
    
    doc.setFontSize(6.5);
    doc.setFont(currentFont, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL VERIFIED AUDIT', stampX + 3.5, stampY + 12);

    doc.setFont(currentFont, 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`ID: #${shortId}`, stampX + 3.5, stampY + 16.5);
    doc.text(`Auditor: ${auditorName}`, stampX + 3.5, stampY + 20.5);
    doc.text(`Score: ${data.total_score || data.score || 0}%`, stampX + 3.5, stampY + 24.5);
  }

  doc.save(`AISCAN_AUDIT_${data.request_id || 'REPORT'}.pdf`);
};

export const exportCorrectedToPDF = async (text: string, title: string) => {
  const doc = new jsPDF();

  const robotoBase64 = await loadRobotoFont();
  let fontLoaded = false;

  if (robotoBase64) {
    try {
      doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
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
  const margin = 15;
  const maxLineWidth = pageWidth - (margin * 2);

  // Concise, scannable QR payload for corrected PDF
  const qrPayload = `AISCAN OPTIMIZED DOCUMENT VERIFIED
Hujjat: ${(title || 'Optimallashtirilgan Hujjat').substring(0, 45)}
Sana: ${new Date().toLocaleDateString()}
Status: VERIFIED & AUTHENTICATED BY AISCAN SYSTEM`;

  // Generate high-contrast, clean QR Code Data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 2,
      width: 400,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    });
  } catch (e) {
    console.warn('QR Code generation failed:', e);
  }

  let currentY = 20;

  // Add Document Header
  doc.setFont(currentFont, 'bold');
  doc.setFontSize(14);
  const headerText = (title || 'OPTIMALLASHTIRILGAN HUJJAT').toUpperCase();
  const headerLines = doc.splitTextToSize(headerText, maxLineWidth);
  headerLines.forEach((line: string) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  });
  
  currentY += 5; // spacing

  // Parse and render lines
  const lines = text.split('\n');
  doc.setFontSize(11);
  doc.setFont(currentFont, 'normal');

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      currentY += 5; // blank line
      continue;
    }

    let isHeading = false;
    let size = 11;
    let style = 'normal';

    if (line.startsWith('# ')) {
      line = line.substring(2).trim();
      size = 14;
      style = 'bold';
      isHeading = true;
    } else if (line.startsWith('## ')) {
      line = line.substring(3).trim();
      size = 13;
      style = 'bold';
      isHeading = true;
    } else if (line.startsWith('### ')) {
      line = line.substring(4).trim();
      size = 12;
      style = 'bold';
      isHeading = true;
    }

    doc.setFont(currentFont, style);
    doc.setFontSize(size);

    let isBullet = false;
    if (line.startsWith('- ') || line.startsWith('* ')) {
      line = line.substring(2).trim();
      isBullet = true;
    }

    const cleanLineText = line.replace(/\*\*/g, '');
    const prefix = isBullet ? '• ' : '';
    const textToDraw = prefix + cleanLineText;

    const wrappedLines = doc.splitTextToSize(textToDraw, maxLineWidth);

    for (let wrappedLine of wrappedLines) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        if (fontLoaded) doc.setFont('Roboto', style);
        currentY = 20;
      }
      doc.text(wrappedLine, margin, currentY);
      currentY += isHeading ? 7 : 6;
    }
    currentY += 2; // spacing after paragraph
  }

  // Draw QR Stamp on all pages of optimized document
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const stampWidth = 76;
    const stampHeight = 28;
    const stampX = pageWidth - stampWidth - 15;
    const stampY = pageHeight - stampHeight - 10;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 58, 138); 
    doc.setLineWidth(0.6);
    doc.roundedRect(stampX, stampY, stampWidth, stampHeight, 1.5, 1.5, 'FD');
    doc.setLineWidth(0.2);
    doc.roundedRect(stampX + 0.8, stampY + 0.8, stampWidth - 1.6, stampHeight - 1.6, 1, 1, 'D');

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', stampX + stampWidth - 26.5, stampY + 1.5, 25, 25);
    }

    doc.setTextColor(30, 58, 138);
    doc.setFont(currentFont, 'bold');
    doc.setFontSize(10);
    doc.text('AISCAN', stampX + 3.5, stampY + 7);
    
    doc.setFontSize(6.5);
    doc.setFont(currentFont, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('VERIFIED OPTIMIZED DOC', stampX + 3.5, stampY + 12);

    doc.setFont(currentFont, 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`AUTHENTICATED SYSTEM`, stampX + 3.5, stampY + 16.5);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, stampX + 3.5, stampY + 20.5);
  }

  doc.save(`${(title || 'hujjat').replace(/[^a-zA-Z0-9А-Яа-яЎўҚқҒғҲҳ_.-]/g, '_')}_optimized.pdf`);
};
