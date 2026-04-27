import { useState, useMemo } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

interface DaySummary {
  label: string;
  date: string;
  revenue: number;
  transactions: number;
  avgOrder: number;
}

function parseDate(dateStr: string): Date {
  try {
    return new Date(dateStr);
  } catch {
    return new Date();
  }
}

function formatDateKey(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getMonthKey(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: 'bg-emerald-500',
  mobile: 'bg-indigo-500',
  card: 'bg-amber-500',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile: 'Mobile Money',
  card: 'Card',
};

export default function SalesReport() {
  const { sales } = useSalesLog();
  const [period, setPeriod] = useState<Period>('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const completedSales = sales.filter((s) => s.status === 'completed');

  // Filter by custom date range
  const filteredSales = useMemo(() => {
    if (period !== 'custom' || !customFrom) return completedSales;
    const from = new Date(customFrom);
    const to = customTo ? new Date(customTo) : new Date();
    to.setHours(23, 59, 59);
    return completedSales.filter((s) => {
      const d = parseDate(s.date);
      return d >= from && d <= to;
    });
  }, [completedSales, period, customFrom, customTo]);

  // Group by period
  const grouped = useMemo((): DaySummary[] => {
    const map = new Map<string, { revenue: number; transactions: number; date: string }>();

    filteredSales.forEach((s) => {
      const d = parseDate(s.date);
      let key = '';
      if (period === 'daily' || period === 'custom') {
        key = formatDateKey(d);
      } else if (period === 'weekly') {
        key = getWeekLabel(d);
      } else {
        key = getMonthKey(d);
      }
      const existing = map.get(key) || { revenue: 0, transactions: 0, date: s.date };
      map.set(key, {
        revenue: existing.revenue + s.grandTotal,
        transactions: existing.transactions + 1,
        date: existing.date,
      });
    });

    return Array.from(map.entries())
      .map(([label, data]) => ({
        label,
        date: data.date,
        revenue: data.revenue,
        transactions: data.transactions,
        avgOrder: data.transactions > 0 ? data.revenue / data.transactions : 0,
      }))
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [filteredSales, period]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.grandTotal;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([method, amount]) => ({
      method,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredSales]);

  const totalRevenue = filteredSales.reduce((s, t) => s + t.grandTotal, 0);
  const totalTx = filteredSales.length;
  const avgOrder = totalTx > 0 ? totalRevenue / totalTx : 0;
  const maxRevenue = Math.max(...grouped.map((g) => g.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['daily', 'weekly', 'monthly', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap capitalize ${
                period === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: `₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-funds-line', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Transactions', value: String(totalTx), icon: 'ri-receipt-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Avg. Order Value', value: `₵${avgOrder.toFixed(2)}`, icon: 'ri-bar-chart-2-line', color: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5 capitalize">{period} Revenue Breakdown</h3>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <i className="ri-bar-chart-2-line text-4xl mb-2"></i>
              <p className="text-slate-400 text-sm">No sales data for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.slice(0, 10).map((g) => (
                <div key={g.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-600 text-xs font-medium truncate max-w-[200px]">{g.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs">{g.transactions} sales</span>
                      <span className="text-slate-800 text-xs font-bold font-mono">₵{g.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                      style={{ width: `${(g.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {grouped.length > 10 && (
                <p className="text-slate-400 text-xs text-center pt-1">+{grouped.length - 10} more periods</p>
              )}
            </div>
          )}
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Payment Methods</h3>
          {paymentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300">
              <i className="ri-bank-card-line text-3xl mb-2"></i>
              <p className="text-slate-400 text-sm">No data</p>
            </div>
          ) : (
            <>
              {/* Donut-style bar */}
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
                {paymentBreakdown.map((p) => (
                  <div
                    key={p.method}
                    className={`${PAYMENT_COLORS[p.method] || 'bg-slate-400'} rounded-sm`}
                    style={{ width: `${p.pct}%` }}
                    title={`${PAYMENT_LABELS[p.method]}: ${p.pct}%`}
                  />
                ))}
              </div>
              <div className="space-y-3">
                {paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${PAYMENT_COLORS[p.method] || 'bg-slate-400'}`}></span>
                      <span className="text-slate-600 text-sm">{PAYMENT_LABELS[p.method] || p.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 text-sm font-bold font-mono">₵{p.amount.toFixed(2)}</p>
                      <p className="text-slate-400 text-xs">{p.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detailed Table */}
      {grouped.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-bold text-sm">Detailed Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Period', 'Transactions', 'Revenue', 'Avg. Order', 'Share'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((g, i) => (
                  <tr key={g.label} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-5 py-3 text-slate-700 text-sm font-semibold">{g.label}</td>
                    <td className="px-5 py-3 text-slate-600 text-sm">{g.transactions}</td>
                    <td className="px-5 py-3 text-slate-800 text-sm font-bold font-mono">₵{g.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-slate-600 text-sm font-mono">₵{g.avgOrder.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(g.revenue / totalRevenue) * 100}%` }} />
                        </div>
                        <span className="text-slate-500 text-xs">{Math.round((g.revenue / totalRevenue) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-5 py-3 text-slate-700 font-bold text-sm">Total</td>
                  <td className="px-5 py-3 text-slate-700 font-bold text-sm">{totalTx}</td>
                  <td className="px-5 py-3 text-indigo-600 font-bold text-sm font-mono">₵{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3 text-slate-600 text-sm font-mono">₵{avgOrder.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-500 text-sm">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
