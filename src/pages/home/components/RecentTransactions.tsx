import { recentTransactions } from '@/mocks/dashboard';

const statusStyle: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-600',
};

const methodIcon: Record<string, string> = {
  Cash: 'ri-money-dollar-circle-line',
  Card: 'ri-bank-card-line',
  'Mobile Money': 'ri-smartphone-line',
};

export default function RecentTransactions() {
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
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Invoice</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Date</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Method</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Amount</th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Status</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((tx, i) => (
              <tr key={tx.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                <td className="py-3.5 pr-4">
                  <span className="text-indigo-600 text-sm font-semibold font-mono">{tx.id}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-slate-700 text-sm font-medium">{tx.customer}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-slate-500 text-sm">{tx.date}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className={`${methodIcon[tx.method] || 'ri-money-dollar-circle-line'} text-sm`}></i>
                    </span>
                    <span>{tx.method}</span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-right">
                  <span className="text-slate-800 text-sm font-bold font-mono">{tx.amount}</span>
                </td>
                <td className="py-3.5 pr-4 text-center">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[tx.status] || 'bg-slate-100 text-slate-600'}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                      <i className="ri-eye-line text-sm"></i>
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                      <i className="ri-printer-line text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
