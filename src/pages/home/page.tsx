import AppLayout from '@/components/feature/AppLayout';
import KpiCard from './components/KpiCard';
import SalesChart from './components/SalesChart';
import StockAlerts from './components/StockAlerts';
import RecentTransactions from './components/RecentTransactions';
import { kpiData, recentItems } from '@/mocks/dashboard';

export default function DashboardPage() {
  return (
    <AppLayout>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Chart + Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3">
          <SalesChart />
        </div>
        <div className="lg:col-span-2">
          <StockAlerts />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mb-6">
        <RecentTransactions />
      </div>

      {/* Recently Added Items */}
      <div className="bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-800 font-bold text-base">Recently Added Items</h3>
          <button className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap">View Inventory</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recentItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer">
              <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover object-top" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-800 text-sm font-semibold truncate">{item.name}</p>
                <p className="text-slate-400 text-xs">{item.category}</p>
                <p className="text-indigo-600 text-sm font-bold font-mono mt-0.5">{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
