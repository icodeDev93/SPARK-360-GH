import { useState, useRef } from 'react';
import type { ExpenseRecord, PaymentMethod } from '@/types/erp';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/mocks/expenses';
import { supabase } from '@/lib/supabase';

interface Props {
  initial?: ExpenseRecord;
  onSave: (data: Omit<ExpenseRecord, 'expenseId'>) => void;
  onClose: () => void;
}

const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  Cash:            'ri-money-dollar-circle-line',
  MoMo:            'ri-smartphone-line',
  Cheque:          'ri-file-list-3-line',
  'Bank Transfer': 'ri-bank-line',
};

export default function ExpenseForm({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    description: initial?.description ?? '',
    category:    initial?.category    ?? EXPENSE_CATEGORIES[0],
    amountGHS:   initial?.amountGHS   ?? 0,
    date:        initial?.date        ?? new Date().toISOString().split('T')[0],
    paidBy:      (initial?.paidBy     ?? 'Cash') as PaymentMethod,
    notes:       initial?.notes       ?? '',
    proofUrl:    initial?.proofUrl    ?? null as string | null,
  });
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [proofFile, setProofFile]   = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf'];

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED.includes(file.type)) return;
    setProofFile(file);
  };

  const removeProof = () => {
    setProofFile(null);
    setForm((p) => ({ ...p, proofUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.amountGHS || form.amountGHS <= 0) e.amountGHS = 'Enter a valid amount';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setUploading(true);
    try {
      let proofUrl = form.proofUrl;
      if (proofFile) {
        const ext  = proofFile.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('expense-proofs')
          .upload(path, proofFile, { upsert: false });
        if (!upErr) {
          const { data } = supabase.storage.from('expense-proofs').getPublicUrl(path);
          proofUrl = data.publicUrl;
        }
      }
      onSave({ ...form, proofUrl });
      onClose();
    } finally {
      setUploading(false);
    }
  };

  const set = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const existingProof = form.proofUrl && !proofFile;
  const isPdf = (url: string) => url.toLowerCase().includes('.pdf') || url.toLowerCase().endsWith('pdf');
  const previewFile  = proofFile ? URL.createObjectURL(proofFile) : null;
  const isFilePdf    = proofFile?.type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
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

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
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

            {/* Amount GHS */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (GHS) <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₵</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amountGHS || ''}
                  onChange={(e) => set('amountGHS', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full border rounded-lg pl-7 pr-4 py-2.5 text-sm text-slate-700 outline-none font-mono transition-all ${errors.amountGHS ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
                />
              </div>
              {errors.amountGHS && <p className="text-red-500 text-xs mt-1">{errors.amountGHS}</p>}
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className={`${PAYMENT_ICONS[form.paidBy]} text-sm`}></i>
                </span>
                <select
                  value={form.paidBy}
                  onChange={(e) => set('paidBy', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Optional notes or remarks..."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
            />
          </div>

          {/* Proof of payment */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Proof of Payment
              <span className="text-slate-400 text-xs font-normal ml-2">JPEG, PNG or PDF · max 10 MB</span>
            </label>

            {/* Show existing saved proof */}
            {existingProof && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mb-2">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-indigo-100 rounded-lg">
                  <i className={`${isPdf(form.proofUrl!) ? 'ri-file-pdf-2-line text-red-500' : 'ri-image-line text-indigo-600'} text-base`}></i>
                </div>
                <span className="text-slate-600 text-xs font-medium flex-1 truncate">Existing proof attached</span>
                <a href={form.proofUrl!} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs font-semibold hover:underline whitespace-nowrap">View</a>
                <button onClick={removeProof} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer transition-all">
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}

            {/* New file selected preview */}
            {proofFile && (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 mb-2">
                <div className="w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden border border-indigo-100 flex items-center justify-center bg-white">
                  {isFilePdf
                    ? <i className="ri-file-pdf-2-line text-red-500 text-base"></i>
                    : <img src={previewFile!} alt="preview" className="w-full h-full object-cover" />
                  }
                </div>
                <span className="text-indigo-700 text-xs font-medium flex-1 truncate">{proofFile.name}</span>
                <span className="text-indigo-400 text-xs whitespace-nowrap">{(proofFile.size / 1024).toFixed(0)} KB</span>
                <button onClick={removeProof} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-indigo-300 hover:text-red-500 cursor-pointer transition-all">
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}

            {/* Drop zone — hidden when file already selected */}
            {!proofFile && !existingProof && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-5 cursor-pointer transition-all ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl">
                  <i className="ri-upload-cloud-2-line text-slate-400 text-xl"></i>
                </div>
                <div className="text-center">
                  <p className="text-slate-600 text-sm font-semibold">Click to upload or drag & drop</p>
                  <p className="text-slate-400 text-xs mt-0.5">JPEG, PNG or PDF up to 10 MB</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
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
            disabled={uploading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all flex items-center justify-center gap-2"
          >
            {uploading
              ? <><i className="ri-loader-4-line animate-spin"></i> Uploading…</>
              : initial ? 'Update Expense' : 'Save Expense'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
