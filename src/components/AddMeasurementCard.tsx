import { useState } from 'react';
import { PlusCircle, Info, Calendar } from 'lucide-react';
import { getISODatetimeLocal, getCategoryInfo } from '../utils/bloodPressure';
import { Reading } from '../types';

interface AddMeasurementCardProps {
  onAdd: (data: Omit<Reading, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export function AddMeasurementCard({ onAdd, onToast }: AddMeasurementCardProps) {
  const [datetime, setDatetime] = useState<string>(() => getISODatetimeLocal());
  const [systolic, setSystolic] = useState<string>('');
  const [diastolic, setDiastolic] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [arm, setArm] = useState<'left' | 'right'>('left');
  const [position, setPosition] = useState<'sitting' | 'lying' | 'standing'>('sitting');

  const sysNum = parseFloat(systolic);
  const diaNum = parseFloat(diastolic);
  const hasValidNumbers = !isNaN(sysNum) && !isNaN(diaNum) && sysNum >= 50 && diaNum >= 30;
  const liveCat = hasValidNumbers ? getCategoryInfo(sysNum, diaNum) : null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const s = Math.round(parseFloat(systolic));
    const d = Math.round(parseFloat(diastolic));
    const p = pulse ? Math.round(parseFloat(pulse)) : null;
    const ts = new Date(datetime).getTime();

    if (isNaN(ts)) {
      onToast('Inserisci data e ora valide.', 'error');
      return;
    }

    if (isNaN(s) || s < 50 || s > 300) {
      onToast('Inserisci un valore valido per la sistolica (50–300 mmHg).', 'error');
      return;
    }

    if (isNaN(d) || d < 30 || d > 200) {
      onToast('Inserisci un valore valido per la diastolica (30–200 mmHg).', 'error');
      return;
    }

    if (p !== null && (isNaN(p) || p < 20 || p > 250)) {
      onToast('Inserisci un valore valido per le pulsazioni (20–250 bpm).', 'error');
      return;
    }

    if (d >= s) {
      onToast('La diastolica deve essere inferiore alla sistolica.', 'error');
      return;
    }

    onAdd({
      timestamp: ts,
      systolic: s,
      diastolic: d,
      pulse: p && p > 0 ? p : null,
      notes: notes.trim(),
      arm,
      position,
    });

    const cat = getCategoryInfo(s, d);
    onToast(`Misura salvata: ${s}/${d} mmHg · ${cat.name}`, 'success');

    // Reset inputs but preserve arm & position preference
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setNotes('');
    setDatetime(getISODatetimeLocal());
  };

  const setPreset = (presetNote: string) => {
    setNotes((prev) => (prev ? `${prev}, ${presetNote}` : presetNote));
  };

  return (
    <div className="bg-[#ffffff] dark:bg-[#0f1d36] border border-[#dbe6f5] dark:border-[#1e2f4d] rounded-2xl p-3.5 sm:p-5 shadow-sm transition-colors w-full max-w-full box-border">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0f172a] dark:text-[#f1f5f9]">
            Aggiungi una misura
          </h2>
        </div>

        {liveCat && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm transition-all"
            style={{ backgroundColor: liveCat.color }}
          >
            {liveCat.name}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 w-full max-w-full">
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 sm:gap-3 w-full max-w-full">
          {/* Data e ora - Perfectly contained without clipping */}
          <div className="col-span-2 sm:col-span-4 min-w-0 w-full">
            <div className="flex items-center justify-between h-7">
              <label className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Data e ora</span>
              </label>
              <button
                type="button"
                onClick={() => setDatetime(getISODatetimeLocal())}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                title="Imposta data e ora attuali"
              >
                Adesso
              </button>
            </div>
            <div className="relative w-full">
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                required
                className="w-full max-w-full min-w-0 box-border block min-h-[44px] px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#f0f5fc] dark:bg-[#0a1120] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans [color-scheme:light] dark:[color-scheme:dark] transition-colors"
              />
            </div>
          </div>

          {/* Sistolica */}
          <div className="col-span-1 sm:col-span-2 min-w-0">
            <label className="flex items-center h-7 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] truncate">
              Sistolica (max)
            </label>
            <div className="relative w-full">
              <input
                type="number"
                inputMode="numeric"
                min="50"
                max="300"
                placeholder="—"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                required
                className="w-full max-w-full min-w-0 box-border min-h-[44px] px-3 py-2 text-base font-semibold rounded-xl border border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#f0f5fc] dark:bg-[#0a1120] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#64748b] pointer-events-none">
                SYS
              </span>
            </div>
          </div>

          {/* Diastolica */}
          <div className="col-span-1 sm:col-span-2 min-w-0">
            <label className="flex items-center h-7 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] truncate">
              Diastolica (min)
            </label>
            <div className="relative w-full">
              <input
                type="number"
                inputMode="numeric"
                min="30"
                max="200"
                placeholder="—"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                required
                className="w-full max-w-full min-w-0 box-border min-h-[44px] px-3 py-2 text-base font-semibold rounded-xl border border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#f0f5fc] dark:bg-[#0a1120] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#64748b] pointer-events-none">
                DIA
              </span>
            </div>
          </div>

          {/* Pulsazioni */}
          <div className="col-span-1 sm:col-span-2 min-w-0">
            <label className="flex items-center h-7 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] truncate">
              Pulsazioni
            </label>
            <div className="relative w-full">
              <input
                type="number"
                inputMode="numeric"
                min="20"
                max="250"
                placeholder="—"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className="w-full max-w-full min-w-0 box-border min-h-[44px] px-3 py-2 text-base font-semibold rounded-xl border border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#f0f5fc] dark:bg-[#0a1120] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#64748b] pointer-events-none">
                BPM
              </span>
            </div>
          </div>

          {/* Braccio */}
          <div className="col-span-1 sm:col-span-2 min-w-0">
            <label className="flex items-center h-7 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] truncate">
              Braccio
            </label>
            <div className="grid grid-cols-2 gap-1 h-[44px]">
              <button
                type="button"
                onClick={() => setArm('left')}
                className={`rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  arm === 'left'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f0f5fc] dark:bg-[#0a1120] text-[#64748b] border border-[#dbe6f5] dark:border-[#1e2f4d]'
                }`}
              >
                Sx
              </button>
              <button
                type="button"
                onClick={() => setArm('right')}
                className={`rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  arm === 'right'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f0f5fc] dark:bg-[#0a1120] text-[#64748b] border border-[#dbe6f5] dark:border-[#1e2f4d]'
                }`}
              >
                Dx
              </button>
            </div>
          </div>
        </div>

        {/* Note & Submit */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end w-full max-w-full">
          <div className="sm:col-span-8 min-w-0">
            <label className="flex items-center h-7 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] truncate">
              Annotazioni
            </label>
            <input
              type="text"
              placeholder="es. a riposo, dopo il caffè, prima di dormire, terapia assunta"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full max-w-full min-w-0 box-border min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#f0f5fc] dark:bg-[#0a1120] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4 min-w-0">
            <button
              type="submit"
              className="w-full min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Salva misura</span>
            </button>
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[#64748b] dark:text-[#94a3b8] text-[11px] font-medium mr-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-500" /> Rapidi:
          </span>
          {['A riposo', 'Mattina a digiuno', 'Dopo cena', 'Prima di dormire', 'Dopo caffè', 'Post-allenamento'].map(
            (preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPreset(preset)}
                className="px-2.5 py-1 rounded-full bg-[#f0f5fc] dark:bg-[#0a1120] hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-[#64748b] dark:text-[#94a3b8] text-[11px] font-medium border border-[#dbe6f5] dark:border-[#1e2f4d] transition-colors cursor-pointer"
              >
                + {preset}
              </button>
            )
          )}
        </div>
      </form>
    </div>
  );
}
