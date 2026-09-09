from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.database import get_db

router = APIRouter(prefix="/financial-health", tags=["Individual - Financial Health"])


async def compute_financial_health(user_id: str, db) -> dict:
    """
    Compute composite Financial Health Score (0-100) from actual user data.
    Components: savings(20), debt(20), liquidity(15), investments(15),
                income_stability(10), emergency_fund(10), goals(5), insurance(5)
    """
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    three_months_ago = now - timedelta(days=90)

    # --- Income ---
    income_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    income_result = [doc async for doc in db.income.aggregate(income_pipeline)]
    monthly_income = income_result[0]["total"] if income_result else 0

    # --- Expenses ---
    expense_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    expense_result = [doc async for doc in db.expenses.aggregate(expense_pipeline)]
    monthly_expenses = expense_result[0]["total"] if expense_result else 0

    # --- Investments ---
    investments_cursor = db.investments.find({"user_id": user_id})
    total_invested = 0
    total_current_value = 0
    async for inv in investments_cursor:
        total_invested += inv["quantity"] * inv["purchase_price"]
        total_current_value += inv["quantity"] * inv["current_price"]

    # --- Credit ---
    credit = await db.credit_profiles.find_one({"user_id": user_id})

    # --- Goals ---
    goals_cursor = db.financial_goals.find({"user_id": user_id, "is_active": True})
    goals = [g async for g in goals_cursor]
    on_track_goals = sum(
        1 for g in goals
        if g.get("current_amount", 0) / max(g.get("target_amount", 1), 1) >= 0.5
    )
    goal_score = (on_track_goals / max(len(goals), 1)) if goals else 0.5

    # --- COMPONENT SCORING ---
    components = {}

    # 1. Savings (20 pts): savings rate = (income - expenses) / income
    if monthly_income > 0:
        savings_rate = max(0, (monthly_income - monthly_expenses) / monthly_income)
        components["savings"] = min(20, savings_rate * 50)  # 40% savings rate = 20pts
    else:
        components["savings"] = 0

    # 2. Debt (20 pts): lower EMI/income ratio is better
    if credit and monthly_income > 0:
        dti = credit.get("monthly_emi", 0) / monthly_income
        components["debt"] = max(0, 20 * (1 - dti / 0.5))  # 50% DTI = 0pts
    elif monthly_income > 0:
        components["debt"] = 15  # No credit data = assume moderate
    else:
        components["debt"] = 0

    # 3. Liquidity / Emergency Fund (15 pts): months of expenses covered
    liquid_assets = max(0, monthly_income - monthly_expenses)  # monthly surplus as proxy
    monthly_expense_safe = max(monthly_expenses, 1)
    months_covered = min(6, liquid_assets * 3 / monthly_expense_safe)  # 3 months of surplus
    components["liquidity"] = min(15, months_covered * 2.5)  # 6 months = 15pts

    # 4. Investments (15 pts): investment to income ratio
    if monthly_income > 0:
        inv_ratio = total_current_value / (monthly_income * 12)  # vs annual income
        components["investments"] = min(15, inv_ratio * 3)  # 5x annual income = 15pts
    else:
        components["investments"] = 0

    # 5. Income Stability (10 pts): based on number of income sources
    income_sources_count = await db.income.count_documents({"user_id": user_id, "is_active": True})
    components["income_stability"] = min(10, income_sources_count * 3)

    # 6. Emergency Fund (10 pts): check if emergency fund goal exists
    emergency_goal = await db.financial_goals.find_one({
        "user_id": user_id, "goal_type": "EMERGENCY_FUND", "is_active": True
    })
    if emergency_goal:
        progress = emergency_goal.get("current_amount", 0) / max(emergency_goal.get("target_amount", 1), 1)
        components["emergency_fund"] = min(10, progress * 10)
    else:
        components["emergency_fund"] = 2  # partial credit for having other savings

    # 7. Goals (5 pts)
    components["goals"] = min(5, goal_score * 5)

    # 8. Insurance (5 pts) — placeholder (no insurance module yet)
    components["insurance"] = 3  # Default moderate score

    # Round all components
    for k in components:
        components[k] = round(components[k], 1)

    total_score = min(100, max(0, int(sum(components.values()))))

    # Delta reasons
    delta_reasons = []
    if components["savings"] >= 15:
        delta_reasons.append("✅ Strong savings rate")
    elif components["savings"] < 8:
        delta_reasons.append("⚠️ Low savings rate — expenses may be too high")
    if components["debt"] >= 15:
        delta_reasons.append("✅ Healthy debt levels")
    elif components["debt"] < 8:
        delta_reasons.append("⚠️ High debt burden (EMI/income ratio)")
    if total_current_value > 0:
        delta_reasons.append("✅ Actively investing")
    else:
        delta_reasons.append("💡 No investments tracked — consider starting a SIP")
    if emergency_goal:
        delta_reasons.append("✅ Emergency fund goal active")
    else:
        delta_reasons.append("💡 Set up an emergency fund goal (3-6 months expenses)")

    return {
        "score": total_score,
        "components": components,
        "delta_reasons": delta_reasons,
        "computed_at": now.isoformat(),
        "data_used": {
            "monthly_income": round(monthly_income, 2),
            "monthly_expenses": round(monthly_expenses, 2),
            "total_portfolio_value": round(total_current_value, 2),
        },
    }


@router.get("/score")
async def get_health_score(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await compute_financial_health(current_user["_id"], db)

    # Save score for history
    await db.financial_health_scores.insert_one({
        "user_id": current_user["_id"],
        "score": result["score"],
        "components": result["components"],
        "delta_reasons": result["delta_reasons"],
        "computed_at": datetime.utcnow(),
    })

    return result


@router.get("/history")
async def get_health_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.financial_health_scores.find(
        {"user_id": current_user["_id"]}
    ).sort("computed_at", -1).limit(12)
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)
    return history
