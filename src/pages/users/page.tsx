import { useState } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import type { UserRole } from '@/hooks/useAuth';
import { ROLE_LABELS, ROLE_USERS } from '@/hooks/useAuth';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
  status: 'Active' | 'Inactive';
}

const AVATAR_COLORS = [
  'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-600', 'bg-cyan-600', 'bg-orange-500',
];

const SEED_USERS: AppUser[] = ROLE_USERS.map((u, i) => ({
  ...u,
  status: 'Active',
  avatarColor: u.avatarColor || AVATAR_COLORS[i % AVATAR_COLORS.length],
}));

const USERS_KEY = 'spark360_app_users';

function loadUsers(): AppUser[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppUser[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const EMPTY_FORM = { name: '', email: '', role: 'cashier' as UserRole, status: 'Active' as 'Active' | 'Inactive' };

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>(loadUsers);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');

  const save = (next: AppUser[]) => {
    setUsers(next);
    localStorage.setItem(USERS_KEY, JSON.stringify(next));
  };

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setErrors({}); setShowForm(true); };
  const openEdit = (u: AppUser) => { setEditTarget(u); setForm({ name: u.name, email: u.email, role: u.role, status: u.status }); setErrors({}); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editTarget) {
      save(users.map((u) => u.id === editTarget.id
        ? { ...u, name: form.name, email: form.email, role: form.role, status: form.status, initials: getInitials(form.name) }
        : u
      ));
    } else {
      const colorIdx = users.length % AVATAR_COLORS.length;
      const newUser: AppUser = {
        id: `u${Date.now()}`,
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
        initials: getInitials(form.name),
        avatarColor: AVATAR_COLORS[colorIdx],
      };
      save([...users, newUser]);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    save(users.filter((u) => u.id !== id));
    setDeleteTarget(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = { admin: users.filter((u) => u.role === 'admin').length, manager: users.filter((u) => u.role === 'manager').length, cashier: users.filter((u) => u.role === 'cashier').length };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-slate-800 font-bold text-xl">User Management</h2>
          <p className="text-slate-400 text-sm mt-0.5">Manage staff accounts and role permissions</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
        >
          <i className="ri-user-add-line text-base"></i>
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users',  value: users.length,      icon: 'ri-team-line',         color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Administrators', value: counts.admin,    icon: 'ri-shield-user-line',  color: 'bg-violet-50 text-violet-600' },
          { label: 'Managers',     value: counts.manager,    icon: 'ri-user-star-line',    color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Cashiers',     value: counts.cashier,    icon: 'ri-user-line',         color: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-slate-100">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${s.color}`}>
              <i className={`${s.icon} text-lg`}></i>
            </div>
            <div>
              <p className="text-slate-800 text-xl font-bold">{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <i className="ri-search-line text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['All', 'admin', 'manager', 'cashier'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap capitalize ${
                roleFilter === r ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {r === 'All' ? 'All Roles' : ROLE_LABELS[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-team-line text-3xl text-slate-300"></i>
                      <p className="text-slate-400 text-sm font-medium">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => {
                  const role = ROLE_LABELS[u.role];
                  return (
                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${u.avatarColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                            {u.initials}
                          </div>
                          <span className="text-slate-800 text-sm font-semibold">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-500 text-sm">{u.email}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${role.bg} ${role.color}`}>
                          {role.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          u.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                          >
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">{editTarget ? 'Edit User' : 'Add New User'}</h2>
                <p className="text-slate-400 text-xs mt-0.5">Fill in the details below</p>
              </div>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Kofi Boateng"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${errors.name ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. kofi@spark360.com"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all ${errors.email ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 bg-white cursor-pointer"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 bg-white cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Role permissions hint */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  {form.role === 'admin' ? 'Administrator' : form.role === 'manager' ? 'Manager' : 'Cashier'} Permissions
                </p>
                <p className="text-xs text-slate-400">
                  {form.role === 'admin'
                    ? 'Full access: Dashboard, POS, Sales, Customers, Purchases, Inventory, Expenses, Reports, Settings'
                    : form.role === 'manager'
                    ? 'Access: Dashboard, POS, Sales, Customers, Purchases, Inventory, Expenses, Reports'
                    : 'Limited access: POS, Customers, Sales History only'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={closeForm} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-all">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all">
                {editTarget ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl mb-4">
              <i className="ri-delete-bin-line text-red-600 text-xl"></i>
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-2">Remove User?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">This user account will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold cursor-pointer whitespace-nowrap">Remove</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
