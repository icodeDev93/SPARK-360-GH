import { useState } from 'react';
import { Supplier } from '@/mocks/suppliers';
import { sanitizeText, sanitizeEmail, sanitizeMultiline, isValidEmail } from '@/lib/sanitize';

interface Props {
  initial?: Supplier;
  onSave: (data: Omit<Supplier, 'id' | 'totalOrders' | 'totalSpent'>) => void;
  onClose: () => void;
}

const CATEGORIES = ['Electronics', 'Accessories', 'Clothing', 'Stationery', 'Food & Drinks', 'Furniture', 'Other'];

export default function SupplierForm({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    contact: initial?.contact ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    category: initial?.category ?? CATEGORIES[0],
    status: initial?.status ?? 'active' as 'active' | 'inactive',
    joinedDate: initial?.joinedDate ?? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Company name is required';
    if (!form.contact.trim()) e.contact = 'Contact person is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (form.email.trim() && !isValidEmail(form.email.trim())) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      ...form,
      name:    sanitizeText(form.name),
      contact: sanitizeText(form.contact),
      phone:   sanitizeText(form.phone),
      email:   sanitizeEmail(form.email),
      address: sanitizeText(form.address),
      notes:   sanitizeMultiline(form.notes),
    });
    onClose();
  };

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-base">{initial ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <p className="text-slate-400 text-xs mt-0.5">Supplier contact and business details</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. TechWorld Distributors"
              maxLength={150}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${errors.name ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Person <span className="text-red-400">*</span></label>
              <input
                value={form.contact}
                onChange={(e) => set('contact', e.target.value)}
                placeholder="Full name"
                maxLength={100}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${errors.contact ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
              {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone <span className="text-red-400">*</span></label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+233 XX XXX XXXX"
                maxLength={30}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${errors.phone ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@company.com"
                maxLength={200}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all ${errors.email ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
              <input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="City, Country"
                maxLength={200}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Payment terms, lead times, special conditions..."
              rows={2}
              maxLength={500}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all">
            {initial ? 'Update Supplier' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}
