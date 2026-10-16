import { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

const INSTALLED_STORAGE_KEY = 'pressione_pwa_installed';

export function usePwaInstallation() {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;

    try {
      // Check iOS standalone mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window.navigator as any).standalone === true) {
        return true;
      }

      // Check standard PWA display-mode standalone
      if (window.matchMedia?.('(display-mode: standalone)').matches) {
        return true;
      }

      // Check full-screen display mode
      if (window.matchMedia?.('(display-mode: fullscreen)').matches) {
        return true;
      }
    } catch {
      // Ignore matchMedia errors
    }

    // Check localStorage flag safely
    if (safeGetItem(INSTALLED_STORAGE_KEY) === 'true') {
      return true;
    }

    return false;
  });

  useEffect(() => {
    const checkDisplayMode = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (isStandalone) {
          setIsInstalled(true);
          safeSetItem(INSTALLED_STORAGE_KEY, 'true');
        }
      } catch {
        // Ignore
      }
    };

    checkDisplayMode();

    let mediaQuery: MediaQueryList | null = null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        safeSetItem(INSTALLED_STORAGE_KEY, 'true');
      }
    };

    try {
      mediaQuery = window.matchMedia?.('(display-mode: standalone)') ?? null;
      mediaQuery?.addEventListener('change', handleMediaChange);
    } catch {
      // fallback for older browsers
      mediaQuery?.addListener?.(handleMediaChange);
    }

    // Standard Chromium appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      safeSetItem(INSTALLED_STORAGE_KEY, 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      try {
        mediaQuery?.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery?.addListener?.(handleMediaChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const markAsInstalled = () => {
    setIsInstalled(true);
    safeSetItem(INSTALLED_STORAGE_KEY, 'true');
  };

  return { isInstalled, markAsInstalled };
}

