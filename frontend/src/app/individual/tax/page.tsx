'use client';
import { useEffect, useState } from 'react';
import { tax as api } from '@/lib/api';
import { formatINR } from '@/lib/utils';

const EMPTY_FORM = { gross_income: 0, deductions_80c: 0, deductions_80d: 0, home_loan_interest: 0, hra_exemption: 0, other_deductions: 0, capital_gains_stcg: 0, capital_gains_ltcg: 0 };

export default function TaxPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.profile().then((p: any) => {
      if (p?.gross_income) setForm({ gross_income: p.gross_income, deductions_80c: p.deductions_80c, deductions_80d: p.deductions_80d, home_loan_interest: p.home_loan_interest, hra_exemption: p.hra_exemption, other_deductions: p.other_deductions, capital_gains_stcg: p.capital_gains_stcg, capital_gains_ltcg: p.capital_gains_ltcg });
    });
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res: any = await api.calculate({ ...form, financial_year: '2024-25' });
      setResult(res);
      await api.updateProfile({ ...form, financial_year: '2024-25' });
    } finally { setLoading(false); }
  };

  const Field = ({ label, field }: { label: string; field: keyof typeof EMPTY_FORM }) => (
    <div>
      <label className="input-label">{label}</label>
      <input type="number" step="1000" className="input" value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }))} />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tax Planner</h1>
        <p className="text-slate-400 text-sm mt-0.5">FY 2024-25 — Old vs New regime comparison</p>
        <div className="mt-2 inline-block badge-warning text-[11px]">Estimation tool — not an authorized filing service</div>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-4">
        <h2 className="text-base font-semibold text-white">Income & Deductions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Annual Gross Income (₹)" field="gross_income" />
          <Field label="80C (ELSS, PPF, NPS) (₹)" field="deductions_80c" />
          <Field label="80D Health Insurance (₹)" field="deductions_80d" />
          <Field label="Home Loan Interest 24(b) (₹)" field="home_loan_interest" />
          <Field label="HRA Exemption (₹)" field="hra_exemption" />
          <Field label="Other Deductions (₹)" field="other_deductions" />
          <Field label="STCG Capital Gains (₹)" field="capital_gains_stcg" />
          <Field label="LTCG Capital Gains (₹)" field="capital_gains_ltcg" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Calculating...' : 'Calculate Tax'}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          {/* Recommendation Banner */}
          <div className={`card border-2 ${result.recommended_regime === 'NEW' ? 'border-indigo-500/50 bg-indigo-950/30' : 'border-emerald-500/50 bg-emerald-950/30'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-slate-400 text-sm">Recommended Regime</p>
                <p className="text-white text-xl font-bold">{result.recommended_regime} REGIME</p>
                <p className="text-emerald-400 text-sm mt-1">Save {formatINR(result.tax_savings_by_switching)} by choosing this regime</p>
              </div>
              <div className="text-4xl">🏆</div>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['old_regime', 'new_regime'] as const).map((regime) => {
              const r = result[regime];
              const isRecommended = result.recommended_regime === (regime === 'old_regime' ? 'OLD' : 'NEW');
              return (
                <div key={regime} className={`card space-y-3 ${isRecommended ? 'border-indigo-500/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white capitalize">{regime.replace('_', ' ').replace('regime', 'Regime')}</h3>
                    {isRecommended && <span className="badge-info">Recommended</span>}
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Taxable Income', formatINR(r.taxable_income)],
                      ['Total Deductions', formatINR(r.total_deductions)],
                      ['Tax Amount', formatINR(r.total_tax)],
                      ['Effective Rate', `${r.effective_rate}%`],
                      ['Take-home/Month', formatINR(r.take_home_monthly)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-slate-800 space-y-1">
                    {r.suggestions.map((s: string) => (
                      <p key={s} className="text-slate-400 text-xs flex gap-1.5"><span>💡</span><span>{s}</span></p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-slate-600 text-xs text-center">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
