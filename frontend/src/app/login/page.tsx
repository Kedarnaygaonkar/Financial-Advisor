'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    account_type: 'INDIVIDUAL',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.full_name, form.account_type);
      }
      router.push('/individual/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left — Brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl">💰</div>
          <span className="text-white font-bold text-xl">AI Financial OS</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Your complete<br />
              <span className="gradient-text">AI Financial Advisor</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Track income, expenses, investments, taxes, and retirement — powered by AI that understands your real financial data.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '📊', title: 'Smart Dashboard', desc: 'Real-time financial overview' },
              { icon: '🤖', title: 'AI Advisor', desc: 'Answers questions from your real data' },
              { icon: '📈', title: 'Portfolio Tracking', desc: 'Stocks, MF, FD, Gold & more' },
              { icon: '🧾', title: 'India Tax Planner', desc: 'Old vs New regime comparison' },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{f.title}</p>
                  <p className="text-slate-400 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">🇮🇳</div>
          <span className="text-slate-500 text-sm">India-first financial OS</span>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg">💰</div>
            <span className="text-white font-bold text-lg">AI Financial OS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="text-slate-400">
              {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>

          {/* Quick demo hint */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setForm({ email: 'demo@financialos.in', password: 'Demo@1234', full_name: '', account_type: 'INDIVIDUAL' })}
              className="w-full mb-6 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-600/10 text-indigo-300 text-sm font-medium hover:bg-indigo-600/20 transition-colors text-center"
            >
              🎯 Use demo account → demo@financialos.in / Demo@1234
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="input-label">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="input"
                  placeholder="Arjun Mehta"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div>
              <label className="input-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="arjun@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="input-label">Account Type</label>
                <select
                  name="account_type"
                  className="select"
                  value={form.account_type}
                  onChange={handleChange}
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              id={mode === 'login' ? 'login-btn' : 'register-btn'}
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
