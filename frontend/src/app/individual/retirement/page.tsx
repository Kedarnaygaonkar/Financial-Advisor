'use client';
import { useEffect, useState } from 'react';
import { retirement as api } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sunset, AlertTriangle, CheckCircle } from 'lucide-react';

const EMPTY = { current_age: 30, retirement_age: 60, life_expectancy: 85, current_monthly_income: 0, current_monthly_expenses: 0, current_investments: 0, inflation_rate: 6, expected_return: 12, post_retirement_return: 7 };

export default function RetirementPage() {
  const [plan, setPlan] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'overview' | 'update'>('overview');

  useEffect(() => {
    api.plan().then((p: any) => {
      if (p.exists) {
        setPlan(p);
        setForm({ current_age: p.current_age, retirement_age: p.retirement_age, life_expectancy: p.life_expectancy || 85, current_monthly_income: p.current_monthly_income, current_monthly_expenses: p.current_monthly_expenses, current_investments: p.current_investments, inflation_rate: p.inflation_rate, expected_return: p.expected_return, post_retirement_return: p.post_retirement_return || 7 });
      } else {
        setTab('update');
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { const res: any = await api.calculate(form); setPlan({ ...res, exists: true }); setTab('overview'); } finally { setSaving(false); }
  };

  const Field = ({ label, field, step = 1 }: { label: string; field: keyof typeof EMPTY; step?: number }) => (
    <div>
      <label className="input-label">{label}</label>
      <input type="number" step={step} className="input" value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }))} required />
    </div>
  );

  if (loading) return <div className="p-8"><div className="skeleton h-64 rounded-2xl" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Retirement Planner</h1><p className="text-slate-400 text-sm mt-0.5">Calculate your FIRE number</p></div>
        {plan?.exists && (
          <div className="flex gap-2">
            {['overview', 'update'].map((t) => (
              <button key={t} onClick={() => setTab(t as any)} className={tab === t ? 'btn-primary py-1.5 px-4' : 'btn-secondary py-1.5 px-4'}>{t === 'overview' ? '📊 Plan' : '✏️ Edit'}</button>
            ))}
          </div>
        )}
      </div>

      {tab === 'overview' && plan?.exists ? (
        <div className="space-y-6">
          <div className="card text-center py-10 bg-gradient-to-br from-slate-900 to-indigo-950/30">
            <Sunset className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
            <p className="text-slate-400 mb-1">Required Retirement Corpus</p>
            <div className="text-5xl font-bold text-white mb-2">{formatINR(plan.corpus_required, true)}</div>
            <p className="text-indigo-400 text-sm mb-6">You need to save {formatINR(plan.required_monthly_investment, true)} / month to reach this goal.</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="text-slate-400">Years to retire: <span className="text-white font-medium">{plan.years_to_retire}</span></div>
              <div className="text-slate-400">Years in retirement: <span className="text-white font-medium">{plan.years_in_retirement}</span></div>
              <div className="text-slate-400">Expenses at retirement: <span className="text-white font-medium">{formatINR(plan.monthly_expenses_at_retirement, true)}/mo</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card"><p className="metric-label">Projected Corpus</p><p className="metric-value">{formatINR(plan.corpus_projected, true)}</p><p className="text-xs text-slate-500 mt-1">From current investments</p></div>
            <div className="metric-card"><p className="metric-label">Corpus Gap</p><p className={`metric-value ${plan.corpus_gap > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{formatINR(plan.corpus_gap, true)}</p>
              {plan.corpus_gap > 0 ? <p className="text-xs text-amber-500/70 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Shortfall</p> : <p className="text-xs text-emerald-500/70 mt-1 flex items-center gap-1"><CheckCircle size={12} /> Fully funded</p>}
            </div>
            <div className="metric-card"><p className="metric-label">Required Monthly SIP</p><p className="metric-value text-indigo-400">{formatINR(plan.required_monthly_investment, true)}</p><p className="text-xs text-slate-500 mt-1">To close the gap</p></div>
          </div>

          {plan.projection_chart?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-semibold text-white mb-4">Corpus Projection to Retirement</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={plan.projection_chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatINR(v, true)} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => formatINR(v, true)} labelFormatter={(label) => `Age ${label}`} />
                  <Area type="monotone" dataKey="projected_corpus" name="Projected Corpus" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="required_at_this_point" name="Target Track" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card text-sm text-slate-400">
            <h3 className="font-medium text-white mb-2">Assumptions</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Inflation rate: {plan.assumptions.inflation_rate}</li>
              <li>Expected return (pre-retirement): {plan.assumptions.expected_return}</li>
              <li>Expected return (post-retirement): {plan.assumptions.post_retirement_return}</li>
              <li>Life expectancy: {plan.assumptions.life_expectancy} years</li>
            </ul>
            <p className="mt-4 text-xs italic">{plan.disclaimer}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">{plan?.exists ? 'Update Parameters' : 'Create Retirement Plan'}</h2>
          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Current Age" field="current_age" />
              <Field label="Retirement Age" field="retirement_age" />
              <Field label="Life Expectancy" field="life_expectancy" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Current Monthly Income (₹)" field="current_monthly_income" step={1000} />
              <Field label="Current Monthly Expenses (₹)" field="current_monthly_expenses" step={1000} />
              <Field label="Current Investments (₹)" field="current_investments" step={1000} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Inflation Rate (%)" field="inflation_rate" step={0.1} />
              <Field label="Expected Return (%)" field="expected_return" step={0.1} />
              <Field label="Post-Retirement Return (%)" field="post_retirement_return" step={0.1} />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              {plan?.exists && <button type="button" onClick={() => setTab('overview')} className="btn-secondary">Cancel</button>}
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Calculating...' : 'Calculate Plan'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
