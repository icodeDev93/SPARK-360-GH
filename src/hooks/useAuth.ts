import { useState } from 'react';

export type UserRole = 'cashier' | 'manager' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
}

export const ROLE_USERS: AuthUser[] = [
  {
    id: 'u1',
    name: 'Store Admin',
    email: 'admin@spark360.com',
    role: 'admin',
    initials: 'SA',
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'u2',
    name: 'Kwame Mensah',
    email: 'manager@spark360.com',
    role: 'manager',
    initials: 'KM',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'u3',
    name: 'Ama Owusu',
    email: 'cashier@spark360.com',
    role: 'cashier',
    initials: 'AO',
    avatarColor: 'bg-amber-500',
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'settings', 'sales-history', 'users'],
  manager: ['dashboard', 'pos', 'customers', 'purchases', 'inventory', 'expenses', 'reports', 'sales-history'],
  cashier: ['pos', 'customers', 'sales-history'],
};

export const ROLE_LABELS: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin: { label: 'Administrator', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  manager: { label: 'Manager', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cashier: { label: 'Cashier', color: 'text-amber-700', bg: 'bg-amber-100' },
};

const AUTH_KEY = 'spark360_auth_user';

function loadUser(): AuthUser {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      const found = ROLE_USERS.find((u) => u.id === parsed.id);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return ROLE_USERS[0];
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser>(loadUser);

  const switchUser = (userId: string) => {
    const user = ROLE_USERS.find((u) => u.id === userId);
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      setCurrentUser(user);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return ROLE_PERMISSIONS[currentUser.role].includes(permission);
  };

  return { currentUser, switchUser, hasPermission, allUsers: ROLE_USERS };
}
