'use client';
import { useEffect, useState } from 'react';
import { income as api } from '@/lib/api';
import { formatINR, formatDate } from '@/lib/utils';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

const SOURCES = ['SALARY', 'FREELANCE', 'BUSINESS', 'INTEREST', 'DIVIDENDS', 'CAPITAL_GAINS', 'OTHER'];
const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME'];
const SOURCE_EMOJI: Record<string, string> = { SALARY: '💼', FREELANCE: '🖥️', BUSINESS: '🏢', INTEREST: '🏦', DIVIDENDS: '📊', CAPITAL_GAINS: '📈', OTHER: '💰' };

export default function IncomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: 'SALARY', amount: '', frequency: 'MONTHLY', description: '', date: new Date().toISOString().substring(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, sum]: any[] = await Promise.all([api.list(), api.summary()]);
      setItems(list); setSummary(sum);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.create({ ...form, amount: parseFloat(form.amount), date: new Date(form.date).toISOString() });
      setShowForm(false);
      setForm({ source: 'SALARY', amount: '', frequency: 'MONTHLY', description: '', date: new Date().toISOString().substring(0, 10) });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete income record?')) return;
    await api.delete(id); load();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Income</h1><p className="text-slate-400 text-sm">Track all income sources</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Add Income</button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="metric-card">
            <p className="metric-label">This Month</p>
            <p className="metric-value text-emerald-400">{formatINR(summary.this_month_total, true)}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Last Month</p>
            <p className="metric-value">{formatINR(summary.last_month_total, true)}</p>
          </div>
          <div className="metric-card col-span-2 md:col-span-1">
            <p className="metric-label">Month-over-Month</p>
            {summary.month_over_month_change_pct !== null ? (
              <div className={`flex items-center gap-2 ${summary.month_over_month_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.month_over_month_change_pct >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                <p className="metric-value">{summary.month_over_month_change_pct >= 0 ? '+' : ''}{summary.month_over_month_change_pct}%</p>
              </div>
            ) : <p className="metric-value text-slate-400">N/A</p>}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-in">
            <h2 className="text-lg font-semibold text-white mb-4">Add Income</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Source</label>
                  <select className="select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    {SOURCES.map(s => <option key={s} value={s}>{SOURCE_EMOJI[s]} {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Frequency</label>
                  <select className="select" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Amount (₹)</label>
                  <input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="input-label">Date</label>
                  <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="input-label">Description</label>
                <input type="text" className="input" placeholder="Salary from TechCorp..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Income'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3 className="text-white font-medium mb-1">No income records</h3>
          <p className="text-slate-400 text-sm mb-4">Add your salary and other income sources</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Income</button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Source</th><th>Description</th><th>Frequency</th><th>Date</th><th className="text-right">Amount</th><th></th></tr></thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item._id}>
                  <td><div className="flex items-center gap-2"><span>{SOURCE_EMOJI[item.source]}</span><span className="badge-success text-[11px]">{item.source}</span></div></td>
                  <td className="text-slate-300">{item.description}</td>
                  <td><span className="badge-neutral text-[11px]">{item.frequency}</span></td>
                  <td className="text-slate-400 text-sm whitespace-nowrap">{formatDate(item.date)}</td>
                  <td className="text-right text-emerald-400 font-semibold">{formatINR(item.amount)}</td>
                  <td className="text-right"><button onClick={() => handleDelete(item._id)} className="btn-ghost p-1.5 text-red-400"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
