'use client';

import { useEffect, useState, useCallback } from 'react';
import { expenses as expensesApi } from '@/lib/api';
import { formatINR, formatDate, CATEGORY_EMOJI, CATEGORY_COLORS } from '@/lib/utils';
import type { Expense, ExpenseListResponse } from '@/types';
import { Plus, Search, Trash2, Edit3, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = ['FOOD', 'TRAVEL', 'SHOPPING', 'BILLS', 'RENT', 'EMI', 'MEDICAL', 'EDUCATION', 'ENTERTAINMENT', 'INVESTMENT', 'OTHER'];
const PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'CASH', 'OTHER'];

function ExpenseForm({ expense, onSave, onCancel }: {
  expense?: Expense;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    amount: expense?.amount || '',
    category: expense?.category || 'FOOD',
    description: expense?.description || '',
    date: expense?.date ? expense.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
    payment_method: expense?.payment_method || 'UPI',
    merchant: expense?.merchant || '',
  });
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);

  const autoClassify = async () => {
    if (!form.description) return;
    setClassifying(true);
    try {
      const result: any = await expensesApi.classify(form.description);
      setForm(prev => ({ ...prev, category: result.category }));
    } catch {}
    setClassifying(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, amount: parseFloat(form.amount as string), date: new Date(form.date).toISOString() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex gap-2">
          <input
            type="text" className="input" value={form.description}
            placeholder="Swiggy order, Reliance Petrol..."
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required
          />
          <button type="button" onClick={autoClassify} disabled={classifying} className="btn-secondary text-xs shrink-0 px-3">
            {classifying ? '...' : '🤖 Auto'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">Category</label>
          <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Payment Method</label>
          <select className="select" value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value as any }))}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="input-label">Merchant (optional)</label>
        <input type="text" className="input" value={form.merchant} placeholder="Swiggy, Amazon..." onChange={e => setForm(p => ({ ...p, merchant: e.target.value }))} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;
      const result: any = await expensesApi.list(params);
      setData(result);
    } catch {}
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (formData: any) => {
    await expensesApi.create(formData);
    setShowForm(false);
    load();
  };

  const handleUpdate = async (formData: any) => {
    if (!editExpense) return;
    await expensesApi.update(editExpense._id, formData);
    setEditExpense(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await expensesApi.delete(id);
    load();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track and manage your spending</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Form Modal */}
      {(showForm || editExpense) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-in">
            <h2 className="text-lg font-semibold text-white mb-4">{editExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <ExpenseForm
              expense={editExpense || undefined}
              onSave={editExpense ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditExpense(null); }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            className="input pl-9"
            placeholder="Search expenses..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="select w-full sm:w-48" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : !data?.data.length ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <h3 className="text-white font-medium mb-1">No expenses found</h3>
          <p className="text-slate-400 text-sm mb-4">{search || category ? 'Try adjusting your filters' : 'Add your first expense to start tracking'}</p>
          {!search && !category && (
            <button onClick={() => setShowForm(true)} className="btn-primary">Add Expense</button>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((expense) => (
                  <tr key={expense._id} className={expense.is_anomaly ? 'bg-amber-500/5' : ''}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{CATEGORY_EMOJI[expense.category]}</span>
                        <span
                          className="badge text-[11px]"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[expense.category]}20`,
                            color: CATEGORY_COLORS[expense.category],
                            borderColor: `${CATEGORY_COLORS[expense.category]}30`,
                          }}
                        >
                          {expense.category}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="max-w-xs">
                        <p className="text-slate-200 text-sm truncate">{expense.description}</p>
                        {expense.is_anomaly && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={10} className="text-amber-400" />
                            <span className="text-[10px] text-amber-400">Unusual spending</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-slate-400 text-sm whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td>
                      <span className="badge-neutral text-[11px]">{expense.payment_method}</span>
                    </td>
                    <td className="text-right">
                      <span className="text-white font-semibold">{formatINR(expense.amount)}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditExpense(expense)} className="btn-ghost p-1.5">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(expense._id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary py-1.5 px-3">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page === data.pages} className="btn-secondary py-1.5 px-3">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
