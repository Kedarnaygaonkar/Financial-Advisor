export interface User {
  id: string;
  email: string;
  full_name: string;
  account_type: 'INDIVIDUAL' | 'BUSINESS';
  created_at: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardData {
  user: { name: string; account_type: string };
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate_pct: number;
  portfolio_value: number;
  portfolio_invested: number;
  total_debt: number;
  credit_score: number | null;
  credit_risk: string | null;
  financial_health_score: number;
  health_components: Record<string, number>;
  mom_income_change_pct: number;
  mom_expense_change_pct: number;
  cashflow_chart: CashflowPoint[];
  goals_summary: GoalSummary[];
  goals_count: number;
}

export interface CashflowPoint {
  month: string;
  income: number;
  expenses: number;
}

export interface GoalSummary {
  name: string;
  goal_type: string;
  progress_pct: number;
  target_amount: number;
  current_amount: number;
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | 'FOOD' | 'TRAVEL' | 'SHOPPING' | 'BILLS' | 'RENT'
  | 'EMI' | 'MEDICAL' | 'EDUCATION' | 'ENTERTAINMENT' | 'INVESTMENT' | 'OTHER';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'NETBANKING' | 'OTHER';

export interface Expense {
  _id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  payment_method: PaymentMethod;
  merchant?: string;
  is_anomaly: boolean;
  anomaly_reason?: string;
  created_at: string;
}

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ExpenseAnalytics {
  monthly_trend: { month: string; total: number }[];
  category_distribution: { category: string; total: number }[];
  month_over_month_change_pct: number | null;
  average_monthly: number;
  top_categories: { category: string; total: number }[];
}

// ─── Income ───────────────────────────────────────────────────────────────────
export type IncomeSource =
  | 'SALARY' | 'FREELANCE' | 'BUSINESS' | 'INTEREST' | 'DIVIDENDS' | 'CAPITAL_GAINS' | 'OTHER';

export interface Income {
  _id: string;
  source: IncomeSource;
  amount: number;
  frequency: string;
  description: string;
  date: string;
  is_active: boolean;
}

export interface IncomeSummary {
  this_month_total: number;
  last_month_total: number;
  month_over_month_change_pct: number | null;
  source_breakdown: { source: string; total: number }[];
}

// ─── Investment ───────────────────────────────────────────────────────────────
export type AssetType =
  | 'STOCKS' | 'MUTUAL_FUNDS' | 'ETF' | 'BONDS' | 'FD' | 'GOLD' | 'OTHER';

export interface Holding {
  _id: string;
  asset_type: AssetType;
  name: string;
  symbol?: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  current_price: number;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  return_pct: number;
}

export interface PortfolioSummary {
  total_invested: number;
  total_value: number;
  total_pnl: number;
  return_pct: number;
}

export interface AllocationItem {
  asset_type: string;
  value: number;
  invested: number;
  percentage: number;
}

export interface Portfolio {
  holdings: Holding[];
  summary: PortfolioSummary;
  allocation: AllocationItem[];
}

// ─── Credit ───────────────────────────────────────────────────────────────────
export interface CreditProfile {
  estimated_credit_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH';
  monthly_emi: number;
  total_loans: number;
  credit_utilization_pct: number;
  suggestions: string[];
  component_scores: Record<string, number>;
  trajectory: 'IMPROVING' | 'STABLE' | 'DECLINING';
  disclaimer: string;
}

// ─── Tax ─────────────────────────────────────────────────────────────────────
export interface TaxResult {
  old_regime: TaxRegimeResult;
  new_regime: TaxRegimeResult;
  recommended_regime: 'OLD' | 'NEW';
  tax_savings_by_switching: number;
  disclaimer: string;
}

export interface TaxRegimeResult {
  taxable_income: number;
  total_tax: number;
  effective_rate: number;
  total_deductions: number;
  cess: number;
  take_home_monthly: number;
  slab_breakdown: { from: number; to: number; rate_pct: number; tax: number }[];
  suggestions: string[];
}

// ─── Goals ───────────────────────────────────────────────────────────────────
export interface FinancialGoal {
  _id: string;
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  inflation_rate: number;
  expected_return: number;
  monthly_contribution: number;
  projection: GoalProjection;
}

export interface GoalProjection {
  months_remaining: number;
  inflation_adjusted_target: number;
  projected_amount: number;
  shortfall: number;
  progress_pct: number;
  required_monthly_contribution: number;
  on_track: boolean;
}

// ─── Financial Health ──────────────────────────────────────────────────────────
export interface FinancialHealthScore {
  score: number;
  components: Record<string, number>;
  delta_reasons: string[];
  computed_at: string;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export interface AIConversation {
  _id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  _id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  created_at: string;
}
