import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { suppliers as initialSuppliers, purchases as initialPurchases } from '@/mocks/purchases';

type Tab = 'purchases' | 'suppliers';

const statusStyle: Record<string, string> = {
  Received: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-600',
};

const payStyle: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Unpaid: 'bg-red-100 text-red-600',
  Refunded: 'bg-slate-100 text-slate-600',
};

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>('purchases');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [suppliers] = useState(initialSuppliers);
  const [purchases] = useState(initialPurchases);

  return (
    <AppLayout>
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6">
        {(['purchases', 'suppliers'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap capitalize ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'purchases' ? 'Purchase Orders' : 'Suppliers'}
          </button>
        ))}
      </div>

      {tab === 'purchases' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Orders', value: purchases.length, icon: 'ri-file-list-3-line', color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Received', value: purchases.filter((p) => p.status === 'Received').length, icon: 'ri-checkbox-circle-line', color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Pending', value: purchases.filter((p) => p.status === 'Pending').length, icon: 'ri-time-line', color: 'text-amber-600 bg-amber-50' },
              { label: 'Total Spent', value: '₵9,790', icon: 'ri-money-dollar-circle-line', color: 'text-violet-600 bg-violet-50' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${s.color}`}>
                  <i className={`${s.icon} text-lg`}></i>
                </div>
                <div>
                  <p className="text-slate-800 text-xl font-bold">{s.value}</p>
                  <p className="text-slate-400 text-xs">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPurchaseForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
              New Purchase Order
            </button>
          </div>

          <div className="bg-white rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Order ID', 'Supplier', 'Date', 'Items', 'Total', 'Status', 'Payment', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, i) => (
                    <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-3.5"><span className="text-indigo-600 text-sm font-semibold font-mono">{p.id}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-700 text-sm font-medium">{p.supplier}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{p.date}</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-600 text-sm">{p.items} items</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-800 text-sm font-bold font-mono">{p.total}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[p.status] || 'bg-slate-100 text-slate-600'}`}>{p.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${payStyle[p.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{p.paymentStatus}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer">
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                            <i className="ri-printer-line text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'suppliers' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowSupplierForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
              Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-5 hover:border-indigo-200 border border-slate-100 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 flex items-center justify-center bg-indigo-100 rounded-xl text-indigo-600 font-bold text-lg">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-slate-800 font-bold text-sm">{s.name}</p>
                      <p className="text-slate-400 text-xs">{s.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer">
                      <i className="ri-edit-line text-sm"></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-user-line text-sm"></i></span>
                    <span>{s.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-phone-line text-sm"></i></span>
                    <span>{s.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="w-4 h-4 flex items-center justify-center"><i className="ri-mail-line text-sm"></i></span>
                    <span>{s.email}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <div className="flex-1 text-center">
                    <p className="text-slate-800 font-bold text-base">{s.totalOrders}</p>
                    <p className="text-slate-400 text-xs">Orders</p>
                  </div>
                  <div className="w-px bg-slate-100"></div>
                  <div className="flex-1 text-center">
                    <p className="text-slate-800 font-bold text-base">{s.totalSpent}</p>
                    <p className="text-slate-400 text-xs">Total Spent</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Supplier Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-slate-800 font-bold text-lg">Add Supplier</h2>
              <button onClick={() => setShowSupplierForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Company Name', placeholder: 'e.g. TechWorld Distributors' },
                { label: 'Contact Person', placeholder: 'Full name' },
                { label: 'Phone Number', placeholder: '+233 XX XXX XXXX' },
                { label: 'Email Address', placeholder: 'email@company.com' },
                { label: 'Address', placeholder: 'City, Country' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowSupplierForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => setShowSupplierForm(false)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap">Save Supplier</button>
            </div>
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {showPurchaseForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-slate-800 font-bold text-lg">New Purchase Order</h2>
              <button onClick={() => setShowPurchaseForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier</label>
                <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer">
                  {suppliers.map((s) => <option key={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Order Date</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Total Amount (₵)</label>
                <input type="number" min={0} step={0.01} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 font-mono" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 resize-none" placeholder="Optional notes..."></textarea>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowPurchaseForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => setShowPurchaseForm(false)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap">Create Order</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
