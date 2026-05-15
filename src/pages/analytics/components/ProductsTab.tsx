import { useMemo, useState } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useInventory } from '@/hooks/useInventory';
import type { AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

interface Props {
  filter: AnalyticsFilter;
  variant?: 'full' | 'top';
}

const CATEGORY_COLORS: Record<string, string> = {
  Electronics: 'bg-indigo-500',
  Accessories: 'bg-violet-500',
  Clothing: 'bg-emerald-500',
  Stationery: 'bg-amber-500',
  'Food & Drinks': 'bg-rose-500',
};

export default function ProductsTab({ filter, variant = 'full' }: Props) {
  const { invoices } = useSalesLog();
  const { items: inventoryItems } = useInventory();
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'qty'>('revenue');
  const isTopOnly = variant === 'top';

  const categoryMap = useMemo(() => {
    const map = new Map<string, { category: string; image: string }>();
    inventoryItems.forEach((i) => map.set(i.itemId, { category: i.category, image: i.image || '' }));
    return map;
  }, [inventoryItems]);

  const completedInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === 'completed' && filter.isInRange(inv.date)),
    [invoices, filter]
  );

  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; category: string; qty: number; revenue: number; cost: number; profit: number; image: string }>();
    completedInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const meta = categoryMap.get(item.productId);
        const existing = map.get(item.productId);
        if (existing) {
          existing.qty += item.netQty;
          existing.revenue += item.netSales;
          existing.cost += item.totalCost;
          existing.profit += item.grossMargin;
        } else {
          map.set(item.productId, {
            name: item.productName,
            category: meta?.category || 'Other',
            qty: item.netQty,
            revenue: item.netSales,
            cost: item.totalCost,
            profit: item.grossMargin,
            image: meta?.image || '',
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'profit') return b.profit - a.profit;
      return b.qty - a.qty;
    });
  }, [completedInvoices, categoryMap, sortBy]);

  const categoryStats = useMemo(() => {
    const map: Record<string, { revenue: number; profit: number; qty: number }> = {};
    productStats.forEach((p) => {
      if (!map[p.category]) map[p.category] = { revenue: 0, profit: 0, qty: 0 };
      map[p.category].revenue += p.revenue;
      map[p.category].profit += p.profit;
      map[p.category].qty += p.qty;
    });
    return Object.entries(map).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.revenue - a.revenue);
  }, [productStats]);

  const totalRevenue = productStats.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = productStats.reduce((s, p) => s + p.profit, 0);
  const maxCatRevenue = Math.max(...categoryStats.map((c) => c.revenue), 1);

  return (
    <div className="space-y-6" id="analytics-print-area">
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {([
          { key: 'revenue', label: 'By Revenue' },
          { key: 'profit', label: 'By Profit' },
          { key: 'qty', label: 'By Quantity' },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setSortBy(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${sortBy === t.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-1 ${isTopOnly ? '' : 'lg:grid-cols-3'} gap-4`}>
        <div className={`${isTopOnly ? '' : 'lg:col-span-2'} bg-white rounded-xl p-6 border border-slate-100`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-800 font-bold text-base">Top Products</h3>
            <span className="text-slate-400 text-xs">{productStats.length} products · {filter.label}</span>
          </div>
          {productStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300">
              <i className="ri-shopping-bag-3-line text-4xl mb-2"></i>
              <p className="text-slate-400 text-sm">No product sales for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr>
                    {['Product', 'Qty', 'Revenue', 'Cost', 'Profit', 'Margin'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productStats.slice(0, 10).map((p, i) => {
                    const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.name} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            {p.image && <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0"><img src={p.image} alt={p.name} className="w-full h-full object-cover object-top" /></div>}
                            <div>
                              <p className="text-slate-800 text-sm font-semibold">{p.name}</p>
                              <p className="text-slate-400 text-xs">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-slate-600 text-sm font-semibold">{p.qty}</td>
                        <td className="py-3 pr-3 text-slate-800 text-sm font-bold font-mono">₵{p.revenue.toFixed(2)}</td>
                        <td className="py-3 pr-3 text-slate-500 text-sm font-mono">₵{p.cost.toFixed(2)}</td>
                        <td className="py-3 pr-3 text-emerald-600 text-sm font-bold font-mono">₵{p.profit.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${margin >= 30 ? 'bg-emerald-100 text-emerald-700' : margin >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="py-3 pr-3 text-slate-700 font-bold text-sm">Total</td>
                    <td className="py-3 pr-3 text-slate-700 font-bold text-sm">{productStats.reduce((s, p) => s + p.qty, 0)}</td>
                    <td className="py-3 pr-3 text-indigo-600 font-bold text-sm font-mono">₵{totalRevenue.toFixed(2)}</td>
                    <td className="py-3 pr-3 text-slate-600 font-bold text-sm font-mono">₵{productStats.reduce((s, p) => s + p.cost, 0).toFixed(2)}</td>
                    <td className="py-3 pr-3 text-emerald-600 font-bold text-sm font-mono">₵{totalProfit.toFixed(2)}</td>
                    <td className="py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {!isTopOnly && <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">By Category</h3>
          {categoryStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300">
              <i className="ri-pie-chart-line text-3xl mb-2"></i>
              <p className="text-slate-400 text-sm">No data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryStats.map((cat) => {
                const pct = totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 100) : 0;
                const color = CATEGORY_COLORS[cat.category] || 'bg-slate-400';
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-700 text-sm font-medium">{cat.category}</span>
                      <span className="text-slate-500 text-xs font-mono">₵{cat.revenue.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${(cat.revenue / maxCatRevenue) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">{cat.qty} items sold</span>
                      <span className="text-emerald-600 text-xs font-semibold font-mono">+₵{cat.profit.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>}
      </div>

      {/* Performance Matrix */}
      {!isTopOnly && <div className="bg-white rounded-xl p-6 border border-slate-100">
        <h3 className="text-slate-800 font-bold text-base mb-4">Product Performance Matrix</h3>
        {productStats.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No data for this period</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {productStats.slice(0, 8).map((p) => {
              const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
              const isHighMargin = margin >= 30;
              const isHighVolume = p.qty >= 3;
              return (
                <div key={p.name} className={`p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${isHighMargin && isHighVolume ? 'border-emerald-200 bg-emerald-50/50' : isHighMargin ? 'border-indigo-200 bg-indigo-50/50' : isHighVolume ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {p.image && <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0"><img src={p.image} alt={p.name} className="w-full h-full object-cover object-top" /></div>}
                    <p className="text-slate-800 text-sm font-semibold truncate">{p.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-slate-400">Revenue</p><p className="text-slate-800 font-bold font-mono">₵{p.revenue.toFixed(2)}</p></div>
                    <div><p className="text-slate-400">Profit</p><p className="text-emerald-600 font-bold font-mono">₵{p.profit.toFixed(2)}</p></div>
                    <div><p className="text-slate-400">Qty</p><p className="text-slate-800 font-bold">{p.qty}</p></div>
                    <div><p className="text-slate-400">Margin</p><p className={`font-bold ${margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-600' : 'text-rose-500'}`}>{margin.toFixed(1)}%</p></div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {isHighVolume && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">High Volume</span>}
                    {isHighMargin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">High Margin</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}
    </div>
  );
}
