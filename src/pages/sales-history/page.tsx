import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import CreditPaymentHistory from '@/components/feature/CreditPaymentHistory';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useAuth } from '@/hooks/useAuth';
import type { InvoiceRecord, PaymentMethod } from '@/types/erp';
import { writeLog } from '@/lib/activityLog';
import Paginator from '@/components/ui/Paginator';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import CreditPaymentReceiptModal, { type CreditPaymentReceipt } from '@/pages/credit/components/CreditPaymentReceiptModal';
import ReceiptModal from '@/pages/pos/components/ReceiptModal';

type StatusFilter = 'all' | 'completed' | 'credit' | 'refunded';
const CASH_METHODS: Exclude<PaymentMethod, 'Credit'>[] = ['Cash', 'MoMo', 'Cheque', 'Bank Transfer'];

const PAGE_SIZE = 20;

const PAYMENT_ICONS: Record<string, string> = {
  Cash:            'ri-money-dollar-circle-line',
  MoMo:            'ri-smartphone-line',
  Cheque:          'ri-draft-line',
  'Bank Transfer': 'ri-bank-line',
  Credit:          'ri-hand-coin-line',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmt(n: number) {
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export default function SalesHistoryPage() {
  const { invoices, creditPayments, refund, deleteInvoice, recordCreditPayment, processReturn } = useSalesLog();
  const { currentUser } = useAuth();
  const { showFeedback } = useFeedbackModal();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [printReceiptInvoice, setPrintReceiptInvoice] = useState<InvoiceRecord | null>(null);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRecord | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<InvoiceRecord | null>(null);
  const [paymentBackInvoice, setPaymentBackInvoice] = useState<InvoiceRecord | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState<Exclude<PaymentMethod, 'Credit'>>('Cash');
  const [markPaidAmount, setMarkPaidAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const paymentSubmitRef = useRef(false);
  const [paymentReceipt, setPaymentReceipt] = useState<CreditPaymentReceipt | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<InvoiceRecord | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [filterStatus, filterPayment, searchQuery]);

  const today = new Date().toISOString().split('T')[0];
  const isAttendant = currentUser?.role === 'cashier';

  // Attendants see only their own sales for today
  const baseInvoices = isAttendant
    ? invoices.filter((inv) => inv.date === today && inv.cashier === currentUser?.name)
    : invoices;

  const filtered = baseInvoices.filter((inv) => {
    const matchStatus  = filterStatus === 'all' || inv.status === filterStatus;
    const matchPayment = filterPayment === 'all' || inv.paymentMethod === filterPayment;
    const q = searchQuery.toLowerCase();
    const matchSearch  =
      (inv.receiptNo ?? '').toLowerCase().includes(q) ||
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.cashier.toLowerCase().includes(q) ||
      inv.items.some((i) => i.productName.toLowerCase().includes(q));
    return matchStatus && matchPayment && matchSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRevenue    = baseInvoices.filter((i) => i.status === 'completed').reduce((s, i) => s + i.netSales, 0);
  const todayCount      = baseInvoices.filter((i) => i.date === today).length;
  const refundedCount   = baseInvoices.filter((i) => i.status === 'refunded').length;
  const creditOutstanding = baseInvoices.filter((i) => i.status === 'credit').reduce((s, i) => s + i.balanceDue, 0);

  const summaryCards = [
    { label: 'Total Transactions', value: String(baseInvoices.length), icon: 'ri-receipt-line',       color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Revenue',      value: fmt(totalRevenue),           icon: 'ri-funds-line',          color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Credit Outstanding', value: fmt(creditOutstanding),      icon: 'ri-hand-coin-line',      color: 'bg-amber-50 text-amber-600' },
    { label: 'Refunded',           value: String(refundedCount),       icon: 'ri-refund-2-line',       color: 'bg-red-50 text-red-500' },
  ];

  const openPaymentModal = (invoice: InvoiceRecord, backInvoice: InvoiceRecord | null = null) => {
    setPaymentBackInvoice(backInvoice);
    setMarkPaidTarget(invoice);
    setMarkPaidMethod('Cash');
    setMarkPaidAmount(invoice.balanceDue.toFixed(2));
  };

  const backFromPaymentModal = () => {
    if (paymentSubmitRef.current) return;
    const backInvoice = paymentBackInvoice;
    setMarkPaidTarget(null);
    setPaymentBackInvoice(null);
    if (backInvoice) setSelectedInvoice(backInvoice);
  };

  const closePaymentModal = (force = false) => {
    if (paymentSubmitRef.current && !force) return;
    setMarkPaidTarget(null);
    setPaymentBackInvoice(null);
    if (!paymentSubmitRef.current) setRecordingPayment(false);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-slate-800 font-bold text-xl">Sales History</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          {isAttendant ? 'Your sales transactions for today' : 'All completed POS transactions'}
        </p>
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
          {(['all', 'completed', 'credit', 'refunded'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {s === 'all' ? 'All Status' : s === 'credit' ? 'Credit' : s.charAt(0).toUpperCase() + s.slice(1)}
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
            <option value="Credit">Credit</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Invoice No.', 'Receipt No.', 'Date', 'Customer', 'Items', 'Cashier', 'Payment', 'Net Sales', 'Margin', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-receipt-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm font-medium">No receipts found</p>
                      <p className="text-slate-300 text-xs">Adjust your filters or complete a sale</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((inv, i) => {
                  const totalQty = inv.items.reduce((s, item) => s + item.netQty, 0);
                  return (
                    <tr key={inv.invoiceNo} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-3.5">
                        <span className="text-indigo-600 font-bold text-sm font-mono">{inv.invoiceNo}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {inv.receiptNo ? (
                          <span className="text-slate-700 font-bold text-sm font-mono">{inv.receiptNo}</span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Pending payment</span>
                        )}
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
                        <span className="text-slate-800 font-bold font-mono text-sm">{fmt(inv.status === 'credit' ? inv.balanceDue : inv.netSales)}</span>
                        {inv.status === 'credit' && inv.amountPaid > 0 && <p className="text-emerald-600 text-xs font-mono">Paid {fmt(inv.amountPaid)}</p>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-emerald-600 font-semibold font-mono text-sm">{fmt(inv.grossMargin)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          inv.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : inv.status === 'credit'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          <i className={`${
                            inv.status === 'completed' ? 'ri-checkbox-circle-line'
                            : inv.status === 'credit' ? 'ri-hand-coin-line'
                            : 'ri-refund-2-line'
                          } text-xs`}></i>
                          {inv.status === 'credit' ? 'Credit' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
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
                          {inv.status === 'completed' && inv.receiptNo && (
                            <button
                              onClick={() => setPrintReceiptInvoice(inv)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                              title="Print receipt"
                            >
                              <i className="ri-printer-line text-sm"></i>
                            </button>
                          )}
                          {(inv.status === 'completed' || inv.status === 'credit') && (
                            <button
                              onClick={() => { setReturnInvoice(inv); setReturnQtys({}); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all cursor-pointer"
                              title="Return items"
                            >
                              <i className="ri-arrow-go-back-line text-sm"></i>
                            </button>
                          )}
                          {inv.status === 'credit' && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer"
                              title="Mark as paid"
                            >
                              <i className="ri-checkbox-circle-line text-sm"></i>
                            </button>
                          )}
                          {inv.status === 'completed' && (
                            <button
                              onClick={() => setRefundTarget(inv.invoiceNo)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Mark as refunded"
                            >
                              <i className="ri-refund-2-line text-sm"></i>
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(inv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                            title="Delete record"
                          >
                            <i className="ri-delete-bin-line text-sm"></i>
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
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {/* Sale Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Sale Details</h2>
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{selectedInvoice.invoiceNo}</p>
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
                  <p className="text-slate-400 text-xs mb-0.5">Receipt</p>
                  <p className="text-slate-700 font-semibold">{selectedInvoice.receiptNo ?? 'Pending payment'}</p>
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
                  <span>{selectedInvoice.status === 'credit' ? 'Balance Due' : 'Net Sales'}</span>
                  <span className="font-mono text-indigo-600 text-base">{fmt(selectedInvoice.status === 'credit' ? selectedInvoice.balanceDue : selectedInvoice.netSales)}</span>
                </div>
                {selectedInvoice.status === 'credit' && selectedInvoice.amountPaid > 0 && (
                  <div className="flex justify-between text-emerald-600 text-sm">
                    <span>Amount Paid</span>
                    <span className="font-mono">{fmt(selectedInvoice.amountPaid)}</span>
                  </div>
                )}
              </div>

              {(selectedInvoice.paymentMethod === 'Credit' || selectedInvoice.amountPaid > 0) && (
                <CreditPaymentHistory invoice={selectedInvoice} payments={creditPayments} />
              )}

              <div className="flex justify-center">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full ${
                  selectedInvoice.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : selectedInvoice.status === 'credit'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  <i className={`${
                    selectedInvoice.status === 'completed' ? 'ri-checkbox-circle-fill'
                    : selectedInvoice.status === 'credit' ? 'ri-hand-coin-line'
                    : 'ri-refund-2-line'
                  } text-sm`}></i>
                  {selectedInvoice.status === 'credit' ? 'Credit (Unpaid)' : selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold cursor-pointer transition-all"
              >
                Close
              </button>
              {selectedInvoice.status === 'credit' && (
                <button
                  onClick={() => { openPaymentModal(selectedInvoice, selectedInvoice); setSelectedInvoice(null); }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold cursor-pointer transition-all"
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl mb-4">
              <i className="ri-delete-bin-line text-red-500 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Delete Sale Record?</h3>
            <p className="text-slate-500 text-sm mb-2 leading-relaxed">
              Invoice <span className="font-bold text-indigo-600">{deleteTarget.invoiceNo}</span> for{' '}
              <span className="font-bold text-slate-700">{deleteTarget.customerName}</span> will be permanently removed.
            </p>
            <p className="text-slate-400 text-xs mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteInvoice(deleteTarget.invoiceNo);
                  if (currentUser) writeLog(currentUser, {
                    category: 'sales', action: 'delete',
                    description: `Deleted sale ${deleteTarget.invoiceNo} for ${deleteTarget.customerName} — ₵${deleteTarget.netSales.toFixed(2)}`,
                  });
                  showFeedback({
                    title: 'Sale Deleted',
                    message: `${deleteTarget.invoiceNo} has been removed successfully.`,
                    buttonLabel: 'Continue',
                    kind: 'deleted',
                  });
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <button
              type="button"
              onClick={backFromPaymentModal}
              disabled={recordingPayment}
              className="absolute left-4 top-4 h-8 flex items-center gap-1.5 rounded-lg px-2 text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Back"
              title="Back"
            >
              <i className="ri-arrow-left-line text-lg"></i>
              <span className="text-xs font-bold">Back</span>
            </button>
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 rounded-xl mb-4 mt-8">
              <i className="ri-checkbox-circle-line text-emerald-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-1">Record Credit Payment</h3>
            <p className="text-slate-500 text-sm mb-4">
              Invoice <span className="font-bold text-indigo-600">{markPaidTarget.invoiceNo}</span> — <span className="font-bold text-slate-700">{fmt(markPaidTarget.balanceDue)}</span>
              <br />
              <span className="text-slate-400 text-xs">Each payment generates its own receipt.</span>
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount (₵)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={markPaidTarget.balanceDue}
                value={markPaidAmount}
                onChange={(e) => setMarkPaidAmount(e.target.value)}
                placeholder={`Max: ${fmt(markPaidTarget.balanceDue)}`}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 font-mono"
              />
            </div>
            <div className="mb-4">
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
              <button
                onClick={() => closePaymentModal()}
                disabled={recordingPayment}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
                <button
                onClick={async () => {
                  if (paymentSubmitRef.current) return;
                  const amount = Math.min(markPaidTarget.balanceDue, Math.max(0, parseFloat(markPaidAmount) || 0));
                  if (amount <= 0) return;
                  const target = markPaidTarget;
                  const previousPaid = target.amountPaid;
                  try {
                    paymentSubmitRef.current = true;
                    setRecordingPayment(true);
                    const payment = await recordCreditPayment(target.invoiceNo, amount, markPaidMethod);
                    if (!payment) return;
                    if (currentUser) writeLog(currentUser, {
                      category: 'credit', action: 'edit',
                      description: `Recorded ${fmt(amount)} payment for credit invoice ${target.invoiceNo} with receipt ${payment.receiptNo} via ${markPaidMethod}`,
                    });
                    setPaymentReceipt({
                      receiptNo: payment.receiptNo,
                      invoiceNo: target.invoiceNo,
                      customerName: target.customerName,
                      invoiceDate: target.date,
                      paymentDate: new Date().toISOString(),
                      paymentMethod: markPaidMethod,
                      cashier: currentUser?.name ?? target.cashier,
                      invoiceTotal: target.netSales,
                      previousPaid,
                      amountPaid: amount,
                      totalPaid: previousPaid + amount,
                      balanceLeft: payment.remainingBalance,
                    });
                    closePaymentModal(true);
                  } finally {
                    paymentSubmitRef.current = false;
                    setRecordingPayment(false);
                  }
                }}
                disabled={recordingPayment || !markPaidAmount || parseFloat(markPaidAmount) <= 0 || parseFloat(markPaidAmount) > markPaidTarget.balanceDue}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {recordingPayment && <i className="ri-loader-4-line animate-spin text-base"></i>}
                {recordingPayment ? 'Recording...' : 'Record Payment'}
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
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{returnInvoice.invoiceNo} — {returnInvoice.customerName}</p>
              </div>
              <button onClick={() => setReturnInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-3">
              {returnInvoice.items.map((item) => {
                const maxReturn = item.qty - item.returnsQty;
                return (
                  <div key={item.productId} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate">{item.productName}</p>
                      <p className="text-slate-400 text-xs">
                        Sold: {item.qty} · Returned: {item.returnsQty} · Available: {maxReturn}
                      </p>
                    </div>
                    {maxReturn > 0 ? (
                      <input
                        type="number"
                        min={0}
                        max={maxReturn}
                        value={returnQtys[item.productId] ?? 0}
                        onChange={(e) => setReturnQtys((prev) => ({
                          ...prev,
                          [item.productId]: Math.min(maxReturn, Math.max(0, Number(e.target.value))),
                        }))}
                        className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-indigo-400"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">Fully returned</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <p className="text-slate-400 text-xs mb-3">
                Returned items will be added back to inventory.
                {returnInvoice.status === 'credit' && ' Customer\'s outstanding balance will be reduced.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setReturnInvoice(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
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
                      description: `Processed return on ${returnInvoice.invoiceNo} for ${returnInvoice.customerName} — ${returns.length} item(s) returned`,
                    });
                    showFeedback({
                      title: 'Return Recorded',
                      message: `Return has been processed for ${returnInvoice.invoiceNo}.`,
                      buttonLabel: 'Continue',
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
                onClick={() => {
                  const inv = invoices.find((i) => i.invoiceNo === refundTarget);
                  refund(refundTarget);
                  if (currentUser && inv) writeLog(currentUser, {
                    category: 'sales', action: 'refund',
                    description: `Refunded sale ${inv.receiptNo ?? inv.invoiceNo} for ${inv.customerName} — ₵${inv.netSales.toFixed(2)} (${inv.paymentMethod})`,
                  });
                  showFeedback({
                    title: 'Sale Refunded',
                    message: `${inv?.invoiceNo ?? 'The sale'} has been marked as refunded.`,
                    buttonLabel: 'Continue',
                  });
                  setRefundTarget(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentReceipt && (
        <CreditPaymentReceiptModal
          receipt={paymentReceipt}
          onClose={() => setPaymentReceipt(null)}
        />
      )}

      {printReceiptInvoice?.receiptNo && (
        <ReceiptModal
          items={printReceiptInvoice.items.map((item) => ({
            id: item.productId,
            name: item.productName,
            price: item.unitPrice,
            costPrice: item.costPrice,
            qty: item.netQty,
            stock: item.netQty,
            image: '',
          }))}
          subtotal={printReceiptInvoice.netSales}
          tax={0}
          discountAmt={0}
          grandTotal={printReceiptInvoice.netSales}
          discount={0}
          receiptNo={printReceiptInvoice.receiptNo}
          paymentMethod={printReceiptInvoice.paymentMethod}
          customerName={printReceiptInvoice.customerName}
          onClose={() => setPrintReceiptInvoice(null)}
          onNewSale={() => setPrintReceiptInvoice(null)}
          newSaleLabel="Close"
        />
      )}
    </AppLayout>
  );
}
