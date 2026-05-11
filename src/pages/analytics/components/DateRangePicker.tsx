import { useState, useRef, useEffect } from 'react';
import type { PresetKey, AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

const PRESETS: { key: PresetKey; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: 'ri-sun-line' },
  { key: '7d', label: 'Last 7 Days', icon: 'ri-calendar-line' },
  { key: '30d', label: 'Last 30 Days', icon: 'ri-calendar-2-line' },
  { key: '90d', label: 'Last 90 Days', icon: 'ri-calendar-check-line' },
  { key: 'year', label: 'This Year', icon: 'ri-calendar-todo-line' },
  { key: 'custom', label: 'Custom Range', icon: 'ri-calendar-event-line' },
];

interface Props {
  filter: AnalyticsFilter;
}

export default function DateRangePicker({ filter }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayLabel = filter.preset === 'custom' && filter.customFrom
    ? `${filter.customFrom}${filter.customTo ? ` → ${filter.customTo}` : ''}`
    : filter.label;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer whitespace-nowrap"
      >
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-calendar-line text-sm"></i>
        </span>
        <span>{displayLabel}</span>
        <span className="w-4 h-4 flex items-center justify-center text-slate-400">
          {open ? <i className="ri-arrow-up-s-line text-sm"></i> : <i className="ri-arrow-down-s-line text-sm"></i>}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-72 bg-white border border-slate-200 rounded-2xl z-50 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-slate-700 font-bold text-sm">Date Range</p>
            <p className="text-slate-400 text-xs mt-0.5">Filter data by period</p>
          </div>

          {/* Preset Buttons */}
          <div className="p-3 space-y-1">
            {PRESETS.filter((p) => p.key !== 'custom').map((p) => (
              <button
                key={p.key}
                onClick={() => { filter.setPreset(p.key); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left ${
                  filter.preset === p.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={`${p.icon} text-sm`}></i>
                </span>
                {p.label}
                {filter.preset === p.key && (
                  <span className="ml-auto w-4 h-4 flex items-center justify-center">
                    <i className="ri-check-line text-sm"></i>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom Range */}
          <div className="px-3 pb-3 border-t border-slate-100 pt-3">
            <button
              onClick={() => filter.setPreset('custom')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left mb-3 ${
                filter.preset === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-calendar-event-line text-sm"></i>
              </span>
              Custom Range
              {filter.preset === 'custom' && (
                <span className="ml-auto w-4 h-4 flex items-center justify-center">
                  <i className="ri-check-line text-sm"></i>
                </span>
              )}
            </button>

            {filter.preset === 'custom' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">From</label>
                  <input
                    type="date"
                    value={filter.customFrom}
                    onChange={(e) => filter.setCustomFrom(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">To</label>
                  <input
                    type="date"
                    value={filter.customTo}
                    onChange={(e) => filter.setCustomTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap mt-1"
                >
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
