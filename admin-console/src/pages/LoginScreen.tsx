import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const features: { icon: string; label: string }[] = [
  { icon: 'ri-shield-check-line', label: 'Business Approvals' },
  { icon: 'ri-building-4-line', label: 'Platform Businesses' },
  { icon: 'ri-group-line', label: 'Owner & User Oversight' },
];

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) setError(loginError.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#1e2139] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center">
            <i className="ri-building-4-line text-white text-2xl" />
          </div>
          <div>
            <span className="text-white font-bold text-xl leading-tight tracking-tight block max-w-[18rem]">
              Bizzy App Admin Console
            </span>
            <p className="text-slate-400 text-sm">Platform Administration</p>
          </div>
        </div>

        <div>
          <h2 className="text-white text-4xl font-bold leading-snug mb-4">
            Oversee every business,
            <br />
            all in one place.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Approve new signups, manage business status, and keep track of platform owners and users.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {features.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <i className={`${icon} text-indigo-400 text-lg`} />
                </div>
                <span className="text-slate-300 text-base">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          Powered By{' '}
          <a
            href="https://www.triaxistechnologies.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-indigo-400 transition-colors"
          >
            TriAxis Technologies
          </a>{' '}
          &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <i className="ri-building-4-line text-white text-xl" />
            </div>
            <span className="text-slate-800 font-bold text-base leading-tight tracking-tight">
              Bizzy App Admin Console
            </span>
          </div>

          <h1 className="text-slate-800 font-bold text-3xl mb-2">Welcome back!</h1>
          <p className="text-slate-500 text-base mb-10">Sign in with your platform admin account.</p>

          <form onSubmit={submit} className="flex flex-col gap-6">
            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Email address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="ri-mail-line text-lg" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="ri-lock-line text-lg" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <i className="ri-error-warning-line text-red-500 text-lg flex-shrink-0" />
                <p className="text-red-600 text-base">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-base transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
