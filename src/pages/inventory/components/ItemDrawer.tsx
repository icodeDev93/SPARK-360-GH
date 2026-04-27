import { useState, useEffect } from 'react';
import { inventoryCategories } from '@/mocks/inventory';

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

interface ItemDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}

const emptyItem: InventoryItem = {
  id: 0, name: '', sku: '', category: 'Electronics', stock: 0, reorder: 10, costPrice: 0, sellPrice: 0, image: '',
};

export default function ItemDrawer({ open, item, onClose, onSave }: ItemDrawerProps) {
  const [form, setForm] = useState<InventoryItem>(emptyItem);

  useEffect(() => {
    setForm(item ? { ...item } : { ...emptyItem, id: Date.now() });
  }, [item, open]);

  const handleChange = (field: keyof InventoryItem, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-slate-800 font-bold text-lg">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
              placeholder="e.g. Samsung Galaxy A15"
            />
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
                placeholder="EL-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
              >
                {inventoryCategories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cost Price (₵)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sell Price (₵)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.sellPrice}
                onChange={(e) => handleChange('sellPrice', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Current Stock</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reorder Level</label>
              <input
                type="number"
                min={0}
                value={form.reorder}
                onChange={(e) => handleChange('reorder', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono"
              />
            </div>
          </div>

          {/* Margin preview */}
          {form.costPrice > 0 && form.sellPrice > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-xs text-emerald-700 font-semibold">
                Profit Margin: {(((form.sellPrice - form.costPrice) / form.sellPrice) * 100).toFixed(1)}%
                &nbsp;(+₵{(form.sellPrice - form.costPrice).toFixed(2)} per unit)
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
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
