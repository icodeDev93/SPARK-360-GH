import { useState } from 'react';
import type { Customer, CustomerType } from '@/types/erp';

type Step = 'select' | 'phone' | 'found' | 'not_found' | 'add_form';

interface Props {
  customers: Customer[];
  addCustomer: (
    data: Omit<Customer, 'customerId' | 'totalPurchases' | 'outstandingBalance' | 'lastOrderDate'>
  ) => Promise<Customer>;
  onComplete: (customerId: string | null, customerName: string) => void;
  onCancel: () => void;
}

export default function CustomerSelectModal({ customers, addCustomer, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [phone, setPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    customerType: 'Retail' as CustomerType,
  });

  const handlePhoneSearch = () => {
    const q = phone.trim().replace(/\s/g, '');
    if (!q) return;
    const match = customers.find((c) => c.phone.replace(/\s/g, '') === q);
    if (match) {
      setFoundCustomer(match);
      setStep('found');
    } else {
      setForm((prev) => ({ ...prev, phone: phone.trim() }));
      setStep('not_found');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const handleSaveNewCustomer = async () => {
    setFormError('');
    if (!form.fullName.trim()) { setFormError('Full name is required.'); return; }
    if (!form.phone.trim()) { setFormError('Phone number is required.'); return; }
    setSaving(true);
    try {
      const saved = await addCustomer({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        customerType: form.customerType,
        statusFlag: 'Active',
        avatar: getInitials(form.fullName.trim()),
        notes: form.address.trim() || undefined,
      });
      onComplete(saved.customerId, saved.fullName);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm mx-4 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button
                onClick={() => {
                  if (step === 'phone') setStep('select');
                  else if (step === 'found') setStep('phone');
                  else if (step === 'not_found') setStep('phone');
                  else if (step === 'add_form') setStep('not_found');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <i className="ri-arrow-left-line text-base"></i>
              </button>
            )}
            <div>
              <h2 className="text-slate-800 font-bold text-base">
                {step === 'select' && 'Complete Sale'}
                {step === 'phone' && 'Find Customer'}
                {step === 'found' && 'Customer Found'}
                {step === 'not_found' && 'Customer Not Found'}
                {step === 'add_form' && 'New Customer'}
              </h2>
              <p className="text-slate-400 text-xs">
                {step === 'select' && 'Choose how to record this sale'}
                {step === 'phone' && 'Search by phone number'}
                {step === 'found' && 'Confirm the customer below'}
                {step === 'not_found' && `No match for "${phone}"`}
                {step === 'add_form' && 'Enter customer details'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── Step: select ── */}
          {step === 'select' && (
            <div className="space-y-3">
              <button
                onClick={() => onComplete(null, 'Walk-in Customer')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 group-hover:bg-indigo-100">
                  <i className="ri-walk-line text-xl text-slate-500 group-hover:text-indigo-600"></i>
                </div>
                <div>
                  <p className="text-slate-800 font-semibold text-sm">Walk-in Customer</p>
                  <p className="text-slate-400 text-xs mt-0.5">Complete sale without a customer profile</p>
                </div>
                <i className="ri-arrow-right-s-line text-slate-300 group-hover:text-indigo-400 ml-auto text-xl"></i>
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-left transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 group-hover:bg-emerald-100">
                  <i className="ri-user-search-line text-xl text-slate-500 group-hover:text-emerald-600"></i>
                </div>
                <div>
                  <p className="text-slate-800 font-semibold text-sm">Registered Customer</p>
                  <p className="text-slate-400 text-xs mt-0.5">Search by phone number or add new</p>
                </div>
                <i className="ri-arrow-right-s-line text-slate-300 group-hover:text-emerald-400 ml-auto text-xl"></i>
              </button>
            </div>
          )}

          {/* ── Step: phone ── */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1.5">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="ri-phone-line text-base"></i>
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                    placeholder="e.g. 0241234567"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handlePhoneSearch}
                disabled={!phone.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-search-line"></i>
                Search Customer
              </button>
            </div>
          )}

          {/* ── Step: found ── */}
          {step === 'found' && foundCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm bg-indigo-500">
                  {foundCustomer.avatar || foundCustomer.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-semibold text-sm truncate">{foundCustomer.fullName}</p>
                  <p className="text-slate-500 text-xs">{foundCustomer.phone}</p>
                  {foundCustomer.email && (
                    <p className="text-slate-400 text-xs truncate">{foundCustomer.email}</p>
                  )}
                </div>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  {foundCustomer.customerType}
                </span>
              </div>

              <button
                onClick={() => onComplete(foundCustomer.customerId, foundCustomer.fullName)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-check-line text-base"></i>
                Continue with {foundCustomer.fullName.split(' ')[0]}
              </button>

              <button
                onClick={() => { setPhone(''); setStep('phone'); }}
                className="w-full py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-all cursor-pointer"
              >
                Search a different number
              </button>
            </div>
          )}

          {/* ── Step: not_found ── */}
          {step === 'not_found' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-3">
                <div className="w-14 h-14 flex items-center justify-center bg-amber-50 rounded-full mb-3">
                  <i className="ri-user-unfollow-line text-2xl text-amber-500"></i>
                </div>
                <p className="text-slate-700 font-semibold text-sm">No customer found</p>
                <p className="text-slate-400 text-xs mt-1">
                  No registered customer with phone <span className="font-mono font-semibold">{phone}</span>
                </p>
              </div>

              <button
                onClick={() => setStep('add_form')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-user-add-line"></i>
                Add as New Customer
              </button>

              <button
                onClick={() => { setPhone(''); setStep('phone'); }}
                className="w-full py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-all cursor-pointer"
              >
                Search again
              </button>
            </div>
          )}

          {/* ── Step: add_form ── */}
          {step === 'add_form' && (
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g. John Mensah"
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. 0241234567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Customer Type</label>
                <div className="flex gap-2">
                  {(['Retail', 'Wholesale'] as CustomerType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, customerType: type }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        form.customerType === type
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0"></i>
                  <p className="text-red-600 text-xs">{formError}</p>
                </div>
              )}

              <button
                onClick={handleSaveNewCustomer}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
              >
                {saving ? (
                  <><i className="ri-loader-4-line animate-spin"></i> Saving…</>
                ) : (
                  <><i className="ri-check-double-line"></i> Save & Complete Sale</>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
