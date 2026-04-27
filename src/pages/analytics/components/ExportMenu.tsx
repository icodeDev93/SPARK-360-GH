import { useState, useRef, useEffect } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useExpenses } from '@/hooks/useExpenses';
import {
  exportSalesCSV,
  exportProductsCSV,
  exportExpensesCSV,
  exportProfitCSV,
  printAnalyticsPDF,
} from '../utils/exportUtils';
import type { AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

interface Props {
  activeTab: string;
  filter: AnalyticsFilter;
}

type ExportStatus = 'idle' | 'exporting' | 'done';

export default function ExportMenu({ activeTab, filter }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const { sales } = useSalesLog();
  const { expenses } = useExpenses();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredSales = sales.filter((s) => filter.isInRange(s.date));
  const filteredExpenses = expenses.filter((e) => filter.isInRange(e.date));
  const rangeLabel = filter.label.toLowerCase().replace(/\s+/g, '-');

  function flash() {
    setStatus('exporting');
    setTimeout(() => { setStatus('done'); setTimeout(() => setStatus('idle'), 1200); }, 600);
  }

  function handleCSV() {
    setOpen(false);
    flash();
    switch (activeTab) {
      case 'overview':
        exportSalesCSV(filteredSales, rangeLabel);
        break;
      case 'products':
        exportProductsCSV(filteredSales, rangeLabel);
        break;
      case 'customers':
        exportSalesCSV(filteredSales, rangeLabel);
        break;
      case 'profit':
        exportProfitCSV(filteredSales, filteredExpenses, rangeLabel);
        break;
      default:
        exportSalesCSV(filteredSales, rangeLabel);
    }
  }

  function handleExpensesCSV() {
    setOpen(false);
    flash();
    exportExpensesCSV(filteredExpenses, rangeLabel);
  }

  function handlePDF() {
    setOpen(false);
    flash();
    const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    printAnalyticsPDF(tabLabel, filter.label);
  }

  const btnClass = status === 'done'
    ? 'bg-emerald-600 text-white'
    : status === 'exporting'
    ? 'bg-slate-200 text-slate-500 cursor-wait'
    : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => status === 'idle' && setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${btnClass}`}
      >
        <span className="w-4 h-4 flex items-center justify-center">
          {status === 'exporting' && <i className="ri-loader-4-line text-sm animate-spin"></i>}
          {status === 'done' && <i className="ri-check-line text-sm"></i>}
          {status === 'idle' && <i className="ri-download-2-line text-sm"></i>}
        </span>
        {status === 'exporting' ? 'Exporting…' : status === 'done' ? 'Exported!' : 'Export'}
        {status === 'idle' && (
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            {open ? <i className="ri-arrow-up-s-line text-sm"></i> : <i className="ri-arrow-down-s-line text-sm"></i>}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-2xl z-50 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-slate-700 font-bold text-sm">Export Report</p>
            <p className="text-slate-400 text-xs mt-0.5">{filter.label} · {filteredSales.length} sales</p>
          </div>

          <div className="p-2">
            {/* CSV Section */}
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2">CSV Format</p>

            <button
              onClick={handleCSV}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-left"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
                <i className="ri-file-excel-2-line text-base"></i>
              </span>
              <div>
                <p className="font-semibold text-slate-800">
                  {activeTab === 'profit' ? 'Profit Summary' : activeTab === 'products' ? 'Products Report' : 'Sales Report'}
                </p>
                <p className="text-slate-400 text-xs">Download as .csv</p>
              </div>
            </button>

            {(activeTab === 'profit' || activeTab === 'overview') && (
              <button
                onClick={handleExpensesCSV}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-left"
              >
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 flex-shrink-0">
                  <i className="ri-file-list-3-line text-base"></i>
                </span>
                <div>
                  <p className="font-semibold text-slate-800">Expenses Report</p>
                  <p className="text-slate-400 text-xs">Download as .csv</p>
                </div>
              </button>
            )}

            {/* PDF Section */}
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2 mt-1 border-t border-slate-100 pt-3">PDF / Print</p>

            <button
              onClick={handlePDF}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-left"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 flex-shrink-0">
                <i className="ri-file-pdf-line text-base"></i>
              </span>
              <div>
                <p className="font-semibold text-slate-800">Print / Save PDF</p>
                <p className="text-slate-400 text-xs">Opens print dialog</p>
              </div>
            </button>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-slate-400 text-xs">
              <span className="w-3 h-3 inline-flex items-center justify-center mr-1"><i className="ri-information-line text-xs"></i></span>
              Exports reflect the selected date range
            </p>
          </div>
        </div>
      )}
    </div>
  );
}