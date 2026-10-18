import { useState } from 'react';
import { Reading, CATEGORIES } from '../types';
import { DiaryStats, formatDateFull, formatTime, getCategoryIndex, groupByTimeOfDay } from '../utils/bloodPressure';
import { saveOrSharePdfReport, isIosStandaloneMode } from '../utils/pdfReport';
import { Printer, X, FileText, Download } from 'lucide-react';

interface DoctorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  readings: Reading[];
  stats: DiaryStats | null;
  onToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export function DoctorReportModal({ isOpen, onClose, readings, stats, onToast }: DoctorReportModalProps) {
  const [patientName, setPatientName] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !stats || !readings.length) return null;

  const firstDate = formatDateFull(readings[0].timestamp);
  const lastDate = formatDateFull(readings[readings.length - 1].timestamp);
  const groups = groupByTimeOfDay(readings);

  const handleSavePdf = async (disposition: 'inline' | 'attachment' = 'attachment') => {
    try {
      setIsGenerating(true);
      const outcome = await saveOrSharePdfReport(
        {
          readings,
          stats,
          patientName,
          doctorNotes,
        },
        disposition
      );
      if (outcome === 'downloaded') {
        onToast?.('Report PDF scaricato con successo!', 'success');
      }
    } catch {
      onToast?.('Errore durante la creazione del PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    // In iOS Home Screen Standalone mode, Apple disables window.print().
    // Automatically use saveOrSharePdfReport('inline') which opens the native iOS Share Sheet (HTTPS)
    // or hands off the PDF to Safari (HTTP) where Print and Share work natively!
    if (isIosStandaloneMode()) {
      handleSavePdf('inline');
      return;
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 pt-[max(3.75rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:block print:overflow-visible">
      <div className="bg-[#ffffff] dark:bg-[#0f1d36] print:bg-white text-[#0f172a] dark:text-[#f1f5f9] print:text-black border border-[#dbe6f5] dark:border-[#1e2f4d] print:border-none rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden print:overflow-visible flex flex-col max-h-[calc(100dvh-4.75rem)] sm:max-h-[90vh] print:max-h-none print:shadow-none">
        {/* Header - safe from iOS notch/status bar, hidden on print */}
        <div className="px-3.5 py-3 sm:px-5 sm:py-4 border-b border-[#dbe6f5] dark:border-[#1e2f4d] flex items-center justify-between gap-2 bg-[#f0f5fc] dark:bg-[#0a1120] print:hidden flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-sm sm:text-lg truncate">
              Report Medico
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
              title="Apre la schermata Stampa / Condividi di iOS o del computer"
            >
              <Printer className="w-4 h-4 flex-shrink-0" />
              <span>Stampa / Condividi</span>
            </button>

            <button
              type="button"
              onClick={() => handleSavePdf('attachment')}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-200/90 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 text-[#0f172a] dark:text-[#f1f5f9] rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-60"
              title="Scarica il file PDF sul dispositivo"
            >
              <Download className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{isGenerating ? '...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] bg-slate-200/60 dark:bg-slate-800/80 rounded-xl cursor-pointer"
              aria-label="Chiudi report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="p-4 sm:p-8 overflow-y-auto print:overflow-visible space-y-5 sm:space-y-6 print:p-0 flex-1">
          <div className="border-b pb-4 border-slate-200 dark:border-slate-800 print:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="font-display font-black text-xl sm:text-2xl text-[#0a192f] dark:text-blue-400 print:text-[#0a192f]">
                  DIARIO DELLA PRESSIONE ARTERIOSA
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitoraggio domiciliare dei valori pressori secondo criteri ESC/ESH
                </p>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-500">
                Data report: {formatDateFull(Date.now())}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Paziente
                </label>
                <input
                  type="text"
                  placeholder="Inserisci Nome e Cognome del paziente"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-2.5 py-1.5 mt-0.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 print:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-none font-medium"
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Periodo di rilevazione
                </span>
                <span className="text-sm font-medium block mt-1.5">
                  dal {firstDate} al {lastDate} ({readings.length} misurazioni)
                </span>
              </div>
            </div>
          </div>

          {/* Key Clinical Summary Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 print:grid-cols-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <span className="text-[11px] text-slate-500 block">Pressione Media</span>
              <div className="font-display font-bold text-xl text-slate-900 dark:text-white print:text-black">
                {stats.avgSystolic}/{stats.avgDiastolic} <span className="text-xs font-normal">mmHg</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: stats.avgCategory.color }}>
                {stats.avgCategory.name}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <span className="text-[11px] text-slate-500 block">Frequenza Media</span>
              <div className="font-display font-bold text-xl text-sky-600 dark:text-sky-400 print:text-sky-700">
                {stats.avgPulse || '—'} <span className="text-xs font-normal">bpm</span>
              </div>
              <span className="text-xs text-slate-500">polso a riposo</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <span className="text-[11px] text-slate-500 block">Picco Massimo</span>
              <div className="font-display font-bold text-xl text-rose-600">
                {stats.maxSystolic}/{stats.maxDiastolic} <span className="text-xs font-normal">mmHg</span>
              </div>
              <span className="text-xs text-slate-500">valore più alto</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <span className="text-[11px] text-slate-500 block">Target &lt; 140/90</span>
              <div className="font-display font-bold text-xl text-blue-600 dark:text-blue-400 print:text-blue-700">
                {stats.pctNormal}%
              </div>
              <span className="text-xs text-slate-500">{stats.normalCount} su {stats.count} entro i limiti</span>
            </div>
          </div>

          {/* Time of day breakdown */}
          <div>
            <h4 className="font-display font-bold text-sm mb-2 text-slate-700 dark:text-slate-300 print:text-slate-800">
              Confronto per Fasce Orarie
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {groups.map((g) => (
                <div
                  key={g.key}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300 bg-slate-50 dark:bg-slate-900/30 print:bg-slate-50"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{g.name}</div>
                  <div className="text-[10px] text-slate-500">{g.timeRange}</div>
                  <div className="font-bold text-sm sm:text-base mt-1 text-slate-900 dark:text-white print:text-black">
                    {g.avgSys ? `${g.avgSys}/${g.avgDia}` : '—'} mmHg
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 print:text-sky-700 mt-0.5">
                    {g.avgPulse ? `♥ ${g.avgPulse} bpm` : ''} ({g.readings.length} letture)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent readings compact table */}
          <div>
            <h4 className="font-display font-bold text-sm mb-2 text-slate-700 dark:text-slate-300 print:text-slate-800">
              Ultime Misurazioni Registrate
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="p-2 whitespace-nowrap">Data e Ora</th>
                    <th className="p-2">Sist.</th>
                    <th className="p-2">Diast.</th>
                    <th className="p-2">BPM</th>
                    <th className="p-2">Categoria</th>
                    <th className="p-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                  {[...readings].reverse().slice(0, 15).map((r) => {
                    const cat = CATEGORIES[getCategoryIndex(r.systolic, r.diastolic)];
                    return (
                      <tr key={r.id}>
                        <td className="p-2 font-medium whitespace-nowrap">
                          {formatDateFull(r.timestamp)}, {formatTime(r.timestamp)}
                        </td>
                        <td className="p-2 font-bold text-rose-600">{r.systolic}</td>
                        <td className="p-2 font-bold text-blue-600">{r.diastolic}</td>
                        <td className="p-2 text-teal-600">{r.pulse || '—'}</td>
                        <td className="p-2 whitespace-nowrap">{cat.name}</td>
                        <td className="p-2 italic text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes / Clinical observation box */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-700 uppercase mb-1">
              Note del Medico / Terapia in atto
            </label>
            <textarea
              rows={3}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Spazio per annotazioni cliniche, posologia o raccomandazioni (verranno incluse nel PDF)..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-slate-400"
            />
          </div>

          <div className="text-[11px] text-slate-400 print:text-slate-600 text-center border-t border-slate-200 dark:border-slate-800 print:border-slate-300 pt-3">
            Documento generato dall'applicazione "Pressione – il tuo diario". I dati si basano su rilevazioni domiciliari con misuratore validato.
          </div>
        </div>
      </div>
    </div>
  );
}

