import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSalesLog } from '@/hooks/useSalesLog';
import type { InvoiceRecord } from '@/types/erp';

const PAYMENT_ICONS: Record<string, string> = {
  Cash:            'ri-money-dollar-circle-line',
  MoMo:            'ri-smartphone-line',
  Cheque:          'ri-draft-line',
  'Bank Transfer': 'ri-bank-line',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export default function SalesHistoryPage() {
  const { invoices, refund } = useSalesLog();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'refunded'>('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const filtered = invoices.filter((inv) => {
    const matchStatus  = filterStatus === 'all' || inv.status === filterStatus;
    const matchPayment = filterPayment === 'all' || inv.paymentMethod === filterPayment;
    const q = searchQuery.toLowerCase();
    const matchSearch  =
      inv.receiptNo.toLowerCase().includes(q) ||
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.cashier.toLowerCase().includes(q) ||
      inv.items.some((i) => i.productName.toLowerCase().includes(q));
    return matchStatus && matchPayment && matchSearch;
  });

  const totalRevenue  = invoices.filter((i) => i.status === 'completed').reduce((s, i) => s + i.netSales, 0);
  const todayCount    = invoices.filter((i) => i.date === today).length;
  const refundedCount = invoices.filter((i) => i.status === 'refunded').length;

  const summaryCards = [
    { label: 'Total Transactions', value: String(invoices.length),  icon: 'ri-receipt-line',        color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Revenue',      value: fmt(totalRevenue),         icon: 'ri-funds-line',           color: 'bg-emerald-50 text-emerald-600' },
    { label: "Today's Sales",      value: String(todayCount),        icon: 'ri-calendar-check-line',  color: 'bg-amber-50 text-amber-600' },
    { label: 'Refunded',           value: String(refundedCount),     icon: 'ri-refund-2-line',        color: 'bg-red-50 text-red-500' },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-slate-800 font-bold text-xl">Sales History</h2>
        <p className="text-slate-400 text-sm mt-0.5">All completed POS transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${c.color}`}>
              <i className={`${c.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{c.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <i className="ri-search-line text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search receipt, cashier, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'completed', 'refunded'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-indigo-400 bg-white cursor-pointer"
          >
            <option value="all">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="MoMo">MoMo</option>
            <option value="Cheque">Cheque</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Receipt No.', 'Date', 'Customer', 'Items', 'Cashier', 'Payment', 'Net Sales', 'Margin', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-receipt-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm font-medium">No receipts found</p>
                      <p className="text-slate-300 text-xs">Adjust your filters or complete a sale</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((inv, i) => {
                  const totalQty = inv.items.reduce((s, item) => s + item.netQty, 0);
                  return (
                    <tr key={inv.receiptNo} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-3.5">
                        <span className="text-indigo-600 font-bold text-sm font-mono">{inv.receiptNo}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-slate-700 text-sm font-semibold">{formatDate(inv.date)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-700 text-sm font-medium">{inv.customerName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-slate-700 text-sm">
                          {inv.items.slice(0, 2).map((i) => i.productName).join(', ')}
                          {inv.items.length > 2 && <span className="text-slate-400"> +{inv.items.length - 2} more</span>}
                        </p>
                        <p className="text-slate-400 text-xs">{totalQty} units</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-600 text-sm">{inv.cashier}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-slate-600 text-sm whitespace-nowrap">
                          <i className={`${PAYMENT_ICONS[inv.paymentMethod] ?? 'ri-money-dollar-circle-line'} text-slate-400 text-sm`}></i>
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-slate-800 font-bold font-mono text-sm">{fmt(inv.netSales)}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-emerald-600 font-semibold font-mono text-sm">{fmt(inv.grossMargin)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          inv.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          <i className={`${inv.status === 'completed' ? 'ri-checkbox-circle-line' : 'ri-refund-2-line'} text-xs`}></i>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            title="View details"
                          >
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                          {inv.status === 'completed' && (
                            <button
                              onClick={() => setRefundTarget(inv.invoiceNo)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Mark as refunded"
                            >
                              <i className="ri-refund-2-line text-sm"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Receipt Details</h2>
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{selectedInvoice.receiptNo}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Date</p>
                  <p className="text-slate-700 font-semibold">{formatDate(selectedInvoice.date)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Customer</p>
                  <p className="text-slate-700 font-semibold">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Cashier</p>
                  <p className="text-slate-700 font-semibold">{selectedInvoice.cashier}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Payment</p>
                  <p className="text-slate-700 font-semibold">{selectedInvoice.paymentMethod}</p>
                </div>
              </div>

              {/* Line items */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3">Line Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.productId} className="flex items-start justify-between text-sm gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 font-semibold truncate">{item.productName}</p>
                        <p className="text-slate-400 text-xs">
                          ₵{item.unitPrice.toFixed(2)} × {item.netQty} units
                          {item.returnsQty > 0 && <span className="text-red-400 ml-1">({item.returnsQty} returned)</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-800 font-bold font-mono">{fmt(item.netSales)}</p>
                        <p className="text-emerald-600 text-xs font-mono">+{fmt(item.grossMargin)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Total Cost</span>
                  <span className="font-mono">{fmt(selectedInvoice.totalCost)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Gross Margin</span>
                  <span className="font-mono">{fmt(selectedInvoice.grossMargin)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>Net Sales</span>
                  <span className="font-mono text-indigo-600 text-base">{fmt(selectedInvoice.netSales)}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full ${
                  selectedInvoice.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  <i className={`${selectedInvoice.status === 'completed' ? 'ri-checkbox-circle-fill' : 'ri-refund-2-line'} text-sm`}></i>
                  {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirm Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-amber-100 rounded-xl mb-4">
              <i className="ri-refund-2-line text-amber-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Mark as Refunded?</h3>
            <p className="text-slate-500 text-sm mb-2 leading-relaxed">
              Receipt <span className="font-bold text-indigo-600">{invoices.find((inv) => inv.invoiceNo === refundTarget)?.receiptNo ?? refundTarget}</span> will be marked as refunded.
            </p>
            <p className="text-slate-400 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { refund(refundTarget); setRefundTarget(null); }}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
