import { monthlyChart } from '@/mocks/dashboard';

export default function SalesChart() {
  const maxVal = Math.max(...monthlyChart.flatMap((d) => [d.sales, d.purchases]));

  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-slate-800 font-bold text-base">Monthly Performance</h3>
          <p className="text-slate-400 text-xs mt-0.5">Sales vs Purchases comparison</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-500"></span>
            <span className="text-xs text-slate-500">Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-300"></span>
            <span className="text-xs text-slate-500">Purchases</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 h-48">
        {monthlyChart.map((d) => {
          const salesH = Math.round((d.sales / maxVal) * 100);
          const purchH = Math.round((d.purchases / maxVal) * 100);
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-1 h-40">
                <div
                  className="flex-1 bg-indigo-500 rounded-t-md transition-all duration-500 hover:bg-indigo-600 cursor-pointer relative group"
                  style={{ height: `${salesH}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    ₵{(d.sales / 1000).toFixed(1)}k
                  </div>
                </div>
                <div
                  className="flex-1 bg-slate-200 rounded-t-md transition-all duration-500 hover:bg-slate-300 cursor-pointer relative group"
                  style={{ height: `${purchH}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    ₵{(d.purchases / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
