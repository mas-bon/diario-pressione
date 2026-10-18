import { Reading } from '../types';

export const SYSTOLIC_RANGE = { min: 50, max: 300 } as const;
export const DIASTOLIC_RANGE = { min: 30, max: 200 } as const;
export const PULSE_RANGE = { min: 20, max: 250 } as const;

const inRange = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max;

export function isValidMeasurement(sys: number, dia: number, pulse: number | null | undefined): boolean {
  if (!Number.isFinite(sys) || !Number.isFinite(dia)) return false;
  if (!inRange(sys, SYSTOLIC_RANGE) || !inRange(dia, DIASTOLIC_RANGE)) return false;
  if (pulse != null && !(Number.isFinite(pulse) && inRange(pulse, PULSE_RANGE))) return false;
  return true;
}

/** Returns null for empty/zero pulse, NaN for non-numeric values, otherwise the rounded number. */
function normalizePulse(raw: unknown): number | null {
  if (raw == null || raw === '' || raw === 0) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

/** Validates a loosely-typed record. Returns null when it is invalid or out of range. */
export function sanitizeReading(raw: unknown, fallbackId: string): Reading | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const sys = Math.round(Number(item.systolic));
  const dia = Math.round(Number(item.diastolic));
  const ts = Number(item.timestamp);
  const pulse = normalizePulse(item.pulse);

  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (Number.isNaN(pulse)) return null;
  if (!isValidMeasurement(sys, dia, pulse)) return null;

  const createdAt = Number(item.createdAt);
  const updatedAt = Number(item.updatedAt);
  return {
    id: typeof item.id === 'string' && item.id ? item.id : fallbackId,
    timestamp: ts,
    systolic: sys,
    diastolic: dia,
    pulse,
    notes: typeof item.notes === 'string' ? item.notes : '',
    arm: item.arm === 'right' || item.arm === 'unspecified' ? item.arm : 'left',
    position: item.position === 'lying' || item.position === 'standing' ? item.position : 'sitting',
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : ts,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : ts,
  };
}

export function sanitizeReadings(items: unknown[], idPrefix = 'rec'): Reading[] {
  const out: Reading[] = [];
  items.forEach((item, idx) => {
    const r = sanitizeReading(item, `${idPrefix}-${idx}-${Date.now()}`);
    if (r) out.push(r);
  });
  return out;
}

const readingKey = (r: Reading) => `${r.timestamp}|${r.systolic}|${r.diastolic}`;

/** Merges lists, dropping duplicates (timestamp|systolic|diastolic, first occurrence wins) and sorting by timestamp. */
export function mergeReadings(...lists: Reading[][]): Reading[] {
  const seen = new Set<string>();
  const merged: Reading[] = [];
  for (const list of lists) {
    for (const r of list) {
      const key = readingKey(r);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }
  }
  return merged.sort((a, b) => a.timestamp - b.timestamp);
}
