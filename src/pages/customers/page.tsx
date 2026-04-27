import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { customers as initialCustomers, customerHistory } from '@/mocks/customers';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  totalPurchases: number;
  totalSpent: string;
  lastVisit: string;
  avatar: string;
}

const statusStyle: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
};

export default function CustomersPage() {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const avatarColors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500'];

  return (
    <AppLayout>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex-1 max-w-sm">
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
          />
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-add-line text-base"></i></span>
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: customers.length, icon: 'ri-group-line', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Active Today', value: 2, icon: 'ri-user-follow-line', color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Revenue', value: '₵9,815', icon: 'ri-money-dollar-circle-line', color: 'text-violet-600 bg-violet-50' },
          { label: 'Avg. Spent', value: '₵1,227', icon: 'ri-bar-chart-2-line', color: 'text-amber-600 bg-amber-50' },
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

      {/* Customer Table */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Customer', 'Phone', 'Email', 'Purchases', 'Total Spent', 'Last Visit', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColors[i % avatarColors.length]}`}>
                        {c.avatar}
                      </div>
                      <span className="text-slate-800 text-sm font-semibold">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{c.phone}</span></td>
                  <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{c.email}</span></td>
                  <td className="px-5 py-3.5"><span className="text-slate-700 text-sm font-semibold">{c.totalPurchases}</span></td>
                  <td className="px-5 py-3.5"><span className="text-slate-800 text-sm font-bold font-mono">{c.totalSpent}</span></td>
                  <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{c.lastVisit}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                      >
                        <i className="ri-history-line text-sm"></i>
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="w-12 h-12 flex items-center justify-center text-4xl mb-2">
                <i className="ri-group-line"></i>
              </span>
              <p className="text-sm">No customers found</p>
            </div>
          )}
        </div>
      </div>

      {/* Purchase History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                  {selectedCustomer.avatar}
                </div>
                <div>
                  <h2 className="text-slate-800 font-bold text-base">{selectedCustomer.name}</h2>
                  <p className="text-slate-400 text-xs">Purchase History</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-indigo-700 font-bold text-lg">{selectedCustomer.totalPurchases}</p>
                  <p className="text-indigo-500 text-xs">Total Orders</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-emerald-700 font-bold text-lg">{selectedCustomer.totalSpent}</p>
                  <p className="text-emerald-500 text-xs">Total Spent</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-slate-700 font-bold text-lg">{selectedCustomer.lastVisit}</p>
                  <p className="text-slate-400 text-xs">Last Visit</p>
                </div>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50 rounded-lg">
                  <tr>
                    {['Invoice', 'Date', 'Items', 'Amount', 'Method', 'Status'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerHistory.map((h) => (
                    <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                      <td className="px-4 py-3"><span className="text-indigo-600 text-sm font-semibold font-mono">{h.id}</span></td>
                      <td className="px-4 py-3"><span className="text-slate-500 text-sm">{h.date}</span></td>
                      <td className="px-4 py-3"><span className="text-slate-600 text-sm">{h.items}</span></td>
                      <td className="px-4 py-3"><span className="text-slate-800 text-sm font-bold font-mono">{h.amount}</span></td>
                      <td className="px-4 py-3"><span className="text-slate-500 text-sm">{h.method}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[h.status] || 'bg-slate-100 text-slate-600'}`}>{h.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-slate-800 font-bold text-lg">Add Customer</h2>
              <button onClick={() => setShowAddForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Full Name', placeholder: 'e.g. Amara Diallo' },
                { label: 'Phone Number', placeholder: '+233 XX XXX XXXX' },
                { label: 'Email Address', placeholder: 'email@example.com' },
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
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap">Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
