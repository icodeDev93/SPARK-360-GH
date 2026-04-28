import { useState, useMemo } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

interface PeriodSummary {
  label: string;
  date: string;
  revenue: number;
  margin: number;
  transactions: number;
  avgOrder: number;
}

function parseDate(dateStr: string): Date {
  try { return new Date(dateStr); } catch { return new Date(); }
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
  Cash:           'bg-emerald-500',
  MoMo:           'bg-indigo-500',
  Cheque:         'bg-amber-500',
  'Bank Transfer':'bg-violet-500',
};

const fmt = (n: number) => `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

export default function SalesReport() {
  const { invoices } = useSalesLog();
  const [period, setPeriod]       = useState<Period>('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');

  const completedInvoices = invoices.filter((inv) => inv.status === 'completed');

  const filteredInvoices = useMemo(() => {
    if (period !== 'custom' || !customFrom) return completedInvoices;
    const from = new Date(customFrom);
    const to   = customTo ? new Date(customTo) : new Date();
    to.setHours(23, 59, 59);
    return completedInvoices.filter((inv) => {
      const d = parseDate(inv.date);
      return d >= from && d <= to;
    });
  }, [completedInvoices, period, customFrom, customTo]);

  const grouped = useMemo((): PeriodSummary[] => {
    const map = new Map<string, { revenue: number; margin: number; transactions: number; date: string }>();

    filteredInvoices.forEach((inv) => {
      const d = parseDate(inv.date);
      let key = '';
      if (period === 'daily' || period === 'custom') key = formatDateKey(d);
      else if (period === 'weekly') key = getWeekLabel(d);
      else key = getMonthKey(d);

      const ex = map.get(key) || { revenue: 0, margin: 0, transactions: 0, date: inv.date };
      map.set(key, {
        revenue:      ex.revenue + inv.netSales,
        margin:       ex.margin + inv.grossMargin,
        transactions: ex.transactions + 1,
        date:         ex.date,
      });
    });

    return Array.from(map.entries())
      .map(([label, data]) => ({
        label,
        date: data.date,
        revenue: data.revenue,
        margin:  data.margin,
        transactions: data.transactions,
        avgOrder: data.transactions > 0 ? data.revenue / data.transactions : 0,
      }))
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [filteredInvoices, period]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach((inv) => {
      map[inv.paymentMethod] = (map[inv.paymentMethod] || 0) + inv.netSales;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([method, amount]) => ({ method, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredInvoices]);

  const totalRevenue = filteredInvoices.reduce((s, inv) => s + inv.netSales, 0);
  const totalMargin  = filteredInvoices.reduce((s, inv) => s + inv.grossMargin, 0);
  const totalTx      = filteredInvoices.length;
  const avgOrder     = totalTx > 0 ? totalRevenue / totalTx : 0;
  const marginPct    = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const maxRevenue   = Math.max(...grouped.map((g) => g.revenue), 1);

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
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer" />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Net Revenue',    value: fmt(totalRevenue), icon: 'ri-funds-line',        color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Gross Margin',   value: fmt(totalMargin),  icon: 'ri-percent-line',      color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Margin %',       value: `${marginPct.toFixed(1)}%`, icon: 'ri-pie-chart-2-line', color: 'bg-violet-50 text-violet-600' },
          { label: 'Avg. Order',     value: fmt(avgOrder),     icon: 'ri-bar-chart-2-line',  color: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{totalTx} transactions</p>
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
                      <span className="text-emerald-600 text-xs font-semibold font-mono">{fmt(g.margin)}</span>
                      <span className="text-slate-800 text-xs font-bold font-mono">{fmt(g.revenue)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-indigo-500 rounded-l-full transition-all duration-700"
                      style={{ width: `${(g.revenue / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
              {grouped.length > 10 && (
                <p className="text-slate-400 text-xs text-center pt-1">+{grouped.length - 10} more periods</p>
              )}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Payment Methods</h3>
          {paymentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300">
              <i className="ri-bank-card-line text-3xl mb-2"></i>
              <p className="text-slate-400 text-sm">No data</p>
            </div>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
                {paymentBreakdown.map((p) => (
                  <div key={p.method}
                    className={`${PAYMENT_COLORS[p.method] || 'bg-slate-400'} rounded-sm`}
                    style={{ width: `${p.pct}%` }}
                    title={`${p.method}: ${p.pct}%`}
                  />
                ))}
              </div>
              <div className="space-y-3">
                {paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${PAYMENT_COLORS[p.method] || 'bg-slate-400'}`}></span>
                      <span className="text-slate-600 text-sm">{p.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 text-sm font-bold font-mono">{fmt(p.amount)}</p>
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
                  {['Period', 'Transactions', 'Net Revenue', 'Gross Margin', 'Margin %', 'Avg. Order'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((g, i) => {
                  const gPct = g.revenue > 0 ? (g.margin / g.revenue) * 100 : 0;
                  return (
                    <tr key={g.label} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-5 py-3 text-slate-700 text-sm font-semibold">{g.label}</td>
                      <td className="px-5 py-3 text-slate-600 text-sm">{g.transactions}</td>
                      <td className="px-5 py-3 text-slate-800 text-sm font-bold font-mono">{fmt(g.revenue)}</td>
                      <td className="px-5 py-3 text-emerald-600 text-sm font-semibold font-mono">{fmt(g.margin)}</td>
                      <td className="px-5 py-3 text-slate-600 text-sm">{gPct.toFixed(1)}%</td>
                      <td className="px-5 py-3 text-slate-600 text-sm font-mono">{fmt(g.avgOrder)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-5 py-3 text-slate-700 font-bold text-sm">Total</td>
                  <td className="px-5 py-3 text-slate-700 font-bold text-sm">{totalTx}</td>
                  <td className="px-5 py-3 text-indigo-600 font-bold text-sm font-mono">{fmt(totalRevenue)}</td>
                  <td className="px-5 py-3 text-emerald-600 font-bold text-sm font-mono">{fmt(totalMargin)}</td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{marginPct.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-slate-600 text-sm font-mono">{fmt(avgOrder)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
