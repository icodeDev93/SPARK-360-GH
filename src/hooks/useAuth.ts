import { createContext, useContext, useState, useEffect, createElement, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'cashier' | 'manager' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
  avatarUrl: string | null;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'settings', 'sales-history', 'users'],
  manager: ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'sales-history'],
  cashier: ['pos', 'customers', 'sales-history'],
};

export const ROLE_LABELS: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin:   { label: 'Administrator', color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  manager: { label: 'Manager',       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cashier: { label: 'Cashier',       color: 'text-amber-700',   bg: 'bg-amber-100' },
};

// Kept for backward compatibility with any component that imports it.
export const ROLE_USERS: AuthUser[] = [];

function mapRow(r: Record<string, unknown>): AuthUser {
  return {
    id:          r.id as string,
    name:        r.name as string,
    email:       r.email as string,
    role:        r.role as UserRole,
    initials:    r.initials as string,
    avatarColor: r.avatar_color as string,
    avatarUrl:   (r.avatar_url as string | null | undefined) ?? null,
  };
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (nextPassword: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // On mount: restore session from sessionStorage (survives page refresh, not tab close).
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

      // Look up profile by auth UUID — works regardless of email format.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return { success: false, error: 'No profile found for this account. Ask your administrator to create one in the profiles table.' };
      }

      setCurrentUser(mapRow(profile));
      return { success: true };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
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
    return ROLE_PERMISSIONS[currentUser.role].includes(permission);
  };

  return createElement(
    AuthContext.Provider,
    {
      value: {
        currentUser,
        isAuthenticated: currentUser !== null,
        sessionLoading,
        authLoading,
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
