import { useState, useEffect, useCallback } from 'react';
import { Reading } from '../types';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { mergeReadings, sanitizeReadings } from '../utils/readings';

export { mergeReadings } from '../utils/readings';

const LOCAL_STORAGE_KEY = 'pressione_individual_diary_v1';
const LEGACY_STORAGE_KEY = 'pa_v1';
const OFFLINE_CACHE_PREFIX = 'pressione_offline_cache_default';

const INITIAL_SEED_READINGS: Reading[] = [];

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildCloudMigrationUrl(readings: Reading[]): string {
  const baseUrl = 'https://mas-bon.github.io/diario-pressione/';
  if (!readings.length) return baseUrl;
  try {
    const compact = readings.map((r) => ({
      i: r.id,
      t: r.timestamp,
      s: r.systolic,
      d: r.diastolic,
      p: r.pulse,
      n: r.notes || '',
      a: r.arm || 'left',
      o: r.position || 'sitting',
    }));
    const b64 = encodeBase64Utf8(JSON.stringify(compact));
    return `${baseUrl}?migrate=${encodeURIComponent(b64)}`;
  } catch {
    return baseUrl;
  }
}

export function decodeMigratedReadings(b64: string): Reading[] | null {
  try {
    const compact = JSON.parse(decodeBase64Utf8(b64));
    if (!Array.isArray(compact)) return null;
    return sanitizeReadings(
      compact.map((item) => ({
        id: item?.i,
        timestamp: item?.t,
        systolic: item?.s,
        diastolic: item?.d,
        pulse: item?.p,
        notes: item?.n,
        arm: item?.a,
        position: item?.o,
      })),
      'mig'
    );
  } catch {
    return null;
  }
}

function parseMigratedReadingsFromUrl(): Reading[] | null {
  if (typeof window === 'undefined') return null;
  const b64 = new URLSearchParams(window.location.search).get('migrate');
  if (!b64) return null;

  // Remove <link rel="manifest"> when ?migrate= is present so iOS "Add to Home Screen"
  // preserves the ?migrate= query parameter in the Home Screen icon's launch URL!
  document.querySelector('link[rel="manifest"]')?.remove();

  return decodeMigratedReadings(b64);
}

export function convertLegacyReadings(items: unknown[]): Reading[] {
  return sanitizeReadings(
    items.map((item) => {
      const it = (item ?? {}) as Record<string, unknown>;
      return { timestamp: it.ts, systolic: it.s, diastolic: it.d, pulse: it.p, notes: it.n };
    }),
    'legacy'
  );
}

export function useLocalDiary() {
  const [readings, setReadings] = useState<Reading[]>(() => {
    if (typeof window === 'undefined') return INITIAL_SEED_READINGS;

    try {
      const migrated = parseMigratedReadingsFromUrl() ?? [];

      // 1. Try local individual diary key
      const localData = safeGetItem(LOCAL_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          const merged = mergeReadings(sanitizeReadings(parsed, 'local'), migrated);
          if (migrated.length > 0) safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      }

      if (migrated.length > 0) {
        const sorted = mergeReadings(migrated);
        safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
        return sorted;
      }

      // 2. Try previous cache if user was using previous version
      const cached = safeGetItem(OFFLINE_CACHE_PREFIX);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = mergeReadings(sanitizeReadings(parsed, 'cache'));
          safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(valid));
          return valid;
        }
      }

      // 3. Try legacy key
      const legacy = safeGetItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const converted = mergeReadings(convertLegacyReadings(parsed));
          safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(converted));
          return converted;
        }
      }

      // 4. Default seed readings
      safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SEED_READINGS));
      return INITIAL_SEED_READINGS;
    } catch {
      return INITIAL_SEED_READINGS;
    }
  });

  // Save to individual device localStorage whenever readings change
  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(readings));
  }, [readings]);

  // Add reading
  const addReading = useCallback(
    (readingData: Omit<Reading, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now();
      const newReading: Reading = {
        id: `bp-${now}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: readingData.timestamp || now,
        systolic: Math.round(readingData.systolic),
        diastolic: Math.round(readingData.diastolic),
        pulse: readingData.pulse ? Math.round(readingData.pulse) : null,
        notes: readingData.notes || '',
        arm: readingData.arm || 'left',
        position: readingData.position || 'sitting',
        createdAt: now,
        updatedAt: now,
      };

      setReadings((prev) => [...prev, newReading].sort((a, b) => a.timestamp - b.timestamp));
    },
    []
  );

  // Update existing reading
  const updateReading = useCallback((reading: Reading) => {
    setReadings((prev) =>
      prev
        .map((r) => (r.id === reading.id ? { ...reading, updatedAt: Date.now() } : r))
        .sort((a, b) => a.timestamp - b.timestamp)
    );
  }, []);

  // Delete reading
  const deleteReading = useCallback((id: string) => {
    setReadings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Batch import
  const batchImport = useCallback((newReadings: Reading[], replace: boolean) => {
    if (replace) {
      setReadings([...newReadings].sort((a, b) => a.timestamp - b.timestamp));
      return;
    }
    setReadings((prev) => mergeReadings(prev, newReadings));
  }, []);

  // Clear all readings
  const clearAll = useCallback(() => {
    setReadings([]);
  }, []);

  return {
    readings,
    addReading,
    updateReading,
    deleteReading,
    batchImport,
    clearAll,
  };
}
