import { useState, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import Paginator from '@/components/ui/Paginator';

const PAGE_SIZE = 20;
import ItemDrawer from './components/ItemDrawer';
import { useInventory } from '@/hooks/useInventory';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { InventoryItem } from '@/types/erp';
import { useAuth } from '@/hooks/useAuth';
import { writeLog, diffFields } from '@/lib/activityLog';

const CAT_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
  'bg-violet-100 text-violet-600',
  'bg-cyan-100 text-cyan-600',
  'bg-orange-100 text-orange-600',
  'bg-teal-100 text-teal-600',
];

const CAT_ICONS = [
  'ri-price-tag-3-line',
  'ri-leaf-line',
  'ri-cup-line',
  'ri-cake-line',
  'ri-gift-line',
  'ri-store-line',
  'ri-box-3-line',
  'ri-archive-line',
];

function StockBar({ current, reorder }: { current: number; reorder: number }) {
  const pct   = Math.min(100, Math.round((current / Math.max(reorder * 2, 1)) * 100));
  const low   = current === 0 || current <= reorder;
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

const GHS = (v: unknown) => `₵${Number(v).toFixed(2)}`;

export default function InventoryPage() {
  const { items, categories, saveItem, deleteItem, addCategory, renameCategory, deleteCategory } = useInventory();
  const { suppliers } = useSuppliers();
  const { currentUser } = useAuth();
  const [pageTab, setPageTab] = useState<'items' | 'categories'>('items');

  // ── Categories ──────────────────────────────────────────────────────────────
  const [catModal, setCatModal] = useState<{ mode: 'add' | 'edit'; value: string; original: string } | null>(null);
  const [deleteCat, setDeleteCat] = useState<string | null>(null);

  const handleSaveCategory = () => {
    if (!catModal) return;
    const trimmed = catModal.value.trim();
    if (!trimmed) return;
    if (catModal.mode === 'add') {
      addCategory(trimmed);
    } else {
      renameCategory(catModal.original, trimmed);
    }
    setCatModal(null);
  };

  const handleDeleteCategory = (cat: string) => {
    deleteCategory(cat);
    setDeleteCat(null);
  };

  // ── Items ────────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editItem, setEditItem]             = useState<InventoryItem | null>(null);
  const [search, setSearch]                 = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter]       = useState('All');
  const [deleteId, setDeleteId]             = useState<string | null>(null);
  const [page, setPage]                     = useState(1);

  useEffect(() => { setPage(1); }, [search, categoryFilter, stockFilter]);

  const filtered = items.filter((item) => {
    const q           = search.toLowerCase();
    const matchSearch = item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    const matchCat    = categoryFilter === 'All' || item.category === categoryFilter;
    const matchStock  =
      stockFilter === 'All'     ? true
      : stockFilter === 'Low'   ? item.stockStatus === 'LOW'
      : stockFilter === 'Out'   ? item.stockStatus === 'OUT OF STOCK'
      : item.stockStatus === 'OK';
    return matchSearch && matchCat && matchStock;
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (item: InventoryItem) => {
    const isEdit = !!editItem;
    await saveItem(item);
    if (currentUser) {
      if (isEdit) {
        const changes = diffFields(
          editItem as unknown as Record<string, unknown>,
          item as unknown as Record<string, unknown>,
          { productName: 'Product Name', category: 'Category', supplier: 'Supplier', costPrice: 'Cost Price', sellingPrice: 'Selling Price', currentStock: 'Stock Qty', reorderLevel: 'Reorder Level' },
          { costPrice: GHS, sellingPrice: GHS },
        );
        writeLog(currentUser, {
          category: 'inventory', action: 'edit',
          description: `Edited inventory item ${item.productName}`,
          changes,
        });
      } else {
        writeLog(currentUser, {
          category: 'inventory', action: 'create',
          description: `Added new inventory item ${item.productName} (${item.category}) — Cost: ₵${item.costPrice.toFixed(2)}, Price: ₵${item.sellingPrice.toFixed(2)}, Stock: ${item.currentStock}`,
        });
      }
    }
    setDrawerOpen(false);
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    const target = items.find((i) => i.itemId === id);
    deleteItem(id);
    if (currentUser && target) {
      writeLog(currentUser, {
        category: 'inventory', action: 'delete',
        description: `Removed inventory item ${target.productName} (${target.category})`,
      });
    }
    setDeleteId(null);
  };

  const lowCount = items.filter((i) => i.stockStatus === 'LOW').length;
  const outCount = items.filter((i) => i.stockStatus === 'OUT OF STOCK').length;

  const allFilterCategories = ['All', ...categories];
  const supplierNames = suppliers
    .map((supplier) => supplier.name)
    .filter((name, index, names) => name && names.indexOf(name) === index)
    .sort((a, b) => a.localeCompare(b));

  return (
    <AppLayout>
      {/* Page Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6">
        {(['items', 'categories'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPageTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap capitalize ${
              pageTab === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'items' ? `Items (${items.length})` : `Categories (${categories.length})`}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ─────────────────────────────────────────────────────────── */}
      {pageTab === 'items' && (
        <>
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
                {allFilterCategories.map((c) => <option key={c} value={c}>{c}</option>)}
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
              { label: 'Total Items',  value: items.length, icon: 'ri-archive-drawer-line', color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Low Stock',    value: lowCount,     icon: 'ri-alert-line',           color: 'text-amber-600 bg-amber-50' },
              { label: 'Out of Stock', value: outCount,     icon: 'ri-close-circle-line',    color: 'text-red-600 bg-red-50' },
              { label: 'Categories',   value: categories.length, icon: 'ri-price-tag-3-line', color: 'text-emerald-600 bg-emerald-50' },
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
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Expiry</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Supplier</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Cost</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3.5">Price</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <i className="ri-archive-drawer-line text-3xl text-slate-300"></i>
                          <p className="text-slate-400 text-sm">No items found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item, i) => (
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
                        <td className="px-4 py-3.5"><span className="text-slate-400 text-xs font-mono">{item.sku}</span></td>
                        <td className="px-4 py-3.5">
                          <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{item.category}</span>
                        </td>
                        <td className="px-4 py-3.5"><StockBar current={item.currentStock} reorder={item.reorderLevel} /></td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-500 text-xs font-mono">
                            {item.expiryDate || 'No expiry'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5"><span className="text-slate-500 text-xs truncate max-w-[140px] block">{item.supplier}</span></td>
                        <td className="px-4 py-3.5 text-right"><span className="text-slate-500 text-sm font-mono">₵{item.costPrice.toFixed(2)}</span></td>
                        <td className="px-4 py-3.5 text-right"><span className="text-slate-800 text-sm font-bold font-mono">₵{item.sellingPrice.toFixed(2)}</span></td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditItem(item); setDrawerOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </button>
                            <button
                              onClick={() => setDeleteId(item.itemId)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
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
            <Paginator
              page={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          </div>
        </>
      )}

      {/* ── CATEGORIES TAB ────────────────────────────────────────────────────── */}
      {pageTab === 'categories' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-slate-800 font-bold text-lg">Item Categories</h2>
              <p className="text-slate-400 text-sm mt-0.5">Organise your inventory by category</p>
            </div>
            <button
              onClick={() => setCatModal({ mode: 'add', value: '', original: '' })}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-base"></i>
              Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-100 rounded-2xl">
                <i className="ri-price-tag-3-line text-2xl text-slate-400"></i>
              </div>
              <p className="text-slate-600 font-semibold">No categories yet</p>
              <p className="text-slate-400 text-sm">Add your first category to start organising inventory</p>
              <button
                onClick={() => setCatModal({ mode: 'add', value: '', original: '' })}
                className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line text-base"></i>
                Add Category
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((cat, idx) => {
                const colorClass = CAT_COLORS[idx % CAT_COLORS.length];
                const iconClass  = CAT_ICONS[idx % CAT_ICONS.length];
                const itemCount  = items.filter((i) => i.category === cat).length;
                const lowItems   = items.filter((i) => i.category === cat && i.stockStatus === 'LOW').length;
                const outItems   = items.filter((i) => i.category === cat && i.stockStatus === 'OUT OF STOCK').length;

                return (
                  <div key={cat} className="bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-all p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0 ${colorClass}`}>
                        <i className={`${iconClass} text-xl`}></i>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCatModal({ mode: 'edit', value: cat, original: cat })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteCat(cat)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-800 font-bold text-base mb-1">{cat}</p>
                    <p className="text-slate-400 text-xs mb-4">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>

                    <div className="flex gap-2">
                      {outItems > 0 && (
                        <span className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {outItems} out
                        </span>
                      )}
                      {lowItems > 0 && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-semibold px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                          {lowItems} low
                        </span>
                      )}
                      {outItems === 0 && lowItems === 0 && (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          All in stock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add new card */}
              <button
                onClick={() => setCatModal({ mode: 'add', value: '', original: '' })}
                className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all p-5 flex flex-col items-center justify-center gap-2 cursor-pointer min-h-[140px]"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl">
                  <i className="ri-add-line text-slate-400 text-xl"></i>
                </div>
                <p className="text-slate-400 text-sm font-semibold">New Category</p>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Category Modal ─────────────────────────────────────────── */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 rounded-xl mb-4">
              <i className="ri-price-tag-3-line text-indigo-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-1">
              {catModal.mode === 'add' ? 'Add Category' : 'Rename Category'}
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              {catModal.mode === 'add' ? 'Enter a name for the new category.' : `Renaming "${catModal.original}" will update all items in this category.`}
            </p>
            <input
              autoFocus
              type="text"
              value={catModal.value}
              onChange={(e) => setCatModal({ ...catModal, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
              placeholder="e.g. Dairy Products"
              maxLength={60}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCatModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!catModal.value.trim()}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                {catModal.mode === 'add' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Category Confirm ────────────────────────────────────────────── */}
      {deleteCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Delete "{deleteCat}"?</h3>
            {items.filter((i) => i.category === deleteCat).length > 0 ? (
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                This category has <span className="font-bold text-slate-700">{items.filter((i) => i.category === deleteCat).length} item{items.filter((i) => i.category === deleteCat).length !== 1 ? 's' : ''}</span> assigned to it. Reassign or delete those items first before removing this category.
              </p>
            ) : (
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                This category is empty and will be permanently removed.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteCat(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCategory(deleteCat)}
                disabled={items.filter((i) => i.category === deleteCat).length > 0}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Item Confirm ────────────────────────────────────────────────── */}
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
        categories={categories}
        suppliers={supplierNames}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        onSave={handleSave}
      />
    </AppLayout>
  );
}
