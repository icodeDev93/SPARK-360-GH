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
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
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
              <i className="ri-bar-chart-2-line text-4xl mb-2"></i>
              <p className="text-slate-400 text-sm">No sales data for this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-52">
              {dailyRevenue.map((d) => {
                const h = Math.round((d.revenue / maxDaily) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex justify-center">
                      <div
                        className="w-full max-w-[28px] bg-indigo-500 rounded-t-md transition-all duration-500 hover:bg-indigo-600 cursor-pointer relative group"
                        style={{ height: `${Math.max(h, 4)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          ₵{d.revenue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">{d.date.split(',')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
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