'use client';
import { useEffect, useState } from 'react';
import { expenses as api } from '@/lib/api';
import { formatINR, formatMonth, CATEGORY_COLORS, CATEGORY_EMOJI } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function ExpenseAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analytics(6), api.anomalies()])
      .then(([analytics, anoms]: any[]) => { setData(analytics); setAnomalies(anoms); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>;
  if (!data) return null;

  const chartData = data.monthly_trend.map((m: any) => ({ ...m, month: formatMonth(m.month) }));
  const pieData = data.category_distribution.map((c: any) => ({ name: c.category, value: c.total }));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Spending Analytics</h1>
        <p className="text-slate-400 text-sm mt-0.5">Last 6 months overview</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <p className="metric-label">Average Monthly</p>
          <p className="metric-value">{formatINR(data.average_monthly, true)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Month-over-Month</p>
          <div className="flex items-center gap-2">
            {data.month_over_month_change_pct !== null ? (
              <>
                {data.month_over_month_change_pct >= 0 ? <TrendingUp size={18} className="text-red-400" /> : <TrendingDown size={18} className="text-emerald-400" />}
                <p className={`metric-value ${data.month_over_month_change_pct >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {data.month_over_month_change_pct >= 0 ? '+' : ''}{data.month_over_month_change_pct}%
                </p>
              </>
            ) : <p className="metric-value text-slate-400">N/A</p>}
          </div>
        </div>
        <div className="metric-card col-span-2 md:col-span-1">
          <p className="metric-label">Top Category</p>
          <p className="metric-value">{data.top_categories[0] ? `${CATEGORY_EMOJI[data.top_categories[0].category]} ${data.top_categories[0].category}` : '—'}</p>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Monthly Spending Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatINR(v, true)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(v: any) => formatINR(v)} />
            <Bar dataKey="total" name="Spending" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                {pieData.map((entry: any) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatINR(v)} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => `${CATEGORY_EMOJI[v] || ''} ${v}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Top Spending Categories</h2>
          <div className="space-y-3">
            {data.category_distribution.slice(0, 6).map((c: any) => {
              const max = data.category_distribution[0]?.total || 1;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{CATEGORY_EMOJI[c.category]}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300 text-sm">{c.category}</span>
                      <span className="text-white text-sm font-medium">{formatINR(c.total, true)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(c.total / max) * 100}%`, backgroundColor: CATEGORY_COLORS[c.category] || '#6366f1' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="card border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-white">Spending Anomalies</h2>
            <span className="badge-warning ml-auto">{anomalies.length} detected</span>
          </div>
          <div className="space-y-3">
            {anomalies.map((a: any) => (
              <div key={a._id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{a.description}</span>
                    <span className="text-white font-semibold ml-auto">{formatINR(a.amount)}</span>
                  </div>
                  <p className="text-amber-300/70 text-xs mt-0.5">{a.anomaly_reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
