import { useState, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import Paginator from '@/components/ui/Paginator';
import BulkActionBar from '@/components/ui/BulkActionBar';

const PAGE_SIZE = 20;
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseForm from './components/ExpenseForm';
import type { ExpenseRecord, ExpensePaymentMethod } from '@/types/erp';
import { useAuth } from '@/hooks/useAuth';
import { writeLog, diffFields } from '@/lib/activityLog';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import {
  dateRangeLabel,
  exportRowsCsv,
  exportRowsPdf,
  formatCurrency,
  isWithinDateRange,
  type ExportColumn,
} from '@/lib/exportRecords';

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

const PAYMENT_ICONS: Record<ExpensePaymentMethod, string> = {
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
  const {
    expenses, categories, addExpense, updateExpense, deleteExpense,
    addCategory, renameCategory, deleteCategory,
    totalByCategory, grandTotalGHS,
  } = useExpenses();
  const { currentUser } = useAuth();
  const { showFeedback } = useFeedbackModal();
  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null);
  const [filterCat, setFilterCat]         = useState('All');
  const [search, setSearch]               = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [page, setPage]                   = useState(1);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory]     = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => { setPage(1); }, [filterCat, search, startDate, endDate]);

  const filtered = expenses.filter((e) => {
    const matchCat    = filterCat === 'All' || e.category === filterCat;
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && isWithinDateRange(e.date, startDate, endDate);
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedExpenses = expenses.filter((expense) => selectedIds.includes(expense.expenseId));
  const visibleIds = paginated.map((expense) => expense.expenseId);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const sortedCats  = Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]);
  const topCats     = sortedCats.slice(0, 3);
  const filteredTotal = filtered.reduce((s, e) => s + e.amountGHS, 0);

  const expenseColumns: ExportColumn<ExpenseRecord>[] = [
    { header: 'Description', value: (expense) => expense.description },
    { header: 'Category', value: (expense) => expense.category },
    { header: 'Date', value: (expense) => formatDate(expense.date) },
    { header: 'Paid By', value: (expense) => expense.paidBy },
    { header: 'Notes', value: (expense) => expense.notes },
    { header: 'Amount', value: (expense) => formatCurrency(expense.amountGHS) },
  ];

  const exportExpenses = (format: 'csv' | 'pdf') => {
    const options = {
      title: 'Expenses Report',
      filename: `expenses-report-${new Date().toISOString().slice(0, 10)}`,
      subtitle: dateRangeLabel(startDate, endDate),
      columns: expenseColumns,
      rows: filtered,
      totals: [
        { label: 'Expenses', value: String(filtered.length) },
        { label: 'Total Amount', value: formatCurrency(filteredTotal) },
      ],
    };
    if (format === 'csv') exportRowsCsv(options);
    else exportRowsPdf(options);
  };

  const handleEdit  = (exp: ExpenseRecord) => { setEditTarget(exp); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditTarget(null); };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((expenseId) => expenseId !== id) : [...prev, id]);
  };

  const toggleVisibleSelection = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleBulkDelete = async () => {
    if (bulkDeleting || selectedExpenses.length === 0) return;
    setBulkDeleting(true);
    for (const expense of selectedExpenses) {
      await deleteExpense(expense.expenseId);
    }
    if (currentUser) writeLog(currentUser, {
      category: 'expenses',
      action: 'delete',
      description: `Bulk deleted ${selectedExpenses.length} expense(s): ${selectedExpenses.map((expense) => expense.description).join(', ')}`,
    });
    showFeedback({
      title: 'Expenses Deleted',
      message: `${selectedExpenses.length} expense${selectedExpenses.length === 1 ? '' : 's'} removed successfully.`,
      buttonLabel: 'Continue',
      kind: 'deleted',
    });
    setSelectedIds([]);
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
  };

  const handleAddCategory = async () => {
    const result = await addCategory(newCategory);
    if (!result.success) {
      setCategoryError(result.error ?? 'Unable to add category.');
      return;
    }
    const savedName = newCategory.trim();
    setNewCategory('');
    setCategoryError('');
    setCategoryModalOpen(false);
    showFeedback({
      title: 'Category Added',
      message: `${savedName} is now available for this business.`,
      buttonLabel: 'Continue',
    });
  };

  const handleStartEditCategory = (category: string) => {
    setEditingCategory(category);
    setEditingCategoryName(category);
    setCategoryError('');
  };

  const handleRenameCategory = async () => {
    if (!editingCategory) return;
    const result = await renameCategory(editingCategory, editingCategoryName);
    if (!result.success) {
      setCategoryError(result.error ?? 'Unable to update category.');
      return;
    }
    setEditingCategory(null);
    setEditingCategoryName('');
    setCategoryError('');
    showFeedback({
      title: 'Category Updated',
      message: `${editingCategory} has been renamed successfully.`,
      buttonLabel: 'Continue',
    });
  };

  const handleDeleteCategory = async (category: string) => {
    const result = await deleteCategory(category);
    if (!result.success) {
      setCategoryError(result.error ?? 'Unable to delete category.');
      return;
    }
    if (filterCat === category) setFilterCat('All');
    showFeedback({
      title: 'Category Deleted',
      message: `${category} has been removed from this business.`,
      buttonLabel: 'Continue',
      kind: 'deleted',
    });
  };

  const handleSave = async (data: Omit<ExpenseRecord, 'expenseId'>) => {
    if (editTarget) {
      const changes = diffFields(
        editTarget as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
        { description: 'Description', category: 'Category', amountGHS: 'Amount', paidBy: 'Paid By', date: 'Date', notes: 'Notes' },
        { amountGHS: (v) => `₵${Number(v).toFixed(2)}` },
      );
      await updateExpense(editTarget.expenseId, data);
      if (currentUser) writeLog(currentUser, {
        category: 'expenses', action: 'edit',
        description: `Edited expense "${data.description}" (${data.category})`,
        changes,
      });
    } else {
      await addExpense(data);
      if (currentUser) writeLog(currentUser, {
        category: 'expenses', action: 'create',
        description: `Added expense "${data.description}" — ${data.category}, ₵${data.amountGHS.toFixed(2)} via ${data.paidBy}`,
      });
    }
    showFeedback({
      title: editTarget ? 'Expense Updated' : 'Expense Recorded',
      message: `${data.description} has been ${editTarget ? 'updated' : 'recorded'} successfully.`,
      buttonLabel: 'Continue',
    });
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCategoryModalOpen(true); setNewCategory(''); setCategoryError(''); }}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-price-tag-3-line text-base"></i>
            Add Category
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-base"></i>
            Add Expense
          </button>
        </div>
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
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 mb-4 min-w-0">
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
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none min-w-0" title="Start date" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none min-w-0" title="End date" />
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <button onClick={() => exportExpenses('csv')} className="flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-file-excel-2-line text-base"></i>
            Export to CSV
          </button>
          <button onClick={() => exportExpenses('pdf')} className="flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-file-pdf-2-line text-base"></i>
            Export to PDF
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', ...categories] as string[]).map((cat) => (
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
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onDelete={() => setBulkDeleteOpen(true)}
      />
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelection}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    aria-label="Select visible expenses"
                  />
                </th>
                {['Description', 'Category', 'Date', 'Paid By', 'Notes', 'Amount (₵)', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-wallet-3-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm font-medium">No expenses found</p>
                      <p className="text-slate-300 text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((e, i) => (
                  <tr key={e.expenseId} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(e.expenseId)}
                        onChange={() => toggleSelected(e.expenseId)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        aria-label={`Select ${e.description}`}
                      />
                    </td>
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
                        {e.proofUrl && (
                          <a
                            href={e.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer"
                            title="View proof"
                          >
                            <i className="ri-attachment-2 text-sm"></i>
                          </a>
                        )}
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
                  <td colSpan={6} className="px-5 py-3 text-sm font-bold text-slate-600">
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
        <Paginator
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          initial={editTarget ?? undefined}
          categories={categories}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}

      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Add Expense Category</h2>
                <p className="text-slate-400 text-xs mt-0.5">Available only for this business</p>
              </div>
              <button
                onClick={() => {
                  setCategoryModalOpen(false);
                  setEditingCategory(null);
                  setCategoryError('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer transition-all"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(event) => { setNewCategory(event.target.value); setCategoryError(''); }}
                  placeholder="e.g. Repairs"
                  maxLength={80}
                  className={`min-w-0 flex-1 border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${categoryError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'}`}
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
                >
                  Add
                </button>
              </div>
              {categoryError && <p className="text-red-500 text-xs mt-1">{categoryError}</p>}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Existing Categories</h3>
                {categories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                    <i className="ri-price-tag-3-line text-2xl text-slate-300"></i>
                    <p className="text-slate-400 text-sm mt-2">No categories added yet</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {categories.map((category) => {
                      const count = expenses.filter((expense) => expense.category === category).length;
                      const isEditing = editingCategory === category;
                      return (
                        <div key={category} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingCategoryName}
                                onChange={(event) => { setEditingCategoryName(event.target.value); setCategoryError(''); }}
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                                maxLength={80}
                              />
                              <button
                                onClick={handleRenameCategory}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                                title="Save category"
                              >
                                <i className="ri-check-line text-sm"></i>
                              </button>
                              <button
                                onClick={() => { setEditingCategory(null); setEditingCategoryName(''); }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 cursor-pointer"
                                title="Cancel edit"
                              >
                                <i className="ri-close-line text-sm"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-700">{category}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEditCategory(category)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer"
                                  title="Edit category"
                                >
                                  <i className="ri-edit-line text-sm"></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category)}
                                  disabled={count > 0}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200 cursor-pointer"
                                  title={count > 0 ? 'Category is in use' : 'Delete category'}
                                >
                                  <i className="ri-delete-bin-line text-sm"></i>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setCategoryModalOpen(false);
                  setEditingCategory(null);
                  setCategoryError('');
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
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
              <button onClick={() => {
                const target = expenses.find((e) => e.expenseId === deleteTarget);
                deleteExpense(deleteTarget);
                if (currentUser && target) writeLog(currentUser, {
                  category: 'expenses', action: 'delete',
                  description: `Deleted expense "${target.description}" — ${target.category}, ₵${target.amountGHS.toFixed(2)}`,
                });
                setDeleteTarget(null);
                showFeedback({
                  title: 'Expense Deleted',
                  message: `${target?.description ?? 'The expense'} has been removed successfully.`,
                  buttonLabel: 'Continue',
                  kind: 'deleted',
                });
              }} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold cursor-pointer whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Delete Selected Expenses?</h3>
            <p className="text-slate-500 text-sm mb-2 leading-relaxed">
              {selectedExpenses.length} expense{selectedExpenses.length === 1 ? '' : 's'} will be permanently removed.
            </p>
            <p className="text-slate-400 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
