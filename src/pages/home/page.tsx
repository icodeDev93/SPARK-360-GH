import AppLayout from '@/components/feature/AppLayout';
import KpiCard from './components/KpiCard';
import SalesChart from './components/SalesChart';
import StockAlerts from './components/StockAlerts';
import RecentTransactions from './components/RecentTransactions';
import { useSalesLog } from '@/hooks/useSalesLog';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { useInventory } from '@/hooks/useInventory';
import { calcKpiSummary, calcMonthlyPerformance } from '@/services/dashboardService';

const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().split('T')[0];

const KPI_CONFIG = [
  { key: 'totalRevenue',   label: 'Total Revenue',   icon: 'ri-shopping-bag-3-line',        color: 'indigo' },
  { key: 'grossMargin',    label: 'Gross Margin',     icon: 'ri-line-chart-line',             color: 'emerald' },
  { key: 'totalExpenses',  label: 'Total Expenses',   icon: 'ri-money-dollar-circle-line',    color: 'amber' },
  { key: 'netProfit',      label: 'Net Profit',       icon: 'ri-funds-line',                  color: 'violet' },
] as const;

function fmt(val: number) {
  return `₵${val.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { invoices } = useSalesLog();
  const { expenses } = useExpenses();
  const { currentUser } = useAuth();
  const { items: inventoryItems } = useInventory();

  const isAttendant = currentUser?.role === 'cashier';

  // Attendants see only their own sales for today; DB data is untouched
  const scopedInvoices = isAttendant
    ? invoices.filter((inv) => inv.date === TODAY && inv.cashier === currentUser?.name)
    : invoices;
  const scopedExpenses = isAttendant ? [] : expenses;

  const kpi = calcKpiSummary(inventoryItems, scopedInvoices, scopedExpenses);
  const monthlyData = calcMonthlyPerformance(scopedInvoices, scopedExpenses, CURRENT_YEAR);
  const recentInvoices = scopedInvoices.slice(0, 6);
  const recentItems = inventoryItems.slice(0, 4);

  return (
    <AppLayout>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPI_CONFIG.map(({ key, label, icon, color }) => (
          <KpiCard
            key={key}
            label={label}
            value={fmt(kpi[key])}
            icon={icon}
            color={color}
          />
        ))}
      </div>

      {/* Stock Value banner */}
      <div className="bg-indigo-600 text-white rounded-xl px-6 py-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="ri-archive-stack-line text-lg"></i>
          <span className="text-sm font-semibold">Total Stock Value</span>
        </div>
        <span className="text-xl font-bold font-mono">{fmt(kpi.totalStockValue)}</span>
      </div>

      {/* Chart + Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3">
          <SalesChart data={monthlyData} />
        </div>
        <div className="lg:col-span-2">
          <StockAlerts />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mb-6">
        <RecentTransactions invoices={recentInvoices} />
      </div>

      {/* Recently Added Items */}
      <div className="bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-800 font-bold text-base">Recently Added Items</h3>
          <button className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap">
            View Inventory
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recentItems.map((item) => (
            <div
              key={item.itemId}
              className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <i className="ri-box-3-line text-xl text-slate-400"></i>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-slate-800 text-sm font-semibold truncate">{item.productName}</p>
                <p className="text-slate-400 text-xs">{item.category}</p>
                <p className="text-indigo-600 text-sm font-bold font-mono mt-0.5">
                  ₵{item.sellingPrice.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
