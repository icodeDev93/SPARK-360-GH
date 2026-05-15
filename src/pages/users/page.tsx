import { useState, useEffect } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import type { UserRole, PermissionOverrides } from '@/hooks/useAuth';
import { ROLE_LABELS, ALL_PERMISSIONS, useAuth } from '@/hooks/useAuth';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import PasswordInput from '@/components/ui/PasswordInput';
import { writeLog, diffFields } from '@/lib/activityLog';
import { sanitizeText } from '@/lib/sanitize';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
  status: 'Active' | 'Inactive';
  permissionOverrides: PermissionOverrides;
}

const AVATAR_COLORS = [
  'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-600', 'bg-cyan-600', 'bg-orange-500',
];

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function mapRow(r: Record<string, unknown>): AppUser {
  const raw = r.permission_overrides as PermissionOverrides | null | undefined;
  return {
    id:                  r.id as string,
    name:                r.name as string,
    email:               r.email as string,
    role:                r.role as UserRole,
    initials:            r.initials as string,
    avatarColor:         r.avatar_color as string,
    status:              (r.status as 'Active' | 'Inactive') ?? 'Active',
    permissionOverrides: { granted: raw?.granted ?? [], revoked: raw?.revoked ?? [] },
  };
}

const EMPTY_OVERRIDES: PermissionOverrides = { granted: [], revoked: [] };

const EMPTY_FORM = {
  name: '', email: '', role: 'cashier' as UserRole,
  status: 'Active' as 'Active' | 'Inactive',
  password: '', confirmPassword: '',
  overrides: EMPTY_OVERRIDES,
};

function hasCustomOverrides(o: PermissionOverrides) {
  return o.granted.length > 0 || o.revoked.length > 0;
}

export default function UsersPage() {
  const { rolePermissions, currentUser } = useAuth();
  const [users, setUsers]           = useState<AppUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (!error && data) setUsers(data.map(mapRow));
      setLoading(false);
    })();
  }, []);

  const openAdd  = () => { setEditTarget(null); setForm(EMPTY_FORM); setErrors({}); setFormError(''); setShowForm(true); };
  const openEdit = (u: AppUser) => {
    setEditTarget(u);
    setForm({
      name: u.name, email: u.email, role: u.role, status: u.status,
      password: '', confirmPassword: '',
      overrides: { granted: [...u.permissionOverrides.granted], revoked: [...u.permissionOverrides.revoked] },
    });
    setErrors({}); setFormError(''); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditTarget(null); setSaving(false); };

  // When role changes in form, clear overrides so they start fresh for the new role
  function handleRoleChange(newRole: UserRole) {
    setForm((p) => ({ ...p, role: newRole, overrides: EMPTY_OVERRIDES }));
  }

  // Toggle a permission override for the user being edited
  function togglePermission(key: string) {
    const rolePerms = form.role === 'admin'
      ? (ALL_PERMISSIONS.map((p) => p.key) as string[])
      : (rolePermissions[form.role as 'manager' | 'cashier'] ?? []);
    const roleHas = rolePerms.includes(key);

    setForm((prev) => {
      const { granted, revoked } = prev.overrides;
      if (roleHas) {
        // Role provides this — toggle revoke
        return revoked.includes(key)
          ? { ...prev, overrides: { granted, revoked: revoked.filter((p) => p !== key) } }
          : { ...prev, overrides: { granted, revoked: [...revoked, key] } };
      } else {
        // Role doesn't provide this — toggle custom grant
        return granted.includes(key)
          ? { ...prev, overrides: { granted: granted.filter((p) => p !== key), revoked } }
          : { ...prev, overrides: { granted: [...granted, key], revoked } };
      }
    });
  }

  function getPermState(key: string): 'role' | 'custom' | 'revoked' | 'none' {
    if (form.role === 'admin') return 'role';
    const rolePerms = rolePermissions[form.role as 'manager' | 'cashier'] ?? [];
    const { granted, revoked } = form.overrides;
    if (revoked.includes(key)) return 'revoked';
    if (granted.includes(key)) return 'custom';
    if (rolePerms.includes(key)) return 'role';
    return 'none';
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!editTarget) {
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Minimum 6 characters';
      if (!form.confirmPassword) e.confirmPassword = 'Please confirm the password';
      else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    } else if (form.password) {
      if (form.password.length < 6) e.password = 'Minimum 6 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError('');

    try {
      if (editTarget) {
        const cleanName = sanitizeText(form.name);
        const initials = getInitials(cleanName);
        const overridesToSave = form.role === 'admin' ? EMPTY_OVERRIDES : form.overrides;

        const { error } = await supabase
          .from('profiles')
          .update({
            name: cleanName, email: form.email, role: form.role,
            status: form.status, initials,
            permission_overrides: overridesToSave,
          })
          .eq('id', editTarget.id);

        if (error) { setFormError(error.message); return; }

        if (form.password) {
          const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
            editTarget.id, { password: form.password },
          );
          if (pwError) { setFormError('Profile saved but password update failed: ' + pwError.message); return; }
        }

        if (currentUser) {
          const changes = diffFields(
            { name: editTarget.name, role: editTarget.role, status: editTarget.status },
            { name: cleanName,       role: form.role,       status: form.status },
            { name: 'Name', role: 'Role', status: 'Status' },
          );
          const overrideChanged =
            JSON.stringify(editTarget.permissionOverrides) !== JSON.stringify(overridesToSave);
          if (overrideChanged) changes.push({ field: 'Permission Overrides', old: 'previous', new: 'updated' });
          if (form.password)   changes.push({ field: 'Password', old: '••••••••', new: '(changed)' });
          writeLog(currentUser, {
            category: 'users', action: 'edit',
            description: `Edited user ${cleanName} (${ROLE_LABELS[form.role].label})`,
            changes,
          });
        }

        setUsers((prev) => prev.map((u) =>
          u.id === editTarget.id
            ? { ...u, name: cleanName, email: form.email, role: form.role, status: form.status, initials, permissionOverrides: overridesToSave }
            : u
        ));
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          email_confirm: true,
        });

        if (authError || !authData.user) {
          setFormError(authError?.message ?? 'Failed to create auth account.');
          return;
        }

        const newName     = sanitizeText(form.name);
        const initials    = getInitials(newName);
        const avatarColor = AVATAR_COLORS[users.length % AVATAR_COLORS.length];

        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id, name: newName,
          email: form.email.toLowerCase().trim(),
          role: form.role, status: form.status, initials, avatar_color: avatarColor,
          permission_overrides: EMPTY_OVERRIDES,
        });

        if (profileError) {
          setFormError('Account created but profile setup failed: ' + profileError.message);
          return;
        }

        const newUser: AppUser = {
          id: authData.user.id, name: newName,
          email: form.email.toLowerCase().trim(),
          role: form.role, status: form.status, initials, avatarColor,
          permissionOverrides: EMPTY_OVERRIDES,
        };
        setUsers((prev) => [...prev, newUser]);
        if (currentUser) {
          writeLog(currentUser, {
            category: 'users', action: 'create',
            description: `Created new user ${newName} (${ROLE_LABELS[form.role].label}) — ${form.email.toLowerCase().trim()}`,
          });
        }
      }

      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const target = users.find((u) => u.id === id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (currentUser && target) {
        writeLog(currentUser, {
          category: 'users', action: 'delete',
          description: `Removed user ${target.name} (${ROLE_LABELS[target.role].label})`,
        });
      }
    }
    setDeleteTarget(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    admin:   users.filter((u) => u.role === 'admin').length,
    manager: users.filter((u) => u.role === 'manager').length,
    cashier: users.filter((u) => u.role === 'cashier').length,
  };

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
          { label: 'Total Users',    value: users.length,   icon: 'ri-team-line',        color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Administrators', value: counts.admin,   icon: 'ri-shield-user-line', color: 'bg-violet-50 text-violet-600' },
          { label: 'Managers',       value: counts.manager, icon: 'ri-user-star-line',   color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Attendants',     value: counts.cashier, icon: 'ri-user-line',        color: 'bg-amber-50 text-amber-600' },
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
        <div className="flex items-center gap-2 flex-wrap">
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-loader-4-line animate-spin text-2xl text-indigo-400"></i>
                      <p className="text-slate-400 text-sm">Loading users…</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
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
                  const customised = u.role !== 'admin' && hasCustomOverrides(u.permissionOverrides);
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
                      <td className="px-5 py-3.5"><span className="text-slate-500 text-sm">{u.email}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${role.bg} ${role.color}`}>
                            {role.label}
                          </span>
                          {customised && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
                              <i className="ri-equalizer-line text-xs"></i>
                              Custom
                            </span>
                          )}
                        </div>
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
                          <button onClick={() => openEdit(u)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer">
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button onClick={() => setDeleteTarget(u.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer">
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
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-slate-800 font-bold text-base">{editTarget ? 'Edit User' : 'Add New User'}</h2>
                <p className="text-slate-400 text-xs mt-0.5">Fill in the details below</p>
              </div>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <i className="ri-error-warning-line text-red-500 text-base flex-shrink-0 mt-0.5"></i>
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Kofi Boateng"
                  autoComplete="off"
                  maxLength={100}
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
                  placeholder="e.g. kofi@spark360gh.com"
                  autoComplete="off"
                  disabled={!!editTarget}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 ${errors.email ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 bg-white cursor-pointer"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Attendant</option>
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

              {/* Access Permissions */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Access Permissions</p>
                  {form.role !== 'admin' && hasCustomOverrides(form.overrides) && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
                      <i className="ri-equalizer-line text-xs"></i>
                      Customised
                    </span>
                  )}
                </div>

                {form.role === 'admin' ? (
                  <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-700">
                    <i className="ri-shield-check-fill text-sm mt-0.5"></i>
                    <span>Administrator has full access to all features and cannot be restricted.</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_PERMISSIONS.map((perm) => {
                        const state = getPermState(perm.key);
                        const checked = state === 'role' || state === 'custom';
                        return (
                          <label
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                              state === 'role'    ? 'bg-indigo-50 border-indigo-100' :
                              state === 'custom'  ? 'bg-emerald-50 border-emerald-100' :
                              state === 'revoked' ? 'bg-red-50 border-red-100' :
                              'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className={`w-4 h-4 flex-shrink-0 rounded flex items-center justify-center border-2 transition-all ${
                              state === 'role'    ? 'bg-indigo-600 border-indigo-600' :
                              state === 'custom'  ? 'bg-emerald-600 border-emerald-600' :
                              state === 'revoked' ? 'bg-white border-red-300' :
                              'bg-white border-slate-300'
                            }`}>
                              {checked && <i className="ri-check-line text-white" style={{ fontSize: '10px' }}></i>}
                              {state === 'revoked' && <i className="ri-close-line text-red-400" style={{ fontSize: '10px' }}></i>}
                            </div>
                            <span className={`text-xs font-semibold flex-1 ${
                              state === 'role'    ? 'text-indigo-700' :
                              state === 'custom'  ? 'text-emerald-700' :
                              state === 'revoked' ? 'text-red-500' :
                              'text-slate-500'
                            }`}>
                              {perm.label}
                            </span>
                            {state === 'custom'  && <span className="text-xs font-bold text-emerald-500">+</span>}
                            {state === 'revoked' && <span className="text-xs font-bold text-red-400">Off</span>}
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block"></span>From role</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span>Custom grant</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border-2 border-red-300 inline-block"></span>Blocked</span>
                    </div>
                  </>
                )}
              </div>

              {/* Password */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  {editTarget ? 'Change Password' : 'Password'}
                  {!editTarget && <span className="text-red-400 ml-0.5">*</span>}
                  {editTarget && <span className="text-slate-400 text-xs font-normal ml-2">Leave blank to keep current password</span>}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      {editTarget ? 'New Password' : 'Password'} {!editTarget && <span className="text-red-400">*</span>}
                    </label>
                    <PasswordInput
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      iconClassName="text-sm"
                      inputClassName={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none transition-all ${errors.password ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Confirm Password {!editTarget && <span className="text-red-400">*</span>}
                    </label>
                    <PasswordInput
                      value={form.confirmPassword}
                      onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      iconClassName="text-sm"
                      inputClassName={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none transition-all ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={closeForm} disabled={saving} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold cursor-pointer whitespace-nowrap transition-all flex items-center justify-center gap-2">
                {saving ? <><i className="ri-loader-4-line animate-spin"></i> Saving…</> : editTarget ? 'Save Changes' : 'Add User'}
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
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">This will remove the user's profile and access to the app.</p>
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
