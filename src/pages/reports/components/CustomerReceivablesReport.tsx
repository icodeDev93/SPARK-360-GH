import { useMemo } from 'react';
import { useSalesLog } from '@/hooks/useSalesLog';
import type { AnalyticsFilter } from '@/hooks/useAnalyticsFilter';

const fmt = (n: number) => `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return date;
  }
}

export default function CustomerReceivablesReport({ filter }: { filter: AnalyticsFilter }) {
  const { invoices } = useSalesLog();

  const creditInvoices = useMemo(
    () => invoices
      .filter((inv) => inv.balanceDue > 0.005)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [invoices]
  );

  const totals = useMemo(() => {
    const invoiceTotal = creditInvoices.reduce((sum, inv) => sum + inv.netSales, 0);
    const paidTotal = creditInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const outstandingTotal = creditInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    const customerCount = new Set(creditInvoices.map((inv) => inv.customerId || inv.customerName)).size;
    return { invoiceTotal, paidTotal, outstandingTotal, customerCount };
  }, [creditInvoices]);

  return (
    <div className="space-y-6" id="analytics-print-area">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Credit Invoices', value: String(creditInvoices.length), note: 'Outstanding invoices', icon: 'ri-file-list-3-line', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Customers', value: String(totals.customerCount), note: 'With receivables', icon: 'ri-user-heart-line', color: 'bg-violet-50 text-violet-600' },
          { label: 'Invoice Value', value: fmt(totals.invoiceTotal), note: 'Original credit total', icon: 'ri-bill-line', color: 'bg-amber-50 text-amber-600' },
          { label: 'Total Receivable', value: fmt(totals.outstandingTotal), note: 'Balance still unpaid', icon: 'ri-hand-coin-line', color: 'bg-rose-50 text-rose-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 ${card.color}`}>
              <i className={`${card.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{card.label}</p>
              <p className="text-slate-900 text-xl font-bold mt-0.5 font-mono">{card.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{card.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-slate-800 font-bold text-sm">Customer Receivables</h3>
            <p className="text-slate-400 text-xs mt-0.5">All open customer balances</p>
          </div>
          <span className="text-rose-600 font-bold font-mono text-sm">{fmt(totals.outstandingTotal)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Invoice No.', 'Date', 'Customer', 'Invoice Total', 'Amount Paid', 'Outstanding', 'Status'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {creditInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No customer receivables found for this date range
                  </td>
                </tr>
              ) : creditInvoices.map((inv, index) => (
                <tr key={inv.invoiceNo} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${index % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-5 py-3 text-slate-800 text-sm font-bold font-mono">{inv.invoiceNo}</td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3 text-slate-700 text-sm font-semibold">{inv.customerName}</td>
                  <td className="px-5 py-3 text-slate-700 text-sm font-mono">{fmt(inv.netSales)}</td>
                  <td className="px-5 py-3 text-emerald-600 text-sm font-mono">{fmt(inv.amountPaid)}</td>
                  <td className="px-5 py-3 text-rose-600 text-sm font-bold font-mono">{fmt(inv.balanceDue)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                      Credit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-5 py-3 text-slate-700 font-bold text-sm" colSpan={3}>Total</td>
                <td className="px-5 py-3 text-slate-800 font-bold text-sm font-mono">{fmt(totals.invoiceTotal)}</td>
                <td className="px-5 py-3 text-emerald-600 font-bold text-sm font-mono">{fmt(totals.paidTotal)}</td>
                <td className="px-5 py-3 text-rose-600 font-extrabold text-sm font-mono">{fmt(totals.outstandingTotal)}</td>
                <td className="px-5 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
