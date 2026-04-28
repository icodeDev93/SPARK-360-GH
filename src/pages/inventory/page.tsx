import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import ItemDrawer from './components/ItemDrawer';
import { inventoryItems as seedItems, inventoryCategories } from '@/mocks/inventory';
import { enrichInventoryItem } from '@/services/inventoryService';
import type { InventoryItem } from '@/types/erp';

function StockBar({ current, reorder }: { current: number; reorder: number }) {
  const pct  = Math.min(100, Math.round((current / Math.max(reorder * 2, 1)) * 100));
  const low  = current === 0 || current <= reorder;
  const color = current === 0 ? 'bg-red-500' : low ? 'bg-amber-400' : 'bg-emerald-500';
  const dot   = current === 0 ? 'bg-red-500' : low ? 'bg-amber-400' : 'bg-emerald-500';
  const text  = current === 0 ? 'text-red-500' : low ? 'text-amber-500' : 'text-emerald-600';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`}></span>
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
      <span className={`text-xs font-bold font-mono ${text}`}>{current}</span>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(seedItems);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [editItem, setEditItem]       = useState<InventoryItem | null>(null);
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  const filtered = items.filter((item) => {
    const q           = search.toLowerCase();
    const matchSearch = item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    const matchCat    = categoryFilter === 'All' || item.category === categoryFilter;
    const matchStock  =
      stockFilter === 'All'
        ? true
        : stockFilter === 'Low'
        ? item.stockStatus === 'LOW'
        : stockFilter === 'Out'
        ? item.stockStatus === 'OUT OF STOCK'
        : item.stockStatus === 'OK';
    return matchSearch && matchCat && matchStock;
  });

  const handleSave = (item: InventoryItem) => {
    const enriched = enrichInventoryItem(item);
    setItems((prev) => {
      const exists = prev.find((i) => i.itemId === enriched.itemId);
      return exists
        ? prev.map((i) => (i.itemId === enriched.itemId ? enriched : i))
        : [...prev, enriched];
    });
    setDrawerOpen(false);
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== id));
    setDeleteId(null);
  };

  const lowCount  = items.filter((i) => i.stockStatus === 'LOW').length;
  const outCount  = items.filter((i) => i.stockStatus === 'OUT OF STOCK').length;
  const catCount  = new Set(items.map((i) => i.category)).size;

  return (
    <AppLayout>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 w-full sm:w-72">
            <i className="ri-search-line text-slate-400 text-sm"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items or SKU..."
              className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none cursor-pointer"
          >
            {inventoryCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none cursor-pointer"
          >
            <option value="All">All Stock</option>
            <option value="Low">Low Stock</option>
            <option value="Out">Out of Stock</option>
            <option value="OK">In Stock</option>
          </select>
        </div>
        <button
          onClick={() => { setEditItem(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line text-base"></i>
          Add New Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items',   value: items.length, icon: 'ri-archive-drawer-line', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Low Stock',     value: lowCount,     icon: 'ri-alert-line',           color: 'text-amber-600 bg-amber-50' },
          { label: 'Out of Stock',  value: outCount,     icon: 'ri-close-circle-line',    color: 'text-red-600 bg-red-50' },
          { label: 'Categories',    value: catCount,     icon: 'ri-price-tag-3-line',     color: 'text-emerald-600 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-lg`}></i>
            </div>
            <div>
              <p className="text-slate-800 text-xl font-bold">{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">Item</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">SKU</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Category</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Stock</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Supplier</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Cost</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Price</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-archive-drawer-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm">No items found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, i) => (
                  <tr key={item.itemId} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                          {item.image
                            ? <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                            : <i className="ri-box-3-line text-slate-400 text-lg"></i>}
                        </div>
                        <span className="text-slate-800 text-sm font-semibold">{item.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-400 text-xs font-mono">{item.sku}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{item.category}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StockBar current={item.currentStock} reorder={item.reorderLevel} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-500 text-xs truncate max-w-[140px] block">{item.supplier}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-slate-500 text-sm font-mono">₵{item.costPrice.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-slate-800 text-sm font-bold font-mono">₵{item.sellingPrice.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditItem(item); setDrawerOpen(true); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteId(item.itemId)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-full mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-500 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-center mb-2">Delete Item?</h3>
            <p className="text-slate-500 text-sm text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        item={editItem}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        onSave={handleSave}
      />
    </AppLayout>
  );
}
