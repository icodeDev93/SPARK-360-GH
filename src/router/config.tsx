import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import ProtectedRoute from '@/components/feature/ProtectedRoute';
import RouteSuspense from './RouteSuspense';

const DashboardPage = lazy(() => import('@/pages/home/page'));
const POSPage = lazy(() => import('@/pages/pos/page'));
const InventoryPage = lazy(() => import('@/pages/inventory/page'));
const PurchasesPage = lazy(() => import('@/pages/purchases/page'));
const CustomersPage = lazy(() => import('@/pages/customers/page'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/page'));
const SettingsPage = lazy(() => import('@/pages/settings/page'));
const ExpensesPage = lazy(() => import('@/pages/expenses/page'));
const BankDepositPage = lazy(() => import('@/pages/bank-deposit/page'));
const SalesHistoryPage = lazy(() => import('@/pages/sales-history/page'));
const SuppliersPage = lazy(() => import('@/pages/suppliers/page'));
const CreditPage = lazy(() => import('@/pages/credit/page'));
const UsersPage = lazy(() => import('@/pages/users/page'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const LoginPage = lazy(() => import('@/pages/login/page'));
const RegisterPage = lazy(() => import('@/pages/register/page'));
const LogsPage = lazy(() => import('@/pages/logs/page'));
const BusinessSelectPage = lazy(() => import('@/pages/business-select/page'));
const StockTransferPage = lazy(() => import('@/pages/stock-transfer/page'));

const routes: RouteObject[] = [
  { path: '/login', element: <RouteSuspense><LoginPage /></RouteSuspense> },
  { path: '/register', element: <RouteSuspense><RegisterPage /></RouteSuspense> },
  { path: '/businesses', element: <RouteSuspense><BusinessSelectPage /></RouteSuspense> },
  { path: '/', element: <RouteSuspense><ProtectedRoute permission="dashboard"><DashboardPage /></ProtectedRoute></RouteSuspense> },
  { path: '/pos', element: <RouteSuspense><ProtectedRoute permission="pos"><POSPage /></ProtectedRoute></RouteSuspense> },
  { path: '/sales-history', element: <RouteSuspense><ProtectedRoute permission="sales-history"><SalesHistoryPage /></ProtectedRoute></RouteSuspense> },
  { path: '/inventory', element: <RouteSuspense><ProtectedRoute permission="inventory"><InventoryPage /></ProtectedRoute></RouteSuspense> },
  { path: '/purchases', element: <RouteSuspense><ProtectedRoute permission="purchases"><PurchasesPage /></ProtectedRoute></RouteSuspense> },
  { path: '/suppliers', element: <RouteSuspense><ProtectedRoute permission="purchases"><SuppliersPage /></ProtectedRoute></RouteSuspense> },
  { path: '/customers', element: <RouteSuspense><ProtectedRoute permission="customers"><CustomersPage /></ProtectedRoute></RouteSuspense> },
  { path: '/credit', element: <RouteSuspense><ProtectedRoute permission="credit"><CreditPage /></ProtectedRoute></RouteSuspense> },
  { path: '/expenses', element: <RouteSuspense><ProtectedRoute permission="expenses"><ExpensesPage /></ProtectedRoute></RouteSuspense> },
  { path: '/bank-deposit', element: <RouteSuspense><ProtectedRoute permission="bank-deposit"><BankDepositPage /></ProtectedRoute></RouteSuspense> },
  { path: '/stock-transfer', element: <RouteSuspense><ProtectedRoute permission="stock-transfer"><StockTransferPage /></ProtectedRoute></RouteSuspense> },
  { path: '/reports', element: <RouteSuspense><ProtectedRoute permission="reports"><Navigate to="/analytics" replace /></ProtectedRoute></RouteSuspense> },
  { path: '/analytics', element: <RouteSuspense><ProtectedRoute permission="reports"><AnalyticsPage /></ProtectedRoute></RouteSuspense> },
  { path: '/settings', element: <RouteSuspense><ProtectedRoute permission="settings"><SettingsPage /></ProtectedRoute></RouteSuspense> },
  { path: '/users', element: <RouteSuspense><ProtectedRoute permission="users"><UsersPage /></ProtectedRoute></RouteSuspense> },
  { path: '/logs', element: <RouteSuspense><ProtectedRoute permission="logs"><LogsPage /></ProtectedRoute></RouteSuspense> },
  { path: '*', element: <RouteSuspense><NotFound /></RouteSuspense> },
];

export default routes;
