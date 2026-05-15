import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/erp';
import { supabase } from '@/lib/supabase';
import { sanitizeText } from '@/lib/sanitize';

interface ItemDrawerProps {
  open:       boolean;
  item:       InventoryItem | null;
  categories: string[];
  suppliers:  string[];
  onClose:    () => void;
  onSave:     (item: InventoryItem) => void | Promise<void>;
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
  expiryDate:   '',
  image:        '',
};

export default function ItemDrawer({ open, item, categories, suppliers, onClose, onSave }: ItemDrawerProps) {
  const [form, setForm] = useState<Omit<InventoryItem, 'stockStatus' | 'marginPerUnit'>>(EMPTY);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierError, setSupplierError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      const { stockStatus: _s, marginPerUnit: _m, ...rest } = item;
      setForm(rest);
      setSupplierSearch(rest.supplier);
      setPreviewUrl(rest.image);
    } else {
      setForm({ ...EMPTY });
      setSupplierSearch('');
      setPreviewUrl('');
    }
    setSupplierError('');
    setSupplierOpen(false);
    setSelectedImage(null);
    setImageError('');
  }, [item, open]);

  useEffect(() => {
    if (!selectedImage) return;
    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const uploadImage = async () => {
    if (!selectedImage) return form.image;

    const ext = selectedImage.type === 'image/png' ? 'png' : 'jpg';
    const safeName = (form.itemId || form.productName || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
    const path = `products/${safeName}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, selectedImage, {
        contentType: selectedImage.type,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleImageChange = (file: File | undefined) => {
    setImageError('');
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setSelectedImage(null);
      setImageError('Upload a JPEG or PNG image.');
      return;
    }

    setSelectedImage(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    set('image', '');
    setImageError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const typedSupplier = supplierSearch.trim();
    let itemToSave = form as InventoryItem;
    if (typedSupplier && !form.supplier) {
      const exactSupplier = suppliers.find((supplier) =>
        supplier.toLowerCase() === typedSupplier.toLowerCase()
      );
      if (exactSupplier) {
        itemToSave = { ...form, supplier: exactSupplier } as InventoryItem;
      } else {
        setSupplierError('Choose a supplier from the list.');
        setSupplierOpen(true);
        return;
      }
    }

    try {
      setSaving(true);
      const image = await uploadImage();
      await onSave({ ...itemToSave, productName: sanitizeText(itemToSave.productName), image } as InventoryItem);
    } catch (error) {
      console.error(error);
      setImageError('Image upload failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const margin    = form.sellingPrice - form.costPrice;
  const marginPct = form.sellingPrice > 0 ? (margin / form.sellingPrice) * 100 : 0;
  const supplierQuery = supplierSearch.trim().toLowerCase();
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.toLowerCase().includes(supplierQuery)
  );

  const selectSupplier = (supplier: string) => {
    set('supplier', supplier);
    setSupplierSearch(supplier);
    setSupplierError('');
    setSupplierOpen(false);
  };

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
              maxLength={150}
            />
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">SKU</label>
              <input
                value={form.sku}
                readOnly
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-500 outline-none bg-slate-50 font-mono"
                placeholder="Auto-generated"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier</label>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                value={supplierSearch}
                onFocus={() => setSupplierOpen(true)}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  set('supplier', '');
                  setSupplierError('');
                  setSupplierOpen(true);
                }}
                className={`w-full border rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-700 outline-none transition-all ${
                  supplierError ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'
                }`}
                placeholder="Search suppliers..."
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setSupplierOpen((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <i className={`ri-arrow-down-s-line text-base transition-transform ${supplierOpen ? 'rotate-180' : ''}`}></i>
              </button>
            </div>
            {supplierOpen && (
              <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => (
                    <button
                      type="button"
                      key={supplier}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSupplier(supplier)}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-all cursor-pointer ${
                        form.supplier === supplier
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {supplier}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-400">No suppliers found</div>
                )}
              </div>
            )}
            {form.supplier && (
              <p className="mt-1.5 text-xs text-slate-400">Selected: {form.supplier}</p>
            )}
            {supplierError && (
              <p className="mt-1.5 text-xs text-red-500">{supplierError}</p>
            )}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => set('expiryDate', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Picture</label>
            <div className="flex gap-3">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                {previewUrl ? (
                  <img src={previewUrl} alt={form.productName || 'Product preview'} className="w-full h-full object-cover" />
                ) : (
                  <i className="ri-image-add-line text-3xl text-slate-300"></i>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                  <i className="ri-upload-2-line text-base"></i>
                  Upload Picture
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => handleImageChange(e.target.files?.[0])}
                  />
                </label>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <i className="ri-delete-bin-line text-base"></i>
                  </button>
                )}
                <p className="mt-2 text-xs text-slate-400">JPEG or PNG only. Max 5 MB.</p>
                {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
              </div>
            </div>
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
            disabled={saving}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
          >
            {saving && <i className="ri-loader-4-line animate-spin text-base"></i>}
            {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </>
  );
}
