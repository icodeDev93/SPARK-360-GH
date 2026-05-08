import { useMemo } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useExpenses } from '@/hooks/useExpenses';
import { inventoryItems } from '@/mocks/inventory';
import type { AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

interface Props { filter: AnalyticsFilter; }

const EXPENSE_COLORS: Record<string, string> = {
  Rent: 'bg-indigo-500', Utilities: 'bg-violet-500', Payroll: 'bg-emerald-500',
  Supplies: 'bg-amber-500', Marketing: 'bg-rose-500', Maintenance: 'bg-cyan-500',
  Transport: 'bg-orange-500', Insurance: 'bg-teal-500', Other: 'bg-slate-400',
};

function parseDate(dateStr: string): Date {
  try { return new Date(dateStr); } catch { return new Date(); }
}

export default function ProfitTab({ filter }: Props) {
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

  const totalCOGS = useMemo(() => completedSales.reduce((sum, sale) =>
    sum + sale.items.reduce((itemSum, item) => {
      const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
      return itemSum + (inv ? inv.costPrice * item.qty : 0);
    }, 0), 0), [completedSales]);

  const totalRevenue = completedSales.reduce((s, t) => s + t.grandTotal, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amountGHS, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const profitByCategory = useMemo(() => {
    const map: Record<string, { revenue: number; cogs: number; grossProfit: number }> = {};
    completedSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
        const category = inv?.category || 'Other';
        const revenue = item.price * item.qty;
        const cogs = inv ? inv.costPrice * item.qty : 0;
        if (!map[category]) map[category] = { revenue: 0, cogs: 0, grossProfit: 0 };
        map[category].revenue += revenue;
        map[category].cogs += cogs;
        map[category].grossProfit += revenue - cogs;
      });
    });
    return Object.entries(map).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.grossProfit - a.grossProfit);
  }, [completedSales]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amountGHS; });
    return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const maxExpense = Math.max(...expenseByCategory.map((e) => e.amount), 1);
  const totalExpenseAmount = expenseByCategory.reduce((s, e) => s + e.amount, 0);

  const dailyProfit = useMemo(() => {
    const map = new Map<string, { revenue: number; cogs: number; expenses: number }>();
    completedSales.forEach((sale) => {
      const key = sale.date;
      const existing = map.get(key) || { revenue: 0, cogs: 0, expenses: 0 };
      const saleCogs = sale.items.reduce((sum, item) => {
        const inv = inventoryItems.find((i) => Number(i.itemId.replace(/\D/g, '')) === item.id);
        return sum + (inv ? inv.costPrice * item.qty : 0);
      }, 0);
      map.set(key, { revenue: existing.revenue + sale.grandTotal, cogs: existing.cogs + saleCogs, expenses: existing.expenses });
    });
    filteredExpenses.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const existing = map.get(key) || { revenue: 0, cogs: 0, expenses: 0 };
      map.set(key, { ...existing, expenses: existing.expenses + e.amountGHS });
    });
    return Array.from(map.entries())
      .map(([date, data]) => ({ date, grossProfit: data.revenue - data.cogs, netProfit: data.revenue - data.cogs - data.expenses }))
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
      .slice(-14);
  }, [completedSales, filteredExpenses]);

  const maxDailyProfit = Math.max(...dailyProfit.map((d) => Math.max(d.grossProfit, d.netProfit)), 1);
  const minDailyProfit = Math.min(...dailyProfit.map((d) => Math.min(d.grossProfit, d.netProfit)), 0);
  const profitRange = maxDailyProfit - minDailyProfit || 1;

  return (
    <div className="space-y-6" id="analytics-print-area">
      {/* Profit KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₵${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-funds-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Cost of Goods', value: `₵${totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-shopping-basket-line', color: 'bg-rose-50 text-rose-600' },
          { label: 'Gross Profit', value: `₵${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-coins-line', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Net Profit', value: `₵${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-wallet-line', color: netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-start gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${kpi.color}`}>
              <i className={`${kpi.icon} text-xl`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{kpi.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-1 font-mono">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Margin Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%`, sub: 'Revenue minus COGS', color: grossMargin >= 30 ? 'text-emerald-600' : grossMargin >= 15 ? 'text-amber-600' : 'text-rose-600' },
          { label: 'Net Margin', value: `${netMargin.toFixed(1)}%`, sub: 'After all expenses', color: netMargin >= 15 ? 'text-emerald-600' : netMargin >= 5 ? 'text-amber-600' : 'text-rose-600' },
          { label: 'Expense Ratio', value: `${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0.0'}%`, sub: 'Expenses / Revenue', color: 'text-slate-600' },
          { label: 'COGS Ratio', value: `${totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : '0.0'}%`, sub: 'COGS / Revenue', color: 'text-slate-600' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl p-5 border border-slate-100">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 font-mono ${m.color}`}>{m.value}</p>
            <p className="text-slate-400 text-xs mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profit Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-slate-800 font-bold text-base">Profit Trend</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span><span className="text-xs text-slate-500">Gross</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500"></span><span className="text-xs text-slate-500">Net</span></div>
            </div>
          </div>
          {dailyProfit.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300">
              <i className="ri-line-chart-line text-4xl mb-2"></i>
              <p className="text-slate-400 text-sm">No profit data for this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-52">
              {dailyProfit.map((d) => {
                const grossH = Math.round(((d.grossProfit - minDailyProfit) / profitRange) * 100);
                const netH = Math.round(((d.netProfit - minDailyProfit) / profitRange) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5 h-40">
                      <div className="w-full max-w-[14px] bg-emerald-500 rounded-t-sm transition-all duration-500 hover:bg-emerald-600 cursor-pointer relative group" style={{ height: `${Math.max(grossH, 4)}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Gross: ₵{d.grossProfit.toFixed(2)}</div>
                      </div>
                      <div className="w-full max-w-[14px] bg-indigo-500 rounded-t-sm transition-all duration-500 hover:bg-indigo-600 cursor-pointer relative group" style={{ height: `${Math.max(netH, 4)}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Net: ₵{d.netProfit.toFixed(2)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">{d.date.split(',')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Expense Breakdown</h3>
          {expenseByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300">
              <i className="ri-pie-chart-line text-3xl mb-2"></i>
              <p className="text-slate-400 text-sm">No expenses for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenseByCategory.map((e) => {
                const pct = totalExpenseAmount > 0 ? Math.round((e.amount / totalExpenseAmount) * 100) : 0;
                const color = EXPENSE_COLORS[e.category] || 'bg-slate-400';
                return (
                  <div key={e.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-700 text-sm font-medium">{e.category}</span>
                      <span className="text-slate-500 text-xs font-mono">₵{e.amount.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${(e.amount / maxExpense) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-700 text-sm font-bold">Total</span>
                <span className="text-slate-800 text-sm font-bold font-mono">₵{totalExpenseAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profit by Category Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-slate-800 font-bold text-sm">Profit by Category</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Category', 'Revenue', 'COGS', 'Gross Profit', 'Margin', 'Share'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profitByCategory.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">No data for this period</td></tr>
              ) : profitByCategory.map((cat, i) => {
                const margin = cat.revenue > 0 ? (cat.grossProfit / cat.revenue) * 100 : 0;
                const share = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                return (
                  <tr key={cat.category} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-5 py-3 text-slate-700 text-sm font-semibold">{cat.category}</td>
                    <td className="px-5 py-3 text-slate-800 text-sm font-bold font-mono">₵{cat.revenue.toFixed(2)}</td>
                    <td className="px-5 py-3 text-slate-500 text-sm font-mono">₵{cat.cogs.toFixed(2)}</td>
                    <td className="px-5 py-3 text-emerald-600 text-sm font-bold font-mono">₵{cat.grossProfit.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${margin >= 40 ? 'bg-emerald-100 text-emerald-700' : margin >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-slate-500 text-xs">{share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {profitByCategory.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-5 py-3 text-slate-700 font-bold text-sm">Total</td>
                  <td className="px-5 py-3 text-indigo-600 font-bold text-sm font-mono">₵{totalRevenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600 font-bold text-sm font-mono">₵{totalCOGS.toFixed(2)}</td>
                  <td className="px-5 py-3 text-emerald-600 font-bold text-sm font-mono">₵{grossProfit.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600 text-sm font-bold">{grossMargin.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-slate-500 text-sm">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
