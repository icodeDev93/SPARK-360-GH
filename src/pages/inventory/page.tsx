import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import ItemDrawer from './components/ItemDrawer';
import { inventoryItems as initialItems, inventoryCategories } from '@/mocks/inventory';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  reorder: number;
  costPrice: number;
  sellPrice: number;
  image: string;
}

function StockBar({ stock, reorder }: { stock: number; reorder: number }) {
  const pct = Math.min(100, Math.round((stock / (reorder * 3)) * 100));
  const color = stock <= reorder * 0.5 ? 'bg-red-500' : stock <= reorder ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
      <span className={`text-xs font-bold font-mono ${stock <= reorder * 0.5 ? 'text-red-500' : stock <= reorder ? 'text-amber-500' : 'text-emerald-600'}`}>
        {stock}
      </span>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchStock = stockFilter === 'All' || (stockFilter === 'Low' && item.stock <= item.reorder) || (stockFilter === 'OK' && item.stock > item.reorder);
    return matchSearch && matchCat && matchStock;
  });

  const handleSave = (item: InventoryItem) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      return exists ? prev.map((i) => i.id === item.id ? item : i) : [...prev, item];
    });
    setDrawerOpen(false);
    setEditItem(null);
  };

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteId(null);
  };

  return (
    <AppLayout>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 w-full sm:w-72">
            <span className="w-4 h-4 flex items-center justify-center text-slate-400">
              <i className="ri-search-line text-sm"></i>
            </span>
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
            <option value="OK">In Stock</option>
          </select>
        </div>
        <button
          onClick={() => { setEditItem(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line text-base"></i>
          </span>
          Add New Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items', value: items.length, icon: 'ri-archive-drawer-line', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Low Stock', value: items.filter((i) => i.stock <= i.reorder).length, icon: 'ri-alert-line', color: 'text-amber-600 bg-amber-50' },
          { label: 'Out of Stock', value: items.filter((i) => i.stock === 0).length, icon: 'ri-close-circle-line', color: 'text-red-600 bg-red-50' },
          { label: 'Categories', value: new Set(items.map((i) => i.category)).size, icon: 'ri-price-tag-3-line', color: 'text-emerald-600 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${s.color}`}>
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
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">Item</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">SKU</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Category</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Stock</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Cost</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Price</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <span className="text-slate-800 text-sm font-semibold">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-slate-400 text-xs font-mono">{item.sku}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{item.category}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StockBar stock={item.stock} reorder={item.reorder} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-slate-500 text-sm font-mono">₵{item.costPrice.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-slate-800 text-sm font-bold font-mono">₵{item.sellPrice.toFixed(2)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditItem(item); setDrawerOpen(true); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                      >
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="w-12 h-12 flex items-center justify-center text-4xl mb-2">
                <i className="ri-archive-drawer-line"></i>
              </span>
              <p className="text-sm">No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
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
