import { createContext, useContext, useState, useEffect, useRef, createElement, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { writeLog } from '@/lib/activityLog';
import { sanitizeUrl } from '@/lib/sanitize';
import { isNetworkError } from '@/lib/localCache';
import { getStoredActiveBusinessId, setStoredActiveBusinessId } from '@/lib/businessScope';

export type UserRole = 'cashier' | 'manager' | 'owner';

export interface PermissionOverrides {
  granted: string[];
  revoked: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
  avatarUrl: string | null;
  primaryBusinessId: string | null;
  businessAccess: 'all' | 'assigned';
  permissionOverrides: PermissionOverrides;
}

const ADMIN_PERMISSIONS = [
  'dashboard', 'pos', 'sales-history', 'customers', 'credit',
  'purchases', 'inventory', 'expenses', 'bank-deposit',
  'stock-transfer', 'reports', 'settings', 'users', 'logs',
];

// Static fallback used while Supabase loads (and for display in users/page.tsx)
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner:   ADMIN_PERMISSIONS,
  manager: ['dashboard', 'pos', 'sales-history', 'customers', 'credit', 'purchases', 'inventory', 'expenses', 'bank-deposit', 'stock-transfer', 'reports'],
  cashier: ['pos', 'sales-history', 'customers', 'credit'],
};

export const ROLE_LABELS: Record<UserRole, { label: string; color: string; bg: string }> = {
  owner:   { label: 'Owner', color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  manager: { label: 'Manager',       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cashier: { label: 'Attendant',     color: 'text-amber-700',   bg: 'bg-amber-100' },
};

// All configurable permissions (used in Settings Role Permissions section)
export const ALL_PERMISSIONS = [
  { key: 'dashboard',     label: 'Dashboard',           icon: 'ri-dashboard-3-line' },
  { key: 'pos',           label: 'Sales (POS)',          icon: 'ri-shopping-cart-2-line' },
  { key: 'sales-history', label: 'Sales History',        icon: 'ri-receipt-line' },
  { key: 'customers',     label: 'Customers',            icon: 'ri-group-line' },
  { key: 'credit',        label: 'Credit Invoices',      icon: 'ri-hand-coin-line' },
  { key: 'purchases',     label: 'Purchases & Supplies', icon: 'ri-store-3-line' },
  { key: 'inventory',     label: 'Inventory',            icon: 'ri-archive-drawer-line' },
  { key: 'expenses',      label: 'Expenses',             icon: 'ri-wallet-3-line' },
  { key: 'bank-deposit',  label: 'Bank Deposit',         icon: 'ri-bank-card-line' },
  { key: 'stock-transfer', label: 'Stock Transfer',       icon: 'ri-arrow-left-right-line' },
  { key: 'reports',       label: 'Analytics & Reports',  icon: 'ri-pie-chart-2-line' },
  { key: 'users',         label: 'User Management',      icon: 'ri-user-settings-line' },
  { key: 'settings',      label: 'Settings',             icon: 'ri-settings-3-line' },
  { key: 'logs',          label: 'Activity Log',         icon: 'ri-file-list-3-line' },
] as const;

export const ROLE_USERS: AuthUser[] = [];

export type DynamicPermissions = Record<'manager' | 'cashier', string[]>;

const DEFAULT_DYNAMIC: DynamicPermissions = {
  manager: ROLE_PERMISSIONS.manager,
  cashier: ROLE_PERMISSIONS.cashier,
};

function mapRow(r: Record<string, unknown>): AuthUser {
  const raw = r.permission_overrides as PermissionOverrides | null | undefined;
  return {
    id:                  r.id as string,
    name:                r.name as string,
    email:               r.email as string,
    role:                (r.role === 'admin' ? 'owner' : r.role) as UserRole,
    initials:            r.initials as string,
    avatarColor:         r.avatar_color as string,
    avatarUrl:           (r.avatar_url as string | null | undefined) ?? null,
    primaryBusinessId:   (r.primary_business_id as string | null | undefined) ?? null,
    businessAccess:      ((r.business_access as string | null | undefined) === 'all' ? 'all' : 'assigned'),
    permissionOverrides: { granted: raw?.granted ?? [], revoked: raw?.revoked ?? [] },
  };
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  authLoading: boolean;
  rolePermissions: DynamicPermissions;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (nextPassword: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser]       = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading]       = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<DynamicPermissions>(DEFAULT_DYNAMIC);
  const [permissionBusinessId, setPermissionBusinessId] = useState<string | null>(() => getStoredActiveBusinessId());

  useEffect(() => {
    const onBusinessChanged = (event: Event) => {
      setPermissionBusinessId((event as CustomEvent<string | null>).detail ?? null);
    };
    window.addEventListener('bizzyapp:business-changed', onBusinessChanged);
    return () => window.removeEventListener('bizzyapp:business-changed', onBusinessChanged);
  }, []);

  // Load permissions for the selected business and subscribe only to that tenant.
  useEffect(() => {
    if (!currentUser || !permissionBusinessId) {
      setRolePermissions(DEFAULT_DYNAMIC);
      return undefined;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('business_role_permissions')
          .select('role, permissions')
          .eq('business_id', permissionBusinessId);
        if (data?.length) {
          const perms = { ...DEFAULT_DYNAMIC };
          data.forEach((row: { role: string; permissions: string[] }) => {
            if (row.role === 'manager' || row.role === 'cashier') {
              perms[row.role] = row.permissions;
            }
          });
          setRolePermissions(perms);
        }
      } catch (error) {
        console.warn('Unable to load role permissions from Supabase.', error);
      }
    })();

    const channel = supabase
      .channel(`role_permissions_${permissionBusinessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_role_permissions', filter: `business_id=eq.${permissionBusinessId}` },
        (payload) => {
          const row = payload.new as { role: string; permissions: string[] };
          if (row?.role === 'manager' || row?.role === 'cashier') {
            setRolePermissions((prev) => ({ ...prev, [row.role]: row.permissions }));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, permissionBusinessId]);

  // Subscribe to own profile changes (e.g. owner updates permission overrides)
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`profile_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` },
        (payload) => { setCurrentUser(mapRow(payload.new as Record<string, unknown>)); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            const user = mapRow(profile);
            setCurrentUser(user);
          }
        }
      } catch (error) {
        console.warn('Using cached auth profile because Supabase session restore failed.', error);
      } finally {
        setSessionLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    setAuthLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError || !authData.user) {
        const msg = authError?.message ?? '';
        if (msg.toLowerCase().includes('not confirmed') || msg.toLowerCase().includes('email_not_confirmed')) {
          return { success: false, error: 'Your account is not confirmed. Ask the owner to confirm it in Supabase.' };
        }
        return { success: false, error: msg || 'Invalid email or password.' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return { success: false, error: 'No profile found for this account. Ask the owner to create one in the profiles table.' };
      }

      const user = mapRow(profile);

      if (user.role === 'cashier') {
        let hasActiveBusiness = false;
        let accessFailed = false;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const { data: accessible, error: accessError } = await supabase.rpc('get_accessible_businesses');
          accessFailed = Boolean(accessError);
          hasActiveBusiness = !accessError && Boolean(user.primaryBusinessId)
            && Array.isArray(accessible)
            && accessible.some((row: { id: string; status: string }) => row.id === user.primaryBusinessId && row.status === 'active');
          if (hasActiveBusiness) break;
          if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 450));
        }
        if (!hasActiveBusiness) {
          await supabase.auth.signOut();
          return { success: false, error: accessFailed
            ? 'Unable to verify business access right now. Check your connection and try again.'
            : 'You are not assigned to an active business. Ask your business owner to check your Assigned Business in Edit User.' };
        }
      }

      setCurrentUser(user);
      if (user.role !== 'cashier') setStoredActiveBusinessId(null);
      writeLog(user, { category: 'auth', action: 'login', description: `${user.name} (${ROLE_LABELS[user.role].label}) logged in` });
      return { success: true };
    } catch (error) {
      return { success: false, error: isNetworkError(error) ? 'No internet connection. Connect to the internet and try again.' : error instanceof Error ? error.message : 'Login failed.' };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser) {
      await writeLog(currentUser, { category: 'auth', action: 'logout', description: `${currentUser.name} (${ROLE_LABELS[currentUser.role].label}) logged out` });
    }
    await supabase.auth.signOut().catch((error) => {
      console.warn('Unable to sign out from Supabase. Local session was cleared.', error);
    });
    setStoredActiveBusinessId(null);
    setCurrentUser(null);
  };

  // 30-minute inactivity auto-logout
  const logoutRef = useRef(logout);
  useEffect(() => { logoutRef.current = logout; });

  useEffect(() => {
    if (!currentUser) return;
    const TIMEOUT = 30 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logoutRef.current(), TIMEOUT);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [currentUser]);

  const updateAvatar = async (avatarUrl: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('update_own_profile_avatar', {
      next_avatar_url: sanitizeUrl(avatarUrl),
    });
    if (error) return { success: false, error: error.message };
    if (data) {
      const user = mapRow(data as Record<string, unknown>);
      setCurrentUser(user);
    }
    return { success: true };
  };

  const updatePassword = async (nextPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'No active user session.' };
    if (nextPassword.length < 10) return { success: false, error: 'Password must be at least 10 characters.' };
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'owner') return true;
    const { granted, revoked } = currentUser.permissionOverrides;
    if (revoked.includes(permission)) return false;
    if (granted.includes(permission)) return true;
    return rolePermissions[currentUser.role as 'manager' | 'cashier']?.includes(permission) ?? false;
  };

  return createElement(
    AuthContext.Provider,
    {
      value: {
        currentUser,
        isAuthenticated: currentUser !== null,
        sessionLoading,
        authLoading,
        rolePermissions,
        login,
        logout,
        updateAvatar,
        updatePassword,
        hasPermission,
      },
    },
    children,
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
