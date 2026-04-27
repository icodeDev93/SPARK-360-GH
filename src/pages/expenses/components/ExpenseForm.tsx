import { useState } from 'react';
import { ExpenseRecord, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/mocks/expenses';

interface Props {
  initial?: ExpenseRecord;
  onSave: (data: Omit<ExpenseRecord, 'id'>) => void;
  onClose: () => void;
}

export default function ExpenseForm({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    description: initial?.description ?? '',
    category: initial?.category ?? EXPENSE_CATEGORIES[0],
    amount: initial?.amount ?? 0,
    date: initial?.date ?? new Date().toISOString().split('T')[0],
    paidBy: initial?.paidBy ?? PAYMENT_METHODS[0],
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.amount || form.amount <= 0) e.amount = 'Enter a valid amount';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(form);
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
            <h2 className="text-slate-800 font-bold text-base">{initial ? 'Edit Expense' : 'Add Expense'}</h2>
            <p className="text-slate-400 text-xs mt-0.5">Record a business expense</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer transition-all"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Store Rent - May 2026"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${errors.description ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₵</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount || ''}
                  onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full border rounded-lg pl-7 pr-4 py-2.5 text-sm text-slate-700 outline-none font-mono transition-all ${errors.amount ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none cursor-pointer transition-all ${errors.date ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            {/* Paid By */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paid By</label>
              <select
                value={form.paidBy}
                onChange={(e) => set('paidBy', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
              >
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              maxLength={500}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
          >
            {initial ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
