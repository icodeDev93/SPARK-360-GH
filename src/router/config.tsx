import { Navigate, RouteObject } from 'react-router-dom';
import DashboardPage from '@/pages/home/page';
import POSPage from '@/pages/pos/page';
import InventoryPage from '@/pages/inventory/page';
import PurchasesPage from '@/pages/purchases/page';
import CustomersPage from '@/pages/customers/page';
import AnalyticsPage from '@/pages/analytics/page';
import SettingsPage from '@/pages/settings/page';
import ExpensesPage from '@/pages/expenses/page';
import SalesHistoryPage from '@/pages/sales-history/page';
import SuppliersPage from '@/pages/suppliers/page';
import UsersPage from '@/pages/users/page';
import NotFound from '@/pages/NotFound';
import LoginPage from '@/pages/login/page';
import ProtectedRoute from '@/components/feature/ProtectedRoute';

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/',              element: <ProtectedRoute permission="dashboard"><DashboardPage /></ProtectedRoute> },
  { path: '/pos',           element: <ProtectedRoute permission="pos"><POSPage /></ProtectedRoute> },
  { path: '/sales-history', element: <ProtectedRoute permission="sales-history"><SalesHistoryPage /></ProtectedRoute> },
  { path: '/inventory',     element: <ProtectedRoute permission="inventory"><InventoryPage /></ProtectedRoute> },
  { path: '/purchases',     element: <ProtectedRoute permission="purchases"><PurchasesPage /></ProtectedRoute> },
  { path: '/suppliers',     element: <ProtectedRoute permission="purchases"><SuppliersPage /></ProtectedRoute> },
  { path: '/customers',     element: <ProtectedRoute permission="customers"><CustomersPage /></ProtectedRoute> },
  { path: '/expenses',      element: <ProtectedRoute permission="expenses"><ExpensesPage /></ProtectedRoute> },
  { path: '/reports',       element: <ProtectedRoute permission="reports"><Navigate to="/analytics" replace /></ProtectedRoute> },
  { path: '/analytics',     element: <ProtectedRoute permission="reports"><AnalyticsPage /></ProtectedRoute> },
  { path: '/settings',      element: <ProtectedRoute permission="settings"><SettingsPage /></ProtectedRoute> },
  { path: '/users',         element: <ProtectedRoute permission="users"><UsersPage /></ProtectedRoute> },
  { path: '*', element: <NotFound /> },
];

export default routes;
