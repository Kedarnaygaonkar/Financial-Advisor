"""
AI Tool Registry — functions available to Gemini for financial queries.
Each tool fetches real user data from MongoDB.
The AI is NOT allowed to invent financial information.
"""
from datetime import datetime, timedelta
from typing import Optional
from app.database import get_db


async def get_financial_summary(user_id: str) -> dict:
    """Get a complete financial summary for the user."""
    db = get_db()
    now = datetime.utcnow()
    this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Income
    inc = [d async for d in db.income.aggregate([
        {"$match": {"user_id": user_id, "date": {"$gte": this_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])]
    monthly_income = inc[0]["total"] if inc else 0

    # Expenses
    exp = [d async for d in db.expenses.aggregate([
        {"$match": {"user_id": user_id, "date": {"$gte": this_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])]
    monthly_expenses = exp[0]["total"] if exp else 0

    # Investments
    portfolio_value = 0.0
    async for inv in db.investments.find({"user_id": user_id}):
        portfolio_value += inv["quantity"] * inv["current_price"]

    # Credit
    credit = await db.credit_profiles.find_one({"user_id": user_id})

    # Health score (from last saved)
    health = await db.financial_health_scores.find_one(
        {"user_id": user_id}, sort=[("computed_at", -1)]
    )

    return {
        "monthly_income_inr": round(monthly_income, 2),
        "monthly_expenses_inr": round(monthly_expenses, 2),
        "monthly_savings_inr": round(monthly_income - monthly_expenses, 2),
        "savings_rate_pct": round(
            (monthly_income - monthly_expenses) / monthly_income * 100 if monthly_income > 0 else 0, 1
        ),
        "portfolio_value_inr": round(portfolio_value, 2),
        "estimated_credit_score": credit.get("estimated_credit_score") if credit else None,
        "financial_health_score": health.get("score") if health else None,
        "total_debt_inr": credit.get("total_loans", 0) if credit else 0,
    }


async def get_expenses(user_id: str, month: Optional[int] = None, year: Optional[int] = None, category: Optional[str] = None) -> dict:
    """Get expense breakdown for a given month/year."""
    db = get_db()
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    start = datetime(y, m, 1)
    if m == 12:
        end = datetime(y + 1, 1, 1)
    else:
        end = datetime(y, m + 1, 1)

    match = {"user_id": user_id, "date": {"$gte": start, "$lt": end}}
    if category:
        match["category"] = category.upper()

    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    breakdown = [d async for d in db.expenses.aggregate(pipeline)]
    total = sum(d["total"] for d in breakdown)

    return {
        "period": f"{y}-{m:02d}",
        "total_inr": round(total, 2),
        "breakdown": [{"category": d["_id"], "amount": round(d["total"], 2), "count": d["count"]} for d in breakdown],
    }


async def get_income(user_id: str, month: Optional[int] = None, year: Optional[int] = None) -> dict:
    """Get income breakdown for a given month/year."""
    db = get_db()
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start = datetime(y, m, 1)
    end = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)

    pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": "$source", "total": {"$sum": "$amount"}}},
    ]
    breakdown = [d async for d in db.income.aggregate(pipeline)]
    total = sum(d["total"] for d in breakdown)

    return {
        "period": f"{y}-{m:02d}",
        "total_inr": round(total, 2),
        "sources": [{"source": d["_id"], "amount": round(d["total"], 2)} for d in breakdown],
    }


async def get_investments(user_id: str) -> dict:
    """Get current portfolio overview."""
    db = get_db()
    holdings = []
    total_invested = 0
    total_value = 0
    async for inv in db.investments.find({"user_id": user_id}):
        inv_val = inv["quantity"] * inv["current_price"]
        inv_cost = inv["quantity"] * inv["purchase_price"]
        holdings.append({
            "name": inv["name"],
            "type": inv["asset_type"],
            "current_value_inr": round(inv_val, 2),
            "invested_inr": round(inv_cost, 2),
            "pnl_inr": round(inv_val - inv_cost, 2),
        })
        total_value += inv_val
        total_invested += inv_cost

    return {
        "total_value_inr": round(total_value, 2),
        "total_invested_inr": round(total_invested, 2),
        "total_pnl_inr": round(total_value - total_invested, 2),
        "return_pct": round((total_value - total_invested) / total_invested * 100, 2) if total_invested > 0 else 0,
        "holdings_count": len(holdings),
        "holdings": holdings,
    }


async def get_credit_profile(user_id: str) -> dict:
    """Get credit health information."""
    db = get_db()
    credit = await db.credit_profiles.find_one({"user_id": user_id})
    if not credit:
        return {"exists": False, "message": "No credit profile set up"}

    return {
        "estimated_credit_score": credit.get("estimated_credit_score"),
        "risk_category": credit.get("risk_category"),
        "monthly_emi_inr": credit.get("monthly_emi", 0),
        "total_loans_inr": credit.get("total_loans", 0),
        "credit_utilization_pct": credit.get("credit_utilization_pct", 0),
        "suggestions": credit.get("suggestions", []),
        "disclaimer": "Estimated credit health — not an official CIBIL/bureau score",
    }


async def get_financial_health(user_id: str) -> dict:
    """Get latest financial health score."""
    db = get_db()
    health = await db.financial_health_scores.find_one(
        {"user_id": user_id}, sort=[("computed_at", -1)]
    )
    if not health:
        return {"exists": False, "message": "No health score computed yet"}
    return {
        "score": health["score"],
        "components": health["components"],
        "key_insights": health.get("delta_reasons", []),
    }


async def get_goals(user_id: str) -> dict:
    """Get all active financial goals and their progress."""
    db = get_db()
    goals = [g async for g in db.financial_goals.find({"user_id": user_id, "is_active": True})]
    if not goals:
        return {"count": 0, "goals": []}

    now = datetime.utcnow()
    result = []
    for g in goals:
        months_left = max(0, int((g["target_date"] - now).days / 30))
        progress_pct = min(100, g.get("current_amount", 0) / max(g.get("target_amount", 1), 1) * 100)
        result.append({
            "name": g["name"],
            "type": g["goal_type"],
            "target_inr": g["target_amount"],
            "current_inr": g.get("current_amount", 0),
            "progress_pct": round(progress_pct, 1),
            "months_remaining": months_left,
            "on_track": progress_pct >= (1 - months_left / max((g["target_date"] - g["created_at"]).days / 30, 1)) * 100,
        })

    return {"count": len(result), "goals": result}


# Tool definitions for Gemini function calling
TOOL_DEFINITIONS = [
    {
        "name": "get_financial_summary",
        "description": "Get a complete financial summary including monthly income, expenses, savings rate, portfolio value, credit score, and financial health score for the current user",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_expenses",
        "description": "Get expense breakdown by category for a specific month and year. Optionally filter by category.",
        "parameters": {
            "type": "object",
            "properties": {
                "month": {"type": "integer", "description": "Month number (1-12). Defaults to current month."},
                "year": {"type": "integer", "description": "Year (e.g. 2024). Defaults to current year."},
                "category": {"type": "string", "description": "Optional expense category to filter by (FOOD, TRAVEL, SHOPPING, BILLS, RENT, EMI, MEDICAL, EDUCATION, ENTERTAINMENT, INVESTMENT, OTHER)"},
            },
            "required": [],
        },
    },
    {
        "name": "get_income",
        "description": "Get income breakdown by source for a specific month and year",
        "parameters": {
            "type": "object",
            "properties": {
                "month": {"type": "integer", "description": "Month number (1-12). Defaults to current month."},
                "year": {"type": "integer", "description": "Year. Defaults to current year."},
            },
            "required": [],
        },
    },
    {
        "name": "get_investments",
        "description": "Get current investment portfolio overview including all holdings, total value, P&L, and returns",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_credit_profile",
        "description": "Get the user's estimated credit health score, risk category, EMI obligations, and improvement suggestions",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_financial_health",
        "description": "Get the user's Financial Health Score (0-100) and component breakdown",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_goals",
        "description": "Get all active financial goals, their progress percentage, and whether they are on track",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]

# Tool function dispatch map
TOOL_FUNCTIONS = {
    "get_financial_summary": get_financial_summary,
    "get_expenses": get_expenses,
    "get_income": get_income,
    "get_investments": get_investments,
    "get_credit_profile": get_credit_profile,
    "get_financial_health": get_financial_health,
    "get_goals": get_goals,
}
