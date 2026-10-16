import { useState, useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface TwoTapDeleteButtonProps {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

export function TwoTapDeleteButton({
  onConfirm,
  label,
  confirmLabel = 'Tocca per confermare',
  size = 'md',
  title = 'Elimina',
  className = '',
}: TwoTapDeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isConfirming) {
      // First tap: enter confirmation mode with 4-second timeout
      setIsConfirming(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setIsConfirming(false);
      }, 4000);
    } else {
      // Second tap: execute action
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsConfirming(false);
      onConfirm();
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsConfirming(false);
  };

  if (isConfirming) {
    return (
      <div className="inline-flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md border border-rose-700 transition-all text-xs cursor-pointer ${
            size === 'lg' ? 'py-2 px-3.5 text-sm' : ''
          }`}
          title="Tocca di nuovo per eliminare definitivamente"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
          <span>{confirmLabel}</span>
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
          title="Annulla eliminazione"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95 cursor-pointer border shadow-xs ${
        // High visibility red / rose design that stands out sharply
        'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
      } ${
        size === 'sm'
          ? 'p-1.5 text-xs'
          : size === 'lg'
          ? 'px-3.5 py-2 text-sm'
          : 'p-2 text-xs sm:text-sm'
      } ${className}`}
      title={title}
      aria-label={title}
    >
      <Trash2
        className={`stroke-[2.2] flex-shrink-0 ${
          size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-4 h-4' : 'w-4 h-4'
        }`}
      />
      {label && <span>{label}</span>}
    </button>
  );
}
