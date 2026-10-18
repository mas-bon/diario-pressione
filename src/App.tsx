import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useLocalDiary, buildCloudMigrationUrl } from './hooks/useLocalDiary';
import { usePwaInstallation } from './hooks/usePwaInstallation';
import { computeStats } from './utils/bloodPressure';
import { TimeRangeFilter } from './types';
import { Header } from './components/Header';
import { HeroMetric } from './components/HeroMetric';
import { AddMeasurementCard } from './components/AddMeasurementCard';
import { PeriodFilterBar } from './components/PeriodFilterBar';
import { ChartsSection } from './components/ChartsSection';
import { ReadingsTable } from './components/ReadingsTable';
const DoctorReportModal = lazy(() =>
  import('./components/DoctorReportModal').then((m) => ({ default: m.DoctorReportModal }))
);
import { InstallPwaModal } from './components/InstallPwaModal';
import { Toast, ToastMessage } from './components/Toast';
import { parseFileToReadings } from './utils/fileImportExport';
import { safeGetItem, safeSetItem } from './utils/safeStorage';
import { Heart, Smartphone, Lock } from 'lucide-react';

export default function App() {
  const {
    readings,
    addReading,
    updateReading,
    deleteReading,
    batchImport,
    clearAll,
  } = useLocalDiary();

  const { isInstalled, markAsInstalled } = usePwaInstallation();

  const [range, setRange] = useState<TimeRangeFilter>(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPwaTip, setShowPwaTip] = useState(true);

  // Dark mode management (safe for iOS file:// and sandboxed WebViews)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeGetItem('pressione_theme');
      if (saved) return saved === 'dark';
      try {
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      safeSetItem('pressione_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      safeSetItem('pressione_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Toast notification dispatcher
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filtered readings by selected time range
  const filteredReadings = useMemo(() => {
    if (!readings.length) return [];
    if (range === 0) return readings;

    const latestTs = readings[readings.length - 1].timestamp;
    const limitTs = latestTs - range * 864e5;
    return readings.filter((r) => r.timestamp >= limitTs);
  }, [readings, range]);

  // Key stats based on filtered readings
  const filteredStats = useMemo(() => {
    return computeStats(filteredReadings);
  }, [filteredReadings]);

  // Latest reading is always from the master list
  const latestReading = readings.length ? readings[readings.length - 1] : null;

  // Drag and drop handler
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      try {
        const imported = await parseFileToReadings(file);
        if (imported.length > 0) {
          batchImport(imported, false);
          addToast(`Importate ${imported.length} letture dal file rilasciato!`, 'success');
        } else {
          addToast('Nessuna lettura valida nel file rilasciato.', 'error');
        }
      } catch {
        addToast('Errore durante la lettura del file.', 'error');
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [batchImport, addToast]);

  return (
    <div className="min-h-screen text-[#0f172a] dark:text-[#f1f5f9] transition-colors safe-top safe-bottom">
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-600/90 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm pointer-events-none animate-in fade-in">
          <Heart className="w-16 h-16 mb-4 animate-bounce" />
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
            Rilascia il file per caricarlo
          </h2>
          <p className="text-base sm:text-lg text-blue-100 mt-2">
            Supporta file Excel (.xlsx, .xls), CSV (.csv) e Backup (.json)
          </p>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-7 print:hidden">
        {/* Header toolbar */}
        <Header
          readings={readings}
          isInstalled={isInstalled}
          onOpenReport={() => setIsReportModalOpen(true)}
          onOpenInstall={() => setIsInstallModalOpen(true)}
          onBatchImport={(newItems, replace) => batchImport(newItems, replace)}
          onClearAll={clearAll}
          onToast={addToast}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        {/* Banner per slegare l'iPhone dal PC (visibile solo se aperto dall'IP locale http://192.168...) */}
        {typeof window !== 'undefined' &&
          window.location.protocol === 'http:' &&
          /iphone|ipad|ipod/i.test(window.navigator.userAgent) && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm font-bold">
                  ⚡
                </div>
                <div className="text-[#0f172a] dark:text-[#f1f5f9]">
                  <strong className="block text-sm sm:text-base text-amber-700 dark:text-amber-300">
                    Stai usando l'icona collegata al Wi-Fi del PC ({window.location.hostname})
                  </strong>
                  <span>
                    Per far funzionare l'app su iPhone <strong>anche a PC spento e fuori casa</strong>, tocca il pulsante qui sotto: trasferirà automaticamente le tue <strong>{readings.length} misurazioni</strong> sulla versione autonoma e ti basterà fare <strong>Condividi (↑) → Aggiungi alla schermata Home</strong>!
                  </span>
                </div>
              </div>
              <a
                href={buildCloudMigrationUrl(readings)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-center text-sm shadow-md transition-colors"
              >
                📲 Passa alla versione senza PC (trasferisci le tue {readings.length} misurazioni)
              </a>
            </div>
          )}

        {/* iPhone install / PWA banner tip (only visible if NOT already installed) */}
        {showPwaTip && !isInstalled && (
          <div className="mb-4 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 border border-blue-500/20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Smartphone className="w-4 h-4" />
              </div>
              <p className="text-[#0f172a] dark:text-[#f1f5f9]">
                <strong>Web App installabile (funziona anche a PC spento):</strong> Tocca il tasto <strong>Condividi (↑)</strong> di Safari in basso e scegli <strong>"Aggiungi alla schermata Home"</strong> per usarla sempre in autonomia!
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Istruzioni
              </button>
              <button
                onClick={() => setShowPwaTip(false)}
                className="p-1 rounded-lg text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] text-xs font-bold"
                title="Chiudi avviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form: Add measurement */}
        <div className="mb-5">
          <AddMeasurementCard onAdd={addReading} onToast={addToast} />
        </div>

        {/* Main Content Area */}
        <main className="space-y-5">
          {/* Hero Section with animated ECG */}
          <HeroMetric latestReading={latestReading} stats={filteredStats} />

          {/* Time range selector bar */}
          {readings.length > 0 && (
            <PeriodFilterBar
              currentRange={range}
              onChangeRange={setRange}
              filteredCount={filteredReadings.length}
            />
          )}

          {/* Charts Section */}
          {filteredReadings.length > 0 && (
            <ChartsSection readings={filteredReadings} isDark={isDark} />
          )}

          {/* Table / Archive Section */}
          <ReadingsTable
            readings={readings}
            onDelete={deleteReading}
            onUpdate={updateReading}
            onToast={addToast}
          />
        </main>

        {/* Clinical Disclaimer & Individual Privacy Footer */}
        <footer className="mt-8 pt-6 border-t border-[#dbe6f5] dark:border-[#1e2f4d] text-center space-y-2.5">
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] max-w-2xl mx-auto">
            I valori e le soglie si basano sulle Linee Guida Europee <strong>ESC/ESH</strong> (Società Europea di Cardiologia e Società Europea dell'Ipertensione Arteriosa). Questa applicazione ha finalità di monitoraggio personale e non sostituisce il giudizio del medico curante.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
            <span className="flex items-center gap-1 font-medium text-blue-700 dark:text-blue-300">
              <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              100% Locale & Privato: i dati risiedono solo su questo dispositivo
            </span>
            <span>·</span>
            <span>Web App Standalone & Offline</span>
            <span>·</span>
            <span>Nessuna condivisione esterna</span>
          </div>
        </footer>
      </div>

      {/* Install PWA Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstalled={markAsInstalled}
      />

      {/* Doctor Report Modal */}
      {isReportModalOpen && (
        <Suspense fallback={null}>
          <DoctorReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            readings={readings}
            stats={filteredStats}
            onToast={addToast}
          />
        </Suspense>
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
