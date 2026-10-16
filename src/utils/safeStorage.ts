// Safe wrapper around localStorage that never throws SecurityError on iOS file:// / WKWebView / Private Mode

const memoryFallback = new Map<string, string>();

export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Fallback to in-memory storage when iOS blocks localStorage on file:// or opaque origins
  }
  return memoryFallback.get(key) ?? null;
}

export function safeSetItem(key: string, value: string): boolean {
  memoryFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {
    // Ignored: stored in memoryFallback
  }
  return false;
}

export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__pressione_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
