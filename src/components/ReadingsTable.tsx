import { useState, useMemo } from 'react';
import { Reading, CATEGORIES } from '../types';
import { formatDateFull, formatTime, getCategoryIndex } from '../utils/bloodPressure';
import { Search, Edit2, Check, X, Filter } from 'lucide-react';
import { TwoTapDeleteButton } from './TwoTapDeleteButton';

interface ReadingsTableProps {
  readings: Reading[];
  onDelete: (id: string) => void;
  onUpdate: (reading: Reading) => void;
  onToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export function ReadingsTable({ readings, onDelete, onUpdate, onToast }: ReadingsTableProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingReading, setEditingReading] = useState<Reading | null>(null);

  // Filtered readings in reverse chronological order
  const filteredReadings = useMemo(() => {
    let result = [...readings].reverse();

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          `${r.systolic}/${r.diastolic}`.includes(q) ||
          formatDateFull(r.timestamp).toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      const catIdx = parseInt(selectedCategory, 10);
      result = result.filter((r) => getCategoryIndex(r.systolic, r.diastolic) === catIdx);
    }

    return result;
  }, [readings, search, selectedCategory]);

  const handleStartEdit = (reading: Reading) => {
    setEditingReading({ ...reading });
  };

  const handleSaveEdit = () => {
    if (!editingReading) return;
    if (editingReading.diastolic >= editingReading.systolic) {
      onToast('La diastolica deve essere inferiore alla sistolica.', 'error');
      return;
    }
    onUpdate(editingReading);
    setEditingReading(null);
    onToast('Misurazione aggiornata con successo.', 'success');
  };

  return (
    <div className="bg-[#ffffff] dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] rounded-2xl p-4 sm:p-5 shadow-sm w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-base sm:text-lg text-[#0f172a] dark:text-[#f1f5f9]">
            Tutte le letture ({filteredReadings.length})
          </h3>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
            Archivio storico delle misurazioni salvate sul dispositivo
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Cerca nota, valore..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#64748b]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 text-[#64748b] pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
            >
              <option value="all">Tutte le categorie</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.index} value={cat.index}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredReadings.length === 0 ? (
        <div className="py-12 text-center text-[#64748b] dark:text-[#94a3b8]">
          <p className="text-sm">Nessuna misurazione trovata per i criteri selezionati.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List (visible on screens < 768px) */}
          <div className="block md:hidden space-y-2.5">
            {filteredReadings.map((r) => {
              const cat = CATEGORIES[getCategoryIndex(r.systolic, r.diastolic)];
              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f8fafc] dark:bg-[#0c1829] flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: cat.color }}
                      title={cat.name}
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display font-extrabold text-lg text-[#0f172a] dark:text-[#f1f5f9]">
                          {r.systolic}/{r.diastolic}
                        </span>
                        <span className="text-[11px] font-medium text-[#64748b]">mmHg</span>
                        {r.pulse && (
                          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                            ♥ {r.pulse} bpm
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {formatDateFull(r.timestamp)} · {formatTime(r.timestamp)}
                        {r.arm && ` · ${r.arm === 'left' ? 'Sx' : 'Dx'}`}
                      </div>
                      {r.notes && (
                        <p className="text-xs text-[#0f172a] dark:text-[#f1f5f9] italic mt-1 truncate">
                          "{r.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(r)}
                      className="p-2 rounded-xl text-[#64748b] hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Modifica misura"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <TwoTapDeleteButton
                      onConfirm={() => {
                        onDelete(r.id);
                        onToast('Misura eliminata.', 'info');
                      }}
                      confirmLabel="Conferma eliminazione"
                      title="Elimina misura"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (visible on screens >= 768px) */}
          <div className="hidden md:block overflow-x-auto max-h-[460px] overflow-y-auto rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-[#f0f4f9] dark:bg-[#0c1829] text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider z-10 border-b border-[#d8e2ee] dark:border-[#1c2e46]">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Ora</th>
                  <th className="py-2.5 px-3">Sistolica</th>
                  <th className="py-2.5 px-3">Diastolica</th>
                  <th className="py-2.5 px-3">BPM</th>
                  <th className="py-2.5 px-3">Categoria ESC/ESH</th>
                  <th className="py-2.5 px-3">Braccio</th>
                  <th className="py-2.5 px-3">Note</th>
                  <th className="py-2.5 px-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d8e2ee] dark:divide-[#1c2e46]">
                {filteredReadings.map((r) => {
                  const cat = CATEGORIES[getCategoryIndex(r.systolic, r.diastolic)];
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#f1f5f9] dark:hover:bg-[#132238] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-[#0f172a] dark:text-[#f1f5f9] whitespace-nowrap">
                        {formatDateFull(r.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748b] dark:text-[#94a3b8] whitespace-nowrap font-mono text-xs">
                        {formatTime(r.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                        {r.systolic}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                        {r.diastolic}
                      </td>
                      <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400 font-medium">
                        {r.pulse ? `${r.pulse} bpm` : '—'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span style={{ color: cat.color }}>{cat.name}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748b] dark:text-[#94a3b8] whitespace-nowrap">
                        {r.arm === 'right' ? 'Destro' : 'Sinistro'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748b] dark:text-[#94a3b8] max-w-xs truncate">
                        {r.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(r)}
                            className="p-1.5 rounded-lg text-[#64748b] hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Modifica"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <TwoTapDeleteButton
                            onConfirm={() => {
                              onDelete(r.id);
                              onToast('Misura eliminata.', 'info');
                            }}
                            size="sm"
                            confirmLabel="Confermi?"
                            title="Elimina"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[max(3.75rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#ffffff] dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#d8e2ee] dark:border-[#1c2e46] pb-3">
              <h4 className="font-display font-bold text-base text-[#0f172a] dark:text-[#f1f5f9]">
                Modifica Misura
              </h4>
              <button
                onClick={() => setEditingReading(null)}
                className="p-1 text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Sistolica</label>
                <input
                  type="number"
                  value={editingReading.systolic}
                  onChange={(e) =>
                    setEditingReading({ ...editingReading, systolic: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Diastolica</label>
                <input
                  type="number"
                  value={editingReading.diastolic}
                  onChange={(e) =>
                    setEditingReading({ ...editingReading, diastolic: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Pulsazioni (bpm)</label>
                <input
                  type="number"
                  value={editingReading.pulse || ''}
                  onChange={(e) =>
                    setEditingReading({
                      ...editingReading,
                      pulse: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Braccio</label>
                <select
                  value={editingReading.arm || 'left'}
                  onChange={(e) =>
                    setEditingReading({ ...editingReading, arm: e.target.value as 'left' | 'right' })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9]"
                >
                  <option value="left">Sinistro</option>
                  <option value="right">Destro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#64748b] mb-1">Note</label>
                <input
                  type="text"
                  value={editingReading.notes || ''}
                  onChange={(e) => setEditingReading({ ...editingReading, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#d8e2ee] dark:border-[#1c2e46] bg-[#f0f4f9] dark:bg-[#09111e] text-[#0f172a] dark:text-[#f1f5f9]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#d8e2ee] dark:border-[#1c2e46]">
              <button
                onClick={() => setEditingReading(null)}
                className="px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-[#f0f4f9] dark:hover:bg-[#162740] rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salva modifiche</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
