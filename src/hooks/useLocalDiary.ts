import { useState, useEffect, useCallback } from 'react';
import { Reading } from '../types';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

const LOCAL_STORAGE_KEY = 'pressione_individual_diary_v1';
const LEGACY_STORAGE_KEY = 'pa_v1';
const OFFLINE_CACHE_PREFIX = 'pressione_offline_cache_default';

const INITIAL_SEED_READINGS: Reading[] = [];

export function useLocalDiary() {
  const [readings, setReadings] = useState<Reading[]>(() => {
    if (typeof window === 'undefined') return INITIAL_SEED_READINGS;

    try {
      // 1. Try local individual diary key
      const localData = safeGetItem(LOCAL_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed.sort((a, b) => a.timestamp - b.timestamp);
      }

      // 2. Try previous cache if user was using previous version
      const cached = safeGetItem(OFFLINE_CACHE_PREFIX);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          return parsed.sort((a, b) => a.timestamp - b.timestamp);
        }
      }

      // 3. Try legacy key
      const legacy = safeGetItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const converted: Reading[] = parsed.map((item, idx) => ({
            id: `legacy-${idx}`,
            timestamp: item.ts || Date.now(),
            systolic: item.s || 120,
            diastolic: item.d || 80,
            pulse: item.p || null,
            notes: item.n || '',
            arm: 'left',
            position: 'sitting',
            createdAt: item.ts || Date.now(),
            updatedAt: item.ts || Date.now(),
          }));
          safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(converted));
          return converted.sort((a, b) => a.timestamp - b.timestamp);
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
      const sorted = [...newReadings].sort((a, b) => a.timestamp - b.timestamp);
      setReadings(sorted);
      return;
    }

    setReadings((prev) => {
      const seen = new Set(prev.map((r) => `${r.timestamp}|${r.systolic}|${r.diastolic}`));
      const merged = [...prev];
      for (const item of newReadings) {
        const key = `${item.timestamp}|${item.systolic}|${item.diastolic}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
      return merged.sort((a, b) => a.timestamp - b.timestamp);
    });
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
