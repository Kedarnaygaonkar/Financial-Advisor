'use client';
import { useEffect, useState } from 'react';
import { credit as api } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const EMPTY = { monthly_income: 0, total_loans: 0, monthly_emi: 0, credit_utilization_pct: 0, repayment_history_pct: 100, num_credit_accounts: 0, num_missed_payments: 0 };

export default function CreditPage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'overview' | 'update'>('overview');

  useEffect(() => {
    api.profile().then((p: any) => { setProfile(p); if (p?.estimated_credit_score) setForm({ monthly_income: p.monthly_income, total_loans: p.total_loans, monthly_emi: p.monthly_emi, credit_utilization_pct: p.credit_utilization_pct, repayment_history_pct: p.repayment_history_pct, num_credit_accounts: p.num_credit_accounts, num_missed_payments: p.num_missed_payments }); }).finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { const res: any = await api.analyze(form); setProfile(res); setTab('overview'); } finally { setSaving(false); }
  };

  const scoreColor = profile?.estimated_credit_score >= 750 ? 'text-emerald-400' : profile?.estimated_credit_score >= 650 ? 'text-amber-400' : 'text-red-400';

  if (loading) return <div className="p-8"><div className="skeleton h-64 rounded-2xl" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-white">Credit Health</h1><p className="text-slate-400 text-sm mt-0.5">Estimated credit health score — Not an official CIBIL bureau score</p></div>
        <span className="badge-warning">Estimated Model</span>
      </div>

      <div className="flex gap-2">
        {['overview', 'update'].map((t) => (
          <button key={t} onClick={() => setTab(t as any)} className={tab === t ? 'btn-primary py-1.5 px-4' : 'btn-secondary py-1.5 px-4'}>
            {t === 'overview' ? '📊 Overview' : '✏️ Update Profile'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        !profile?.estimated_credit_score ? (
          <div className="card text-center py-12">
            <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Set up your credit profile</h3>
            <p className="text-slate-400 text-sm mb-4">Enter your financial details to get an estimated credit health score</p>
            <button onClick={() => setTab('update')} className="btn-primary">Get My Score</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card text-center py-8">
              <div className={`text-6xl font-bold mb-2 ${scoreColor}`}>{profile.estimated_credit_score}</div>
              <p className="text-slate-400 text-sm mb-1">Estimated Credit Score</p>
              <span className={`badge text-sm ${profile.risk_category === 'LOW' ? 'badge-success' : profile.risk_category === 'MEDIUM' ? 'badge-warning' : 'badge-danger'}`}>
                {profile.risk_category} RISK
              </span>
              <div className="flex items-center justify-center gap-1 mt-2 text-slate-500 text-xs">
                {profile.trajectory === 'IMPROVING' ? <TrendingUp size={14} className="text-emerald-400" /> : profile.trajectory === 'DECLINING' ? <TrendingDown size={14} className="text-red-400" /> : <Minus size={14} />}
                {profile.trajectory}
              </div>
            </div>

            <div className="card space-y-3">
              <h2 className="text-base font-semibold text-white">Score Components</h2>
              {Object.entries(profile.component_scores || {}).map(([k, v]: [string, any]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm w-44 capitalize shrink-0">{k.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${(v / 40) * 100}%` }} />
                  </div>
                  <span className="text-white text-sm w-10 text-right">{v.toFixed(1)}</span>
                </div>
              ))}
            </div>

            <div className="card space-y-2">
              <h2 className="text-base font-semibold text-white">Improvement Suggestions</h2>
              {(profile.suggestions || []).map((s: string) => (
                <p key={s} className="text-slate-300 text-sm flex gap-2"><span>💡</span><span>{s}</span></p>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ['Monthly EMI', formatINR(profile.monthly_emi, true)],
                ['Total Loans', formatINR(profile.total_loans, true)],
                ['Credit Utilization', `${profile.credit_utilization_pct}%`],
              ].map(([label, value]) => (
                <div key={label} className="metric-card"><p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Update Credit Details</h2>
          <form onSubmit={handleAnalyze} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Monthly Income (₹)', 'monthly_income', 0],
              ['Total Loans Outstanding (₹)', 'total_loans', 0],
              ['Total Monthly EMI (₹)', 'monthly_emi', 0],
              ['Credit Utilization (%)', 'credit_utilization_pct', 1],
              ['Repayment History (%)', 'repayment_history_pct', 1],
              ['Number of Credit Accounts', 'num_credit_accounts', 0],
              ['Missed Payments (last 12 months)', 'num_missed_payments', 0],
            ].map(([label, field, step]) => (
              <div key={field as string}>
                <label className="input-label">{label}</label>
                <input type="number" step={step as number} className="input" value={(form as any)[field as string]} onChange={e => setForm(p => ({ ...p, [field as string]: parseFloat(e.target.value) || 0 }))} />
              </div>
            ))}
            <div className="col-span-full flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setTab('overview')} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Analyzing...' : 'Analyze Credit Health'}</button>
            </div>
          </form>
        </div>
      )}

      <p className="text-slate-600 text-xs text-center">{profile?.disclaimer || 'This is an estimated credit health score, not an official CIBIL/bureau score. For official scores, visit TransUnion CIBIL.'}</p>
    </div>
  );
}
