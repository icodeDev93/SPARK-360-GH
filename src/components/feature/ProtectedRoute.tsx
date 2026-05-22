import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_PERMISSIONS, type UserRole, useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';

const PERMISSION_HOME: Record<string, string> = {
  dashboard: '/',
  pos: '/pos',
  customers: '/customers',
  credit: '/credit',
  purchases: '/purchases',
  inventory: '/inventory',
  expenses: '/expenses',
  'bank-deposit': '/bank-deposit',
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
  adminOnly,
}: {
  children: ReactNode;
  permission?: string;
  adminOnly?: boolean;
}) {
  const { currentUser, isAuthenticated, sessionLoading, hasPermission } = useAuth();
  const { activeBusinessId, loading: businessLoading } = useBusiness();
  const location = useLocation();

  if (sessionLoading || (isAuthenticated && businessLoading)) {
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

  if (adminOnly && currentUser?.role !== 'owner') {
    return <Navigate to={defaultPathForRole(currentUser!.role)} replace />;
  }

  if (!activeBusinessId) {
    return <Navigate to="/businesses" state={{ from: location }} replace />;
  }

  if (permission && currentUser && !hasPermission(permission)) {
    return <Navigate to={defaultPathForRole(currentUser.role)} replace />;
  }

  return <>{children}</>;
}
