export interface Reading {
  id: string;
  timestamp: number;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string;
  arm?: 'left' | 'right' | 'unspecified';
  position?: 'sitting' | 'lying' | 'standing';
  createdAt: number;
  updatedAt: number;
}

export type CategoryIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface CategoryInfo {
  index: CategoryIndex;
  name: string;
  color: string;
  badgeBg: string;
  borderCol: string;
  textCol: string;
  description: string;
  criteria: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    index: 0,
    name: 'Ottimale',
    color: '#0284c7',
    badgeBg: 'bg-sky-600',
    borderCol: 'border-sky-500',
    textCol: 'text-sky-600 dark:text-sky-400',
    description: 'Pressione perfetta, rischio cardiovascolare minimo.',
    criteria: 'Sistolica < 120 e Diastolica < 80 mmHg',
  },
  {
    index: 1,
    name: 'Normale',
    color: '#2563eb',
    badgeBg: 'bg-blue-600',
    borderCol: 'border-blue-500',
    textCol: 'text-blue-600 dark:text-blue-400',
    description: 'Valori corretti nella norma fisiologica.',
    criteria: 'Sistolica 120–129 o Diastolica 80–84 mmHg',
  },
  {
    index: 2,
    name: 'Normale-alta',
    color: '#e0b422',
    badgeBg: 'bg-amber-500',
    borderCol: 'border-amber-500',
    textCol: 'text-amber-600 dark:text-amber-400',
    description: 'Valori pre-ipertensivi, monitorare con regolarità.',
    criteria: 'Sistolica 130–139 o Diastolica 85–89 mmHg',
  },
  {
    index: 3,
    name: 'Ipertensione grado 1',
    color: '#ee8a2b',
    badgeBg: 'bg-orange-500',
    borderCol: 'border-orange-500',
    textCol: 'text-orange-600 dark:text-orange-400',
    description: 'Ipertensione lieve, raccomandato controllo medico.',
    criteria: 'Sistolica 140–159 o Diastolica 90–99 mmHg',
  },
  {
    index: 4,
    name: 'Ipertensione grado 2',
    color: '#e5484d',
    badgeBg: 'bg-rose-500',
    borderCol: 'border-rose-500',
    textCol: 'text-rose-600 dark:text-rose-400',
    description: 'Ipertensione moderata, consultare il medico.',
    criteria: 'Sistolica 160–179 o Diastolica 100–109 mmHg',
  },
  {
    index: 5,
    name: 'Ipertensione grado 3',
    color: '#a3182e',
    badgeBg: 'bg-red-800',
    borderCol: 'border-red-700',
    textCol: 'text-red-700 dark:text-red-400',
    description: 'Ipertensione severa, rivolgersi tempestivamente al medico.',
    criteria: 'Sistolica ≥ 180 o Diastolica ≥ 110 mmHg',
  },
];

export type TimeRangeFilter = 0 | 7 | 30 | 90 | 365;

export type SyncStatus = 'connected' | 'connecting' | 'offline' | 'syncing';
