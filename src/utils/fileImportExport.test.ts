import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildXlsxBuffer,
  buildXlsxRows,
  parseCsvRows,
  parseDateCell,
  parseJsonReadings,
  parseRowsToReadings,
  parseTimeCell,
} from './fileImportExport';
import { Reading } from '../types';

const sample: Reading = {
  id: 's1',
  timestamp: new Date(2026, 9, 15, 8, 30).getTime(),
  systolic: 132,
  diastolic: 84,
  pulse: 71,
  notes: 'mattina',
  arm: 'right',
  position: 'lying',
  createdAt: 1,
  updatedAt: 1,
};

describe('cell parsers', () => {
  it('parses italian, ISO and european dates', () => {
    expect(parseDateCell('15 ott 2026')).toEqual(new Date(2026, 9, 15));
    expect(parseDateCell('2026-10-15')).toEqual(new Date(2026, 9, 15));
    expect(parseDateCell('15/10/2026')).toEqual(new Date(2026, 9, 15));
    expect(parseDateCell('')).toBeNull();
  });

  it('parses times', () => {
    expect(parseTimeCell('08:30')).toEqual({ hours: 8, minutes: 30 });
    expect(parseTimeCell(0.5)).toEqual({ hours: 12, minutes: 0 });
    expect(parseTimeCell('boh')).toEqual({ hours: 12, minutes: 0 });
  });
});

describe('CSV import', () => {
  it('parses semicolon CSV with quotes', () => {
    const csv = 'Data;Ora;Sistolica;Diastolica;Pulsazioni;Note\r\n2026-10-15;08:30;130;85;70;"a; b"\r\n';
    const rows = parseCsvRows(csv);
    const res = parseRowsToReadings(rows);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ systolic: 130, diastolic: 85, pulse: 70, notes: 'a; b' });
  });

  it('skips out-of-range rows', () => {
    const csv = 'Data;Ora;Sistolica;Diastolica;Pulsazioni\n2026-10-15;08:00;400;85;70\n2026-10-15;09:00;120;80;300\n2026-10-15;10:00;120;80;\n';
    const res = parseRowsToReadings(parseCsvRows(csv));
    expect(res).toHaveLength(1);
    expect(res[0].pulse).toBeNull();
  });
});

describe('JSON import', () => {
  it('reads backup payloads and compact aliases, discarding invalid items', () => {
    const text = JSON.stringify({
      readings: [sample, { s: 118, d: 76, ts: 5000 }, { systolic: 10, diastolic: 5, timestamp: 1 }],
    });
    const res = parseJsonReadings(text);
    expect(res).toHaveLength(2);
    expect(res.map((x) => x.timestamp)).toEqual([5000, sample.timestamp]);
    expect(res[1]).toMatchObject({ id: 's1', arm: 'right', position: 'lying' });
  });

  it('accepts a bare array', () => {
    expect(parseJsonReadings(JSON.stringify([sample]))).toHaveLength(1);
  });
});

describe('XLSX export/import round trip', () => {
  it('exports rows and can be read back as readings', () => {
    expect(buildXlsxRows([sample])[0]).toMatchObject({ 'Sistolica (mmHg)': 132, Braccio: 'Destro', Posizione: 'Sdraiato' });

    const buffer = buildXlsxBuffer(XLSX, [sample]);
    const wb = XLSX.read(buffer, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    const res = parseRowsToReadings(rows);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ systolic: 132, diastolic: 84, pulse: 71, notes: 'mattina' });
  });
});
