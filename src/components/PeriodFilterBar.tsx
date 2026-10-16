import { TimeRangeFilter } from '../types';

interface PeriodFilterBarProps {
  currentRange: TimeRangeFilter;
  onChangeRange: (range: TimeRangeFilter) => void;
  filteredCount: number;
}

export function PeriodFilterBar({ currentRange, onChangeRange, filteredCount }: PeriodFilterBarProps) {
  const options: { label: string; value: TimeRangeFilter }[] = [
    { label: 'Tutto', value: 0 },
    { label: '90 giorni', value: 90 },
    { label: '30 giorni', value: 30 },
    { label: '7 giorni', value: 7 },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 my-4 w-full max-w-full">
      <div className="inline-flex rounded-xl p-1 bg-[#d8e2ee]/60 dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] w-full sm:w-auto">
        {options.map((opt) => {
          const isSelected = currentRange === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeRange(opt.value)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#f1f5f9]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-[#64748b] dark:text-[#94a3b8] font-medium hidden sm:block">
        Visualizzate <strong>{filteredCount}</strong> misurazioni
      </div>
    </div>
  );
}
