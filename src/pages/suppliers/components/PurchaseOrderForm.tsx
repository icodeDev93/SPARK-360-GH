import { useState } from 'react';
import { Supplier, PurchaseOrder } from '@/mocks/suppliers';
import { sanitizeMultiline } from '@/lib/sanitize';

interface Props {
  suppliers: Supplier[];
  onSave: (data: Omit<PurchaseOrder, 'id'>) => void;
  onClose: () => void;
  defaultSupplierId?: string;
}

export default function PurchaseOrderForm({ suppliers, onSave, onClose, defaultSupplierId }: Props) {
  const activeSuppliers = suppliers.filter((s) => s.status === 'active');
  const [form, setForm] = useState({
    supplierId: defaultSupplierId ?? (activeSuppliers[0]?.id ?? ''),
    date: new Date().toISOString().split('T')[0],
    expectedDate: '',
    items: 1,
    total: 0,
    status: 'Pending' as PurchaseOrder['status'],
    paymentStatus: 'Unpaid' as PurchaseOrder['paymentStatus'],
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedSupplier = suppliers.find((s) => s.id === form.supplierId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.supplierId) e.supplierId = 'Select a supplier';
    if (!form.total || form.total <= 0) e.total = 'Enter a valid amount';
    if (!form.date) e.date = 'Order date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      supplierId: form.supplierId,
      supplierName: selectedSupplier?.name ?? '',
      date: new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      expectedDate: form.expectedDate
        ? new Date(form.expectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'TBD',
      items: form.items,
      total: form.total,
      status: form.status,
      paymentStatus: form.paymentStatus,
      notes: sanitizeMultiline(form.notes),
    });
    onClose();
  };

  const set = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-base">New Purchase Order</h2>
            <p className="text-slate-400 text-xs mt-0.5">Create a new order from a supplier</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier <span className="text-red-400">*</span></label>
            <select
              value={form.supplierId}
              onChange={(e) => set('supplierId', e.target.value)}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none bg-white cursor-pointer transition-all ${errors.supplierId ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
            >
              {activeSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>}
          </div>

          {selectedSupplier && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="w-9 h-9 flex items-center justify-center bg-indigo-600 rounded-lg text-white font-bold text-sm flex-shrink-0">
                {selectedSupplier.name.charAt(0)}
              </div>
              <div>
                <p className="text-indigo-800 text-sm font-semibold">{selectedSupplier.contact}</p>
                <p className="text-indigo-500 text-xs">{selectedSupplier.phone} · {selectedSupplier.address}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Order Date <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none cursor-pointer transition-all ${errors.date ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expected Delivery</label>
              <input
                type="date"
                value={form.expectedDate}
                onChange={(e) => set('expectedDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">No. of Items</label>
              <input
                type="number"
                min={1}
                value={form.items}
                onChange={(e) => set('items', parseInt(e.target.value) || 1)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-mono transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Amount <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₵</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.total || ''}
                  onChange={(e) => set('total', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full border rounded-lg pl-7 pr-4 py-2.5 text-sm text-slate-700 outline-none font-mono transition-all ${errors.total ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
                />
              </div>
              {errors.total && <p className="text-red-500 text-xs mt-1">{errors.total}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Order Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
              >
                {['Pending', 'Received', 'Partial', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Status</label>
              <select
                value={form.paymentStatus}
                onChange={(e) => set('paymentStatus', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
              >
                {['Unpaid', 'Paid', 'Partial', 'Refunded'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Items ordered, special instructions..."
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
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}
