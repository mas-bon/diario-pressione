import { Reading, CategoryIndex, CATEGORIES, CategoryInfo } from '../types';

export const getCategoryIndex = (sys: number, dia: number): CategoryIndex => {
  if (sys >= 180 || dia >= 110) return 5;
  if (sys >= 160 || dia >= 100) return 4;
  if (sys >= 140 || dia >= 90) return 3;
  if (sys >= 130 || dia >= 85) return 2;
  if (sys >= 120 || dia >= 80) return 1;
  return 0;
};

export const getCategoryInfo = (sys: number, dia: number): CategoryInfo => {
  const idx = getCategoryIndex(sys, dia);
  return CATEGORIES[idx];
};

export const pad = (n: number) => String(n).padStart(2, '0');

export const formatDateFull = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateShort = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
  });
};

export const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateTime = (ts: number): string => {
  return `${formatDateFull(ts)}, ${formatTime(ts)}`;
};

export const getISODatetimeLocal = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export interface DiaryStats {
  count: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgPulse: number | null;
  maxSystolic: number;
  maxDiastolic: number;
  minSystolic: number;
  minDiastolic: number;
  pctNormal: number; // under 140/90
  normalCount: number;
  avgCategory: CategoryInfo;
  pulsePressure: number; // S - D
  meanArterialPressure: number; // D + (S-D)/3
}

export const computeStats = (readings: Reading[]): DiaryStats | null => {
  if (!readings.length) return null;

  const S = readings.map((r) => r.systolic);
  const D = readings.map((r) => r.diastolic);
  const P = readings.map((r) => r.pulse).filter((p): p is number => typeof p === 'number' && p > 0);

  const avgSys = Math.round(S.reduce((a, b) => a + b, 0) / S.length);
  const avgDia = Math.round(D.reduce((a, b) => a + b, 0) / D.length);
  const avgP = P.length ? Math.round(P.reduce((a, b) => a + b, 0) / P.length) : null;

  const normalCount = readings.filter((r) => r.systolic < 140 && r.diastolic < 90).length;
  const pctNormal = Math.round((normalCount / readings.length) * 100);

  const pulsePressure = avgSys - avgDia;
  const meanArterialPressure = Math.round(avgDia + (avgSys - avgDia) / 3);

  return {
    count: readings.length,
    avgSystolic: avgSys,
    avgDiastolic: avgDia,
    avgPulse: avgP,
    maxSystolic: Math.max(...S),
    maxDiastolic: Math.max(...D),
    minSystolic: Math.min(...S),
    minDiastolic: Math.min(...D),
    normalCount,
    pctNormal,
    avgCategory: getCategoryInfo(avgSys, avgDia),
    pulsePressure,
    meanArterialPressure,
  };
};

export interface TimeOfDayGroup {
  name: string;
  key: 'mattina' | 'pomeriggio' | 'sera' | 'notte';
  timeRange: string;
  readings: Reading[];
  avgSys: number | null;
  avgDia: number | null;
  avgPulse: number | null;
}

export const groupByTimeOfDay = (readings: Reading[]): TimeOfDayGroup[] => {
  const mattina: Reading[] = [];
  const pomeriggio: Reading[] = [];
  const sera: Reading[] = [];

  readings.forEach((r) => {
    const hour = new Date(r.timestamp).getHours();
    if (hour >= 6 && hour < 12) {
      mattina.push(r);
    } else if (hour >= 12 && hour < 18) {
      pomeriggio.push(r);
    } else {
      sera.push(r);
    }
  });

  const getAvgs = (items: Reading[]) => {
    if (!items.length) return { sys: null, dia: null, pulse: null };
    const s = Math.round(items.reduce((a, b) => a + b.systolic, 0) / items.length);
    const d = Math.round(items.reduce((a, b) => a + b.diastolic, 0) / items.length);
    const pItems = items.map((i) => i.pulse).filter((p): p is number => typeof p === 'number' && p > 0);
    const p = pItems.length ? Math.round(pItems.reduce((a, b) => a + b, 0) / pItems.length) : null;
    return { sys: s, dia: d, pulse: p };
  };

  const mStats = getAvgs(mattina);
  const pStats = getAvgs(pomeriggio);
  const sStats = getAvgs(sera);

  return [
    {
      name: 'Mattina',
      key: 'mattina',
      timeRange: '06:00 – 12:00',
      readings: mattina,
      avgSys: mStats.sys,
      avgDia: mStats.dia,
      avgPulse: mStats.pulse,
    },
    {
      name: 'Pomeriggio',
      key: 'pomeriggio',
      timeRange: '12:00 – 18:00',
      readings: pomeriggio,
      avgSys: pStats.sys,
      avgDia: pStats.dia,
      avgPulse: pStats.pulse,
    },
    {
      name: 'Sera / Notte',
      key: 'sera',
      timeRange: '18:00 – 06:00',
      readings: sera,
      avgSys: sStats.sys,
      avgDia: sStats.dia,
      avgPulse: sStats.pulse,
    },
  ];
};
