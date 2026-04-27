import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import { useAnalyticsFilter } from '@/hooks/useAnalyticsFilter';
import DateRangePicker from './components/DateRangePicker';
import ExportMenu from './components/ExportMenu';
import OverviewTab from './components/OverviewTab';
import ProductsTab from './components/ProductsTab';
import CustomersTab from './components/CustomersTab';
import ProfitTab from './components/ProfitTab';

type AnalyticsTab = 'overview' | 'products' | 'customers' | 'profit';

const TAB_CONFIG = [
  { key: 'overview', label: 'Overview', icon: 'ri-dashboard-3-line' },
  { key: 'products', label: 'Products', icon: 'ri-shopping-bag-3-line' },
  { key: 'customers', label: 'Customers', icon: 'ri-group-line' },
  { key: 'profit', label: 'Profit & Loss', icon: 'ri-coins-line' },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const filter = useAnalyticsFilter();

  return (
    <AppLayout>
      {/* Header Row: Tabs + Date Picker + Export */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 flex-shrink-0">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as AnalyticsTab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={`${t.icon} text-sm`}></i>
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date Range Picker + Export */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <DateRangePicker filter={filter} />
          <ExportMenu activeTab={tab} filter={filter} />
        </div>
      </div>

      {/* Active period badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-3 h-3 flex items-center justify-center"><i className="ri-calendar-line text-xs"></i></span>
          {filter.label}
          {filter.preset === 'custom' && filter.customFrom && (
            <span className="text-indigo-500 font-normal ml-1">
              {filter.customFrom}{filter.customTo ? ` → ${filter.customTo}` : ''}
            </span>
          )}
        </span>
        <span className="text-slate-400 text-xs">All data filtered to this period</span>
      </div>

      {tab === 'overview' && <OverviewTab filter={filter} />}
      {tab === 'products' && <ProductsTab filter={filter} />}
      {tab === 'customers' && <CustomersTab filter={filter} />}
      {tab === 'profit' && <ProfitTab filter={filter} />}
    </AppLayout>
  );
}