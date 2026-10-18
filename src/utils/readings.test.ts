import { describe, expect, it } from 'vitest';
import { isValidMeasurement, mergeReadings, sanitizeReading, sanitizeReadings } from './readings';
import { buildCloudMigrationUrl, convertLegacyReadings, decodeMigratedReadings } from '../hooks/useLocalDiary';
import { Reading } from '../types';

const r = (over: Partial<Reading> = {}): Reading => ({
  id: 'x',
  timestamp: 1000,
  systolic: 120,
  diastolic: 80,
  pulse: 70,
  notes: '',
  arm: 'left',
  position: 'sitting',
  createdAt: 1000,
  updatedAt: 1000,
  ...over,
});

describe('isValidMeasurement', () => {
  it('accepts boundaries', () => {
    expect(isValidMeasurement(50, 30, 20)).toBe(true);
    expect(isValidMeasurement(300, 200, 250)).toBe(true);
    expect(isValidMeasurement(120, 80, null)).toBe(true);
  });

  it('rejects out of range', () => {
    expect(isValidMeasurement(49, 80, null)).toBe(false);
    expect(isValidMeasurement(301, 80, null)).toBe(false);
    expect(isValidMeasurement(120, 29, null)).toBe(false);
    expect(isValidMeasurement(120, 201, null)).toBe(false);
    expect(isValidMeasurement(120, 80, 19)).toBe(false);
    expect(isValidMeasurement(120, 80, 251)).toBe(false);
    expect(isValidMeasurement(NaN, 80, null)).toBe(false);
  });
});

describe('sanitizeReading(s)', () => {
  it('does not fall back to 120/80 defaults', () => {
    expect(sanitizeReading({ timestamp: 1, systolic: 'abc', diastolic: 80 }, 'id')).toBeNull();
    expect(sanitizeReading({ timestamp: 1, diastolic: 80 }, 'id')).toBeNull();
  });

  it('discards invalid pulse instead of keeping the record', () => {
    expect(sanitizeReading({ timestamp: 1, systolic: 120, diastolic: 80, pulse: 5 }, 'id')).toBeNull();
  });

  it('normalizes empty pulse to null and fills defaults', () => {
    const res = sanitizeReading({ timestamp: 5, systolic: 120.4, diastolic: 80, pulse: 0 }, 'fallback');
    expect(res).toMatchObject({ id: 'fallback', systolic: 120, pulse: null, arm: 'left', position: 'sitting' });
  });

  it('keeps only valid records', () => {
    const out = sanitizeReadings([
      { timestamp: 1, systolic: 120, diastolic: 80 },
      { timestamp: 2, systolic: 500, diastolic: 80 },
      null,
      'x',
    ]);
    expect(out).toHaveLength(1);
  });
});

describe('mergeReadings', () => {
  it('dedups by timestamp|systolic|diastolic keeping the first and sorts', () => {
    const merged = mergeReadings(
      [r({ id: 'a', timestamp: 30 }), r({ id: 'b', timestamp: 10 })],
      [r({ id: 'c', timestamp: 10 }), r({ id: 'd', timestamp: 20, systolic: 130 })]
    );
    expect(merged.map((x) => x.id)).toEqual(['b', 'd', 'a']);
  });

  it('does not mutate inputs', () => {
    const a = [r({ timestamp: 2 }), r({ timestamp: 1, systolic: 121 })];
    mergeReadings(a);
    expect(a[0].timestamp).toBe(2);
  });
});

describe('migration links', () => {
  it('round-trips readings with non-ASCII notes', () => {
    const src = [r({ id: 'm1', notes: 'caffè è già ☕' })];
    const url = new URL(buildCloudMigrationUrl(src));
    const decoded = decodeMigratedReadings(url.searchParams.get('migrate')!);
    expect(decoded?.[0]).toMatchObject({ id: 'm1', notes: 'caffè è già ☕', systolic: 120 });
  });

  it('decodes links produced by the legacy escape/encodeURIComponent encoder', () => {
    const json = JSON.stringify([{ i: 'old', t: 1000, s: 130, d: 85, p: null, n: 'è', a: 'right', o: 'lying' }]);
    const legacyB64 = Buffer.from(json, 'utf8').toString('base64');
    expect(decodeMigratedReadings(legacyB64)?.[0]).toMatchObject({ id: 'old', arm: 'right', position: 'lying', notes: 'è' });
  });

  it('drops invalid records and rejects garbage', () => {
    const b64 = Buffer.from(JSON.stringify([{ t: 1, s: 999, d: 80 }, { t: 2, s: 120, d: 80 }])).toString('base64');
    expect(decodeMigratedReadings(b64)).toHaveLength(1);
    expect(decodeMigratedReadings('!!!')).toBeNull();
  });

  it('converts legacy pa_v1 records and drops invalid ones', () => {
    const out = convertLegacyReadings([{ ts: 5, s: 125, d: 82, p: 66, n: 'ok' }, { ts: 6, s: 10, d: 5 }, {}]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ systolic: 125, pulse: 66, notes: 'ok' });
  });
});
