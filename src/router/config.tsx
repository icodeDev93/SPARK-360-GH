import { RouteObject } from 'react-router-dom';
import DashboardPage from '@/pages/home/page';
import POSPage from '@/pages/pos/page';
import InventoryPage from '@/pages/inventory/page';
import PurchasesPage from '@/pages/purchases/page';
import CustomersPage from '@/pages/customers/page';
import ReportsPage from '@/pages/reports/page';
import AnalyticsPage from '@/pages/analytics/page';
import SettingsPage from '@/pages/settings/page';
import ExpensesPage from '@/pages/expenses/page';
import SalesHistoryPage from '@/pages/sales-history/page';
import SuppliersPage from '@/pages/suppliers/page';
import UsersPage from '@/pages/users/page';
import NotFound from '@/pages/NotFound';

const routes: RouteObject[] = [
  { path: '/', element: <DashboardPage /> },
  { path: '/pos', element: <POSPage /> },
  { path: '/sales-history', element: <SalesHistoryPage /> },
  { path: '/inventory', element: <InventoryPage /> },
  { path: '/purchases', element: <PurchasesPage /> },
  { path: '/suppliers', element: <SuppliersPage /> },
  { path: '/customers', element: <CustomersPage /> },
  { path: '/expenses', element: <ExpensesPage /> },
  { path: '/reports', element: <ReportsPage /> },
  { path: '/analytics', element: <AnalyticsPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/users', element: <UsersPage /> },
  { path: '*', element: <NotFound /> },
];

export default routes;
