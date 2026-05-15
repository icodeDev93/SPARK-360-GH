import { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import Paginator from '@/components/ui/Paginator';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import type { InvoiceRecord, PaymentMethod } from '@/types/erp';
import { writeLog } from '@/lib/activityLog';

const PAGE_SIZE = 20;

const CASH_METHODS: Exclude<PaymentMethod, 'Credit'>[] = ['Cash', 'MoMo', 'Cheque', 'Bank Transfer'];

type SortCol = 'date' | 'amount' | 'days';

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function agingBadge(days: number) {
  if (days === 0) return { label: 'Today', cls: 'bg-emerald-100 text-emerald-700' };
  if (days <= 7)  return { label: `${days}d`, cls: 'bg-emerald-100 text-emerald-700' };
  if (days <= 30) return { label: `${days}d`, cls: 'bg-amber-100 text-amber-700' };
  return { label: `${days}d`, cls: 'bg-red-100 text-red-600' };
}

function calcDueDate(iso: string, dueDays: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + dueDays);
  return d;
}

function dueBadge(iso: string, dueDays: number): { label: string; cls: string } {
  const due = calcDueDate(iso, dueDays);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - now.getTime()) / 86_400_000);
  if (diff < 0)  return { label: `Overdue ${Math.abs(diff)}d`, cls: 'bg-red-100 text-red-600 font-bold' };
  if (diff === 0) return { label: 'Due Today', cls: 'bg-amber-100 text-amber-700 font-bold' };
  if (diff <= 3)  return { label: `Due in ${diff}d`, cls: 'bg-amber-100 text-amber-700' };
  return { label: formatDate(due.toISOString()), cls: 'bg-emerald-100 text-emerald-700' };
}

export default function CreditPage() {
  const { invoices, markCreditAsPaid, processReturn } = useSalesLog();
  const { customers } = useCustomers();
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const { invoiceDueDays } = settings;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortCol>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<InvoiceRecord | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState<Exclude<PaymentMethod, 'Credit'>>('Cash');
  const [returnInvoice, setReturnInvoice] = useState<InvoiceRecord | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});

  useEffect(() => { setPage(1); }, [searchQuery, sortBy, sortDir]);

  const customerTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    customers.forEach((c) => { map[c.customerId] = c.customerType; });
    return map;
  }, [customers]);

  const creditInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return invoices
      .filter((inv) => inv.status === 'credit')
      .filter((inv) =>
        !q ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.receiptNo.toLowerCase().includes(q) ||
        inv.invoiceNo.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'date')   diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount') diff = a.netSales - b.netSales;
        if (sortBy === 'days')   diff = daysAgo(b.date) - daysAgo(a.date);
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [invoices, searchQuery, sortBy, sortDir]);

  const paginated = creditInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalOutstanding = creditInvoices.reduce((s, inv) => s + inv.netSales, 0);
  const uniqueCustomers  = new Set(creditInvoices.map((inv) => inv.customerId || inv.customerName)).size;
  const oldestDays       = creditInvoices.length > 0 ? Math.max(...creditInvoices.map((inv) => daysAgo(inv.date))) : 0;

  const toggleSort = (col: SortCol) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortIcon = (col: string) => {
    if (sortBy !== col) return 'ri-arrow-up-down-line opacity-30';
    return sortDir === 'asc' ? 'ri-arrow-up-line text-indigo-500' : 'ri-arrow-down-line text-indigo-500';
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-slate-800 font-bold text-xl">Credit Invoices</h2>
        <p className="text-slate-400 text-sm mt-0.5">Outstanding credit sales awaiting payment</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Outstanding', value: fmt(totalOutstanding),        icon: 'ri-hand-coin-line',        color: 'bg-amber-50 text-amber-600' },
          { label: 'Credit Invoices',   value: String(creditInvoices.length), icon: 'ri-file-list-3-line',      color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Customers in Debt', value: String(uniqueCustomers),       icon: 'ri-group-line',            color: 'bg-violet-50 text-violet-600' },
          {
            label: 'Oldest Invoice',
            value: oldestDays > 0 ? `${oldestDays} days` : '—',
            icon: 'ri-time-line',
            color: oldestDays > 30 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 mb-4 max-w-sm">
        <i className="ri-search-line text-slate-400 text-sm"></i>
        <input
          type="text"
          placeholder="Search customer or receipt no..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                  Receipt No.
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                  Customer
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap cursor-pointer select-none hover:text-slate-600"
                >
                  <span className="flex items-center gap-1">Date <i className={`${sortIcon('date')} text-xs`}></i></span>
                </th>
                <th
                  onClick={() => toggleSort('days')}
                  className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap cursor-pointer select-none hover:text-slate-600"
                >
                  <span className="flex items-center gap-1">Age <i className={`${sortIcon('days')} text-xs`}></i></span>
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                  Due Date
                </th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap cursor-pointer select-none hover:text-slate-600"
                >
                  <span className="flex items-center gap-1">Amount <i className={`${sortIcon('amount')} text-xs`}></i></span>
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                  Items
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                  Cashier
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {creditInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-checkbox-circle-line text-4xl text-emerald-300"></i>
                      <p className="text-slate-500 font-semibold text-sm">No outstanding credit invoices</p>
                      <p className="text-slate-300 text-xs">All credit sales have been settled</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((inv, i) => {
                  const days  = daysAgo(inv.date);
                  const badge = agingBadge(days);
                  const custType = customerTypeMap[inv.customerId] ?? '';
                  const totalQty = inv.items.reduce((s, item) => s + item.netQty, 0);
                  const db = dueBadge(inv.date, invoiceDueDays);
                  return (
                    <tr key={inv.receiptNo} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-3.5">
                        <span className="text-indigo-600 font-bold text-sm font-mono">{inv.receiptNo}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-800 text-sm font-semibold">{inv.customerName}</p>
                        {custType && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${custType === 'Wholesale' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                            {custType}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-slate-600 text-sm">{formatDate(inv.date)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${db.cls}`}>
                          {db.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-slate-800 font-bold font-mono text-sm">{fmt(inv.netSales)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-600 text-sm truncate max-w-[160px]">
                          {inv.items.slice(0, 2).map((it) => it.productName).join(', ')}
                          {inv.items.length > 2 && <span className="text-slate-400"> +{inv.items.length - 2}</span>}
                        </p>
                        <p className="text-slate-400 text-xs">{totalQty} units</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-500 text-sm">{inv.cashier}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            title="View invoice details"
                          >
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => { setReturnInvoice(inv); setReturnQtys({}); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all cursor-pointer"
                            title="Return items"
                          >
                            <i className="ri-arrow-go-back-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => { setMarkPaidTarget(inv); setMarkPaidMethod('Cash'); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer"
                            title="Mark as paid"
                          >
                            <i className="ri-checkbox-circle-line text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Paginator
          page={page}
          totalItems={creditInvoices.length}
          pageSize={PAGE_SIZE}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Invoice Details</h2>
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{selectedInvoice.receiptNo}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-400 text-xs mb-0.5">Customer</p><p className="text-slate-700 font-semibold">{selectedInvoice.customerName}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Sale Date</p><p className="text-slate-700 font-semibold">{formatDate(selectedInvoice.date)}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Cashier</p><p className="text-slate-700 font-semibold">{selectedInvoice.cashier}</p></div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Age</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${agingBadge(daysAgo(selectedInvoice.date)).cls}`}>
                    {agingBadge(daysAgo(selectedInvoice.date)).label}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Due Date</p>
                  <p className="text-slate-700 font-semibold text-xs">{formatDate(calcDueDate(selectedInvoice.date, invoiceDueDays).toISOString())}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Status</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${dueBadge(selectedInvoice.date, invoiceDueDays).cls}`}>
                    {dueBadge(selectedInvoice.date, invoiceDueDays).label}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3">Line Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.productId} className="flex items-start justify-between text-sm gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 font-semibold truncate">{item.productName}</p>
                        <p className="text-slate-400 text-xs">₵{item.unitPrice.toFixed(2)} × {item.netQty} units{item.returnsQty > 0 && <span className="text-red-400 ml-1">({item.returnsQty} returned)</span>}</p>
                      </div>
                      <span className="text-slate-800 font-bold font-mono flex-shrink-0">{fmt(item.netSales)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex justify-between text-sm text-slate-500 mb-1">
                  <span>Total Cost</span><span className="font-mono">{fmt(selectedInvoice.totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Gross Margin</span><span className="font-mono">{fmt(selectedInvoice.grossMargin)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-amber-200 mt-2">
                  <span>Amount Due</span>
                  <span className="font-mono text-amber-600 text-base">{fmt(selectedInvoice.netSales)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 py-2">
                <i className="ri-hand-coin-line text-violet-500"></i>
                <span className="text-violet-700 text-sm font-semibold">Credit — Awaiting Payment</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setSelectedInvoice(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Close
              </button>
              <button
                onClick={() => { setMarkPaidTarget(selectedInvoice); setMarkPaidMethod('Cash'); setSelectedInvoice(null); }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold cursor-pointer"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 rounded-xl mb-4">
              <i className="ri-checkbox-circle-line text-emerald-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-1">Mark as Paid</h3>
            <p className="text-slate-500 text-sm mb-4">
              <span className="font-bold text-indigo-600">{markPaidTarget.receiptNo}</span> — <span className="font-bold text-slate-700">{markPaidTarget.customerName}</span>
              <br />
              <span className="text-amber-600 font-bold font-mono">{fmt(markPaidTarget.netSales)}</span>
            </p>
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment Received Via</p>
              <div className="grid grid-cols-2 gap-2">
                {CASH_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarkPaidMethod(m)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      markPaidMethod === m
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMarkPaidTarget(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await markCreditAsPaid(markPaidTarget.invoiceNo, markPaidMethod);
                  if (currentUser) writeLog(currentUser, {
                    category: 'sales', action: 'edit',
                    description: `Credit invoice ${markPaidTarget.receiptNo} paid — ₵${markPaidTarget.netSales.toFixed(2)} via ${markPaidMethod} (${markPaidTarget.customerName})`,
                  });
                  setMarkPaidTarget(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Items Modal */}
      {returnInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Return Items</h2>
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{returnInvoice.receiptNo} — {returnInvoice.customerName}</p>
              </div>
              <button onClick={() => setReturnInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-4 max-h-[45vh] overflow-y-auto space-y-3">
              {returnInvoice.items.map((item) => {
                const maxReturn = item.qty - item.returnsQty;
                return (
                  <div key={item.productId} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate">{item.productName}</p>
                      <p className="text-slate-400 text-xs">
                        Sold: {item.qty} · Returned: {item.returnsQty} · Available to return: {maxReturn}
                      </p>
                    </div>
                    {maxReturn > 0 ? (
                      <input
                        type="number"
                        min={0}
                        max={maxReturn}
                        value={returnQtys[item.productId] ?? 0}
                        onChange={(e) =>
                          setReturnQtys((prev) => ({
                            ...prev,
                            [item.productId]: Math.min(maxReturn, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-indigo-400"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs whitespace-nowrap">Fully returned</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <p className="text-slate-400 text-xs mb-3">
                Returned items will be restored to inventory. Customer's outstanding balance will be reduced by the returned value.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setReturnInvoice(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const returns = Object.entries(returnQtys)
                      .filter(([, qty]) => qty > 0)
                      .map(([productId, returnQty]) => ({ productId, returnQty }));
                    if (returns.length === 0) { setReturnInvoice(null); return; }
                    await processReturn(returnInvoice.invoiceNo, returns);
                    if (currentUser) writeLog(currentUser, {
                      category: 'sales', action: 'refund',
                      description: `Return processed on ${returnInvoice.receiptNo} for ${returnInvoice.customerName} — ${returns.length} item(s)`,
                    });
                    setReturnInvoice(null);
                    setReturnQtys({});
                  }}
                  disabled={Object.values(returnQtys).every((q) => q <= 0)}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold cursor-pointer"
                >
                  Confirm Returns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
