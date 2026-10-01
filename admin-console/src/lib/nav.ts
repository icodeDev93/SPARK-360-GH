export type PageKey = 'dashboard' | 'approvals' | 'businesses' | 'users';

export const navItems: { key: PageKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { key: 'approvals', label: 'Approvals', icon: 'ri-shield-check-line' },
  { key: 'businesses', label: 'Businesses', icon: 'ri-building-4-line' },
  { key: 'users', label: 'Users', icon: 'ri-group-line' },
];
