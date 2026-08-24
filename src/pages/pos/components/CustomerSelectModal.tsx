import { useMemo, useState } from 'react';
import type { Customer, CustomerStatus, PaymentMethod } from '@/types/erp';
import { sanitizeText, sanitizeMultiline } from '@/lib/sanitize';

type Step = 'select' | 'phone' | 'found' | 'not_found' | 'add_form';

interface Props {
  customers: Customer[];
  addCustomer: (
    data: Omit<Customer, 'customerId' | 'totalPurchases' | 'lastOrderDate'>
  ) => Promise<Customer>;
  onComplete: (customerId: string | null, customerName: string) => void | Promise<void>;
  onCancel: () => void;
  paymentMethod?: PaymentMethod;
  processing?: boolean;
  error?: string;
}

export default function CustomerSelectModal({ customers, addCustomer, onComplete, onCancel, paymentMethod, processing = false, error = '' }: Props) {
  const isCreditSale = paymentMethod === 'Credit';
  const [step, setStep] = useState<Step>('select');
  const [phone, setPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    remarks: '',
    debtLimit: '0.00',
    visitingDay: 'Sunday',
    statusFlag: 'Active' as CustomerStatus,
    outstandingBalance: '0.00',
  });

  const normalizedSearch = phone.trim().toLowerCase();
  const normalizedPhoneSearch = phone.trim().replace(/\s/g, '');
  const customerMatches = useMemo(() => {
    if (!normalizedSearch) return [];
    return customers
      .filter((customer) => {
        const customerName = customer.fullName.toLowerCase();
        const customerPhone = customer.phone.replace(/\s/g, '');
        return customerName.includes(normalizedSearch) || customerPhone.includes(normalizedPhoneSearch);
      })
      .slice(0, 8);
  }, [customers, normalizedPhoneSearch, normalizedSearch]);

  const selectCustomer = (customer: Customer) => {
    setFoundCustomer(customer);
    setPhone(customer.fullName);
    setStep('found');
  };

  const handlePhoneSearch = () => {
    if (!normalizedSearch) return;
    const match =
      customers.find((c) => c.phone.replace(/\s/g, '') === normalizedPhoneSearch) ??
      customerMatches[0];
    if (match) {
      selectCustomer(match);
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
      const cleanName = sanitizeText(form.fullName);
      const saved = await addCustomer({
        fullName: cleanName,
        phone: sanitizeText(form.phone),
        email: '',
        customerType: 'Retail',
        address: sanitizeText(form.address),
        remarks: sanitizeMultiline(form.remarks),
        debtLimit: Math.max(0, parseFloat(form.debtLimit) || 0),
        visitingDay: form.visitingDay,
        outstandingBalance: Math.max(0, parseFloat(form.outstandingBalance) || 0),
        statusFlag: form.statusFlag,
        avatar: getInitials(cleanName),
        notes: sanitizeMultiline(form.remarks) || undefined,
      });
      await onComplete(saved.customerId, saved.fullName);
    } catch (error) {
      console.error(error);
      setFormError(error instanceof Error ? error.message : 'Customer or sale could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm mx-4 flex max-h-[92vh] flex-col overflow-hidden">

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
                {step === 'phone' && 'Search by name or phone number'}
                {step === 'found' && 'Confirm the customer below'}
                {step === 'not_found' && `No match for "${phone}"`}
                {step === 'add_form' && 'Enter customer details'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={processing}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <i className="ri-error-warning-line text-red-500 text-sm mt-0.5 flex-shrink-0"></i>
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          {/* ── Step: select ── */}
          {step === 'select' && (
            <div className="space-y-3">
              {isCreditSale ? (
                <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <i className="ri-hand-coin-line text-violet-500 text-lg flex-shrink-0"></i>
                  <p className="text-violet-700 text-xs font-medium">Credit sales require a registered customer profile.</p>
                </div>
              ) : (
                <button
                  onClick={() => onComplete(null, 'Walk-in Customer')}
                  disabled={processing}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60 disabled:cursor-not-allowed text-left transition-all cursor-pointer group"
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
              )}

              <button
                onClick={() => setStep('phone')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-left transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 group-hover:bg-emerald-100">
                  <i className="ri-user-search-line text-xl text-slate-500 group-hover:text-emerald-600"></i>
                </div>
                <div>
                  <p className="text-slate-800 font-semibold text-sm">Registered Customer</p>
                  <p className="text-slate-400 text-xs mt-0.5">Search by name or phone number</p>
                </div>
                <i className="ri-arrow-right-s-line text-slate-300 group-hover:text-emerald-400 ml-auto text-xl"></i>
              </button>
            </div>
          )}

          {/* ── Step: phone ── */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1.5">Customer Name or Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="ri-search-line text-base"></i>
                  </span>
                  <input
                    type="search"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                    placeholder="Search by customer name or phone"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                {phone.trim() && customerMatches.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {customerMatches.map((customer) => (
                      <button
                        key={customer.customerId}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-all last:border-b-0 hover:bg-indigo-50 cursor-pointer"
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {customer.avatar || getInitials(customer.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{customer.fullName}</p>
                          <p className="truncate text-xs text-slate-500">{customer.phone}</p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          customer.statusFlag === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {customer.statusFlag}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {phone.trim() && customerMatches.length === 0 && (
                  <p className="mt-2 text-xs text-slate-400">No matching customers yet. You can search or add a new customer.</p>
                )}
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
                  {foundCustomer.address && (
                    <p className="text-slate-400 text-xs truncate">{foundCustomer.address}</p>
                  )}
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  foundCustomer.statusFlag === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {foundCustomer.statusFlag}
                </span>
              </div>

              <button
                onClick={() => onComplete(foundCustomer.customerId, foundCustomer.fullName)}
                disabled={processing}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {processing ? <i className="ri-loader-4-line animate-spin text-base"></i> : <i className="ri-check-line text-base"></i>}
                {processing ? 'Saving sale...' : `Continue with ${foundCustomer.fullName.split(' ')[0]}`}
              </button>

              <button
                onClick={() => { setPhone(''); setStep('phone'); }}
                className="w-full py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-all cursor-pointer"
              >
                Search a different customer
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
                  No registered customer matching <span className="font-mono font-semibold">{phone}</span>
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

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Remarks</label>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Debt Limit</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.debtLimit}
                  onChange={(e) => setForm((p) => ({ ...p, debtLimit: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                />
                <p className="text-slate-400 text-[11px] mt-1">0 means UNLIMITED.</p>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Visiting Day</label>
                <select
                  value={form.visitingDay}
                  onChange={(e) => setForm((p) => ({ ...p, visitingDay: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Status</label>
                <select
                  value={form.statusFlag}
                  onChange={(e) => setForm((p) => ({ ...p, statusFlag: e.target.value as CustomerStatus }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                >
                  {['Active', 'Inactive', 'Blocked'].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">Balance</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.outstandingBalance}
                  onChange={(e) => setForm((p) => ({ ...p, outstandingBalance: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                />
                <p className="text-slate-400 text-[11px] mt-1">This is not editable after saving.</p>
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
                disabled={saving || processing}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
              >
                {saving || processing ? (
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
