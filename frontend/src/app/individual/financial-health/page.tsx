'use client';
import { useEffect, useState } from 'react';
import { financialHealth as api } from '@/lib/api';
import { getHealthColor } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

function ComponentBar({ name, value, max }: { name: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value >= max * 0.75 ? '#10b981' : value >= max * 0.4 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-36 capitalize shrink-0">{name.replace('_', ' ')}</span>
      <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-white text-sm font-medium w-12 text-right">{value.toFixed(1)}/{max}</span>
    </div>
  );
}

const COMPONENT_MAX: Record<string, number> = {
  savings: 20, debt: 20, liquidity: 15, investments: 15,
  income_stability: 10, emergency_fund: 10, goals: 5, insurance: 5,
};

export default function FinancialHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.score()
      .then((d: any) => setData(d))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><div className="skeleton h-64 rounded-2xl" /></div>;
  if (error) return <div className="p-8"><div className="card text-center"><AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" /><p className="text-slate-300">{error}</p></div></div>;
  if (!data) return null;

  const color = getHealthColor(data.score);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial Health</h1>
        <p className="text-slate-400 text-sm mt-0.5">Composite score based on your actual financial data</p>
      </div>

      <div className="card text-center py-10">
        <div className="relative inline-block mb-6">
          <svg width="160" height="160" className="-rotate-90">
            <circle cx="80" cy="80" r="64" stroke="rgb(51,65,85)" strokeWidth="12" fill="none" />
            <circle cx="80" cy="80" r="64" stroke={color} strokeWidth="12" fill="none"
              strokeDasharray={2 * Math.PI * 64}
              strokeDashoffset={2 * Math.PI * 64 * (1 - data.score / 100)}
              strokeLinecap="round" className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white">{data.score}</span>
            <span className="text-slate-400 text-sm">/100</span>
          </div>
        </div>
        <p className="text-lg font-semibold" style={{ color }}>
          {data.score >= 75 ? 'Excellent' : data.score >= 60 ? 'Good' : data.score >= 45 ? 'Fair' : 'Needs Attention'}
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-white">Component Breakdown</h2>
        {Object.entries(data.components).map(([k, v]: [string, any]) => (
          <ComponentBar key={k} name={k} value={v} max={COMPONENT_MAX[k] || 10} />
        ))}
      </div>

      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-white">Key Insights</h2>
        {data.delta_reasons.map((r: string) => (
          <p key={r} className="text-slate-300 text-sm flex items-start gap-2">
            <span className="mt-0.5">{r.startsWith('✅') ? '' : r.startsWith('⚠️') ? '' : '💡'}</span>
            <span>{r}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
