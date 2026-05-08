import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_PERMISSIONS, type UserRole, useAuth } from '@/hooks/useAuth';

const PERMISSION_HOME: Record<string, string> = {
  dashboard: '/',
  pos: '/pos',
  customers: '/customers',
  purchases: '/purchases',
  inventory: '/inventory',
  expenses: '/expenses',
  reports: '/reports',
  settings: '/settings',
  'sales-history': '/sales-history',
  users: '/users',
};

function defaultPathForRole(role: UserRole) {
  const firstPermission = ROLE_PERMISSIONS[role][0];
  return PERMISSION_HOME[firstPermission] ?? '/pos';
}

export default function ProtectedRoute({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: string;
}) {
  const { currentUser, isAuthenticated, sessionLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
            <i className="ri-grid-fill text-white text-2xl"></i>
          </div>
          <i className="ri-loader-4-line animate-spin text-indigo-600 text-2xl"></i>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && currentUser && !hasPermission(permission)) {
    return <Navigate to={defaultPathForRole(currentUser.role)} replace />;
  }

  return <>{children}</>;
}
