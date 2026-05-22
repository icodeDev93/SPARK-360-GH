import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/erp';
import { supabase } from '@/lib/supabase';
import { sanitizeMultiline, sanitizeText } from '@/lib/sanitize';

interface ItemDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  categories: string[];
  suppliers: string[];
  onClose: () => void;
  onSave: (item: InventoryItem) => void | Promise<void>;
}

type FormState = Omit<InventoryItem, 'stockStatus' | 'marginPerUnit'>;
type NumberField = {
  [K in keyof FormState]: FormState[K] extends number ? K : never;
}[keyof FormState];

const today = new Date().toISOString().split('T')[0];

const EMPTY: FormState = {
  itemId: '',
  productName: '',
  category: 'Beverages',
  supplier: '',
  costPrice: 0,
  sellingPrice: 0,
  wholesaleCostPrice: 0,
  singleCostPrice: 0,
  wholesaleSellingPrice: 0,
  halfSellingPrice: 0,
  quarterSellingPrice: 0,
  singleSellingPrice: 0,
  wholesaleQuantity: 0,
  singleQuantity: 0,
  quantityPerBox: 0,
  stockLimit: 0,
  description: '',
  priceLevels: [],
  currentStock: 0,
  reorderLevel: 0,
  expiryDate: today,
  image: '',
};

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="pt-2 border-t border-slate-100">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">{children}</h3>
    </div>
  );
}

function RequiredMark() {
  return <span className="text-red-400">*</span>;
}

export default function ItemDrawer({ open, item, categories, suppliers, onClose, onSave }: ItemDrawerProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
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
      setForm({ ...EMPTY, ...rest });
      setSupplierSearch(rest.supplier);
      setPreviewUrl(rest.image);
    } else {
      const next = { ...EMPTY, category: categories[0] ?? EMPTY.category };
      setForm(next);
      setSupplierSearch('');
      setPreviewUrl('');
    }

    setSupplierError('');
    setSupplierOpen(false);
    setSelectedImage(null);
    setImageError('');
  }, [item, open, categories]);

  useEffect(() => {
    if (!selectedImage) return;
    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setNumber = (key: NumberField, value: string) =>
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));

  const uploadImage = async () => {
    if (!selectedImage) return form.image;

    const ext = selectedImage.type === 'image/png' ? 'png' : 'jpg';
    const safeName = (form.itemId || form.productName || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
    const path = `products/${safeName}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, selectedImage, {
      contentType: selectedImage.type,
      upsert: false,
    });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  };

  const handleImageChange = (file: File | undefined) => {
    setImageError('');
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setSelectedImage(null);
      setImageError('Upload a JPEG or PNG image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedImage(null);
      setImageError('Image must be 5 MB or smaller.');
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
    if (saving || !form.itemId.trim() || !form.productName.trim() || !form.category.trim() || !form.expiryDate.trim()) return;

    const typedSupplier = supplierSearch.trim();
    let itemToSave = form;
    if (!typedSupplier) {
      setSupplierError('Supplier is required.');
      setSupplierOpen(true);
      return;
    }
    if (typedSupplier && !form.supplier) {
      const exactSupplier = suppliers.find((supplier) =>
        supplier.toLowerCase() === typedSupplier.toLowerCase()
      );
      if (exactSupplier) {
        itemToSave = { ...form, supplier: exactSupplier };
      } else {
        setSupplierError('Choose a supplier from the list.');
        setSupplierOpen(true);
        return;
      }
    }
    try {
      setSaving(true);
      const image = await uploadImage();
      const quantityPerBox = Math.max(0, itemToSave.quantityPerBox);
      const wholesaleQuantity = Math.max(0, itemToSave.wholesaleQuantity);
      const singleQuantity = Math.max(0, itemToSave.singleQuantity);
      const currentStock = quantityPerBox > 0
        ? Math.floor(wholesaleQuantity * quantityPerBox + singleQuantity)
        : Math.floor(singleQuantity);

      await onSave({
        ...itemToSave,
        itemId: sanitizeText(itemToSave.itemId).toUpperCase(),
        productName: sanitizeText(itemToSave.productName),
        description: sanitizeMultiline(itemToSave.description),
        image,
        costPrice: itemToSave.singleCostPrice,
        sellingPrice: itemToSave.singleSellingPrice,
        currentStock,
        reorderLevel: itemToSave.stockLimit,
        priceLevels: itemToSave.priceLevels
          .map((level) => ({ label: sanitizeText(level.label), price: Number(level.price) || 0 }))
          .filter((level) => level.label),
      } as InventoryItem);
    } catch (error) {
      console.error(error);
      setImageError('Image upload failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const margin = form.singleSellingPrice - form.singleCostPrice;
  const marginPct = form.singleSellingPrice > 0 ? (margin / form.singleSellingPrice) * 100 : 0;
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
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-slate-800 font-bold text-lg">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <form id="inventory-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Code <RequiredMark /></label>
            <input
              required
              value={form.itemId}
              onChange={(e) => set('itemId', e.target.value.toUpperCase())}
              readOnly={!!item}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono read-only:bg-slate-50 read-only:text-slate-500"
              placeholder="e.g. COKE500"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Name <RequiredMark /></label>
            <input
              required
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
              placeholder="e.g. Pringles Original (165g)"
              maxLength={150}
            />
          </div>

          <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category <RequiredMark /></label>
              <select
                required
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier <RequiredMark /></label>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                required
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

          <SectionHeader>Cost Prices</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Wholesale Cost Price (₵) <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.wholesaleCostPrice} onChange={(e) => setNumber('wholesaleCostPrice', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Single Cost Price (₵) <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.singleCostPrice} onChange={(e) => setNumber('singleCostPrice', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
          </div>

          <SectionHeader>Selling Prices</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Wholesale SP (₵) <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.wholesaleSellingPrice} onChange={(e) => setNumber('wholesaleSellingPrice', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Half SP (₵) <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.halfSellingPrice} onChange={(e) => setNumber('halfSellingPrice', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Quarter SP (₵) <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.quarterSellingPrice} onChange={(e) => setNumber('quarterSellingPrice', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Single SP (₵) <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.singleSellingPrice} onChange={(e) => setNumber('singleSellingPrice', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
          </div>

          {form.singleCostPrice > 0 && form.singleSellingPrice > 0 && (
            <div className={`rounded-lg p-3 border ${margin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-semibold ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                Single-unit margin: {marginPct.toFixed(1)}% ({margin >= 0 ? '+' : ''}₵{margin.toFixed(2)} per unit)
              </p>
            </div>
          )}

          <SectionHeader>Quantities Available</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Wholesale Quantity <RequiredMark /></label>
              <input required type="number" min={0} step={0.01} value={form.wholesaleQuantity} onChange={(e) => setNumber('wholesaleQuantity', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Single Quantity <RequiredMark /></label>
              <input required type="number" min={0} value={form.singleQuantity} onChange={(e) => setNumber('singleQuantity', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
          </div>

          <SectionHeader>Additional Details</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Quantity Per Box <RequiredMark /></label>
              <input required type="number" min={0} value={form.quantityPerBox} onChange={(e) => setNumber('quantityPerBox', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Stock Limit <RequiredMark /></label>
              <input required type="number" min={0} value={form.stockLimit} onChange={(e) => setNumber('stockLimit', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all font-mono" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date <RequiredMark /></label>
            <input
              required
              type="date"
              value={form.expiryDate}
              onChange={(e) => set('expiryDate', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none"
              placeholder="Optional product notes"
              maxLength={500}
            />
          </div>
        </form>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="inventory-item-form"
            disabled={saving}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
          >
            {saving && <i className="ri-loader-4-line animate-spin text-base"></i>}
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </>
  );
}
