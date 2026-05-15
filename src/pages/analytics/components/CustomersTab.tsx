import { useMemo } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';
import type { AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

interface Props {
  filter: AnalyticsFilter;
  variant?: 'full' | 'top';
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500'];

export default function CustomersTab({ filter, variant = 'full' }: Props) {
  const { invoices } = useSalesLog();
  const isTopOnly = variant === 'top';

  const filteredInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === 'completed' && filter.isInRange(inv.date)),
    [invoices, filter]
  );

  const customerStats = useMemo(() => {
    const map = new Map<string, { name: string; visits: number; revenue: number; items: number; lastDate: string }>();
    filteredInvoices.forEach((inv) => {
      const name = inv.customerName || 'Walk-in Customer';
      const existing = map.get(name);
      if (existing) {
        existing.visits += 1;
        existing.revenue += inv.netSales;
        existing.items += inv.items.reduce((s, i) => s + i.qty, 0);
        existing.lastDate = inv.date;
      } else {
        map.set(name, { name, visits: 1, revenue: inv.netSales, items: inv.items.reduce((s, i) => s + i.qty, 0), lastDate: inv.date });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  const totalCustomers = customerStats.length;
  const totalRevenue = customerStats.reduce((s, c) => s + c.revenue, 0);
  const avgLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const avgVisits = totalCustomers > 0 ? customerStats.reduce((s, c) => s + c.visits, 0) / totalCustomers : 0;
  const newCustomers = customerStats.filter((c) => c.visits === 1).length;
  const returningCustomers = customerStats.filter((c) => c.visits >= 2).length;

  return (
    <div className="space-y-6" id="analytics-print-area">
      {/* KPIs */}
      {!isTopOnly && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: String(totalCustomers), icon: 'ri-group-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Avg. Lifetime Value', value: `₵${avgLifetimeValue.toFixed(2)}`, icon: 'ri-coins-line', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Avg. Visits', value: avgVisits.toFixed(1), icon: 'ri-repeat-line', color: 'bg-amber-50 text-amber-600' },
          { label: 'Returning Rate', value: `${totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0}%`, icon: 'ri-user-follow-line', color: 'bg-violet-50 text-violet-600' },
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
      </div>}

      <div className={`grid grid-cols-1 ${isTopOnly ? '' : 'lg:grid-cols-3'} gap-4`}>
        {/* Top Customers Table */}
        <div className={`${isTopOnly ? '' : 'lg:col-span-2'} bg-white rounded-xl p-6 border border-slate-100`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-800 font-bold text-base">Top Customers</h3>
            <span className="text-slate-400 text-xs">{filter.label}</span>
          </div>
          {customerStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <i className="ri-group-line text-4xl mb-2"></i>
              <p className="text-slate-400 text-sm">No customer data for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr>
                    {['Customer', 'Visits', 'Items', 'Revenue', 'Avg. Order', 'Last Visit'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerStats.map((c, i) => {
                    const avgOrder = c.visits > 0 ? c.revenue / c.visits : 0;
                    const initials = c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                    const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    return (
                      <tr key={c.name} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{initials}</div>
                            <p className="text-slate-800 text-sm font-semibold">{c.name}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-slate-600 text-sm font-semibold">{c.visits}</td>
                        <td className="py-3 pr-3 text-slate-600 text-sm">{c.items}</td>
                        <td className="py-3 pr-3 text-slate-800 text-sm font-bold font-mono">₵{c.revenue.toFixed(2)}</td>
                        <td className="py-3 pr-3 text-slate-500 text-sm font-mono">₵{avgOrder.toFixed(2)}</td>
                        <td className="py-3 text-slate-500 text-sm">{c.lastDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customer Mix */}
        {!isTopOnly && <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Customer Mix</h3>
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                {totalCustomers > 0 && (
                  <>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="5"
                      strokeDasharray={`${(returningCustomers / totalCustomers) * 100} ${100 - (returningCustomers / totalCustomers) * 100}`}
                      strokeDashoffset="0" className="transition-all duration-700" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="5"
                      strokeDasharray={`${(newCustomers / totalCustomers) * 100} ${100 - (newCustomers / totalCustomers) * 100}`}
                      strokeDashoffset={`-${(returningCustomers / totalCustomers) * 100}`}
                      className="transition-all duration-700" />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-slate-900 text-xl font-bold">{totalCustomers}</span>
                <span className="text-slate-400 text-[10px]">customers</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {[
                { label: 'Returning', color: 'bg-indigo-500', count: returningCustomers },
                { label: 'New', color: 'bg-emerald-500', count: newCustomers },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                    <span className="text-slate-600 text-sm">{item.label}</span>
                  </div>
                  <span className="text-slate-800 text-sm font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-slate-700 font-semibold text-sm mb-3">Visit Frequency</h4>
            <div className="space-y-2">
              {[
                { label: '1 visit', count: customerStats.filter((c) => c.visits === 1).length },
                { label: '2-3 visits', count: customerStats.filter((c) => c.visits >= 2 && c.visits <= 3).length },
                { label: '4+ visits', count: customerStats.filter((c) => c.visits >= 4).length },
              ].map((f) => {
                const pct = totalCustomers > 0 ? (f.count / totalCustomers) * 100 : 0;
                return (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs w-16">{f.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-slate-700 text-xs font-bold w-6 text-right">{f.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
