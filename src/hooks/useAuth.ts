import { createContext, useContext, useState, useEffect, createElement, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { writeLog } from '@/lib/activityLog';

export type UserRole = 'cashier' | 'manager' | 'admin';

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
  permissionOverrides: PermissionOverrides;
}

const ADMIN_PERMISSIONS = [
  'dashboard', 'pos', 'customers', 'purchases', 'inventory',
  'expenses', 'reports', 'settings', 'sales-history', 'users',
];

// Static fallback used while Supabase loads (and for display in users/page.tsx)
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ADMIN_PERMISSIONS,
  manager: ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'sales-history'],
  cashier: ['pos', 'customers', 'sales-history'],
};

export const ROLE_LABELS: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin:   { label: 'Administrator', color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  manager: { label: 'Manager',       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cashier: { label: 'Attendant',     color: 'text-amber-700',   bg: 'bg-amber-100' },
};

// All configurable permissions (used in Settings Role Permissions section)
export const ALL_PERMISSIONS = [
  { key: 'dashboard',     label: 'Dashboard',           icon: 'ri-dashboard-3-line' },
  { key: 'pos',           label: 'Sales (POS)',          icon: 'ri-shopping-cart-2-line' },
  { key: 'sales-history', label: 'Sales History',        icon: 'ri-receipt-line' },
  { key: 'customers',     label: 'Customers',            icon: 'ri-group-line' },
  { key: 'purchases',     label: 'Purchases & Supplies', icon: 'ri-store-3-line' },
  { key: 'inventory',     label: 'Inventory',            icon: 'ri-archive-drawer-line' },
  { key: 'expenses',      label: 'Expenses',             icon: 'ri-wallet-3-line' },
  { key: 'reports',       label: 'Analytics & Reports',  icon: 'ri-pie-chart-2-line' },
  { key: 'users',         label: 'User Management',      icon: 'ri-user-settings-line' },
  { key: 'settings',      label: 'Settings',             icon: 'ri-settings-3-line' },
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
    role:                r.role as UserRole,
    initials:            r.initials as string,
    avatarColor:         r.avatar_color as string,
    avatarUrl:           (r.avatar_url as string | null | undefined) ?? null,
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

  // Load dynamic permissions from Supabase + subscribe to real-time changes
  useEffect(() => {
    supabase.from('role_permissions').select('role, permissions').then(({ data }) => {
      if (data?.length) {
        const perms = { ...DEFAULT_DYNAMIC };
        data.forEach((row: { role: string; permissions: string[] }) => {
          if (row.role === 'manager' || row.role === 'cashier') {
            perms[row.role] = row.permissions;
          }
        });
        setRolePermissions(perms);
      }
    });

    const channel = supabase
      .channel('role_permissions_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        (payload) => {
          const row = payload.new as { role: string; permissions: string[] };
          if (row?.role === 'manager' || row?.role === 'cashier') {
            setRolePermissions((prev) => ({ ...prev, [row.role]: row.permissions }));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Subscribe to own profile changes (e.g. admin updates permission overrides)
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
          if (profile) setCurrentUser(mapRow(profile));
        }
      } finally {
        setSessionLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError || !authData.user) {
        const msg = authError?.message ?? '';
        if (msg.toLowerCase().includes('not confirmed') || msg.toLowerCase().includes('email_not_confirmed')) {
          return { success: false, error: 'Your account is not confirmed. Ask your administrator to confirm it in Supabase.' };
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
        return { success: false, error: 'No profile found for this account. Ask your administrator to create one in the profiles table.' };
      }

      const user = mapRow(profile);
      setCurrentUser(user);
      writeLog(user, { category: 'auth', action: 'login', description: `${user.name} (${ROLE_LABELS[user.role].label}) logged in` });
      return { success: true };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser) {
      await writeLog(currentUser, { category: 'auth', action: 'logout', description: `${currentUser.name} (${ROLE_LABELS[currentUser.role].label}) logged out` });
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const updateAvatar = async (avatarUrl: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('update_own_profile_avatar', {
      next_avatar_url: avatarUrl,
    });
    if (error) return { success: false, error: error.message };
    if (data) setCurrentUser(mapRow(data as Record<string, unknown>));
    return { success: true };
  };

  const updatePassword = async (nextPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'No active user session.' };
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
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
