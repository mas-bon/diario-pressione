import { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Moon,
  Sun,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ShieldCheck,
  DatabaseBackup,
} from 'lucide-react';
import { Reading } from '../types';
import { parseFileToReadings, exportToCsv, exportToXlsx, exportToJson } from '../utils/fileImportExport';
import { formatDateFull } from '../utils/bloodPressure';
import { TwoTapDeleteButton } from './TwoTapDeleteButton';

interface HeaderProps {
  readings: Reading[];
  isInstalled?: boolean;
  onOpenReport: () => void;
  onOpenInstall: () => void;
  onBatchImport: (readings: Reading[], replace: boolean) => void;
  onClearAll: () => void;
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({
  readings,
  isInstalled,
  onOpenReport,
  onOpenInstall,
  onBatchImport,
  onClearAll,
  onToast,
  isDark,
  onToggleTheme,
}: HeaderProps) {
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseFileToReadings(file);
      if (!imported.length) {
        onToast('Nessuna lettura valida trovata: servono colonne per Data, Sistolica e Diastolica.', 'error');
        return;
      }

      onBatchImport(imported, replaceExisting);
      onToast(
        replaceExisting
          ? `Caricate ${imported.length} letture.`
          : `Aggiunte ${imported.length} nuove letture con successo!`,
        'success'
      );
    } catch {
      onToast('Impossibile leggere il file. Assicurati che sia in formato .xlsx, .xls, .csv o .json.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const periodSubtitle = readings.length
    ? `${readings.length} ${readings.length === 1 ? 'misura' : 'misure'} · dal ${formatDateFull(
        readings[0].timestamp
      )} al ${formatDateFull(readings[readings.length - 1].timestamp)}`
    : 'Nessuna misura registrata';

  return (
    <header className="flex flex-col gap-3.5 mb-5 w-full max-w-full">
      {/* Top Bar with Brand & Local Privacy Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0f172a] dark:text-[#f1f5f9] tracking-tight">
              Diario della pressione
            </h1>

            {/* Individual Local Storage Badge in elegant blue */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs"
              title="I dati sono salvati esclusivamente nella memoria locale di questo dispositivo"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Dati individuali in locale</span>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-[#64748b] dark:text-[#94a3b8] mt-0.5">
            {periodSubtitle}
          </div>
        </div>

        {/* Install & Theme Toggle */}
        <div className="flex items-center gap-2">
          {!isInstalled && (
            <button
              onClick={onOpenInstall}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
              title="Installa come Web App sul tuo dispositivo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Installa App</span>
              <span className="sm:hidden">Installa</span>
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl border border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#ffffff] dark:bg-[#0f1d36] text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] transition-colors cursor-pointer shadow-xs"
            title={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            aria-label="Cambia tema chiaro/scuro"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* Tools Toolbar: Upload, Export, Svuota, Checkbox */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#dbe6f5] dark:border-[#1e2f4d]">
        {/* Replace existing checkbox */}
        <label className="flex items-center gap-2 text-xs font-medium text-[#64748b] dark:text-[#94a3b8] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            className="rounded border-[#dbe6f5] dark:border-[#1e2f4d] text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span>Sostituisci i dati attuali al caricamento</span>
        </label>

        {/* Buttons Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File input button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#ffffff] dark:bg-[#0f1d36] border border-[#dbe6f5] dark:border-[#1e2f4d] text-[#0f172a] dark:text-[#f1f5f9] hover:border-blue-500 transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Carica file</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!readings.length}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#ffffff] dark:bg-[#0f1d36] border border-[#dbe6f5] dark:border-[#1e2f4d] text-[#0f172a] dark:text-[#f1f5f9] hover:border-blue-500 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Esporta</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1.5 w-52 bg-[#ffffff] dark:bg-[#0f1d36] border border-[#dbe6f5] dark:border-[#1e2f4d] rounded-xl shadow-xl z-30 py-1.5"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => {
                    exportToCsv(readings);
                    setShowExportMenu(false);
                    onToast('File CSV esportato!', 'success');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center gap-2 hover:bg-[#f0f5fc] dark:hover:bg-[#162740] transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Esporta CSV</span>
                </button>
                <button
                  onClick={async () => {
                    await exportToXlsx(readings);
                    setShowExportMenu(false);
                    onToast('File Excel esportato!', 'success');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center gap-2 hover:bg-[#f0f5fc] dark:hover:bg-[#162740] transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Esporta Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    exportToJson(readings);
                    setShowExportMenu(false);
                    onToast('Backup JSON esportato!', 'success');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center gap-2 hover:bg-[#f0f5fc] dark:hover:bg-[#162740] transition-colors border-t border-[#dbe6f5] dark:border-[#1e2f4d] mt-1 pt-2 font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  <DatabaseBackup className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Backup Completo (.json)</span>
                </button>
              </div>
            )}
          </div>

          {/* Report Medico */}
          <button
            onClick={onOpenReport}
            disabled={!readings.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#ffffff] dark:bg-[#0f1d36] border border-[#dbe6f5] dark:border-[#1e2f4d] text-[#0f172a] dark:text-[#f1f5f9] hover:border-blue-500 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Report Medico</span>
            <span className="sm:hidden">Report</span>
          </button>

          {/* Clear button with two-tap confirmation */}
          {readings.length > 0 && (
            <TwoTapDeleteButton
              onConfirm={() => {
                onClearAll();
                onToast('Tutte le misurazioni sono state eliminate dal dispositivo.', 'info');
              }}
              label="Svuota"
              confirmLabel="Confermi svuota?"
              size="lg"
              title="Svuota tutte le letture salvate in locale"
            />
          )}
        </div>
      </div>
    </header>
  );
}
