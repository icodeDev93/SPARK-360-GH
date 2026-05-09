import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PasswordInput from '@/components/ui/PasswordInput';

export default function LoginPage() {
  const { login, authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error ?? 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#1e2139] flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center">
            <i className="ri-grid-fill text-white text-2xl"></i>
          </div>
          <div>
            <span className="text-white font-bold text-2xl tracking-tight">SPark360</span>
            <p className="text-slate-400 text-sm">POS &amp; Inventory</p>
          </div>
        </div>

        {/* Centre copy */}
        <div>
          <h2 className="text-white text-4xl font-bold leading-snug mb-4">
            Smarter retail,<br />powered by data.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Manage sales, stock, expenses and reports — all from one place.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-4">
            {[
              { icon: 'ri-shopping-bag-3-line', label: 'Point of Sale' },
              { icon: 'ri-archive-line',        label: 'Inventory Tracking' },
              { icon: 'ri-bar-chart-2-line',    label: 'Reports & Analytics' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <i className={`${icon} text-emerald-400 text-lg`}></i>
                </div>
                <span className="text-slate-300 text-base">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-sm">
          Powered By{' '}
          <a
            href="https://www.triaxistechnologies.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-emerald-400 transition-colors"
          >
            TriAxis Technologies
          </a>
          {' '}&copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <i className="ri-grid-fill text-white text-xl"></i>
            </div>
            <span className="text-slate-800 font-bold text-xl tracking-tight">SPark360</span>
          </div>

          <h1 className="text-slate-800 font-bold text-3xl mb-2">Welcome back</h1>
          <p className="text-slate-500 text-base mb-10">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Email */}
            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Email address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="ri-mail-line text-lg"></i>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                leftIcon="ri-lock-line"
                iconClassName="text-lg"
                inputClassName="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <i className="ri-error-warning-line text-red-500 text-lg flex-shrink-0"></i>
                <p className="text-red-600 text-base">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-base transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {authLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-slate-400 text-sm leading-relaxed">
              Don&apos;t have an account or forgotten your password, please contact the Administrator. Thank you.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
