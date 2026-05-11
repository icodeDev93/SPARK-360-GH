import { useMemo } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useExpenses } from '@/hooks/useExpenses';
import type { AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

interface Props { filter: AnalyticsFilter; }

function parseDate(dateStr: string): Date {
  try { return new Date(dateStr); } catch { return new Date(); }
}

export default function OverviewTab({ filter }: Props) {
  const { sales } = useSalesLog();
  const { expenses } = useExpenses();

  const completedSales = useMemo(
    () => sales.filter((s) => s.status === 'completed' && filter.isInRange(s.date)),
    [sales, filter]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => filter.isInRange(e.date)),
    [expenses, filter]
  );

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    completedSales.forEach((s) => {
      map.set(s.date, (map.get(s.date) || 0) + s.grandTotal);
    });
    return Array.from(map.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
      .slice(-14);
  }, [completedSales]);

  const totalRevenue = completedSales.reduce((s, t) => s + t.grandTotal, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amountGHS, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const maxDaily = Math.max(...dailyRevenue.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6" id="analytics-print-area">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-funds-line', color: 'bg-indigo-50 text-indigo-600', trend: '+8.1%', up: true },
          { label: 'Total Expenses', value: `₵${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-wallet-3-line', color: 'bg-rose-50 text-rose-600', trend: '+4.2%', up: false },
          { label: 'Net Profit', value: `₵${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-coins-line', color: 'bg-emerald-50 text-emerald-600', trend: netProfit >= 0 ? '+12.5%' : '-3.2%', up: netProfit >= 0 },
          { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%`, icon: 'ri-percent-line', color: 'bg-amber-50 text-amber-600', trend: '+1.2%', up: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-start gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${kpi.color}`}>
              <i className={`${kpi.icon} text-xl`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{kpi.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-1 font-mono">{kpi.value}</p>
              <p className={`text-xs font-semibold mt-1 ${kpi.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {kpi.trend} <span className="text-slate-400 font-normal">vs last period</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-slate-800 font-bold text-base">Revenue Trend</h3>
            <span className="text-slate-400 text-xs">{filter.label}</span>
          </div>
          {dailyRevenue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300">
              <i className="ri-line-chart-line text-4xl mb-2"></i>
              <p className="text-slate-400 text-sm">No sales data for this period</p>
            </div>
          ) : (() => {
            const W = 600; const H = 180; const PAD = { top: 16, right: 16, bottom: 28, left: 8 };
            const innerW = W - PAD.left - PAD.right;
            const innerH = H - PAD.top - PAD.bottom;
            const n = dailyRevenue.length;
            const xStep = n > 1 ? innerW / (n - 1) : 0;
            const toX = (i: number) => PAD.left + (n === 1 ? innerW / 2 : i * xStep);
            const toY = (v: number) => PAD.top + innerH - (v / maxDaily) * innerH;
            const points = dailyRevenue.map((d, i) => ({ x: toX(i), y: toY(d.revenue), ...d }));
            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
            const labelStep = n <= 7 ? 1 : n <= 14 ? 2 : Math.ceil(n / 7);
            return (
              <div className="relative w-full" style={{ height: H }}>
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                    <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke="#f1f5f9" strokeWidth="1" />
                  ))}
                  {/* Area fill */}
                  <path d={areaPath} fill="url(#revGrad)" />
                  {/* Trend line */}
                  <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Data points + tooltips */}
                  {points.map((p) => (
                    <g key={p.date} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
                      <circle cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="white" strokeWidth="2" className="transition-all group-hover:r-5" />
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <rect x={p.x - 36} y={p.y - 30} width="72" height="20" rx="4" fill="#1e293b" />
                        <text x={p.x} y={p.y - 16} textAnchor="middle" fill="white" fontSize="9" fontFamily="monospace">₵{p.revenue.toFixed(2)}</text>
                      </g>
                    </g>
                  ))}
                  {/* X-axis labels */}
                  {points.map((p, i) => i % labelStep === 0 && (
                    <text key={p.date} x={p.x} y={H - 4} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
                      {p.date.slice(5)}
                    </text>
                  ))}
                </svg>
              </div>
            );
          })()}
        </div>

        {/* Revenue vs Expenses donut */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Revenue vs Expenses</h3>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-36 mb-4">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="4"
                  strokeDasharray={`${totalRevenue + totalExpenses > 0 ? (totalRevenue / (totalRevenue + totalExpenses)) * 100 : 0} ${totalRevenue + totalExpenses > 0 ? 100 - (totalRevenue / (totalRevenue + totalExpenses)) * 100 : 100}`}
                  strokeDashoffset="0" className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-slate-900 text-lg font-bold font-mono">{profitMargin.toFixed(0)}%</span>
                <span className="text-slate-400 text-[10px]">margin</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {[
                { label: 'Revenue', color: 'bg-indigo-500', value: `₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                { label: 'Expenses', color: 'bg-rose-500', value: `₵${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                    <span className="text-slate-600 text-sm">{item.label}</span>
                  </div>
                  <span className="text-slate-800 text-sm font-bold font-mono">{item.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-700 text-sm font-semibold">Net Profit</span>
                </div>
                <span className={`text-sm font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₵{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="bg-white rounded-xl p-6 border border-slate-100">
        <h3 className="text-slate-800 font-bold text-base mb-4">Transaction Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Completed Sales', value: completedSales.length, icon: 'ri-check-double-line', color: 'text-emerald-600' },
            { label: 'Refunded', value: sales.filter((s) => s.status === 'refunded' && filter.isInRange(s.date)).length, icon: 'ri-refund-line', color: 'text-rose-500' },
            { label: 'Avg. Sale Value', value: `₵${completedSales.length > 0 ? (totalRevenue / completedSales.length).toFixed(2) : '0.00'}`, icon: 'ri-shopping-bag-3-line', color: 'text-indigo-600' },
            { label: 'Total Items Sold', value: completedSales.reduce((s, t) => s + t.items.reduce((is, it) => is + it.qty, 0), 0), icon: 'ri-stack-line', color: 'text-violet-600' },
            { label: 'Unique Cashiers', value: new Set(completedSales.map((s) => s.cashier)).size, icon: 'ri-user-line', color: 'text-amber-600' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 ${stat.color}`}>
                <i className={`${stat.icon} text-lg`}></i>
              </span>
              <div>
                <p className="text-slate-900 text-lg font-bold font-mono">{stat.value}</p>
                <p className="text-slate-400 text-xs">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
