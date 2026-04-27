import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useSalesLog, SaleRecord } from '@/hooks/useSalesLog';

const PAYMENT_ICONS: Record<string, string> = {
  cash: 'ri-money-dollar-circle-line',
  mobile: 'ri-smartphone-line',
  card: 'ri-bank-card-line',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile: 'Mobile Money',
  card: 'Card',
};

export default function SalesHistoryPage() {
  const { sales, refundSale } = useSalesLog();
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'refunded'>('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = sales.filter((s) => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchPayment = filterPayment === 'all' || s.paymentMethod === filterPayment;
    const matchSearch =
      s.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cashier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchPayment && matchSearch;
  });

  const completedTotal = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const todayCount = sales.filter((s) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return s.date === today;
  }).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Sales History</h2>
          <p className="text-slate-400 text-sm mt-0.5">All completed POS transactions</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Transactions', value: String(sales.length), icon: 'ri-receipt-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Total Revenue', value: `₵${completedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: 'ri-funds-line', color: 'bg-emerald-50 text-emerald-600' },
          { label: "Today's Sales", value: String(todayCount), icon: 'ri-calendar-check-line', color: 'bg-amber-50 text-amber-600' },
          { label: 'Refunded', value: String(sales.filter((s) => s.status === 'refunded').length), icon: 'ri-refund-2-line', color: 'bg-red-50 text-red-500' },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="text"
            placeholder="Search receipt, cashier, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'completed', 'refunded'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap capitalize ${
                filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
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
            <option value="cash">Cash</option>
            <option value="mobile">Mobile Money</option>
            <option value="card">Card</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Receipt No.', 'Date & Time', 'Items', 'Cashier', 'Payment', 'Total', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 flex items-center justify-center text-3xl text-slate-300">
                        <i className="ri-receipt-line"></i>
                      </span>
                      <p className="text-slate-400 text-sm font-medium">No sales found</p>
                      <p className="text-slate-300 text-xs">Complete a sale on the POS screen to see it here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                    <td className="px-5 py-3.5">
                      <span className="text-indigo-600 font-bold text-sm font-mono">{sale.receiptNo}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700 text-sm font-semibold">{sale.date}</p>
                      <p className="text-slate-400 text-xs">{sale.time}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700 text-sm">
                        {sale.items.slice(0, 2).map((i) => i.name).join(', ')}
                        {sale.items.length > 2 && <span className="text-slate-400"> +{sale.items.length - 2} more</span>}
                      </p>
                      <p className="text-slate-400 text-xs">{sale.items.reduce((s, i) => s + i.qty, 0)} units</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-600 text-sm">{sale.cashier}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-slate-600 text-sm whitespace-nowrap">
                        <i className={`${PAYMENT_ICONS[sale.paymentMethod]} text-slate-400 text-sm`}></i>
                        {PAYMENT_LABELS[sale.paymentMethod]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-800 font-bold font-mono text-sm">
                        ₵{sale.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        sale.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        <i className={`${sale.status === 'completed' ? 'ri-checkbox-circle-line' : 'ri-refund-2-line'} text-xs`}></i>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          title="View details"
                        >
                          <i className="ri-eye-line text-sm"></i>
                        </button>
                        {sale.status === 'completed' && (
                          <button
                            onClick={() => setRefundTarget(sale.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                            title="Mark as refunded"
                          >
                            <i className="ri-refund-2-line text-sm"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">Sale Details</h2>
                <p className="text-indigo-600 text-xs font-bold font-mono mt-0.5">{selectedSale.receiptNo}</p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Date</p>
                  <p className="text-slate-700 font-semibold">{selectedSale.date}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Time</p>
                  <p className="text-slate-700 font-semibold">{selectedSale.time}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Cashier</p>
                  <p className="text-slate-700 font-semibold">{selectedSale.cashier}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Payment</p>
                  <p className="text-slate-700 font-semibold">{PAYMENT_LABELS[selectedSale.paymentMethod]}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-2">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <p className="text-slate-700 font-semibold">{item.name}</p>
                        <p className="text-slate-400 text-xs">₵{item.price.toFixed(2)} × {item.qty}</p>
                      </div>
                      <span className="text-slate-800 font-bold font-mono">₵{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₵{selectedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span className="font-mono">₵{selectedSale.tax.toFixed(2)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({selectedSale.discount}%)</span>
                    <span className="font-mono">-₵{selectedSale.discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-600 text-base">₵{selectedSale.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full ${
                  selectedSale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  <i className={`${selectedSale.status === 'completed' ? 'ri-checkbox-circle-fill' : 'ri-refund-2-line'} text-sm`}></i>
                  {selectedSale.status.charAt(0).toUpperCase() + selectedSale.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedSale(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirm */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-amber-100 rounded-xl mb-4">
              <i className="ri-refund-2-line text-amber-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Mark as Refunded?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This sale will be marked as refunded. The status change cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={() => { refundSale(refundTarget); setRefundTarget(null); }}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer whitespace-nowrap"
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
