import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController,
  BarController,
  DoughnutController,
} from 'chart.js';
import { Reading, CATEGORIES } from '../types';
import { formatDateShort, formatTime, getCategoryIndex, groupByTimeOfDay } from '../utils/bloodPressure';

// Register Chart.js controllers and components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ScatterController,
  LineController,
  BarController,
  DoughnutController,
  Title,
  Tooltip,
  Legend
);

interface ChartsSectionProps {
  readings: Reading[];
  isDark?: boolean;
}

export function ChartsSection({ readings, isDark: isDarkProp }: ChartsSectionProps) {
  const chart1Ref = useRef<HTMLCanvasElement | null>(null);
  const chart2Ref = useRef<HTMLCanvasElement | null>(null);
  const chart3Ref = useRef<HTMLCanvasElement | null>(null);
  const chart4Ref = useRef<HTMLCanvasElement | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstancesRef = useRef<ChartJS<any, any, any>[]>([]);

  useEffect(() => {
    // Destroy previous charts before recreating
    chartInstancesRef.current.forEach((c) => c.destroy());
    chartInstancesRef.current = [];

    if (!readings.length) return;

    const isDark = isDarkProp ?? document.documentElement.classList.contains('dark');
    const inkColor = isDark ? '#f1f5f9' : '#0f172a';
    const mutColor = isDark ? '#94a3b8' : '#64748b';
    const lineColor = isDark ? '#1c2e46' : '#d8e2ee';
    const sysColor = isDark ? '#fb7185' : '#e11d48';
    const diaColor = isDark ? '#60a5fa' : '#2563eb';
    const bpmColor = isDark ? '#38bdf8' : '#0284c7';
    const cardColor = isDark ? '#0f1b2d' : '#ffffff';

    ChartJS.defaults.color = mutColor;
    ChartJS.defaults.font.family = '"DM Sans", system-ui, sans-serif';

    const S = readings.map((r) => r.systolic);
    const D = readings.map((r) => r.diastolic);
    const P = readings.map((r) => r.pulse);
    const labels = readings.map((r) => `${formatDateShort(r.timestamp)} ${formatTime(r.timestamp)}`);

    // --- Chart 1: Trend over time (Line) ---
    if (chart1Ref.current) {
      const c1 = new ChartJS(chart1Ref.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Sistolica',
              data: S,
              borderColor: sysColor,
              backgroundColor: sysColor,
              borderWidth: 2.6,
              pointRadius: readings.length > 50 ? 0 : 3.5,
              tension: 0.3,
            },
            {
              label: 'Diastolica',
              data: D,
              borderColor: diaColor,
              backgroundColor: diaColor,
              borderWidth: 2.6,
              pointRadius: readings.length > 50 ? 0 : 3.5,
              tension: 0.3,
            },
            {
              label: 'Pulsazioni (bpm)',
              data: P,
              borderColor: bpmColor,
              backgroundColor: bpmColor,
              borderWidth: 1.8,
              pointRadius: readings.length > 50 ? 0 : 2.5,
              tension: 0.3,
              yAxisID: 'y2',
            },
            {
              label: 'Soglia 140 (Sistolica)',
              data: readings.map(() => 140),
              borderColor: sysColor,
              borderDash: [5, 5],
              borderWidth: 1.2,
              pointRadius: 0,
              yAxisID: 'y',
            },
            {
              label: 'Soglia 90 (Diastolica)',
              data: readings.map(() => 90),
              borderColor: diaColor,
              borderDash: [5, 5],
              borderWidth: 1.2,
              pointRadius: 0,
              yAxisID: 'y',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              labels: {
                usePointStyle: true,
                filter: (item) => !item.text.startsWith('Soglia'),
                color: inkColor,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 8, maxRotation: 0, color: mutColor },
            },
            y: {
              title: { display: true, text: 'mmHg', color: mutColor },
              grid: { color: lineColor },
              suggestedMin: 60,
              suggestedMax: 170,
              ticks: { color: mutColor },
            },
            y2: {
              position: 'right',
              title: { display: true, text: 'bpm', color: bpmColor },
              grid: { display: false },
              suggestedMin: 40,
              suggestedMax: 120,
              ticks: { color: bpmColor },
            },
          },
        },
      });
      chartInstancesRef.current.push(c1);
    }

    // --- Chart 2: Scatter plot (Systolic vs Diastolic) ---
    if (chart2Ref.current) {
      const c2 = new ChartJS(chart2Ref.current, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Letture',
              data: readings.map((r) => ({ x: r.diastolic, y: r.systolic })),
              backgroundColor: readings.map((r) => CATEGORIES[getCategoryIndex(r.systolic, r.diastolic)].color),
              pointRadius: 6,
              pointHoverRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const raw = ctx.raw as { x: number; y: number };
                  const cat = CATEGORIES[getCategoryIndex(raw.y, raw.x)];
                  return `${raw.y}/${raw.x} mmHg · ${cat.name}`;
                },
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: 'Diastolica (mmHg)', color: mutColor },
              grid: { color: lineColor },
              suggestedMin: 55,
              suggestedMax: 120,
              ticks: { color: mutColor },
            },
            y: {
              title: { display: true, text: 'Sistolica (mmHg)', color: mutColor },
              grid: { color: lineColor },
              suggestedMin: 90,
              suggestedMax: 190,
              ticks: { color: mutColor },
            },
          },
        },
      });
      chartInstancesRef.current.push(c2);
    }

    // --- Chart 3: Doughnut Distribution ---
    if (chart3Ref.current) {
      const counts = [0, 0, 0, 0, 0, 0];
      readings.forEach((r) => {
        counts[getCategoryIndex(r.systolic, r.diastolic)]++;
      });

      const c3 = new ChartJS(chart3Ref.current, {
        type: 'doughnut',
        data: {
          labels: CATEGORIES.map((c) => c.name),
          datasets: [
            {
              data: counts,
              backgroundColor: CATEGORIES.map((c) => c.color),
              borderColor: cardColor,
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                usePointStyle: true,
                color: inkColor,
                filter: (item, chartData) => {
                  const ds = chartData.datasets[0];
                  return (ds.data[item.index as number] as number) > 0;
                },
              },
            },
          },
        },
      });
      chartInstancesRef.current.push(c3);
    }

    // --- Chart 4: Time of day grouped bar ---
    if (chart4Ref.current) {
      const groups = groupByTimeOfDay(readings);
      const c4 = new ChartJS(chart4Ref.current, {
        type: 'bar',
        data: {
          labels: groups.map((g) => `${g.name} (${g.readings.length})`),
          datasets: [
            {
              label: 'Sistolica media',
              data: groups.map((g) => g.avgSys),
              backgroundColor: sysColor,
              borderRadius: 8,
            },
            {
              label: 'Diastolica media',
              data: groups.map((g) => g.avgDia),
              backgroundColor: diaColor,
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                usePointStyle: true,
                color: inkColor,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: mutColor },
            },
            y: {
              grid: { color: lineColor },
              suggestedMin: 60,
              ticks: { color: mutColor },
            },
          },
        },
      });
      chartInstancesRef.current.push(c4);
    }

    return () => {
      chartInstancesRef.current.forEach((c) => c.destroy());
      chartInstancesRef.current = [];
    };
  }, [readings, isDarkProp]);

  if (!readings.length) return null;

  return (
    <div className="grid grid-cols-12 gap-4 w-full max-w-full">
      {/* 1. Trend over time */}
      <div className="col-span-12 bg-[#ffffff] dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-[#0f172a] dark:text-[#f1f5f9]">
              Andamento nel tempo
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
              Linee tratteggiate: soglie cliniche raccomandate a 140 e 90 mmHg
            </p>
          </div>
        </div>
        <div className="relative h-[280px] sm:h-[340px] w-full mt-2">
          <canvas ref={chart1Ref} />
        </div>
      </div>

      {/* 2. Scatter: Systolic vs Diastolic */}
      <div className="col-span-12 lg:col-span-7 bg-[#ffffff] dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="font-display font-bold text-base sm:text-lg text-[#0f172a] dark:text-[#f1f5f9]">
          Sistolica contro diastolica
        </h3>
        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-2">
          Ogni punto è una lettura, colorata in base alla categoria ESC/ESH
        </p>
        <div className="relative h-[260px] sm:h-[300px] w-full mt-2">
          <canvas ref={chart2Ref} />
        </div>
      </div>

      {/* 3. Distribution Donut */}
      <div className="col-span-12 lg:col-span-5 bg-[#ffffff] dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="font-display font-bold text-base sm:text-lg text-[#0f172a] dark:text-[#f1f5f9]">
          Distribuzione categorie
        </h3>
        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-2">
          Percentuale letture per grado di pressione
        </p>
        <div className="relative h-[260px] sm:h-[300px] w-full mt-2">
          <canvas ref={chart3Ref} />
        </div>
      </div>

      {/* 4. Time of day analysis */}
      <div className="col-span-12 bg-[#ffffff] dark:bg-[#0f1b2d] border border-[#d8e2ee] dark:border-[#1c2e46] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="font-display font-bold text-base sm:text-lg text-[#0f172a] dark:text-[#f1f5f9]">
          Momento della giornata
        </h3>
        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-2">
          Medie aggregate per fascia oraria (Mattina 06-12, Pomeriggio 12-18, Sera 18-06)
        </p>
        <div className="relative h-[240px] w-full mt-2">
          <canvas ref={chart4Ref} />
        </div>
      </div>
    </div>
  );
}
