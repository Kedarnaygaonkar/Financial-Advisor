/**
 * Format a number as Indian currency (₹)
 * Uses Indian numbering: Lakhs, Crores
 */
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 10_000_000) {
      return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
    }
    if (Math.abs(amount) >= 100_000) {
      return `₹${(amount / 100_000).toFixed(2)} L`;
    }
    if (Math.abs(amount) >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a percentage with + / - prefix */
export function formatPct(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Format a date string to readable format */
export function formatDate(dateStr: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateStr);
  if (format === 'long') {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format month key (2024-06) to readable (Jun 2024) */
export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** Color for credit risk */
export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'LOW': return 'text-emerald-400';
    case 'MEDIUM': return 'text-amber-400';
    case 'HIGH': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

/** Color for financial health score */
export function getHealthColor(score: number): string {
  if (score >= 75) return '#10b981'; // emerald
  if (score >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

/** Category emoji mapping */
export const CATEGORY_EMOJI: Record<string, string> = {
  FOOD: '🍜',
  TRAVEL: '🚗',
  SHOPPING: '🛍️',
  BILLS: '⚡',
  RENT: '🏠',
  EMI: '💳',
  MEDICAL: '💊',
  EDUCATION: '📚',
  ENTERTAINMENT: '🎬',
  INVESTMENT: '📈',
  OTHER: '📌',
};

/** Asset type display names */
export const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCKS: 'Stocks',
  MUTUAL_FUNDS: 'Mutual Funds',
  ETF: 'ETF',
  BONDS: 'Bonds',
  FD: 'Fixed Deposit',
  GOLD: 'Gold',
  OTHER: 'Other',
};

/** Asset type colors for charts */
export const ASSET_COLORS: Record<string, string> = {
  STOCKS: '#6366f1',
  MUTUAL_FUNDS: '#8b5cf6',
  ETF: '#a78bfa',
  BONDS: '#3b82f6',
  FD: '#06b6d4',
  GOLD: '#f59e0b',
  OTHER: '#6b7280',
};

export const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#f97316',
  TRAVEL: '#3b82f6',
  SHOPPING: '#a855f7',
  BILLS: '#eab308',
  RENT: '#ef4444',
  EMI: '#f43f5e',
  MEDICAL: '#10b981',
  EDUCATION: '#06b6d4',
  ENTERTAINMENT: '#8b5cf6',
  INVESTMENT: '#22c55e',
  OTHER: '#6b7280',
};

/** Goal type icons */
export const GOAL_ICONS: Record<string, string> = {
  HOUSE: '🏠',
  CAR: '🚗',
  EDUCATION: '🎓',
  MARRIAGE: '💍',
  TRAVEL: '✈️',
  EMERGENCY_FUND: '🛡️',
  RETIREMENT: '🌅',
  OTHER: '🎯',
};

/** Clamp a value between min and max */
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
