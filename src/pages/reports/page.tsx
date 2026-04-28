import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { reportSummary, salesByCategory, topProducts } from '@/mocks/reports';
import SalesReport from './components/SalesReport';
import InventoryReport from './components/InventoryReport';

type ReportTab = 'overview' | 'sales' | 'inventory';

const colorMap: Record<string, { bg: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600' },
};

const categoryColors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

const TAB_CONFIG = [
  { key: 'overview',   label: 'Overview',          icon: 'ri-dashboard-3-line' },
  { key: 'sales',      label: 'Sales Report',       icon: 'ri-line-chart-line' },
  { key: 'inventory',  label: 'Inventory Report',   icon: 'ri-archive-drawer-line' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('overview');

  return (
    <AppLayout>
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as ReportTab)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${t.icon} text-sm`}></i>
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {reportSummary.map((s) => {
              const c = colorMap[s.color] || colorMap.indigo;
              return (
                <div key={s.label} className="bg-white rounded-xl p-5 flex items-start gap-4 border border-slate-100">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${c.bg} flex-shrink-0`}>
                    <i className={`${s.icon} text-xl ${c.icon}`}></i>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
                    <p className="text-slate-900 text-2xl font-bold mt-1 font-mono">{s.value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.period}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            {/* Sales by Category */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100">
              <h3 className="text-slate-800 font-bold text-base mb-5">Sales by Category</h3>
              <div className="space-y-4">
                {salesByCategory.map((cat, i) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-700 text-sm font-medium">{cat.category}</span>
                      <span className="text-slate-500 text-xs font-mono">₵{(cat.sales / 1000).toFixed(1)}k ({cat.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${categoryColors[i % categoryColors.length]}`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div className="lg:col-span-3 bg-white rounded-xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-bold text-base">Top Products</h3>
                <span className="text-slate-400 text-xs">This Month</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">#</th>
                      <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Product</th>
                      <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Sold</th>
                      <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.rank} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                        <td className="py-3 pr-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            p.rank === 1 ? 'bg-amber-100 text-amber-700' :
                            p.rank === 2 ? 'bg-slate-200 text-slate-600' :
                            p.rank === 3 ? 'bg-orange-100 text-orange-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {p.rank}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-slate-800 text-sm font-semibold">{p.name}</p>
                          <p className="text-slate-400 text-xs">{p.category}</p>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="text-slate-600 text-sm font-semibold">{p.sold}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-slate-800 text-sm font-bold font-mono">{p.revenue}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-indigo-600 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-base">Sales Analysis</p>
                <p className="text-indigo-200 text-sm mt-0.5">Daily, weekly, monthly & custom date filtering with margin breakdown.</p>
              </div>
              <button
                onClick={() => setTab('sales')}
                className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <i className="ri-line-chart-line text-sm"></i>
                Open
              </button>
            </div>
            <div className="bg-emerald-600 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-base">Inventory Analysis</p>
                <p className="text-emerald-200 text-sm mt-0.5">Stock value, category breakdown, margin analysis and status alerts.</p>
              </div>
              <button
                onClick={() => setTab('inventory')}
                className="flex items-center gap-2 bg-white text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-50 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <i className="ri-archive-drawer-line text-sm"></i>
                Open
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'sales'     && <SalesReport />}
      {tab === 'inventory' && <InventoryReport />}
    </AppLayout>
  );
}
