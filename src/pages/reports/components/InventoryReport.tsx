import { useState } from 'react';
import { inventoryItems } from '@/mocks/inventory';

const fmt  = (n: number) => `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
const fmtK = (n: number) => n >= 1000 ? `₵${(n / 1000).toFixed(1)}k` : fmt(n);

const CAT_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-violet-500', 'bg-orange-500',
];

const STATUS_CONFIG = {
  'OK':           { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', label: 'In Stock' },
  'LOW':          { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700',     label: 'Low Stock' },
  'OUT OF STOCK': { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-600',         label: 'Out of Stock' },
};

type StockFilter = 'All' | 'OK' | 'LOW' | 'OUT OF STOCK';

export default function InventoryReport() {
  const [search, setSearch]           = useState('');
  const [catFilter, setCatFilter]     = useState('All');
  const [stockFilter, setStockFilter] = useState<StockFilter>('All');

  const items = inventoryItems;

  // Aggregates
  const totalItems     = items.length;
  const totalStockVal  = items.reduce((s, i) => s + i.costPrice * i.currentStock, 0);
  const totalRetailVal = items.reduce((s, i) => s + i.sellingPrice * i.currentStock, 0);
  const lowCount       = items.filter((i) => i.stockStatus === 'LOW').length;
  const outCount       = items.filter((i) => i.stockStatus === 'OUT OF STOCK').length;

  // Category breakdown
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const catData = categories.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const value    = catItems.reduce((s, i) => s + i.costPrice * i.currentStock, 0);
    const count    = catItems.length;
    return { cat, value, count };
  }).sort((a, b) => b.value - a.value);
  const maxCatVal = Math.max(...catData.map((c) => c.value), 1);

  // Filtered table
  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    const matchCat    = catFilter === 'All' || item.category === catFilter;
    const matchStock  = stockFilter === 'All' || item.stockStatus === stockFilter;
    return matchSearch && matchCat && matchStock;
  });

  const filteredStockVal = filtered.reduce((s, i) => s + i.costPrice * i.currentStock, 0);

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total SKUs',      value: String(totalItems), sub: `${categories.length} categories`, icon: 'ri-archive-drawer-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Stock Value (Cost)',  value: fmtK(totalStockVal),  sub: 'at cost price',  icon: 'ri-safe-line',          color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Retail Value',    value: fmtK(totalRetailVal), sub: 'at selling price', icon: 'ri-price-tag-3-line',   color: 'bg-violet-50 text-violet-600' },
          { label: 'Alerts',          value: `${lowCount + outCount}`, sub: `${outCount} out · ${lowCount} low`, icon: 'ri-alert-line', color: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Stock Value by Category</h3>
          <div className="space-y-3">
            {catData.map((c, i) => (
              <div key={c.cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${CAT_COLORS[i % CAT_COLORS.length]}`}></span>
                    <span className="text-slate-700 text-sm font-medium">{c.cat}</span>
                    <span className="text-slate-400 text-xs">({c.count} SKUs)</span>
                  </div>
                  <span className="text-slate-700 text-sm font-bold font-mono">{fmtK(c.value)}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${CAT_COLORS[i % CAT_COLORS.length]}`}
                    style={{ width: `${(c.value / maxCatVal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Status Summary */}
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <h3 className="text-slate-800 font-bold text-base mb-5">Stock Status</h3>

          {/* Status bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
            {(['OK', 'LOW', 'OUT OF STOCK'] as const).map((st) => {
              const count = items.filter((i) => i.stockStatus === st).length;
              const pct   = totalItems > 0 ? (count / totalItems) * 100 : 0;
              return pct > 0 ? (
                <div key={st} className={`${STATUS_CONFIG[st].dot} rounded-sm`}
                  style={{ width: `${pct}%` }} title={`${STATUS_CONFIG[st].label}: ${count}`} />
              ) : null;
            })}
          </div>

          <div className="space-y-3">
            {(['OK', 'LOW', 'OUT OF STOCK'] as const).map((st) => {
              const count = items.filter((i) => i.stockStatus === st).length;
              const cfg   = STATUS_CONFIG[st];
              return (
                <div key={st} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}></span>
                    <span className="text-slate-600 text-sm">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{count} items</span>
                    <span className="text-slate-400 text-xs">{totalItems > 0 ? Math.round((count / totalItems) * 100) : 0}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Gross Margin (avg)</span>
              <span className="font-bold text-slate-700">
                {(() => {
                  const avgM = items.reduce((s, i) => s + (i.sellingPrice > 0 ? ((i.sellingPrice - i.costPrice) / i.sellingPrice) * 100 : 0), 0) / (items.length || 1);
                  return `${avgM.toFixed(1)}%`;
                })()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Potential Profit</span>
              <span className="font-bold text-emerald-600 font-mono">{fmtK(totalRetailVal - totalStockVal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <i className="ri-search-line text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="border border-slate-200 bg-white rounded-lg px-4 py-2 text-sm text-slate-700 outline-none cursor-pointer"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className="border border-slate-200 bg-white rounded-lg px-4 py-2 text-sm text-slate-700 outline-none cursor-pointer"
        >
          <option value="All">All Stock</option>
          <option value="OK">In Stock</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT OF STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Product', 'SKU', 'Category', 'Stock', 'Reorder', 'Cost (₵)', 'Price (₵)', 'Stock Value', 'Margin', 'Status'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-archive-drawer-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm">No items found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, i) => {
                  const stockVal  = item.costPrice * item.currentStock;
                  const marginPct = item.sellingPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100 : 0;
                  const cfg       = STATUS_CONFIG[item.stockStatus];
                  return (
                    <tr key={item.itemId} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-800 text-sm font-semibold">{item.productName}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-400 text-xs font-mono">{item.sku}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{item.category}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold font-mono ${item.currentStock === 0 ? 'text-red-500' : item.stockStatus === 'LOW' ? 'text-amber-600' : 'text-slate-800'}`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-400 text-sm font-mono">{item.reorderLevel}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-500 text-sm font-mono">{item.costPrice.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-800 text-sm font-bold font-mono">{item.sellingPrice.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-indigo-600 text-sm font-bold font-mono">{fmt(stockVal)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${marginPct >= 30 ? 'text-emerald-600' : marginPct >= 15 ? 'text-amber-600' : 'text-rose-500'}`}>
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-sm font-bold text-slate-600">
                    {filtered.length} item{filtered.length !== 1 ? 's' : ''} shown
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-indigo-600 font-bold font-mono text-sm">{fmt(filteredStockVal)}</span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
