'use client';
import { useEffect, useState } from 'react';
import { goals as api } from '@/lib/api';
import { formatINR, formatDate, GOAL_ICONS } from '@/lib/utils';
import { Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const GOAL_TYPES = ['HOUSE', 'CAR', 'EDUCATION', 'MARRIAGE', 'TRAVEL', 'EMERGENCY_FUND', 'RETIREMENT', 'OTHER'];
const EMPTY = { name: '', goal_type: 'HOUSE', target_amount: '', current_amount: '0', target_date: '', inflation_rate: '6', expected_return: '12', monthly_contribution: '0' };

export default function GoalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); try { const d: any = await api.list(); setItems(d); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.create({ ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount), inflation_rate: parseFloat(form.inflation_rate), expected_return: parseFloat(form.expected_return), monthly_contribution: parseFloat(form.monthly_contribution), target_date: new Date(form.target_date).toISOString() });
      setShowForm(false); setForm(EMPTY); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete goal?')) return; await api.delete(id); load(); };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Financial Goals</h1><p className="text-slate-400 text-sm">Track your progress toward life goals</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} />Add Goal</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-in overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-semibold text-white mb-4">Create Goal</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Goal Type</label>
                  <select className="select" value={form.goal_type} onChange={e => setForm(p => ({ ...p, goal_type: e.target.value }))}>
                    {GOAL_TYPES.map(t => <option key={t} value={t}>{GOAL_ICONS[t]} {t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Goal Name</label>
                  <input type="text" className="input" placeholder="My Dream House" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Target Amount (₹)</label><input type="number" className="input" value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} required /></div>
                <div><label className="input-label">Current Savings (₹)</label><input type="number" className="input" value={form.current_amount} onChange={e => setForm(p => ({ ...p, current_amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Monthly Contribution (₹)</label><input type="number" className="input" value={form.monthly_contribution} onChange={e => setForm(p => ({ ...p, monthly_contribution: e.target.value }))} /></div>
                <div><label className="input-label">Target Date</label><input type="date" className="input" value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Inflation Rate (%)</label><input type="number" step="0.1" className="input" value={form.inflation_rate} onChange={e => setForm(p => ({ ...p, inflation_rate: e.target.value }))} /></div>
                <div><label className="input-label">Expected Return (%)</label><input type="number" step="0.1" className="input" value={form.expected_return} onChange={e => setForm(p => ({ ...p, expected_return: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
        : items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🎯</div><h3 className="text-white font-medium mb-1">No goals yet</h3><p className="text-slate-400 text-sm mb-4">Set financial goals to track your progress</p><button onClick={() => setShowForm(true)} className="btn-primary">Create Goal</button></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((g: any) => {
              const p = g.projection;
              return (
                <div key={g._id} className="card-hover">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{GOAL_ICONS[g.goal_type] || '🎯'}</span>
                      <div><p className="text-white font-semibold">{g.name}</p><p className="text-slate-500 text-xs">{g.goal_type}</p></div>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.on_track ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-amber-400" />}
                      <button onClick={() => handleDelete(g._id)} className="btn-ghost p-1 text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white font-medium">{p.progress_pct}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill bg-indigo-500" style={{ width: `${p.progress_pct}%` }} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-slate-500">Target</p><p className="text-white font-medium">{formatINR(g.target_amount, true)}</p></div>
                    <div><p className="text-slate-500">Inflation-adj Target</p><p className="text-white font-medium">{formatINR(p.inflation_adjusted_target, true)}</p></div>
                    <div><p className="text-slate-500">Projected</p><p className={`font-medium ${p.on_track ? 'text-emerald-400' : 'text-amber-400'}`}>{formatINR(p.projected_amount, true)}</p></div>
                    <div><p className="text-slate-500">Required/month</p><p className="text-indigo-400 font-medium">{formatINR(p.required_monthly_contribution, true)}</p></div>
                  </div>
                  {p.shortfall > 0 && <p className="mt-3 text-amber-400 text-xs">⚠️ Shortfall: {formatINR(p.shortfall, true)}</p>}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
