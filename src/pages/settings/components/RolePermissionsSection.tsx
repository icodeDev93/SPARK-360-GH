import { useState, useEffect } from 'react';
import { useAuth, ALL_PERMISSIONS, type DynamicPermissions } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { writeLog } from '@/lib/activityLog';

type ConfigRole = 'manager' | 'cashier';

const ROLE_META: Record<ConfigRole, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  manager: {
    label: 'Manager',
    color: 'text-emerald-700',
    bg:    'bg-emerald-100',
    icon:  'ri-user-star-line',
    desc:  'Can oversee operations and view reports.',
  },
  cashier: {
    label: 'Attendant',
    color: 'text-amber-700',
    bg:    'bg-amber-100',
    icon:  'ri-user-line',
    desc:  'Front-line staff handling sales transactions.',
  },
};

export default function RolePermissionsSection() {
  const { rolePermissions, currentUser } = useAuth();
  const [activeRole, setActiveRole]   = useState<ConfigRole>('manager');
  const [localPerms, setLocalPerms]   = useState<DynamicPermissions>(rolePermissions);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  // Sync local state when real-time updates arrive from another admin
  useEffect(() => {
    setLocalPerms(rolePermissions);
  }, [rolePermissions]);

  function toggle(permKey: string) {
    setLocalPerms((prev) => {
      const current = prev[activeRole];
      const next = current.includes(permKey)
        ? current.filter((p) => p !== permKey)
        : [...current, permKey];
      return { ...prev, [activeRole]: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('role_permissions')
        .upsert(
          [
            { role: 'manager', permissions: localPerms.manager, updated_at: new Date().toISOString() },
            { role: 'cashier', permissions: localPerms.cashier, updated_at: new Date().toISOString() },
          ],
          { onConflict: 'role' },
        );
      if (err) { setError(err.message); return; }
      if (currentUser) {
        const lines: string[] = [];
        (['manager', 'cashier'] as const).forEach((role) => {
          const prev = rolePermissions[role];
          const next = localPerms[role];
          const added   = next.filter((p) => !prev.includes(p));
          const removed = prev.filter((p) => !next.includes(p));
          if (added.length)   lines.push(`${ROLE_META[role].label}: granted [${added.join(', ')}]`);
          if (removed.length) lines.push(`${ROLE_META[role].label}: revoked [${removed.join(', ')}]`);
        });
        writeLog(currentUser, {
          category: 'settings', action: 'edit',
          description: lines.length
            ? `Updated role permissions — ${lines.join('; ')}`
            : 'Saved role permissions (no changes)',
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const currentPerms = localPerms[activeRole];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-slate-800 font-bold text-base">Role Permissions</h2>
        <p className="text-slate-400 text-sm mt-1">
          Choose which pages and features each role can access. Changes apply immediately to all logged-in users.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex gap-3 mb-6">
        {(Object.keys(ROLE_META) as ConfigRole[]).map((role) => {
          const meta = ROLE_META[role];
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-lg ${isActive ? 'bg-white/20' : meta.bg}`}>
                <i className={`${meta.icon} text-xs ${isActive ? 'text-white' : meta.color}`}></i>
              </span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Role description */}
      <div className={`flex items-start gap-3 rounded-xl px-4 py-3 mb-6 ${ROLE_META[activeRole].bg}`}>
        <i className={`${ROLE_META[activeRole].icon} text-lg mt-0.5 ${ROLE_META[activeRole].color}`}></i>
        <div>
          <p className={`text-sm font-semibold ${ROLE_META[activeRole].color}`}>{ROLE_META[activeRole].label}</p>
          <p className="text-slate-500 text-xs mt-0.5">{ROLE_META[activeRole].desc}</p>
        </div>
      </div>

      {/* Permission checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {ALL_PERMISSIONS.map((perm) => {
          const checked = currentPerms.includes(perm.key);
          return (
            <label
              key={perm.key}
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                checked
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Custom checkbox */}
              <div
                onClick={() => toggle(perm.key)}
                className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center border-2 transition-all ${
                  checked
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white border-slate-300 hover:border-indigo-400'
                }`}
              >
                {checked && <i className="ri-check-line text-white text-xs"></i>}
              </div>
              <div
                className="flex items-center gap-2.5 flex-1 min-w-0"
                onClick={() => toggle(perm.key)}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${
                  checked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <i className={`${perm.icon} text-sm`}></i>
                </span>
                <span className={`text-sm font-semibold ${checked ? 'text-indigo-800' : 'text-slate-600'}`}>
                  {perm.label}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Admin note */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-6 text-xs text-slate-400">
        <i className="ri-shield-check-line text-indigo-400 text-sm mt-0.5"></i>
        <span>
          <strong className="text-slate-500">Administrator</strong> always has full access to all features and cannot be restricted.
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          <i className="ri-error-warning-line"></i>
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-60 ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <i className={saved ? 'ri-checkbox-circle-fill' : saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'}></i>
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}
