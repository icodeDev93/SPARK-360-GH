import { useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { customerHistory } from '@/mocks/customers';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useCustomers } from '@/hooks/useCustomers';
import { getCustomerInvoices, searchCustomers } from '@/services/crmService';
import type { CustomerType } from '@/types/erp';

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

const TYPE_BADGE: Record<CustomerType, string> = {
  Wholesale: 'bg-violet-100 text-violet-700',
  Retail:    'bg-amber-100 text-amber-700',
};

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const EMPTY_FORM = { fullName: '', companyName: '', phone: '', email: '', customerType: 'Retail' as CustomerType };

export default function CustomersPage() {
  const { customers, addCustomer: dbAddCustomer } = useCustomers();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { invoices } = useSalesLog();

  const today = new Date().toISOString().split('T')[0];

  const invoiceCountByCustomer = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (inv.status === 'completed') {
        map[inv.customerId] = (map[inv.customerId] ?? 0) + 1;
      }
    });
    return map;
  }, [invoices]);

  const filtered = searchCustomers(customers, search);

  const totalRevenue  = customers.reduce((s, c) => s + c.totalPurchases, 0);
  const avgSpent      = customers.length ? totalRevenue / customers.length : 0;
  const activeToday   = customers.filter((c) => c.lastOrderDate === today).length;

  const addCustomer = () => {
    if (!form.fullName.trim()) return;
    dbAddCustomer({
      fullName:     form.fullName.trim(),
      companyName:  form.companyName.trim(),
      phone:        form.phone.trim(),
      email:        form.email.trim(),
      customerType: form.customerType,
      statusFlag:   'Active',
      avatar:       getInitials(form.fullName),
    });
    setShowAddForm(false);
    setForm(EMPTY_FORM);
  };

  return (
    <AppLayout>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex-1 max-w-sm">
          <i className="ri-search-line text-slate-400 text-sm"></i>
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
          <i className="ri-add-line text-base"></i>
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: customers.length,    icon: 'ri-group-line',                color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Active Today',    value: activeToday,         icon: 'ri-user-follow-line',           color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Revenue',   value: fmt(totalRevenue),   icon: 'ri-money-dollar-circle-line',   color: 'text-violet-600 bg-violet-50' },
          { label: 'Avg. Spent',      value: fmt(avgSpent),       icon: 'ri-bar-chart-2-line',           color: 'text-amber-600 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${s.color}`}>
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
      <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Customer', 'Phone', 'Email', 'Type', 'Purchases', 'Total Spent', 'Last Visit', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-group-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm">No customers found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.customerId} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {c.avatar}
                        </div>
                        <div>
                          <p className="text-slate-800 text-sm font-semibold">{c.fullName}</p>
                          {c.companyName && <p className="text-slate-400 text-xs">{c.companyName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-500 text-sm">{c.phone}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-500 text-sm">{c.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_BADGE[c.customerType]}`}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-700 text-sm font-semibold">
                        {invoiceCountByCustomer[c.customerId] ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-800 text-sm font-bold font-mono">{fmt(c.totalPurchases)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-500 text-sm">{formatDate(c.lastOrderDate)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          title="View history"
                        >
                          <i className="ri-history-line text-sm"></i>
                        </button>
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase History Modal */}
      {selectedCustomer && (() => {
        const custInvoices = getCustomerInvoices(selectedCustomer.customerId, invoices);
        const history = custInvoices.length > 0 ? custInvoices : customerHistory.map((h) => ({ ...h, _mock: true }));
        return (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {selectedCustomer.avatar}
                  </div>
                  <div>
                    <h2 className="text-slate-800 font-bold text-base">{selectedCustomer.fullName}</h2>
                    <p className="text-slate-400 text-xs">{selectedCustomer.companyName} · Purchase History</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-indigo-700 font-bold text-lg">{invoiceCountByCustomer[selectedCustomer.customerId] ?? 0}</p>
                    <p className="text-indigo-500 text-xs">Total Orders</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-emerald-700 font-bold text-lg">{fmt(selectedCustomer.totalPurchases)}</p>
                    <p className="text-emerald-500 text-xs">Total Spent</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-amber-700 font-bold text-lg">{fmt(selectedCustomer.outstandingBalance)}</p>
                    <p className="text-amber-500 text-xs">Outstanding</p>
                  </div>
                </div>

                {/* Invoice list */}
                {custInvoices.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Invoice', 'Date', 'Items', 'Net Sales', 'Margin', 'Method'].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {custInvoices.map((inv) => (
                        <tr key={inv.invoiceNo} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                          <td className="px-4 py-3"><span className="text-indigo-600 text-sm font-semibold font-mono">{inv.invoiceNo}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-500 text-sm">{formatDate(inv.date)}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-600 text-sm">{inv.items.length}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-800 text-sm font-bold font-mono">{fmt(inv.netSales)}</span></td>
                          <td className="px-4 py-3"><span className="text-emerald-600 text-sm font-semibold font-mono">{fmt(inv.grossMargin)}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-500 text-sm">{inv.paymentMethod}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Invoice', 'Date', 'Items', 'Amount', 'Method', 'Status'].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customerHistory.map((h) => (
                        <tr key={h.invoiceNo} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                          <td className="px-4 py-3"><span className="text-indigo-600 text-sm font-semibold font-mono">{h.invoiceNo}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-500 text-sm">{formatDate(h.date)}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-600 text-sm">{h.items}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-800 text-sm font-bold font-mono">₵{h.amountGHS.toFixed(2)}</span></td>
                          <td className="px-4 py-3"><span className="text-slate-500 text-sm">{h.method}</span></td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{h.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Customer Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-slate-800 font-bold text-lg">Add Customer</h2>
              <button onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Full Name *',     key: 'fullName',    placeholder: 'e.g. Kwame Asante' },
                { label: 'Company Name',    key: 'companyName', placeholder: 'e.g. Asante Mini Mart' },
                { label: 'Phone Number',    key: 'phone',       placeholder: '+233 XX XXX XXXX' },
                { label: 'Email Address',   key: 'email',       placeholder: 'email@example.com' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                  <input
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Customer Type</label>
                <select
                  value={form.customerType}
                  onChange={(e) => setForm((p) => ({ ...p, customerType: e.target.value as CustomerType }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 bg-white cursor-pointer"
                >
                  <option value="Wholesale">Wholesale</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap">
                Cancel
              </button>
              <button onClick={addCustomer} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap">
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
