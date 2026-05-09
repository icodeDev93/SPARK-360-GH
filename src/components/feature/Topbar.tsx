import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useSidebar } from '@/contexts/SidebarContext';
import { supabase } from '@/lib/supabase';
import PasswordInput from '@/components/ui/PasswordInput';
import GlobalSearch from '@/components/feature/GlobalSearch';
import NotificationsDropdown from '@/components/feature/NotificationsDropdown';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Sales (POS)',
  '/sales-history': 'Sales History',
  '/customers': 'Customers',
  '/suppliers': 'Purchases & Supplies',
  '/inventory': 'Inventory',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/users': 'User Management',
};


export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] || 'SPark360';
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);
  const { currentUser, logout } = useAuth();
  const roleInfo = currentUser ? ROLE_LABELS[currentUser.role] : ROLE_LABELS['cashier'];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const { notifications, dismiss, dismissCategory, criticalCount } = useNotifications();
  const { toggle } = useSidebar();
  const totalAlerts = notifications.length;

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 z-20">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="lg:hidden mr-3 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer flex-shrink-0"
      >
        <i className="ri-menu-line text-xl"></i>
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-slate-800 font-bold text-lg truncate">{title}</h1>
        <p className="text-slate-400 text-xs hidden sm:block">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Search */}
      <GlobalSearch />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Stock Alert Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-pointer relative"
          >
            <i className="ri-notification-3-line text-lg"></i>
            {totalAlerts > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-xs font-bold px-1 ${criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotif && (
            <NotificationsDropdown
              notifications={notifications}
              onDismiss={dismiss}
              onDismissCategory={dismissCategory}
              onClose={() => setShowNotif(false)}
            />
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-all"
          >
            <div className={`w-8 h-8 rounded-full ${currentUser?.avatarColor ?? 'bg-slate-400'} flex items-center justify-center text-white text-xs font-bold overflow-hidden`}>
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.initials ?? '?'
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-slate-800 text-sm font-semibold leading-none">{currentUser?.name ?? 'User'}</p>
              <p className={`text-xs mt-0.5 font-semibold ${roleInfo.color}`}>{roleInfo.label}</p>
            </div>
            <span className="w-4 h-4 flex items-center justify-center text-slate-400">
              <i className={`ri-arrow-${showUserMenu ? 'up' : 'down'}-s-line text-sm`}></i>
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-xl overflow-hidden z-50" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-slate-800 text-sm font-semibold truncate">{currentUser?.name}</p>
                <p className="text-slate-400 text-xs truncate">{currentUser?.email}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); setShowAccountSettings(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <i className="ri-settings-3-line text-base"></i>
                Account settings
              </button>
              <button
                onClick={() => { setShowUserMenu(false); logout().then(() => navigate('/login')); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-t border-slate-100"
              >
                <i className="ri-logout-box-r-line text-base"></i>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {showAccountSettings && (
        <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
      )}
    </header>
  );
}

function AccountSettingsModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateAvatar, updatePassword } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatarUrl ?? '');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError('');
    setAvatarMessage('');

    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Avatar image must be a JPEG or PNG file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar image must be 2MB or smaller.');
      return;
    }

    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleAvatarSave() {
    if (!currentUser || !avatarFile) return;

    setSavingAvatar(true);
    setError('');
    setAvatarMessage('');

    try {
      const ext = avatarFile.type === 'image/png' ? 'png' : 'jpg';
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(path, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
      const result = await updateAvatar(data.publicUrl);
      if (!result.success) {
        setError(result.error ?? 'Unable to update avatar.');
        return;
      }

      setAvatarFile(null);
      setAvatarPreview(data.publicUrl);
      setAvatarMessage('Avatar updated.');
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handlePasswordSave(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setPasswordMessage('');

    if (!nextPassword || !confirmPassword) {
      setError('Fill in both password fields.');
      return;
    }
    if (nextPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await updatePassword(nextPassword);
      if (!result.success) {
        setError(result.error ?? 'Unable to update password.');
        return;
      }

      setNextPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 text-lg font-bold">Account settings</h2>
            <p className="text-slate-400 text-xs mt-0.5">{currentUser?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              <i className="ri-error-warning-line text-base mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          <section className="space-y-3">
            <div>
              <h3 className="text-slate-800 text-sm font-bold">Avatar</h3>
              <p className="text-slate-400 text-xs">Upload a JPEG or PNG image, up to 2MB.</p>
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${currentUser?.avatarColor ?? 'bg-slate-400'} overflow-hidden flex items-center justify-center text-white text-lg font-bold flex-shrink-0`}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.initials ?? '?'
                )}
              </div>

              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer">
                  <i className="ri-image-add-line text-base"></i>
                  Choose image
                  <input type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} className="hidden" />
                </label>
                {avatarFile && <p className="text-slate-400 text-xs mt-1 truncate">{avatarFile.name}</p>}
                {avatarMessage && <p className="text-emerald-600 text-xs mt-1 font-semibold">{avatarMessage}</p>}
              </div>

              <button
                onClick={handleAvatarSave}
                disabled={!avatarFile || savingAvatar}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingAvatar ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>

          <form onSubmit={handlePasswordSave} className="space-y-3 border-t border-slate-100 pt-5">
            <div>
              <h3 className="text-slate-800 text-sm font-bold">Password</h3>
              <p className="text-slate-400 text-xs">Set a new password for your account.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PasswordInput
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                iconClassName="text-sm"
                inputClassName="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-400"
              />
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                iconClassName="text-sm"
                inputClassName="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>{passwordMessage && <p className="text-emerald-600 text-xs font-semibold">{passwordMessage}</p>}</div>
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
