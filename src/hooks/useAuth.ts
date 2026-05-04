import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'cashier' | 'manager' | 'admin';

export interface AuthUser {
  id: string; name: string; email: string; role: UserRole;
  initials: string; avatarColor: string;
}

const DEFAULT_USERS: AuthUser[] = [
  { id: 'u1', name: 'Store Admin',   email: 'admin@spark360.com',   role: 'admin',    initials: 'SA', avatarColor: 'bg-indigo-600' },
  { id: 'u2', name: 'Kwame Mensah',  email: 'manager@spark360.com', role: 'manager',  initials: 'KM', avatarColor: 'bg-emerald-600' },
  { id: 'u3', name: 'Ama Owusu',     email: 'cashier@spark360.com', role: 'cashier',  initials: 'AO', avatarColor: 'bg-amber-500' },
];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'settings', 'sales-history', 'users'],
  manager: ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'sales-history'],
  cashier: ['pos', 'customers', 'sales-history'],
};

export const ROLE_LABELS: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin:   { label: 'Administrator', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  manager: { label: 'Manager',       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cashier: { label: 'Cashier',       color: 'text-amber-700',  bg: 'bg-amber-100' },
};

// Keep ROLE_USERS export for backward compatibility
export const ROLE_USERS = DEFAULT_USERS;

const AUTH_KEY = 'spark360_auth_user';

function loadStoredUser(): AuthUser {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      if (parsed.id) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_USERS[0];
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser>(loadStoredUser);
  const [allUsers, setAllUsers] = useState<AuthUser[]>(DEFAULT_USERS);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('users').select('*').order('name');
      if (error) { console.error(error); return; }

      if (!data || data.length === 0) {
        await supabase.from('users').insert(DEFAULT_USERS.map((u) => ({
          id: u.id, name: u.name, email: u.email, role: u.role,
          initials: u.initials, avatar_color: u.avatarColor,
        })));
      } else {
        const loaded: AuthUser[] = data.map((r) => ({
          id: r.id, name: r.name, email: r.email, role: r.role as UserRole,
          initials: r.initials, avatarColor: r.avatar_color,
        }));
        setAllUsers(loaded);
        // Refresh current user from DB in case their details changed
        const refreshed = loaded.find((u) => u.id === currentUser.id);
        if (refreshed) {
          setCurrentUser(refreshed);
          localStorage.setItem(AUTH_KEY, JSON.stringify(refreshed));
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchUser = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      setCurrentUser(user);
    }
  };

  const hasPermission = (permission: string): boolean =>
    ROLE_PERMISSIONS[currentUser.role].includes(permission);

  return { currentUser, switchUser, hasPermission, allUsers };
}
