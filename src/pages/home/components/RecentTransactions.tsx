import type { InvoiceRecord } from '@/types/erp';

interface RecentTransactionsProps {
  invoices: InvoiceRecord[];
}

const statusStyle: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  refunded:  'bg-red-100 text-red-600',
};

const methodIcon: Record<string, string> = {
  Cash:           'ri-money-dollar-circle-line',
  MoMo:           'ri-smartphone-line',
  Cheque:         'ri-draft-line',
  'Bank Transfer':'ri-bank-line',
};

export default function RecentTransactions({ invoices }: RecentTransactionsProps) {
  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-bold text-base">Recent Transactions</h3>
        <button className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap">View All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Receipt No.</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Date</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Method</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Net Sales</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Margin</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv.invoiceNo} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                <td className="py-3.5 pr-4">
                  <span className="text-indigo-600 text-sm font-semibold font-mono">{inv.receiptNo}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <div>
                    <p className="text-slate-700 text-sm font-medium">{inv.customerName}</p>
                    <p className="text-slate-400 text-xs">{inv.cashier}</p>
                  </div>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-slate-500 text-sm">{inv.date}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <i className={`${methodIcon[inv.paymentMethod] ?? 'ri-money-dollar-circle-line'} text-sm`}></i>
                    <span>{inv.paymentMethod}</span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-right">
                  <span className="text-slate-800 text-sm font-bold font-mono">
                    ₵{inv.netSales.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-right">
                  <span className="text-emerald-600 text-sm font-semibold font-mono">
                    ₵{inv.grossMargin.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="py-3.5 text-center">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
