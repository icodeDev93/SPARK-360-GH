import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useExpenses } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORIES } from '@/mocks/expenses';
import ExpenseForm from './components/ExpenseForm';
import type { ExpenseRecord, PaymentMethod } from '@/types/erp';

const CATEGORY_COLORS: Record<string, string> = {
  Rent:        'bg-emerald-100 text-emerald-700',
  Utilities:   'bg-amber-100 text-amber-700',
  Payroll:     'bg-indigo-100 text-indigo-700',
  Supplies:    'bg-cyan-100 text-cyan-700',
  Marketing:   'bg-rose-100 text-rose-700',
  Maintenance: 'bg-orange-100 text-orange-700',
  Transport:   'bg-sky-100 text-sky-700',
  Insurance:   'bg-violet-100 text-violet-700',
  Other:       'bg-slate-100 text-slate-600',
};

const CATEGORY_ICONS: Record<string, string> = {
  Rent:        'ri-building-line',
  Utilities:   'ri-flashlight-line',
  Payroll:     'ri-group-line',
  Supplies:    'ri-box-3-line',
  Marketing:   'ri-megaphone-line',
  Maintenance: 'ri-tools-line',
  Transport:   'ri-car-line',
  Insurance:   'ri-shield-check-line',
  Other:       'ri-more-line',
};

const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  Cash:            'ri-money-dollar-circle-line',
  MoMo:            'ri-smartphone-line',
  Cheque:          'ri-file-list-3-line',
  'Bank Transfer': 'ri-bank-line',
};

const BAR_COLORS  = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-violet-500','bg-orange-500','bg-slate-400'];
const DOT_COLORS  = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-violet-500','bg-orange-500','bg-slate-400'];
const TEXT_COLORS = ['text-indigo-600','text-emerald-600','text-amber-600','text-rose-600','text-cyan-600','text-violet-600','text-orange-600','text-slate-500'];

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, totalByCategory, grandTotalGHS } = useExpenses();
  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null);
  const [filterCat, setFilterCat]         = useState('All');
  const [search, setSearch]               = useState('');

  const filtered = expenses.filter((e) => {
    const matchCat    = filterCat === 'All' || e.category === filterCat;
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const sortedCats  = Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]);
  const topCats     = sortedCats.slice(0, 3);
  const filteredTotal = filtered.reduce((s, e) => s + e.amountGHS, 0);

  const handleEdit  = (exp: ExpenseRecord) => { setEditTarget(exp); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditTarget(null); };

  const handleSave = (data: Omit<ExpenseRecord, 'expenseId'>) => {
    if (editTarget) {
      updateExpense(editTarget.expenseId, data);
    } else {
      addExpense(data);
    }
    setEditTarget(null);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Expenses</h2>
          <p className="text-slate-400 text-sm mt-0.5">Track and manage all business expenses</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line text-base"></i>
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-xl">
              <i className="ri-wallet-3-line text-red-500 text-lg"></i>
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Expenses</p>
          </div>
          <p className="text-slate-900 text-2xl font-bold font-mono">{fmt(grandTotalGHS)}</p>
          <p className="text-slate-400 text-xs mt-1">{expenses.length} records</p>
        </div>

        {topCats.map(([cat, total]) => (
          <div key={cat} className="bg-white rounded-xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`}>
                <i className={`${CATEGORY_ICONS[cat] ?? 'ri-more-line'} text-lg`}></i>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{cat}</p>
            </div>
            <p className="text-slate-900 text-2xl font-bold font-mono">{fmt(total)}</p>
            <p className="text-slate-400 text-xs mt-1">{Math.round((total / grandTotalGHS) * 100)}% of total</p>
          </div>
        ))}
      </div>

      {/* Extra category cards (5th+) */}
      {sortedCats.length > 4 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {sortedCats.slice(4).map(([cat, total]) => (
            <div key={cat} className="bg-white rounded-xl p-5 border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`}>
                  <i className={`${CATEGORY_ICONS[cat] ?? 'ri-more-line'} text-lg`}></i>
                </div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{cat}</p>
              </div>
              <p className="text-slate-900 text-2xl font-bold font-mono">{fmt(total)}</p>
              <p className="text-slate-400 text-xs mt-1">{Math.round((total / grandTotalGHS) * 100)}% of total</p>
            </div>
          ))}
        </div>
      )}

      {/* Spending Breakdown Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 mb-6">
        <h3 className="text-slate-700 font-bold text-sm mb-4">Spending Breakdown</h3>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
          {sortedCats.map(([cat, total], i) => (
            <div
              key={cat}
              className={`${BAR_COLORS[i % BAR_COLORS.length]} rounded-sm transition-all`}
              style={{ width: `${(total / grandTotalGHS) * 100}%` }}
              title={`${cat}: ${fmt(total)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {sortedCats.map(([cat, total], i) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]}`}></span>
              <span className="text-xs text-slate-600">{cat}</span>
              <span className={`text-xs font-bold font-mono ${TEXT_COLORS[i % TEXT_COLORS.length]}`}>₵{total.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <i className="ri-search-line text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', ...EXPENSE_CATEGORIES] as string[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterCat === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Description', 'Category', 'Date', 'Paid By', 'Notes', 'Amount (₵)', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-wallet-3-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm font-medium">No expenses found</p>
                      <p className="text-slate-300 text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((e, i) => (
                  <tr key={e.expenseId} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-800 text-sm font-semibold">{e.description}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[e.category] ?? 'bg-slate-100 text-slate-600'}`}>
                        <i className={`${CATEGORY_ICONS[e.category] ?? 'ri-more-line'} text-xs`}></i>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-slate-500 text-sm">{formatDate(e.date)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-slate-600 text-sm whitespace-nowrap">
                        <i className={`${PAYMENT_ICONS[e.paidBy]} text-slate-400 text-sm`}></i>
                        {e.paidBy}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[180px]">
                      <span className="text-slate-500 text-sm truncate block">{e.notes || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-red-600 text-sm font-bold font-mono whitespace-nowrap">{fmt(e.amountGHS)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(e)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(e.expenseId)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-sm font-bold text-slate-600">
                    {filtered.length} expense{filtered.length !== 1 ? 's' : ''} shown
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-red-600 font-bold font-mono text-sm">{fmt(filteredTotal)}</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Delete Expense?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This expense record will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => { deleteExpense(deleteTarget); setDeleteTarget(null); }} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold cursor-pointer whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
