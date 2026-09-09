'use client';

import { useEffect, useState } from 'react';
import { dashboard as dashboardApi } from '@/lib/api';
import { formatINR, formatPct, formatMonth, getHealthColor, GOAL_ICONS, CATEGORY_COLORS } from '@/lib/utils';
import type { DashboardData } from '@/types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, AlertCircle, Shield, Target } from 'lucide-react';

function MetricCard({
  label, value, change, icon, color = 'text-white'
}: {
  label: string; value: string; change?: number | null; icon: string; color?: string;
}) {
  return (
    <div className="metric-card animate-slide-in">
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {change !== undefined && change !== null && (
          <span className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="metric-label">{label}</p>
        <p className={`metric-value ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function HealthScoreRing({ score }: { score: number }) {
  const color = getHealthColor(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-28 h-28">
        <svg className="transform -rotate-90 w-28 h-28">
          <circle cx="56" cy="56" r="40" stroke="rgb(51,65,85)" strokeWidth="8" fill="none" />
          <circle
            cx="56" cy="56" r="40"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm shadow-2xl">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-6">
          <span>{p.name}</span>
          <span className="font-semibold">{formatINR(p.value, true)}</span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.get()
      .then((d: any) => setData(d))
      .catch((e: any) => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="skeleton h-8 w-48 mb-2" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8 flex items-center justify-center">
      <div className="card max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium mb-1">Unable to load dashboard</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  const savingsAmount = data.monthly_income - data.monthly_expenses;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          {data.user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's your financial snapshot for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard icon="💎" label="Net Worth" value={formatINR(data.net_worth, true)} />
        <MetricCard icon="💰" label="Monthly Income" value={formatINR(data.monthly_income, true)} change={data.mom_income_change_pct} />
        <MetricCard icon="💸" label="Monthly Expenses" value={formatINR(data.monthly_expenses, true)} change={data.mom_expense_change_pct} color={savingsAmount < 0 ? 'text-red-400' : 'text-white'} />
        <MetricCard icon="🏦" label="Savings" value={formatINR(Math.abs(savingsAmount), true)} color={savingsAmount >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MetricCard icon="📈" label="Portfolio" value={formatINR(data.portfolio_value, true)} />
        <MetricCard icon="💳" label="Total Debt" value={formatINR(data.total_debt, true)} color="text-amber-400" />
        <div className="metric-card col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="metric-label">Savings Rate</span>
            <span className={`text-lg font-bold ${data.savings_rate_pct >= 20 ? 'text-emerald-400' : data.savings_rate_pct >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
              {data.savings_rate_pct.toFixed(1)}%
            </span>
          </div>
          <div className="progress-bar mt-3">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(data.savings_rate_pct, 100)}%`,
                background: data.savings_rate_pct >= 20 ? '#10b981' : data.savings_rate_pct >= 10 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Target: 20%+</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-white mb-4">Cash Flow</h2>
          {data.cashflow_chart.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-icon">📊</div>
              <p className="text-slate-400 text-sm">No data yet. Add income and expenses to see your cash flow.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.cashflow_chart} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatINR(v, true)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#6366f1" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Financial Health */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Financial Health</h2>
          <HealthScoreRing score={data.financial_health_score} />
          <div className="mt-4 space-y-2">
            {Object.entries(data.health_components).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-slate-500 text-xs capitalize w-28 shrink-0">{key.replace('_', ' ')}</span>
                <div className="flex-1 progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min((val / 20) * 100, 100)}%`,
                      background: val >= 15 ? '#10b981' : val >= 8 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{val.toFixed(0)}</span>
              </div>
            ))}
          </div>
          <a href="/individual/financial-health" className="mt-4 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            View full report <ArrowRight size={12} />
          </a>
        </div>
      </div>

      {/* Credit & Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Health */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Estimated Credit Health</h2>
            <span className="badge-info text-[10px]">Estimated</span>
          </div>
          {data.credit_score ? (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{data.credit_score}</div>
                <div className="text-xs text-slate-400 mt-1">Model Score</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className={data.credit_risk === 'LOW' ? 'text-emerald-400' : data.credit_risk === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'} />
                  <span className={`text-sm font-medium ${data.credit_risk === 'LOW' ? 'text-emerald-400' : data.credit_risk === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}`}>
                    {data.credit_risk} Risk
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Not an official CIBIL/bureau score
                </div>
                <a href="/individual/credit" className="mt-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                  View details <ArrowRight size={12} />
                </a>
              </div>
            </div>
          ) : (
            <div className="empty-state py-6">
              <div className="empty-icon">🛡️</div>
              <p className="text-slate-400 text-sm mb-3">Set up your credit profile to see your estimated score</p>
              <a href="/individual/credit" className="btn-primary text-sm py-2">Set Up</a>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Financial Goals</h2>
            <a href="/individual/goals" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              All goals <ArrowRight size={12} />
            </a>
          </div>
          {data.goals_summary.length === 0 ? (
            <div className="empty-state py-6">
              <div className="empty-icon">🎯</div>
              <p className="text-slate-400 text-sm mb-3">Start tracking your financial goals</p>
              <a href="/individual/goals" className="btn-primary text-sm py-2">Create Goal</a>
            </div>
          ) : (
            <div className="space-y-3">
              {data.goals_summary.map((goal) => (
                <div key={goal.name} className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{GOAL_ICONS[goal.goal_type] || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-200 truncate">{goal.name}</span>
                      <span className="text-xs text-slate-400 ml-2 shrink-0">{goal.progress_pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill bg-indigo-500"
                        style={{ width: `${goal.progress_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">{formatINR(goal.current_amount, true)}</span>
                      <span className="text-xs text-slate-500">{formatINR(goal.target_amount, true)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
