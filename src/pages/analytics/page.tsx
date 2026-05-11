import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAnalyticsFilter } from '@/hooks/useAnalyticsFilter';
import DateRangePicker from './components/DateRangePicker';
import ExportMenu from './components/ExportMenu';
import OverviewTab from './components/OverviewTab';
import ProductsTab from './components/ProductsTab';
import CustomersTab from './components/CustomersTab';
import ProfitTab from './components/ProfitTab';
import SalesReport from '@/pages/reports/components/SalesReport';
import InventoryReport from '@/pages/reports/components/InventoryReport';

type AnalyticsTab =
  | 'overview'
  | 'sales'
  | 'top-products'
  | 'top-customers'
  | 'product-report'
  | 'customer-report'
  | 'stock-report'
  | 'profit';

const TAB_CONFIG = [
  { key: 'overview', label: 'Overview Report', icon: 'ri-dashboard-3-fill' },
  { key: 'sales', label: 'Sale Report', icon: 'ri-shopping-cart-2-fill' },
  { key: 'top-products', label: 'Top Products', icon: 'ri-star-fill' },
  { key: 'top-customers', label: 'Top Customers', icon: 'ri-group-fill' },
  { key: 'product-report', label: 'Product Report', icon: 'ri-archive-2-fill' },
  { key: 'customer-report', label: 'Customer Report', icon: 'ri-user-search-fill' },
  { key: 'stock-report', label: 'Stock Report', icon: 'ri-archive-drawer-fill' },
  { key: 'profit', label: 'Profit Loss Report', icon: 'ri-line-chart-fill' },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const filter = useAnalyticsFilter();

  return (
    <AppLayout>
      {/* Header Row: Date Picker + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-5">
        <div className="flex items-center gap-2 justify-end">
          <DateRangePicker filter={filter} />
          <ExportMenu activeTab={tab} filter={filter} />
        </div>
      </div>

      {/* Report Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as AnalyticsTab)}
            className={`min-h-[92px] rounded-xl border p-3 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
              tab === t.key
                ? 'bg-indigo-700 border-indigo-700 text-white shadow-md ring-2 ring-indigo-200'
                : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 shadow-sm'
            }`}
          >
            <span className="w-10 h-10 flex items-center justify-center text-white">
              <i className={`${t.icon} text-3xl`}></i>
            </span>
            <span className="text-xs font-semibold leading-snug max-w-[96px]">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Active period badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-3 h-3 flex items-center justify-center"><i className="ri-calendar-line text-xs"></i></span>
          {filter.label}
          {filter.preset === 'custom' && filter.customFrom && (
            <span className="text-indigo-500 font-normal ml-1">
              {filter.customFrom}{filter.customTo ? ` -> ${filter.customTo}` : ''}
            </span>
          )}
        </span>
        <span className="text-slate-400 text-xs">
          {tab === 'stock-report' ? 'Stock report uses the current inventory snapshot' : 'All data filtered to this period'}
        </span>
      </div>

      {tab === 'overview' && <OverviewTab filter={filter} />}
      {tab === 'sales' && <SalesReport filter={filter} />}
      {tab === 'top-products' && <ProductsTab filter={filter} variant="top" />}
      {tab === 'top-customers' && <CustomersTab filter={filter} variant="top" />}
      {tab === 'product-report' && <ProductsTab filter={filter} />}
      {tab === 'customer-report' && <CustomersTab filter={filter} />}
      {tab === 'stock-report' && <InventoryReport />}
      {tab === 'profit' && <ProfitTab filter={filter} />}
    </AppLayout>
  );
}
