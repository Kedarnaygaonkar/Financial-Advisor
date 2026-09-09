// API requests go through the Next.js rewrite proxy configured in next.config.ts
const API_V1 = '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Token Storage ────────────────────────────────────────────────────────────
export const tokenStore = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },
  set: (token: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('access_token', token);
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  setRefresh: (token: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('refresh_token', token);
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_V1}${path}`;
  const token = tokenStore.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['X-Access-Token'] = token;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail: string = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') {
        detail = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Pydantic validation errors
        detail = data.detail.map((e: any) => {
          const field = e.loc?.slice(1).join('.') || '';
          return field ? `${field}: ${e.msg}` : e.msg;
        }).join('; ');
      } else if (data.detail) {
        detail = JSON.stringify(data.detail);
      }
    } catch {}
    throw new ApiError(res.status, detail);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// NOTE: Backend auth routes have NO trailing slash (/auth/login not /auth/login/)
export const auth = {
  register: async (email: string, password: string, full_name: string, account_type = 'INDIVIDUAL') => {
    const data: any = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name, account_type }) });
    if (data?.access_token) tokenStore.set(data.access_token);
    if (data?.refresh_token) tokenStore.setRefresh(data.refresh_token);
    return data;
  },

  login: async (email: string, password: string) => {
    const data: any = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data?.access_token) tokenStore.set(data.access_token);
    if (data?.refresh_token) tokenStore.setRefresh(data.refresh_token);
    return data;
  },

  logout: async () => {
    try { await request('/auth/logout', { method: 'POST' }); } catch {}
    tokenStore.clear();
  },

  me: () => request('/auth/me'),
  updateMe: (data: object) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  refresh: () => request('/auth/refresh', { method: 'POST' }),
};

// ─── Individual Dashboard ─────────────────────────────────────────────────────
// Backend: prefix="/dashboard", route="/" → full path = /dashboard/
export const dashboard = {
  get: () => request('/individual/dashboard/'),
};

// ─── Income ───────────────────────────────────────────────────────────────────
// Backend: prefix="/income", root route "/" → /income/
// other routes: "/summary" → /income/summary  (no slash)
export const income = {
  list: () => request('/individual/income/'),
  create: (data: object) => request('/individual/income/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: object) => request(`/individual/income/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/individual/income/${id}`, { method: 'DELETE' }),
  summary: () => request('/individual/income/summary'),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
// Backend: prefix="/expenses", root route "/" → /expenses/
// other routes: "/analytics" "/classify" "/anomalies" → no trailing slash
export const expenses = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request(`/individual/expenses/${qs}`);
  },
  create: (data: object) => request('/individual/expenses/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: object) => request(`/individual/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/individual/expenses/${id}`, { method: 'DELETE' }),
  classify: (text: string) => request('/individual/expenses/classify', { method: 'POST', body: JSON.stringify({ text }) }),
  analytics: (months = 6) => request(`/individual/expenses/analytics?months=${months}`),
  anomalies: () => request('/individual/expenses/anomalies'),
};

// ─── Investments ──────────────────────────────────────────────────────────────
// Backend: prefix="/investments", routes "/portfolio" "/holdings" etc → no trailing slash
export const investments = {
  portfolio: () => request('/individual/investments/portfolio'),
  holdings: () => request('/individual/investments/holdings'),
  addHolding: (data: object) => request('/individual/investments/holdings', { method: 'POST', body: JSON.stringify(data) }),
  updateHolding: (id: string, data: object) => request(`/individual/investments/holdings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHolding: (id: string) => request(`/individual/investments/holdings/${id}`, { method: 'DELETE' }),
  liquidityInfo: () => request('/individual/investments/liquidity-info'),
};

// ─── Credit ───────────────────────────────────────────────────────────────────
export const credit = {
  profile: () => request('/individual/credit/profile'),
  update: (data: object) => request('/individual/credit/profile', { method: 'PUT', body: JSON.stringify(data) }),
  analyze: (data: object) => request('/individual/credit/analyze', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Tax ─────────────────────────────────────────────────────────────────────
export const tax = {
  profile: () => request('/individual/tax/profile'),
  updateProfile: (data: object) => request('/individual/tax/profile', { method: 'PUT', body: JSON.stringify(data) }),
  calculate: (data: object) => request('/individual/tax/calculate', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Goals ───────────────────────────────────────────────────────────────────
// Backend: root route "/" → /goals/
// other routes: "/{goal_id}" "/{goal_id}/projection" → no trailing slash
export const goals = {
  list: () => request('/individual/goals/'),
  create: (data: object) => request('/individual/goals/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: object) => request(`/individual/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/individual/goals/${id}`, { method: 'DELETE' }),
  projection: (id: string) => request(`/individual/goals/${id}/projection`),
};

// ─── Retirement ───────────────────────────────────────────────────────────────
// Backend routes: "/plan" "/calculate" → no trailing slash
export const retirement = {
  plan: () => request('/individual/retirement/plan'),
  calculate: (data: object) => request('/individual/retirement/calculate', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Financial Health ─────────────────────────────────────────────────────────
// Backend routes: "/score" "/history" → no trailing slash
export const financialHealth = {
  score: () => request('/individual/financial-health/score'),
  history: () => request('/individual/financial-health/history'),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
// Backend: prefix="/ai", root route for conversations → check what's defined
export const ai = {
  conversations: () => request('/individual/ai/conversations'),
  createConversation: () => request('/individual/ai/conversations', { method: 'POST' }),
  messages: (conversationId: string) => request(`/individual/ai/conversations/${conversationId}/messages`),

  sendMessage: async (conversationId: string, content: string, onChunk: (chunk: string) => void): Promise<void> => {
    const token = tokenStore.get();
    const res = await fetch(`${API_V1}/individual/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Access-Token': token } : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) throw new ApiError(res.status, 'AI request failed');
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  },
};

// ─── Business ─────────────────────────────────────────────────────────────────
export const business = {
  dashboard: () => request('/business/dashboard'),
  profile: () => request('/business/profile'),
  customers: () => request('/business/customers'),
  vendors: () => request('/business/vendors'),
  invoices: () => request('/business/invoices'),
  reports: () => request('/business/reports/summary'),
};
