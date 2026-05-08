import { useState, useMemo } from 'react';

export type PresetKey = 'today' | '7d' | '30d' | '90d' | 'year' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface AnalyticsFilter {
  preset: PresetKey;
  customFrom: string;
  customTo: string;
  range: DateRange;
  label: string;
  setPreset: (p: PresetKey) => void;
  setCustomFrom: (v: string) => void;
  setCustomTo: (v: string) => void;
  isInRange: (dateStr: string) => boolean;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

const PRESET_LABELS: Record<PresetKey, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  year: 'This Year',
  custom: 'Custom Range',
};

export function useAnalyticsFilter(): AnalyticsFilter {
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo((): DateRange => {
    const now = new Date();
    switch (preset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case '7d':
        return { from: daysAgo(7), to: endOfDay(now) };
      case '30d':
        return { from: daysAgo(30), to: endOfDay(now) };
      case '90d':
        return { from: daysAgo(90), to: endOfDay(now) };
      case 'year':
        return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
      case 'custom': {
        const from = customFrom ? startOfDay(new Date(customFrom)) : null;
        const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
        return { from, to };
      }
      default:
        return { from: daysAgo(30), to: endOfDay(now) };
    }
  }, [preset, customFrom, customTo]);

  const isInRange = (dateStr: string): boolean => {
    try {
      const d = new Date(dateStr);
      if (range.from && d < range.from) return false;
      if (range.to && d > range.to) return false;
      return true;
    } catch {
      return true;
    }
  };

  return {
    preset,
    customFrom,
    customTo,
    range,
    label: PRESET_LABELS[preset],
    setPreset,
    setCustomFrom,
    setCustomTo,
    isInRange,
  };
}
