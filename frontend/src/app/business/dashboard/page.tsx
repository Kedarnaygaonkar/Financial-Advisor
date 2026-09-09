'use client';

import { useEffect, useState } from 'react';
import { business as api } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { Building2, Users, Briefcase, FileText, ArrowRight } from 'lucide-react';

export default function BusinessDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard()
      .then((d: any) => setData(d))
      .catch(() => setData({ has_company: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><div className="skeleton h-64 rounded-2xl" /></div>;

  if (!data?.has_company) return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center text-2xl mb-4"><Building2 size={32} /></div>
      <h2 className="text-xl font-bold text-white mb-2">Welcome to Business Portal</h2>
      <p className="text-slate-400 max-w-md mx-auto mb-6">Create your company profile to start managing customers, vendors, invoices, and your business financials.</p>
      <button className="btn-primary">Create Company Profile</button>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{data.company_name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Business Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card"><p className="metric-label">Revenue (YTD)</p><p className="metric-value text-emerald-400">{formatINR(data.metrics.revenue, true)}</p></div>
        <div className="metric-card"><p className="metric-label">Receivables</p><p className="metric-value text-amber-400">{formatINR(data.metrics.receivables, true)}</p></div>
        <div className="metric-card"><p className="metric-label">Expenses</p><p className="metric-value text-red-400">{formatINR(data.metrics.expenses, true)}</p></div>
        <div className="metric-card"><p className="metric-label">Net Profit</p><p className="metric-value text-emerald-400">{formatINR(data.metrics.profit, true)}</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center py-6">
          <Users size={24} className="text-indigo-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{data.counts.customers}</p>
          <p className="text-slate-400 text-sm">Customers</p>
        </div>
        <div className="card text-center py-6">
          <Briefcase size={24} className="text-indigo-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{data.counts.vendors}</p>
          <p className="text-slate-400 text-sm">Vendors</p>
        </div>
        <div className="card text-center py-6">
          <FileText size={24} className="text-indigo-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{data.counts.invoices}</p>
          <p className="text-slate-400 text-sm">Invoices</p>
        </div>
      </div>

      <div className="card border-indigo-500/20 bg-gradient-to-r from-slate-900 to-indigo-950/30">
        <h2 className="text-base font-semibold text-white mb-4">Enterprise Modules (Coming Soon)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(data.placeholders).map(([key, info]: [string, any]) => (
            <div key={key} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center opacity-70">
              <p className="text-white text-sm font-medium mb-1">{info.label}</p>
              <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">In Development</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
