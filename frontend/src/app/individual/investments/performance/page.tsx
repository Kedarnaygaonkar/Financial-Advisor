'use client';
import { TrendingUp, BarChart2 } from 'lucide-react';

export default function PerformancePage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Performance</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your portfolio returns over time</p>
        </div>
      </div>

      <div className="coming-soon-module mt-10">
        <div className="flex flex-col items-center justify-center py-20 w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <TrendingUp size={32} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Performance Analytics</h2>
          <p className="text-slate-400 max-w-md">
            Detailed performance tracking, benchmarking against major indices, and historical return analytics will be available in the next update.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="skeleton h-32 w-48 rounded-xl" />
            <div className="skeleton h-32 w-48 rounded-xl" />
            <div className="skeleton h-32 w-48 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
