import { Reading, CATEGORIES } from '../types';
import {
  DiaryStats,
  formatDateFull,
  formatTime,
  getCategoryIndex,
  groupByTimeOfDay,
} from './bloodPressure';

export interface PdfReportOptions {
  readings: Reading[];
  stats: DiaryStats;
  patientName?: string;
  doctorNotes?: string;
}

/**
 * Converts a UTF-8 JavaScript string into a PDF WinAnsiEncoding literal string (...)
 * Properly maps Italian accented characters, dashes, bullets, etc.
 */
function toPdfText(input: string): string {
  // Normalize common Unicode punctuation to WinAnsi equivalents
  const normalized = input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2665/g, '');

  let out = '(';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      // Escape (, ), \
      out += '\\' + String.fromCharCode(code);
    } else if (code >= 32 && code <= 126) {
      out += String.fromCharCode(code);
    } else if (code >= 160 && code <= 255) {
      // Latin-1 / WinAnsi accented chars (à, è, é, ì, ò, ù, °, ·, etc.) as octal escape
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  out += ')';
  return out;
}

function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return [Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3))];
}

function truncateText(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars - 3) + '...';
}

/**
 * Generates a complete, clinical-grade A4 PDF file (Uint8Array) synchronously
 * with zero external dependencies so it works 100% offline on iPhone, Android, and PC.
 */
export function generateDoctorReportPdfBytes(options: PdfReportOptions): Uint8Array {
  const { readings, stats, patientName = '', doctorNotes = '' } = options;

  // A4 dimensions in points: 595.28 x 841.89
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  const pages: string[][] = [];
  let currentCmds: string[] = [];

  const startNewPage = () => {
    currentCmds = [];
    pages.push(currentCmds);
  };

  const setFillHex = (hex: string) => {
    const [r, g, b] = hexToRgb01(hex);
    currentCmds.push(`${r} ${g} ${b} rg`);
  };

  const setStrokeHex = (hex: string) => {
    const [r, g, b] = hexToRgb01(hex);
    currentCmds.push(`${r} ${g} ${b} RG`);
  };

  // topY is measured from the TOP of the page (0 = top, 841.89 = bottom) for easy layout
  const drawRect = (x: number, topY: number, w: number, h: number, fillHex?: string, strokeHex?: string, lineWidth = 0.75) => {
    const pdfY = pageHeight - topY - h;
    currentCmds.push(`${lineWidth} w`);
    if (fillHex && strokeHex) {
      setFillHex(fillHex);
      setStrokeHex(strokeHex);
      currentCmds.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
    } else if (fillHex) {
      setFillHex(fillHex);
      currentCmds.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    } else if (strokeHex) {
      setStrokeHex(strokeHex);
      currentCmds.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
    }
  };

  const drawLine = (x1: number, topY1: number, x2: number, topY2: number, strokeHex = '#cbd5e1', lineWidth = 0.6) => {
    const y1 = pageHeight - topY1;
    const y2 = pageHeight - topY2;
    currentCmds.push(`${lineWidth} w`);
    setStrokeHex(strokeHex);
    currentCmds.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };

  // Font keys: F1 = Helvetica, F2 = Helvetica-Bold, F3 = Helvetica-Oblique
  const drawText = (
    text: string,
    x: number,
    topY: number,
    fontSize: number,
    font: 'F1' | 'F2' | 'F3' = 'F1',
    colorHex = '#0f172a'
  ) => {
    const pdfY = pageHeight - topY - fontSize * 0.82;
    setFillHex(colorHex);
    currentCmds.push(
      `BT /${font} ${fontSize} Tf ${x.toFixed(2)} ${pdfY.toFixed(2)} Td ${toPdfText(text)} Tj ET`
    );
  };

  // Start Page 1
  startNewPage();
  let y = margin;

  // --- 1. Header Banner ---
  drawRect(margin, y, contentWidth, 58, '#0a192f');
  drawText('DIARIO DELLA PRESSIONE ARTERIOSA', margin + 16, y + 14, 16, 'F2', '#ffffff');
  drawText(
    'Report clinico domiciliare secondo le Linee Guida Europee ESC/ESH',
    margin + 16,
    y + 35,
    9.5,
    'F1',
    '#93c5fd'
  );
  const reportDateStr = `Data report: ${formatDateFull(Date.now())}`;
  drawText(reportDateStr, pageWidth - margin - 135, y + 18, 9, 'F2', '#e2e8f0');
  y += 68;

  // --- 2. Patient & Period Info Bar ---
  const firstDate = formatDateFull(readings[0].timestamp);
  const lastDate = formatDateFull(readings[readings.length - 1].timestamp);
  drawRect(margin, y, contentWidth, 38, '#f8fafc', '#cbd5e1', 0.8);
  drawText('PAZIENTE:', margin + 12, y + 8, 8, 'F2', '#64748b');
  drawText(
    patientName.trim() ? patientName.trim() : 'Non specificato',
    margin + 12,
    y + 20,
    11,
    'F2',
    '#0f172a'
  );

  drawText('PERIODO DI RILEVAZIONE:', margin + 250, y + 8, 8, 'F2', '#64748b');
  drawText(
    `Dal ${firstDate} al ${lastDate} (${readings.length} misurazioni)`,
    margin + 250,
    y + 20,
    10.5,
    'F2',
    '#0f172a'
  );
  y += 48;

  // --- 3. Four Summary Cards ---
  const cardGap = 8;
  const cardW = (contentWidth - cardGap * 3) / 4;
  const cardH = 58;

  // Card 1: Media
  drawRect(margin, y, cardW, cardH, '#f8fafc', '#cbd5e1', 0.8);
  drawText('Pressione Media', margin + 10, y + 8, 8.5, 'F1', '#64748b');
  drawText(`${stats.avgSystolic}/${stats.avgDiastolic} mmHg`, margin + 10, y + 23, 13, 'F2', '#0f172a');
  drawText(stats.avgCategory.name, margin + 10, y + 41, 8.5, 'F2', stats.avgCategory.color);

  // Card 2: Frequenza Media
  const c2x = margin + cardW + cardGap;
  drawRect(c2x, y, cardW, cardH, '#f8fafc', '#cbd5e1', 0.8);
  drawText('Frequenza Media', c2x + 10, y + 8, 8.5, 'F1', '#64748b');
  drawText(stats.avgPulse ? `${stats.avgPulse} bpm` : '-- bpm', c2x + 10, y + 23, 13, 'F2', '#0284c7');
  drawText(` Differenziale: ${stats.pulsePressure} mmHg`, c2x + 7, y + 41, 8, 'F1', '#64748b');

  // Card 3: Picco Massimo
  const c3x = margin + (cardW + cardGap) * 2;
  drawRect(c3x, y, cardW, cardH, '#f8fafc', '#cbd5e1', 0.8);
  drawText('Picco Massimo', c3x + 10, y + 8, 8.5, 'F1', '#64748b');
  drawText(`${stats.maxSystolic}/${stats.maxDiastolic} mmHg`, c3x + 10, y + 23, 13, 'F2', '#e11d48');
  drawText(`Min: ${stats.minSystolic}/${stats.minDiastolic} mmHg`, c3x + 10, y + 41, 8, 'F1', '#64748b');

  // Card 4: Target < 140/90
  const c4x = margin + (cardW + cardGap) * 3;
  drawRect(c4x, y, cardW, cardH, '#f8fafc', '#cbd5e1', 0.8);
  drawText('Target < 140/90', c4x + 10, y + 8, 8.5, 'F1', '#64748b');
  drawText(`${stats.pctNormal}%`, c4x + 10, y + 23, 14, 'F2', '#2563eb');
  drawText(`${stats.normalCount} su ${stats.count} nella norma`, c4x + 10, y + 41, 8, 'F1', '#64748b');

  y += cardH + 14;

  // --- 4. Time of Day Breakdown ---
  drawText('Confronto per Fasce Orarie', margin, y, 10.5, 'F2', '#0f172a');
  y += 15;

  const groups = groupByTimeOfDay(readings);
  const todGap = 8;
  const todW = (contentWidth - todGap * 2) / 3;
  const todH = 48;

  groups.forEach((g, idx) => {
    const gx = margin + idx * (todW + todGap);
    drawRect(gx, y, todW, todH, '#f8fafc', '#cbd5e1', 0.8);
    drawText(`${g.name} (${g.timeRange})`, gx + 10, y + 8, 8.5, 'F2', '#334155');
    const valStr = g.avgSys ? `${g.avgSys}/${g.avgDia} mmHg` : 'Nessuna lettura';
    drawText(valStr, gx + 10, y + 22, 11.5, 'F2', '#0f172a');
    const subStr = g.avgPulse
      ? `Polso medio: ${g.avgPulse} bpm (${g.readings.length} letture)`
      : `${g.readings.length} letture registrate`;
    drawText(subStr, gx + 10, y + 36, 7.5, 'F1', '#0284c7');
  });

  y += todH + 14;

  // --- 5. Optional Doctor Notes / Therapy ---
  if (doctorNotes.trim()) {
    drawRect(margin, y, contentWidth, 42, '#fffbeb', '#fcd34d', 0.8);
    drawText('NOTE CLINICHE / TERAPIA IN ATTO:', margin + 10, y + 8, 8, 'F2', '#b45309');
    const lines = doctorNotes.trim().split(/\r?\n/).slice(0, 2);
    lines.forEach((line, i) => {
      drawText(truncateText(line, 95), margin + 10, y + 20 + i * 10, 8.5, 'F1', '#0f172a');
    });
    y += 52;
  }

  // --- 6. Readings Table (All readings in reverse chronological order, paginated) ---
  drawText(`Elenco Misurazioni Registrate (${readings.length})`, margin, y, 10.5, 'F2', '#0f172a');
  y += 14;

  const colX = {
    date: margin + 6,
    sys: margin + 115,
    dia: margin + 165,
    bpm: margin + 215,
    arm: margin + 258,
    cat: margin + 295,
    notes: margin + 405,
  };

  const drawTableHeader = (topY: number) => {
    drawRect(margin, topY, contentWidth, 20, '#e2e8f0', '#cbd5e1', 0.7);
    drawText('DATA E ORA', colX.date, topY + 6, 7.5, 'F2', '#334155');
    drawText('SIST.', colX.sys, topY + 6, 7.5, 'F2', '#334155');
    drawText('DIAST.', colX.dia, topY + 6, 7.5, 'F2', '#334155');
    drawText('BPM', colX.bpm, topY + 6, 7.5, 'F2', '#334155');
    drawText('BR.', colX.arm, topY + 6, 7.5, 'F2', '#334155');
    drawText('CATEGORIA ESC/ESH', colX.cat, topY + 6, 7.5, 'F2', '#334155');
    drawText('ANNOTAZIONI', colX.notes, topY + 6, 7.5, 'F2', '#334155');
    return topY + 20;
  };

  y = drawTableHeader(y);

  const sortedDesc = [...readings].reverse();
  const rowH = 18;
  const maxBottomY = pageHeight - 50;

  sortedDesc.forEach((r, idx) => {
    if (y + rowH > maxBottomY) {
      startNewPage();
      y = margin;
      drawText('DIARIO DELLA PRESSIONE ARTERIOSA - Seguito misurazioni', margin, y, 10, 'F2', '#64748b');
      y += 16;
      y = drawTableHeader(y);
    }

    if (idx % 2 === 1) {
      drawRect(margin, y, contentWidth, rowH, '#f8fafc');
    }
    drawLine(margin, y + rowH, margin + contentWidth, y + rowH, '#e2e8f0', 0.5);

    const cat = CATEGORIES[getCategoryIndex(r.systolic, r.diastolic)];
    const dtStr = `${formatDateFull(r.timestamp)}, ${formatTime(r.timestamp)}`;

    drawText(dtStr, colX.date, y + 5, 8, 'F1', '#0f172a');
    drawText(`${r.systolic}`, colX.sys, y + 5, 8.5, 'F2', '#e11d48');
    drawText(`${r.diastolic}`, colX.dia, y + 5, 8.5, 'F2', '#2563eb');
    drawText(r.pulse ? `${r.pulse}` : '-', colX.bpm, y + 5, 8, 'F1', '#0284c7');
    drawText(r.arm === 'right' ? 'Dx' : 'Sx', colX.arm, y + 5, 8, 'F1', '#64748b');
    drawText(cat.name, colX.cat, y + 5, 8, 'F2', cat.color);
    drawText(truncateText(r.notes || '-', 24), colX.notes, y + 5, 7.5, 'F3', '#475569');

    y += rowH;
  });

  // Add footer to all pages
  const totalPages = pages.length;
  pages.forEach((cmds, pageIdx) => {
    currentCmds = cmds;
    const footerY = pageHeight - 30;
    drawLine(margin, footerY - 4, pageWidth - margin, footerY - 4, '#cbd5e1', 0.5);
    drawText(
      'Classificazione basata sulle Linee Guida Europee ESC/ESH. Documento ad uso informativo per il medico curante.',
      margin,
      footerY,
      7.5,
      'F1',
      '#64748b'
    );
    drawText(
      `Pagina ${pageIdx + 1} di ${totalPages}`,
      pageWidth - margin - 55,
      footerY,
      7.5,
      'F2',
      '#64748b'
    );
  });

  // --- Assemble valid PDF 1.4 binary ---
  // Object IDs:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica)
  // 4: Font F2 (Helvetica-Bold)
  // 5: Font F3 (Helvetica-Oblique)
  // 6 .. 6 + 2*N - 1: Page object + Content stream object for each page
  const objects: string[] = [];

  const pageObjIds: number[] = [];
  let nextObjId = 6;

  const pageEntries = pages.map((cmds) => {
    const pageId = nextObjId++;
    const contentId = nextObjId++;
    pageObjIds.push(pageId);
    const streamData = cmds.join('\n');
    return { pageId, contentId, streamData };
  });

  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`;
  objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
  objects[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;
  objects[5] = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj\n`;

  for (const entry of pageEntries) {
    objects[entry.pageId] =
      `${entry.pageId} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ` +
      `/Contents ${entry.contentId} 0 R >>\nendobj\n`;

    objects[entry.contentId] =
      `${entry.contentId} 0 obj\n` +
      `<< /Length ${entry.streamData.length} >>\nstream\n` +
      `${entry.streamData}\nendstream\nendobj\n`;
  }

  let pdfBody = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdfBody.length;
    pdfBody += objects[i];
  }

  const xrefOffset = pdfBody.length;
  pdfBody += `xref\n0 ${objects.length}\n`;
  pdfBody += `0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    pdfBody += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdfBody += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdfBody.length);
  for (let i = 0; i < pdfBody.length; i++) {
    bytes[i] = pdfBody.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}

export function isIosStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
  return isIOS && isStandalone;
}

export function submitToExternalSafariPort(params: {
  base64: string;
  filename: string;
  mimeType: string;
  disposition: 'inline' | 'attachment';
}) {
  const host = window.location.hostname || 'localhost';
  const actionUrl = `${window.location.protocol}//${host}:3001/api/open-file`;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.target = '_blank';
  form.style.display = 'none';

  for (const [key, value] of Object.entries(params)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => {
    if (form.parentNode) form.parentNode.removeChild(form);
  }, 2000);
}

/**
 * Shares or downloads the generated PDF report, including full support for
 * iOS Home Screen Web Apps (navigator.standalone === true) over both HTTPS and HTTP.
 */
export async function saveOrSharePdfReport(
  options: PdfReportOptions,
  disposition: 'inline' | 'attachment' = 'attachment'
): Promise<'shared' | 'downloaded' | 'safari'> {
  const pdfBytes = generateDoctorReportPdfBytes(options);
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `Report-Pressione-${dateTag}.pdf`;
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isMobile = /iphone|ipad|ipod|android/i.test(window.navigator.userAgent);

  // 1. Try native iOS / mobile Web Share API Level 2 (works inside Home Screen PWA on HTTPS)
  try {
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    if (isMobile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Report Pressione Arteriosa',
        text: 'Report clinico del Diario della Pressione Arteriosa (ESC/ESH)',
      });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'shared';
    }
  }

  const base64 = uint8ArrayToBase64(pdfBytes);

  // 2. If running inside an iOS Home Screen WebClip over HTTP, synchronously submit to port 3001
  // (cross-origin port) so iOS opens the PDF in SFSafariViewController with native Print, Share & Done buttons!
  if (isIosStandaloneMode()) {
    submitToExternalSafariPort({
      base64,
      filename,
      mimeType: 'application/pdf',
      disposition: 'inline',
    });
    return 'safari';
  }

  // 3. Regular iOS Safari browser tab: use data:application/octet-stream;base64 to trigger native Download prompt
  if (isIOS) {
    const dataUrl = `data:application/octet-stream;base64,${base64}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return 'downloaded';
  }

  // 4. Desktop browser direct download
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}



