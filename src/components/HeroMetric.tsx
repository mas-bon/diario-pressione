import { Reading } from '../types';
import { DiaryStats, formatDateTime, getCategoryInfo } from '../utils/bloodPressure';
import { Heart, Activity } from 'lucide-react';

interface HeroMetricProps {
  latestReading: Reading | null;
  stats: DiaryStats | null;
}

export function HeroMetric({ latestReading, stats }: HeroMetricProps) {
  if (!latestReading || !stats) {
    return (
      <div className="bg-[#0a192f] dark:bg-[#081324] text-[#f1f5f9] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xl border border-blue-900/50">
        <Activity className="w-12 h-12 mx-auto text-blue-400/60 mb-3 animate-pulse" />
        <h3 className="font-display text-xl font-bold">Nessuna misurazione registrata</h3>
        <p className="text-sm text-blue-200/70 mt-1 max-w-md mx-auto">
          Aggiungi la tua prima misurazione oppure carica un file Excel/CSV per visualizzare l'analisi clinica completa.
        </p>
      </div>
    );
  }

  const latestCat = getCategoryInfo(latestReading.systolic, latestReading.diastolic);

  return (
    <section
      aria-label="Ultima lettura della pressione arteriosa"
      className="bg-[#0a192f] dark:bg-[#081324] text-[#f1f5f9] rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xl border border-blue-900/50 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6"
    >
      {/* Animated ECG background wave in electric cyan-blue */}
      <svg
        className="absolute left-0 right-0 bottom-2 w-full h-24 sm:h-28 opacity-45 pointer-events-none"
        viewBox="0 0 600 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 40H90l10-8 10 8h60l8 10 10-38 10 66 10-28h60l12-12 14 12h96l8 8 10-34 10 58 8-24H600"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-ecg"
        />
      </svg>

      {/* Main Latest Reading Column */}
      <div className="relative z-10 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-200/80 text-xs sm:text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Ultima lettura · {formatDateTime(latestReading.timestamp)}</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-none text-white">
              {latestReading.systolic}/{latestReading.diastolic}
            </span>
            <span className="text-lg sm:text-2xl font-medium text-blue-200/70 tracking-normal">
              mmHg
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: latestCat.color }}
            >
              {latestCat.name}
            </span>

            {latestReading.pulse && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-white/10 text-blue-100 backdrop-blur-sm border border-white/10">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse" />
                <span>{latestReading.pulse} bpm</span>
              </span>
            )}

            {latestReading.arm && latestReading.arm !== 'unspecified' && (
              <span className="text-[11px] uppercase tracking-wider text-blue-200/60 font-semibold px-2 py-0.5 rounded bg-white/5">
                Braccio {latestReading.arm === 'left' ? 'sx' : 'dx'}
              </span>
            )}
          </div>
        </div>

        {latestReading.notes && (
          <p className="mt-3 text-xs sm:text-sm text-blue-100/80 italic line-clamp-2">
            "{latestReading.notes}"
          </p>
        )}
      </div>

      {/* 4 Health Stats Sub-cards */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:gap-3.5 content-start">
        <div className="bg-white/[0.08] hover:bg-white/[0.12] transition-colors rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-md border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-blue-200/75 font-medium">Media periodo</span>
          <div className="mt-1 font-display font-bold text-2xl sm:text-3xl text-white">
            {stats.avgSystolic}/{stats.avgDiastolic}
          </div>
          <span className="text-[11px] text-blue-300/80 font-medium truncate mt-0.5">
            {stats.avgCategory.name}
          </span>
        </div>

        <div className="bg-white/[0.08] hover:bg-white/[0.12] transition-colors rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-md border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-blue-200/75 font-medium">Polso medio</span>
          <div className="mt-1 font-display font-bold text-2xl sm:text-3xl text-white">
            {stats.avgPulse ? `${stats.avgPulse}` : '—'}
          </div>
          <span className="text-[11px] text-blue-300/80 font-medium mt-0.5">bpm (frequenza)</span>
        </div>

        <div className="bg-white/[0.08] hover:bg-white/[0.12] transition-colors rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-md border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-blue-200/75 font-medium">Massima</span>
          <div className="mt-1 font-display font-bold text-2xl sm:text-3xl text-white">
            {stats.maxSystolic}/{stats.maxDiastolic}
          </div>
          <span className="text-[11px] text-blue-300/80 font-medium mt-0.5">sistolica / diastolica</span>
        </div>

        <div className="bg-white/[0.08] hover:bg-white/[0.12] transition-colors rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-md border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-blue-200/75 font-medium">Sotto 140/90</span>
          <div className="mt-1 font-display font-bold text-2xl sm:text-3xl text-sky-300">
            {stats.pctNormal}%
          </div>
          <span className="text-[11px] text-blue-300/80 font-medium mt-0.5">
            {stats.normalCount} su {stats.count}
          </span>
        </div>
      </div>
    </section>
  );
}
