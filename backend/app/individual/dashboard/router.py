from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.individual.financial_health.router import compute_financial_health

router = APIRouter(prefix="/dashboard", tags=["Individual - Dashboard"])


@router.get("/")
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Returns all data needed to render the Individual Dashboard.
    Single endpoint to minimize round trips.
    """
    user_id = current_user["_id"]
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    # ── Monthly Income ──────────────────────────────────────────────────────
    inc_cur = [doc async for doc in db.income.aggregate([
        {"$match": {"user_id": user_id, "date": {"$gte": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])]
    monthly_income = inc_cur[0]["total"] if inc_cur else 0

    inc_prev = [doc async for doc in db.income.aggregate([
        {"$match": {"user_id": user_id, "date": {"$gte": last_month_start, "$lt": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])]
    prev_income = inc_prev[0]["total"] if inc_prev else 0

    # ── Monthly Expenses ─────────────────────────────────────────────────────
    exp_cur = [doc async for doc in db.expenses.aggregate([
        {"$match": {"user_id": user_id, "date": {"$gte": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])]
    monthly_expenses = exp_cur[0]["total"] if exp_cur else 0

    exp_prev = [doc async for doc in db.expenses.aggregate([
        {"$match": {"user_id": user_id, "date": {"$gte": last_month_start, "$lt": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])]
    prev_expenses = exp_prev[0]["total"] if exp_prev else 0

    # ── Portfolio ────────────────────────────────────────────────────────────
    portfolio_value = 0.0
    portfolio_invested = 0.0
    async for inv in db.investments.find({"user_id": user_id}):
        portfolio_value += inv["quantity"] * inv["current_price"]
        portfolio_invested += inv["quantity"] * inv["purchase_price"]

    # ── Credit ───────────────────────────────────────────────────────────────
    credit = await db.credit_profiles.find_one({"user_id": user_id})
    credit_score = credit.get("estimated_credit_score") if credit else None
    credit_risk = credit.get("risk_category") if credit else None

    # ── Loans / Debt ─────────────────────────────────────────────────────────
    total_debt = credit.get("total_loans", 0) if credit else 0

    # ── Net Worth ────────────────────────────────────────────────────────────
    net_worth = portfolio_value - total_debt

    # ── Savings Rate ────────────────────────────────────────────────────────
    savings_rate = 0.0
    if monthly_income > 0:
        savings_rate = max(0, (monthly_income - monthly_expenses) / monthly_income * 100)

    # ── Goals ────────────────────────────────────────────────────────────────
    goals = [doc async for doc in db.financial_goals.find({"user_id": user_id, "is_active": True})]
    goals_summary = [
        {
            "name": g["name"],
            "goal_type": g["goal_type"],
            "progress_pct": round(
                min(100, g.get("current_amount", 0) / max(g.get("target_amount", 1), 1) * 100), 1
            ),
            "target_amount": g["target_amount"],
            "current_amount": g.get("current_amount", 0),
        }
        for g in goals[:5]
    ]

    # ── Cash Flow 6-month chart ──────────────────────────────────────────────
    six_months_ago = now - timedelta(days=180)
    cashflow_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": six_months_ago}}},
        {"$group": {
            "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
            "total": {"$sum": "$amount"},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    income_monthly = {
        f"{d['_id']['year']}-{d['_id']['month']:02d}": d["total"]
        async for d in db.income.aggregate(cashflow_pipeline)
    }
    expense_monthly = {
        f"{d['_id']['year']}-{d['_id']['month']:02d}": d["total"]
        async for d in db.expenses.aggregate(cashflow_pipeline)
    }
    all_months = sorted(set(list(income_monthly.keys()) + list(expense_monthly.keys())))
    cashflow_chart = [
        {
            "month": m,
            "income": round(income_monthly.get(m, 0), 2),
            "expenses": round(expense_monthly.get(m, 0), 2),
        }
        for m in all_months
    ]

    # ── Financial Health (quick calc, no DB write) ───────────────────────────
    health = await compute_financial_health(user_id, db)

    return {
        "user": {
            "name": current_user["full_name"],
            "account_type": current_user["account_type"],
        },
        "net_worth": round(net_worth, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "savings_rate_pct": round(savings_rate, 1),
        "portfolio_value": round(portfolio_value, 2),
        "portfolio_invested": round(portfolio_invested, 2),
        "total_debt": round(total_debt, 2),
        "credit_score": credit_score,
        "credit_risk": credit_risk,
        "financial_health_score": health["score"],
        "health_components": health["components"],
        "mom_income_change_pct": round(
            ((monthly_income - prev_income) / prev_income * 100) if prev_income > 0 else 0, 1
        ),
        "mom_expense_change_pct": round(
            ((monthly_expenses - prev_expenses) / prev_expenses * 100) if prev_expenses > 0 else 0, 1
        ),
        "cashflow_chart": cashflow_chart,
        "goals_summary": goals_summary,
        "goals_count": len(goals),
    }
