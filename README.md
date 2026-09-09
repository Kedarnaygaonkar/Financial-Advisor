# 🇮🇳 AI Financial OS — India-First Financial Advisor Platform

A full-stack, AI-powered financial management platform tailored for India (FY 2024-25). Built with **Next.js 15** on the frontend and **FastAPI + MongoDB** on the backend. Live on Vercel + Render.

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| **Frontend (Vercel)** | https://frontend-beta-amber-97.vercel.app |
| **Backend (Render)** | https://financial-advisor-1g9s.onrender.com |
| **GitHub Repo** | https://github.com/Kedarnaygaonkar/Financial-Advisor |

> **Demo Account:** `demo@financialos.in` / `Demo@1234`

---

## 🏗️ Project Structure

```
TY_EDI_Financial_Advisor/
├── README.md                    ← You are here
├── frontend/                    ← Next.js 15 app (deployed on Vercel)
└── backend/                     ← FastAPI app (deployed on Render)
```

---

## 🎨 Frontend (`/frontend`)

**Stack:** Next.js 15, TypeScript, Tailwind CSS (utility-only via globals.css), Recharts, Lucide React

### Structure
```
frontend/
├── next.config.ts               ← Vercel proxy rewrites (CRITICAL - see Auth section)
├── src/
│   ├── app/
│   │   ├── layout.tsx           ← Root layout with AuthProvider
│   │   ├── page.tsx             ← Root redirect (→ /login)
│   │   ├── globals.css          ← Design system: CSS variables, component classes
│   │   ├── login/page.tsx       ← Login + Register page
│   │   ├── individual/          ← Individual user section
│   │   │   ├── layout.tsx       ← Sidebar navigation (Individual + Business tabs)
│   │   │   ├── dashboard/       ← Main dashboard (charts, KPIs, goals summary)
│   │   │   ├── income/          ← Income tracking (add/edit/delete)
│   │   │   ├── expenses/        ← Expense tracking + AI classification
│   │   │   │   └── analytics/   ← Spending analytics (pie charts, trends)
│   │   │   ├── investments/
│   │   │   │   ├── portfolio/   ← Portfolio overview (Stocks, MF, FD, Gold, etc.)
│   │   │   │   └── performance/ ← Performance tracking
│   │   │   ├── credit/          ← Credit health & CIBIL score
│   │   │   ├── tax/             ← India Tax Planner (Old vs New regime FY 2024-25)
│   │   │   ├── goals/           ← Financial goals tracker
│   │   │   ├── retirement/      ← Retirement corpus calculator
│   │   │   ├── financial-health/← Composite financial health score
│   │   │   └── ai-advisor/      ← AI chatbot (Gemini streaming)
│   │   └── business/            ← Business section (🚧 IN PROGRESS)
│   │       ├── layout.tsx
│   │       └── dashboard/       ← Business dashboard (skeleton ready)
│   ├── contexts/
│   │   └── AuthContext.tsx      ← Auth state (user, login, logout, register)
│   ├── lib/
│   │   ├── api.ts               ← All API calls (CRITICAL - see Auth section)
│   │   └── utils.ts             ← formatINR, formatPct, color helpers, constants
│   └── types/
│       └── index.ts             ← Shared TypeScript types (User, DashboardData, etc.)
```

### Design System
The entire visual style is defined in [`globals.css`](frontend/src/app/globals.css):
- **Colors:** Slate-950 background, Indigo-500/600 primary, Emerald/Red for positive/negative
- **Components:** `.card`, `.metric-card`, `.nav-item`, `.nav-item-active`, `.btn-primary`, `.skeleton`
- **Typography:** System font stack, gradient text utility `.gradient-text`
- **Animations:** `animate-slide-in`, `animate-fade-in`

---

## ⚙️ Backend (`/backend`)

**Stack:** FastAPI, Python 3.11+, Motor (async MongoDB), Pydantic v2, PyJWT, Google Generative AI

### Structure
```
backend/
├── requirements.txt             ← All Python dependencies
├── .env                         ← Local environment variables (NOT committed)
├── render.yaml                  ← Render deployment config (if present)
└── app/
    ├── main.py                  ← FastAPI app, CORS, route registration
    ├── config.py                ← Settings (pydantic-settings, reads .env)
    ├── database.py              ← MongoDB Motor connection, db singleton
    ├── auth/
    │   ├── router.py            ← Login, register, logout, me, refresh endpoints
    │   ├── service.py           ← User creation, password hashing, token generation
    │   ├── schemas.py           ← RegisterRequest, LoginRequest, AuthResponse
    │   ├── dependencies.py      ← get_current_user dependency (reads X-Access-Token)
    │   └── models.py            ← User model (if separate)
    ├── individual/
    │   ├── dashboard/router.py  ← GET /individual/dashboard/ (aggregated KPIs)
    │   ├── income/router.py     ← CRUD for income records
    │   ├── expenses/router.py   ← CRUD + AI classify + analytics + anomalies
    │   ├── investments/router.py← Portfolio, holdings CRUD, liquidity info
    │   ├── credit/router.py     ← Credit profile, CIBIL analyze
    │   ├── tax/router.py        ← Tax profile, Old vs New regime calculator
    │   ├── goals/router.py      ← Goals CRUD + projection calculator
    │   ├── retirement/router.py ← Retirement plan + corpus calculator
    │   ├── financial_health/router.py ← Health score computation + history
    │   ├── ai/router.py         ← Gemini AI conversations (streaming SSE)
    │   └── recommendations/     ← AI recommendation engine
    ├── business/
    │   └── router.py            ← 🚧 Business section (dashboard, profile, customers,
    │                               vendors, invoices, reports/summary)
    ├── models/                  ← Pydantic data models
    │   ├── financial.py         ← Income, Expense, Investment models
    │   ├── investment.py        ← Holdings, Portfolio models
    │   ├── business.py          ← Company, Customer, Vendor, Invoice models
    │   └── expense.py           ← ExpenseCategory, PaymentMethod enums
    ├── ml/
    │   ├── expense_classifier/  ← Rule-based + ML expense category classifier
    │   └── expense_anomaly/     ← Anomaly detection for unusual spending
    └── utils/
        ├── exceptions.py        ← unauthorized(), bad_request() helpers
        └── security.py          ← JWT encode/decode, password hash/verify
```

### API Route Map

All routes are prefixed with `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Login → returns tokens |
| POST | `/auth/logout` | Clear cookies |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/me` | Update profile |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/individual/dashboard/` | Full dashboard data (single round trip) |
| GET | `/individual/income/` | List income |
| POST | `/individual/income/` | Add income |
| PUT | `/individual/income/{id}` | Update income |
| DELETE | `/individual/income/{id}` | Delete income |
| GET | `/individual/income/summary` | Income summary |
| GET | `/individual/expenses/` | List expenses (paginated) |
| POST | `/individual/expenses/` | Add expense |
| PUT | `/individual/expenses/{id}` | Update expense |
| DELETE | `/individual/expenses/{id}` | Delete expense |
| POST | `/individual/expenses/classify` | AI auto-classify expense |
| GET | `/individual/expenses/analytics` | Spending analytics (by category, trend) |
| GET | `/individual/expenses/anomalies` | Detect unusual spending |
| GET | `/individual/investments/portfolio` | Portfolio overview |
| GET | `/individual/investments/holdings` | List holdings |
| POST | `/individual/investments/holdings` | Add holding |
| PUT | `/individual/investments/holdings/{id}` | Update holding |
| DELETE | `/individual/investments/holdings/{id}` | Delete holding |
| GET | `/individual/investments/liquidity-info` | Liquidity breakdown |
| GET | `/individual/credit/profile` | Credit profile |
| PUT | `/individual/credit/profile` | Update credit data |
| POST | `/individual/credit/analyze` | AI credit analysis |
| GET | `/individual/tax/profile` | Tax profile |
| PUT | `/individual/tax/profile` | Update tax profile |
| POST | `/individual/tax/calculate` | Calculate Old vs New regime |
| GET | `/individual/goals/` | List goals |
| POST | `/individual/goals/` | Create goal |
| PUT | `/individual/goals/{id}` | Update goal |
| DELETE | `/individual/goals/{id}` | Delete goal |
| GET | `/individual/goals/{id}/projection` | Goal progress projection |
| GET | `/individual/retirement/plan` | Get retirement plan |
| POST | `/individual/retirement/calculate` | Calculate retirement corpus |
| GET | `/individual/financial-health/score` | Current health score |
| GET | `/individual/financial-health/history` | Score history |
| GET | `/individual/ai/conversations` | List AI conversations |
| POST | `/individual/ai/conversations` | Start new conversation |
| GET | `/individual/ai/conversations/{id}/messages` | Get messages |
| POST | `/individual/ai/conversations/{id}/messages` | Send message (streaming) |
| GET | `/business/dashboard` | 🚧 Business dashboard |
| GET | `/business/profile` | 🚧 Company profile |
| GET | `/business/customers` | 🚧 Customer list |
| GET | `/business/vendors` | 🚧 Vendor list |
| GET | `/business/invoices` | 🚧 Invoice list |
| GET | `/business/reports/summary` | 🚧 Business reports |

---

## 🔐 Authentication Architecture (CRITICAL)

This is the most important section for any AI or developer continuing this project.

### The Problem We Solved
Vercel (frontend) and Render (backend) are on different domains. This causes:
1. **Cross-domain cookies blocked** by Chrome/Firefox (third-party cookie restrictions)
2. **Authorization header stripped** by Vercel's rewrite proxy

### The Solution: Vercel Proxy + Custom Header

**Step 1 — Vercel Proxy (`frontend/next.config.ts`)**

All `/api/v1/*` requests from the browser go to Vercel first. Vercel forwards them server-side to Render. The browser thinks it's talking to the same domain.

```typescript
// frontend/next.config.ts
async rewrites() {
  return [
    { source: '/api/v1/:path*/', destination: 'https://financial-advisor-1g9s.onrender.com/api/v1/:path*/' },
    { source: '/api/v1/:path*',  destination: 'https://financial-advisor-1g9s.onrender.com/api/v1/:path*' },
  ];
}
```

**Step 2 — Token in localStorage (`frontend/src/lib/api.ts`)**

After login, the JWT access token is stored in `localStorage` (NOT cookies — cookies across domains are unreliable).

```typescript
// After login:
localStorage.setItem('access_token', data.access_token);
// Every request:
headers['X-Access-Token'] = localStorage.getItem('access_token');
```

**Step 3 — Custom Header NOT Authorization (`frontend/src/lib/api.ts`)**

⚠️ **DO NOT change this to `Authorization: Bearer`** — Vercel strips the Authorization header in rewrites. We use the custom header `X-Access-Token` which Vercel passes through unchanged.

**Step 4 — Backend reads X-Access-Token (`backend/app/auth/dependencies.py`)**

```python
async def get_current_user(request: Request, access_token = Cookie(default=None), db = Depends(get_db)):
    token = request.headers.get("X-Access-Token")  # Primary
    or  request.headers.get("Authorization")[7:]    # Fallback
    or  access_token                                # Cookie fallback
```

### Token Details
- **Access token:** 15 minutes TTL (JWT, HS256)
- **Refresh token:** 7 days TTL
- **Storage:** `localStorage` (`access_token`, `refresh_token`)
- **Cookie settings:** `SameSite=none; Secure; HttpOnly` (kept for legacy/fallback)

### Auth Flow Diagram
```
Browser → POST /api/v1/auth/login → Vercel → Render
                                              ↓ 200 OK + {access_token, refresh_token}
Browser stores access_token in localStorage
Browser → GET /api/v1/individual/dashboard/ → Vercel → Render
  sends: X-Access-Token: <jwt>                          ↓
                                              Render decodes JWT → 200 OK
```

---

## 🗄️ Database (MongoDB Atlas)

**Database name:** `Financial_Advisor`

### Collections

| Collection | Description |
|---|---|
| `users` | User accounts (`email`, `full_name`, `account_type`, `is_active`, `password_hash`) |
| `income` | Income records (`user_id`, `amount`, `source`, `date`, `category`) |
| `expenses` | Expense records (`user_id`, `amount`, `category`, `payment_method`, `date`, `description`) |
| `investments` | Investment holdings (`user_id`, `asset_class`, `name`, `quantity`, `buy_price`, `current_price`) |
| `credit_profiles` | Credit info (`user_id`, `score`, `risk_level`, `loans`, `credit_cards`) |
| `tax_profiles` | Tax profile (`user_id`, `gross_income`, `deductions`, `regime`, `pan`) |
| `goals` | Financial goals (`user_id`, `name`, `goal_type`, `target_amount`, `current_amount`, `target_date`) |
| `retirement_plans` | Retirement data (`user_id`, `current_age`, `retirement_age`, `corpus_target`) |
| `health_scores` | Daily financial health snapshots (`user_id`, `score`, `components`, `date`) |
| `ai_conversations` | AI chat sessions (`user_id`, `title`, `created_at`) |
| `ai_messages` | Chat messages (`conversation_id`, `role`, `content`, `created_at`) |
| `profiles` | Extended user profile (`user_id`, `phone`, `dob`, `risk_profile`) |
| `companies` | Business company profiles |
| `company_users` | Business user membership/roles |

---

## 🤖 AI Integration

**Model:** `gemini-2.0-flash` (configured via `LLM_MODEL` env var — must use this model)

**Used for:**
1. **AI Advisor chat** — Streaming conversation with context from the user's actual financial data
2. **Expense Classifier** — Auto-categorizes expenses from description text
3. **Credit Analysis** — Natural language credit health assessment

**Key file:** `backend/app/individual/ai/router.py`

The AI has access to the user's real data: income, expenses, investments, goals, net worth, etc. Context is injected into the system prompt before each conversation.

---

## 🇮🇳 India-Specific Features

| Feature | Details |
|---|---|
| **Currency** | All amounts in ₹ (Indian Rupees), formatted with Indian numbering (lakhs/crores) |
| **Tax Regime** | FY 2024-25 — Old regime vs New regime comparison |
| **Tax Slabs** | New regime: 0%, 5%, 10%, 15%, 20%, 25%, 30% as per Budget 2024 |
| **Deductions** | 80C, 80D, HRA, NPS, home loan (80EEA), standard deduction |
| **Investment Types** | Mutual Funds, Stocks (NSE/BSE), Fixed Deposits, PPF, NPS, Gold, Real Estate, EPF |
| **Credit Score** | CIBIL-style scoring (300-900 range) |
| **Goals** | Dream House, Emergency Fund, Education, Travel, Retirement, Wedding (India-context) |

---

## 🚀 Local Development Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Frontend `.env.local` (for local dev)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
> Without this, the proxy in `next.config.ts` defaults to the Render production URL.

---

## 🔧 Environment Variables

### Backend (Render Dashboard → Environment)

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `MONGODB_DB_NAME` | Database name | `Financial_Advisor` |
| `JWT_SECRET` | Secret key for JWT signing (random string) | `supersecretkey123` |
| `LLM_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `LLM_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://frontend-beta-amber-97.vercel.app` |
| `ENVIRONMENT` | `production` or `development` | `production` |

### Frontend (Vercel Dashboard → Settings → Environment Variables)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend Render URL (used in next.config.ts) |

---

## 📦 Key Dependencies

### Backend (`requirements.txt`)
```
fastapi
uvicorn
motor              # Async MongoDB driver
pydantic-settings  # Env var management
pydantic[email]    # Email validation
python-jose        # JWT tokens
passlib[bcrypt]    # Password hashing
google-generativeai # Gemini AI
slowapi            # Rate limiting
```

### Frontend (`package.json`)
```
next@15
react@19
typescript
recharts           # Charts (Area, Bar, Pie)
lucide-react       # Icons
tailwindcss
```

---

## 🚧 What's Built vs What's Pending

### ✅ Completed (Individual Section)
- [x] Authentication (register, login, logout, JWT via X-Access-Token)
- [x] Dashboard (KPIs, net worth, cashflow chart, health score, goals summary)
- [x] Income management (CRUD)
- [x] Expense tracking (CRUD + AI classification + analytics)
- [x] Spending anomaly detection
- [x] Investment portfolio (holdings CRUD, performance)
- [x] Credit health profile
- [x] Tax planner (Old vs New regime, FY 2024-25)
- [x] Financial goals (CRUD + projection)
- [x] Retirement corpus calculator
- [x] Financial health score (composite: savings, debt, investments, etc.)
- [x] AI Advisor chatbot (Gemini streaming, full financial context)

### 🚧 Business Section (Routes defined, pages need implementation)
- [ ] Company profile setup
- [ ] Customer management (CRM)
- [ ] Vendor management
- [ ] Invoice creation & tracking (GST-compliant)
- [ ] Business dashboard (revenue, P&L, cashflow)
- [ ] GST & Tax filing support
- [ ] Payroll management
- [ ] Advanced cash flow forecasting
- [ ] Business AI CFO assistant

### 🔜 Planned Features
- [ ] Bank account aggregation / statement import
- [ ] SIP/EMI calculator
- [ ] Insurance tracker
- [ ] Real-time stock prices (NSE/BSE API)
- [ ] Mutual fund NAV tracking
- [ ] Budget planner with alerts
- [ ] PDF export (P&L, tax summary)
- [ ] Mobile PWA

---

## 🧠 For AI Assistants Continuing This Project

### Before Making Any Changes
1. **Read this README fully** — especially the Auth Architecture section
2. **Never change `X-Access-Token` to `Authorization: Bearer`** — Vercel strips Authorization headers
3. **Always push to `main` branch** — Vercel auto-deploys from main
4. **Wait 2-3 minutes after pushing** for both Vercel and Render to redeploy
5. **After any auth change** — user must sign out and sign in again to get a fresh token

### Adding a New Backend Route
```python
# 1. Create router in backend/app/individual/<feature>/router.py
router = APIRouter(prefix="/<feature>", tags=["Individual - Feature"])

@router.get("/endpoint")  # NO trailing slash on named routes
async def my_endpoint(current_user = Depends(get_current_user), db = Depends(get_db)):
    ...

# 2. Register in backend/app/main.py
from app.individual.<feature>.router import router as <feature>_router
app.include_router(<feature>_router, prefix=f"{API_V1}/individual")
```

### Adding a New Frontend API Call
```typescript
// In frontend/src/lib/api.ts
export const myFeature = {
  list: () => request('/individual/<feature>'),         // No trailing slash for named routes
  create: (data) => request('/individual/<feature>/', { // Trailing slash for root "/"
    method: 'POST', body: JSON.stringify(data)
  }),
};
```

### Route Slash Rules (Critical)
- Backend route `@router.get("/")` with `prefix="/expenses"` → full path is `/expenses/` → call WITH slash
- Backend route `@router.get("/analytics")` → full path is `/expenses/analytics` → call WITHOUT slash
- FastAPI's `redirect_slashes=True` (default) causes 307 redirects that can drop POST bodies

### MongoDB Access
The database is MongoDB Atlas. For local development, ensure:
- Your IP is whitelisted in Atlas Network Access
- In production, set Network Access to `0.0.0.0/0` (allow all IPs) since Render IPs are dynamic

---

## 🐛 Known Issues & Gotchas

| Issue | Status | Notes |
|---|---|---|
| Render cold starts | Known | Render free tier sleeps after 15min. First request may take 30-60s |
| Token expiry | Known | Access token expires in 15min. Refresh token logic is implemented but auto-refresh not wired to frontend yet |
| Business pages | Pending | Routes exist in backend, frontend pages need full implementation |
| Vercel Authorization header | Resolved | Use `X-Access-Token` custom header, NOT `Authorization: Bearer` |
| SameSite cookie cross-domain | Resolved | Solved via Vercel proxy (same-domain to browser) |

---

## 👨‍💻 Team

- **Kedar Naygaonkar** —  Full-stack Development
- *Add your teammates here*

---

## 📝 License

Academic project — TY EDI (Third Year Engineering Design and Innovation)
