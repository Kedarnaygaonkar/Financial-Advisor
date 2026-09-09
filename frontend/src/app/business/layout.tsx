'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, TrendingUp, Receipt, Users, Building2,
  Briefcase, FileText, ShoppingCart, BarChart3, Bot, LogOut,
  Menu, Wallet
} from 'lucide-react';

const BUSINESS_NAV = [
  {
    label: 'Business',
    items: [
      { href: '/business/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/business/profile', icon: Building2, label: 'Company Profile' },
      { href: '/business/customers', icon: Users, label: 'Customers' },
      { href: '/business/vendors', icon: Briefcase, label: 'Vendors' },
      { href: '/business/invoices', icon: FileText, label: 'Invoices' },
      { href: '/business/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Coming Soon',
    items: [
      { href: '#', icon: Wallet, label: 'Accounting', comingSoon: true },
      { href: '#', icon: Receipt, label: 'GST & Tax', comingSoon: true },
      { href: '#', icon: Users, label: 'Payroll', comingSoon: true },
      { href: '#', icon: TrendingUp, label: 'Advanced Cash Flow', comingSoon: true },
      { href: '#', icon: Bot, label: 'AI CFO', comingSoon: true },
    ],
  },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return <div className="min-h-screen bg-slate-950" />;

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 shrink-0">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg">💰</div>
          <div>
            <p className="text-white font-bold text-sm">AI Financial OS</p>
            <p className="text-slate-500 text-xs">Business Portal</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-slate-800">
        <div className="flex rounded-xl bg-slate-800 p-1">
          <button onClick={() => router.push('/individual/dashboard')} className="flex-1 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 transition-all">
            Individual
          </button>
          <button className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white transition-all">
            Business
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {BUSINESS_NAV.map((group) => (
          <div key={group.label}>
            <p className="nav-section-label">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isComingSoon = (item as any).comingSoon;
              if (isComingSoon) {
                return (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 text-sm font-medium cursor-not-allowed">
                    <Icon size={16} /><span>{item.label}</span><span className="ml-auto text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Soon</span>
                  </div>
                );
              }
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={pathname === item.href ? 'nav-item-active flex' : 'nav-item'}>
                  <Icon size={16} /><span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button onClick={async () => { await logout(); router.push('/login'); }} className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={16} /><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <div className="hidden lg:flex"><Sidebar /></div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full"><Sidebar /></div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto">
        <div className="lg:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">💰</div>
            <span className="text-white font-semibold text-sm">Business Portal</span>
          </div>
        </div>
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
