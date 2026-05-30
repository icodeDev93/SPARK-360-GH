import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '@/components/ui/PasswordInput';
import { supabase } from '@/lib/supabase';
import { sanitizeEmail, sanitizeText } from '@/lib/sanitize';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setError('');

    const cleanName = sanitizeText(name);
    const cleanEmail = sanitizeEmail(email);
    const cleanPhone = sanitizeText(phone).replace(/\s+/g, ' ').trim();
    const cleanAddress = sanitizeText(address);
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^\+\d[\d\s-]{7,18}$/.test(cleanPhone) || phoneDigits.length < 8 || phoneDigits.length > 15) {
      setError('Please enter the phone number with country code, e.g. +233 24 123 4567.');
      return;
    }
    if (!cleanAddress) {
      setError('Please enter your address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          role: 'owner',
        },
      },
    });
    setSaving(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate('/login', {
      replace: true,
      state: { registeredEmail: cleanEmail },
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:flex lg:w-[42%] bg-[#1e2139] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center">
            <i className="ri-grid-fill text-white text-2xl"></i>
          </div>
          <div>
            <span className="text-white font-bold text-xl leading-tight tracking-tight max-w-[18rem]">
              Bizzy App Business Management System
            </span>
            <p className="text-slate-400 text-sm">Owner registration</p>
          </div>
        </div>

        <div>
          <h2 className="text-white text-4xl font-bold leading-snug mb-4">
            Start with your<br />own business space.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Register as an Owner, create your businesses, and manage each one separately.
          </p>
        </div>

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

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <i className="ri-grid-fill text-white text-xl"></i>
            </div>
            <span className="text-slate-800 font-bold text-base leading-tight tracking-tight">
              Bizzy App Business Management System
            </span>
          </div>

          <h1 className="text-slate-800 font-bold text-3xl mb-2">Create owner account</h1>
          <p className="text-slate-500 text-base mb-10">Your account will only manage businesses you own.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength={100}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+233 24 123 4567"
                autoComplete="tel"
                inputMode="tel"
                maxLength={20}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Address</label>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Enter your address"
                autoComplete="street-address"
                maxLength={240}
                className="w-full min-h-[96px] resize-none px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Password</label>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
                inputClassName="w-full pr-11 px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-base font-semibold mb-2">Confirm password</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                inputClassName="w-full pr-11 px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <i className="ri-error-warning-line text-red-500 text-lg flex-shrink-0"></i>
                <p className="text-red-600 text-base">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-base transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {saving ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Creating account...
                </>
              ) : (
                'Create Owner Account'
              )}
            </button>

            <p className="text-center text-slate-500 text-sm leading-relaxed">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
