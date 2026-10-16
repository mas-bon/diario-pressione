import * as XLSX from 'xlsx';
import { Reading } from '../types';
import { formatDateFull, formatTime, pad, getCategoryInfo } from './bloodPressure';

const MONTH_NAMES = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function parseDateCell(val: unknown): Date | null {
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  if (typeof val === 'number' && val > 20000) {
    // Excel serial date format
    const d = new Date(Math.floor(val - 25569) * 864e5);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const s = String(val == null ? '' : val).trim().toLowerCase();
  if (!s) return null;

  // e.g. "15 ott 2026"
  const mItalian = s.match(/^(\d{1,2})\s+([a-zà-ú]+)\.?\s+(\d{4})/);
  if (mItalian) {
    const mIdx = MONTH_NAMES.indexOf(mItalian[2].slice(0, 3));
    if (mIdx >= 0) return new Date(+mItalian[3], mIdx, +mItalian[1]);
  }

  // ISO: "2026-10-15"
  const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mIso) {
    return new Date(+mIso[1], +mIso[2] - 1, +mIso[3]);
  }

  // European: "15/10/2026" or "15-10-2026"
  const mEu = s.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{2,4})/);
  if (mEu) {
    let yr = +mEu[3];
    if (yr < 100) yr += 2000;
    return new Date(yr, +mEu[2] - 1, +mEu[1]);
  }

  const parsed = new Date(s);
  return !isNaN(parsed.getTime()) ? parsed : null;
}

export function parseTimeCell(val: unknown): { hours: number; minutes: number } {
  if (typeof val === 'number') {
    // Excel time fraction (0.5 = 12:00)
    if (val < 1) {
      const totalMinutes = Math.round(val * 1440);
      return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
    }
  }
  if (val instanceof Date) {
    return { hours: val.getHours(), minutes: val.getMinutes() };
  }
  const s = String(val || '');
  const m = s.match(/(\d{1,2})[:.](\d{2})/);
  if (m) {
    return { hours: parseInt(m[1], 10), minutes: parseInt(m[2], 10) };
  }
  return { hours: 12, minutes: 0 };
}

export function parseCsvRows(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const sep = semiCount >= commaCount ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (insideQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      insideQuotes = true;
    } else if (ch === sep) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c !== ''));
}

export function parseRowsToReadings(rows: unknown[][]): Reading[] {
  if (!rows || rows.length < 2) return [];

  // Find header row index
  const headerIdx = rows.findIndex((row) =>
    row.some((cell) => /sistol|systol|^sys/i.test(String(cell || '')))
  );

  let dIdx = 0;
  let tIdx = 1;
  let sIdx = 2;
  let aIdx = 3;
  let pIdx = 4;
  let nIdx = 5;

  if (headerIdx >= 0) {
    const headers = rows[headerIdx].map((c) => String(c || '').toLowerCase());
    const findCol = (regex: RegExp) => headers.findIndex((h) => regex.test(h));

    const foundD = findCol(/data|date|giorno/);
    const foundT = findCol(/^ora|time|orario/);
    const foundS = findCol(/sistol|systol|^sys/);
    const foundA = findCol(/diastol|^dia/);
    const foundP = findCol(/puls|bpm|freq|heart|hr|polso/);
    const foundN = findCol(/annot|note|nota|comment/);

    if (foundD >= 0) dIdx = foundD;
    if (foundT >= 0) tIdx = foundT;
    if (foundS >= 0) sIdx = foundS;
    if (foundA >= 0) aIdx = foundA;
    if (foundP >= 0) pIdx = foundP;
    if (foundN >= 0) nIdx = foundN;
  }

  const dataRows = rows.slice(headerIdx >= 0 ? headerIdx + 1 : 0);
  const result: Reading[] = [];

  dataRows.forEach((r, idx) => {
    const dateVal = parseDateCell(r[dIdx]);
    const sysRaw = parseFloat(String(r[sIdx] || '').replace(',', '.'));
    const diaRaw = parseFloat(String(r[aIdx] || '').replace(',', '.'));

    if (!dateVal || isNaN(sysRaw) || isNaN(diaRaw) || sysRaw <= 0 || diaRaw <= 0) {
      return;
    }

    const { hours, minutes } = tIdx >= 0 && r[tIdx] != null ? parseTimeCell(r[tIdx]) : { hours: 12, minutes: 0 };
    const dateObj = new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate(), hours, minutes);
    const pulseRaw = pIdx >= 0 && r[pIdx] != null ? parseFloat(String(r[pIdx]).replace(',', '.')) : null;
    const notesRaw = nIdx >= 0 && r[nIdx] != null ? String(r[nIdx]).trim() : '';

    result.push({
      id: `imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: dateObj.getTime(),
      systolic: Math.round(sysRaw),
      diastolic: Math.round(diaRaw),
      pulse: pulseRaw && pulseRaw > 0 ? Math.round(pulseRaw) : null,
      notes: notesRaw,
      arm: 'left',
      position: 'sitting',
      createdAt: dateObj.getTime(),
      updatedAt: Date.now(),
    });
  });

  return result.sort((a, b) => a.timestamp - b.timestamp);
}

export async function parseFileToReadings(file: File): Promise<Reading[]> {
  const isJson = /\.json$/i.test(file.name);
  if (isJson) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.readings) ? parsed.readings : [];
    const valid: Reading[] = [];
    items.forEach((item: Record<string, unknown>, idx: number) => {
      const sys = Number(item.systolic ?? item.s);
      const dia = Number(item.diastolic ?? item.d);
      const ts = Number(item.timestamp ?? item.ts ?? Date.now());
      if (!isNaN(sys) && !isNaN(dia) && sys > 0 && dia > 0 && !isNaN(ts)) {
        valid.push({
          id: typeof item.id === 'string' ? item.id : `json-${Date.now()}-${idx}`,
          timestamp: ts,
          systolic: Math.round(sys),
          diastolic: Math.round(dia),
          pulse: item.pulse != null && Number(item.pulse) > 0 ? Math.round(Number(item.pulse)) : null,
          notes: typeof item.notes === 'string' ? item.notes : '',
          arm: item.arm === 'right' ? 'right' : 'left',
          position:
            item.position === 'lying' || item.position === 'standing' ? item.position : 'sitting',
          createdAt: Number(item.createdAt) || ts,
          updatedAt: Date.now(),
        });
      }
    });
    return valid.sort((a, b) => a.timestamp - b.timestamp);
  }

  const isCsv = /\.csv$/i.test(file.name);

  if (isCsv) {
    const text = await file.text();
    const rows = parseCsvRows(text);
    return parseRowsToReadings(rows);
  }

  // Handle .xlsx, .xls
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: true, defval: '' });

  return parseRowsToReadings(sheetRows);
}

export function exportToCsv(readings: Reading[], filename = 'diario-pressione.csv') {
  const header = ['Data', 'Ora', 'Sistolica', 'Diastolica', 'Pulsazioni', 'Categoria ESC/ESH', 'Note'];
  const rows = readings.map((r) => {
    const cat = getCategoryInfo(r.systolic, r.diastolic);
    const d = new Date(r.timestamp);
    const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const tStr = formatTime(r.timestamp);
    const noteClean = (r.notes || '').replace(/;/g, ',');
    return [dStr, tStr, r.systolic, r.diastolic, r.pulse || '', cat.name, noteClean].join(';');
  });

  // Include UTF-8 BOM so Excel opens Italian accents properly
  const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportToXlsx(readings: Reading[], filename = 'diario-pressione.xlsx') {
  const data = readings.map((r) => {
    const cat = getCategoryInfo(r.systolic, r.diastolic);
    return {
      Data: formatDateFull(r.timestamp),
      Ora: formatTime(r.timestamp),
      'Sistolica (mmHg)': r.systolic,
      'Diastolica (mmHg)': r.diastolic,
      'Pulsazioni (bpm)': r.pulse || '',
      'Categoria ESC/ESH': cat.name,
      'Braccio': r.arm === 'right' ? 'Destro' : 'Sinistro',
      'Posizione': r.position === 'lying' ? 'Sdraiato' : r.position === 'standing' ? 'In piedi' : 'Seduto',
      Note: r.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Diario Pressione');
  const xlsxArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([xlsxArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}

export function exportToJson(readings: Reading[], filename = 'backup-diario-pressione.json') {
  const payload = {
    app: 'Diario della Pressione Arteriosa',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    count: readings.length,
    readings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  downloadBlob(blob, filename);
}

async function downloadBlob(blob: Blob, filename: string) {
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;

  // 1. On HTTPS mobile, use native Share Sheet if available
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (isIOS && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
  }

  // 2. On iOS Home Screen Standalone over HTTP, submit to port 3001 so iOS opens SFSafariViewController
  if (isIOS && isStandalone) {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buffer.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, i + 0x8000)));
    }
    const base64 = window.btoa(binary);
    const host = window.location.hostname || 'localhost';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${window.location.protocol}//${host}:3001/api/open-file`;
    form.target = '_blank';
    form.style.display = 'none';

    for (const [k, v] of Object.entries({
      base64,
      filename,
      mimeType: blob.type || 'application/octet-stream',
      disposition: 'attachment',
    })) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 2000);
    return;
  }

  // 3. Standard browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}


