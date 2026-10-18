import { describe, expect, it } from 'vitest';
import {
  computeStats,
  formatTime,
  getCategoryIndex,
  getCategoryInfo,
  groupByTimeOfDay,
  pad,
} from './bloodPressure';
import { Reading } from '../types';

const reading = (over: Partial<Reading> = {}): Reading => ({
  id: 'a',
  timestamp: new Date(2026, 9, 15, 8, 0).getTime(),
  systolic: 120,
  diastolic: 80,
  pulse: 70,
  notes: '',
  arm: 'left',
  position: 'sitting',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('getCategoryIndex', () => {
  it.each([
    [110, 70, 0],
    [125, 70, 1],
    [110, 82, 1],
    [135, 70, 2],
    [145, 70, 3],
    [165, 70, 4],
    [185, 70, 5],
    [110, 112, 5],
  ])('%i/%i -> %i', (s, d, idx) => {
    expect(getCategoryIndex(s, d)).toBe(idx);
  });

  it('getCategoryInfo matches the index', () => {
    expect(getCategoryInfo(185, 70).index).toBe(5);
  });
});

describe('formatting', () => {
  it('pads numbers', () => {
    expect(pad(5)).toBe('05');
    expect(pad(12)).toBe('12');
  });

  it('formats time as HH:MM', () => {
    expect(formatTime(new Date(2026, 0, 1, 7, 5).getTime())).toBe('07:05');
  });
});

describe('computeStats', () => {
  it('returns null for empty input', () => {
    expect(computeStats([])).toBeNull();
  });

  it('computes averages for non-empty input', () => {
    const stats = computeStats([
      reading({ id: '1', systolic: 120, diastolic: 80 }),
      reading({ id: '2', systolic: 140, diastolic: 90 }),
    ]);
    expect(stats).not.toBeNull();
    expect(JSON.stringify(stats)).toContain('130');
  });
});

describe('groupByTimeOfDay', () => {
  it('returns groups without throwing', () => {
    expect(Array.isArray(groupByTimeOfDay([reading()]))).toBe(true);
  });
});
