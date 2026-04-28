import { useState, useEffect } from 'react';
import { inventoryCategories } from '@/mocks/inventory';
import type { InventoryItem } from '@/types/erp';

interface ItemDrawerProps {
  open:    boolean;
  item:    InventoryItem | null;
  onClose: () => void;
  onSave:  (item: InventoryItem) => void;
}

const EMPTY: Omit<InventoryItem, 'stockStatus' | 'marginPerUnit'> = {
  itemId:       '',
  productName:  '',
  sku:          '',
  category:     'Beverages',
  supplier:     '',
  costPrice:    0,
  sellingPrice: 0,
  currentStock: 0,
  reorderLevel: 10,
  image:        '',
};

export default function ItemDrawer({ open, item, onClose, onSave }: ItemDrawerProps) {
  const [form, setForm] = useState<Omit<InventoryItem, 'stockStatus' | 'marginPerUnit'>>(EMPTY);

  useEffect(() => {
    if (item) {
      const { stockStatus: _s, marginPerUnit: _m, ...rest } = item;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, itemId: `P${Date.now()}` });
    }
  }, [item, open]);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form as InventoryItem);
  };

  const margin    = form.sellingPrice - form.costPrice;
  const marginPct = form.sellingPrice > 0 ? (margin / form.sellingPrice) * 100 : 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-slate-800 font-bold text-lg">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Name *</label>
            <input
              required
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
              placeholder="e.g. Pringles Original (165g)"
            />
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
                placeholder="SN-PRG-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
              >
                {inventoryCategories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier</label>
            <input
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
              placeholder="e.g. Nestle Ghana Ltd."
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cost Price (₵)</label>
              <input
                type="number" min={0} step={0.01}
                value={form.costPrice}
                onChange={(e) => set('costPrice', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Selling Price (₵)</label>
              <input
                type="number" min={0} step={0.01}
                value={form.sellingPrice}
                onChange={(e) => set('sellingPrice', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
          </div>

          {/* Margin preview */}
          {form.costPrice > 0 && form.sellingPrice > 0 && (
            <div className={`rounded-lg p-3 border ${margin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-semibold ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                Margin: {marginPct.toFixed(1)}% &nbsp;({margin >= 0 ? '+' : ''}₵{margin.toFixed(2)} per unit)
              </p>
            </div>
          )}

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Current Stock</label>
              <input
                type="number" min={0}
                value={form.currentStock}
                onChange={(e) => set('currentStock', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reorder Level</label>
              <input
                type="number" min={0}
                value={form.reorderLevel}
                onChange={(e) => set('reorderLevel', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
          >
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </>
  );
}
