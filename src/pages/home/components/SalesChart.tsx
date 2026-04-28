import type { MonthlyPerformance } from '@/types/erp';

interface SalesChartProps {
  data: MonthlyPerformance[];
}

export default function SalesChart({ data }: SalesChartProps) {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);

  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-slate-800 font-bold text-base">Monthly Performance</h3>
          <p className="text-slate-400 text-xs mt-0.5">Income vs Expenses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-500"></span>
            <span className="text-xs text-slate-500">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400"></span>
            <span className="text-xs text-slate-500">Expenses</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 h-48">
        {data.map((d) => {
          const incomeH = Math.round((d.income / maxVal) * 100);
          const expenseH = Math.round((d.expenses / maxVal) * 100);
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-1 h-40">
                <div
                  className="flex-1 bg-indigo-500 rounded-t-md transition-all duration-500 hover:bg-indigo-600 cursor-pointer relative group"
                  style={{ height: `${incomeH}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    ₵{(d.income / 1000).toFixed(1)}k
                  </div>
                </div>
                <div
                  className="flex-1 bg-amber-400 rounded-t-md transition-all duration-500 hover:bg-amber-500 cursor-pointer relative group"
                  style={{ height: `${expenseH}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    ₵{(d.expenses / 1000).toFixed(1)}k
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
