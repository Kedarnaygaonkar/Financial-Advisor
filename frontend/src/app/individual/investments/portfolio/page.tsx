'use client';

import { useEffect, useState } from 'react';
import { investments as investmentsApi } from '@/lib/api';
import { formatINR, ASSET_COLORS, ASSET_TYPE_LABELS } from '@/lib/utils';
import type { Portfolio, Holding } from '@/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Trash2, ExternalLink } from 'lucide-react';

const ASSET_TYPES = ['STOCKS', 'MUTUAL_FUNDS', 'ETF', 'BONDS', 'FD', 'GOLD', 'OTHER'];

const LIQUIDITY_URL = process.env.NEXT_PUBLIC_LIQUIDITY_PROJECT_URL || '';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    asset_type: 'STOCKS', name: '', symbol: '', quantity: '',
    purchase_price: '', purchase_date: '', current_price: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await investmentsApi.portfolio();
      setPortfolio(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await investmentsApi.addHolding({
        ...form,
        quantity: parseFloat(form.quantity),
        purchase_price: parseFloat(form.purchase_price),
        current_price: parseFloat(form.current_price),
        purchase_date: new Date(form.purchase_date).toISOString(),
      });
      setShowForm(false);
      setForm({ asset_type: 'STOCKS', name: '', symbol: '', quantity: '', purchase_price: '', purchase_date: '', current_price: '', notes: '' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this holding?')) return;
    await investmentsApi.deleteHolding(id);
    load();
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your investment holdings</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Holding
        </button>
      </div>

      {/* Summary Cards */}
      {portfolio && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Invested', value: formatINR(portfolio.summary.total_invested, true) },
            { label: 'Current Value', value: formatINR(portfolio.summary.total_value, true) },
            {
              label: 'Total P&L',
              value: formatINR(Math.abs(portfolio.summary.total_pnl), true),
              extra: portfolio.summary.total_pnl >= 0,
              prefix: portfolio.summary.total_pnl >= 0 ? '+' : '-',
              color: portfolio.summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
            {
              label: 'Overall Return',
              value: `${portfolio.summary.return_pct >= 0 ? '+' : ''}${portfolio.summary.return_pct.toFixed(2)}%`,
              color: portfolio.summary.return_pct >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map((m) => (
            <div key={m.label} className="metric-card">
              <p className="metric-label">{m.label}</p>
              <p className={`metric-value ${(m as any).color || 'text-white'}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Pie */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Asset Allocation</h2>
          {portfolio?.allocation.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={portfolio.allocation}
                  dataKey="value"
                  nameKey="asset_type"
                  cx="50%" cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {portfolio.allocation.map((entry) => (
                    <Cell key={entry.asset_type} fill={ASSET_COLORS[entry.asset_type] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatINR(v, true)} />
                <Legend
                  formatter={(v) => ASSET_TYPE_LABELS[v] || v}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state py-8">
              <div className="empty-icon">📊</div>
              <p className="text-slate-400 text-sm">Add holdings to see allocation</p>
            </div>
          )}
        </div>

        {/* Holdings List */}
        <div className="lg:col-span-2 card">
          <h2 className="text-base font-semibold text-white mb-4">Holdings</h2>
          {!portfolio?.holdings.length ? (
            <div className="empty-state py-8">
              <div className="empty-icon">📈</div>
              <h3 className="text-white font-medium mb-1">No investments yet</h3>
              <p className="text-slate-400 text-sm mb-4">Add your first holding to start tracking your portfolio</p>
              <button onClick={() => setShowForm(true)} className="btn-primary">Add Holding</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th className="text-right">Invested</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">Return</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map((h: Holding) => (
                    <tr key={h._id}>
                      <td>
                        <div>
                          <p className="text-slate-200 text-sm font-medium">{h.name}</p>
                          <p className="text-slate-500 text-xs">{ASSET_TYPE_LABELS[h.asset_type]} {h.symbol ? `· ${h.symbol}` : ''}</p>
                        </div>
                      </td>
                      <td className="text-right text-slate-300 text-sm">{formatINR(h.invested_amount, true)}</td>
                      <td className="text-right text-white text-sm font-medium">{formatINR(h.current_value, true)}</td>
                      <td className="text-right">
                        <span className={`text-sm font-medium ${h.profit_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {h.profit_loss >= 0 ? '+' : ''}{formatINR(h.profit_loss, true)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`flex items-center justify-end gap-1 text-sm font-medium ${h.return_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {h.return_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {h.return_pct >= 0 ? '+' : ''}{h.return_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDelete(h._id)} className="btn-ghost p-1.5 text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* External Liquidity Project Card */}
      <div className="card border-indigo-500/20 bg-gradient-to-r from-indigo-950/50 to-slate-900">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💧</span>
              <h3 className="text-white font-semibold">Advanced Portfolio Liquidity Analysis</h3>
              <span className="badge-info">External</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              For detailed liquidity prediction and analysis, use our dedicated liquidity platform.
              ML-powered predictions, portfolio stress testing, and cashflow modeling.
            </p>
          </div>
          {LIQUIDITY_URL ? (
            <a href={LIQUIDITY_URL} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0">
              <ExternalLink size={15} />
              Analyze Liquidity
            </a>
          ) : (
            <div className="text-slate-500 text-sm flex items-center gap-2">
              <span>Configure NEXT_PUBLIC_LIQUIDITY_PROJECT_URL to enable</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Holding Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-in">
            <h2 className="text-lg font-semibold text-white mb-4">Add Holding</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Asset Type</label>
                  <select className="select" value={form.asset_type} onChange={e => setForm(p => ({ ...p, asset_type: e.target.value }))}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Symbol (optional)</label>
                  <input type="text" className="input" placeholder="RELIANCE.NS" value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="input-label">Name</label>
                <input type="text" className="input" placeholder="Reliance Industries" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Quantity / Units</label>
                  <input type="number" step="0.001" className="input" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required />
                </div>
                <div>
                  <label className="input-label">Purchase Date</label>
                  <input type="date" className="input" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Purchase Price (₹)</label>
                  <input type="number" step="0.01" className="input" value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))} required />
                </div>
                <div>
                  <label className="input-label">Current Price (₹)</label>
                  <input type="number" step="0.01" className="input" value={form.current_price} onChange={e => setForm(p => ({ ...p, current_price: e.target.value }))} required />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add Holding'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
