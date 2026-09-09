import math
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.database import get_db

router = APIRouter(prefix="/retirement", tags=["Individual - Retirement"])


class RetirementRequest(BaseModel):
    current_age: int
    retirement_age: int = 60
    life_expectancy: int = 85
    current_monthly_income: float
    current_monthly_expenses: float
    current_investments: float = 0.0
    inflation_rate: float = 6.0
    expected_return: float = 12.0
    post_retirement_return: float = 7.0


def calculate_retirement(req: RetirementRequest) -> dict:
    years_to_retire = max(1, req.retirement_age - req.current_age)
    years_in_retirement = max(1, req.life_expectancy - req.retirement_age)
    months_to_retire = years_to_retire * 12
    months_in_retirement = years_in_retirement * 12

    monthly_rate = req.expected_return / 100 / 12
    post_monthly_rate = req.post_retirement_return / 100 / 12
    inflation_monthly = req.inflation_rate / 100 / 12

    # Inflation-adjusted monthly expenses at retirement
    monthly_expenses_at_retirement = req.current_monthly_expenses * ((1 + inflation_monthly) ** months_to_retire)

    # Required corpus to sustain expenses in retirement (Present Value of annuity)
    # PV = PMT * [(1 - (1+r)^-n) / r]
    if post_monthly_rate > 0:
        corpus_required = monthly_expenses_at_retirement * (
            (1 - (1 + post_monthly_rate) ** -months_in_retirement) / post_monthly_rate
        )
    else:
        corpus_required = monthly_expenses_at_retirement * months_in_retirement

    # Projected corpus: FV of current investments
    fv_current_investments = req.current_investments * ((1 + monthly_rate) ** months_to_retire)

    corpus_gap = max(0, corpus_required - fv_current_investments)

    # Required monthly investment to close the gap
    if monthly_rate > 0 and months_to_retire > 0:
        req_monthly_investment = corpus_gap * monthly_rate / (
            ((1 + monthly_rate) ** months_to_retire) - 1
        )
    else:
        req_monthly_investment = corpus_gap / max(1, months_to_retire)

    # Year-by-year projection chart data
    projection_chart = []
    running_corpus = req.current_investments
    for year in range(years_to_retire + 1):
        projection_chart.append({
            "age": req.current_age + year,
            "projected_corpus": round(running_corpus, 0),
            "required_at_this_point": round(corpus_required * (year / max(years_to_retire, 1)), 0),
        })
        running_corpus = running_corpus * ((1 + monthly_rate) ** 12) + req_monthly_investment * 12

    return {
        "years_to_retire": years_to_retire,
        "years_in_retirement": years_in_retirement,
        "corpus_required": round(corpus_required, 2),
        "corpus_projected": round(fv_current_investments, 2),
        "corpus_gap": round(corpus_gap, 2),
        "required_monthly_investment": round(req_monthly_investment, 2),
        "monthly_expenses_at_retirement": round(monthly_expenses_at_retirement, 2),
        "projection_chart": projection_chart,
        "assumptions": {
            "inflation_rate": f"{req.inflation_rate}% p.a.",
            "expected_return": f"{req.expected_return}% p.a. (pre-retirement)",
            "post_retirement_return": f"{req.post_retirement_return}% p.a.",
            "life_expectancy": req.life_expectancy,
        },
        "disclaimer": "These are projected estimates based on assumed rates. Actual results may vary.",
    }


@router.get("/plan")
async def get_retirement_plan(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    plan = await db.retirement_plans.find_one({"user_id": current_user["_id"]})
    if not plan:
        return {"exists": False, "message": "No retirement plan found. Create one to get started."}
    
    plan["_id"] = str(plan["_id"])
    
    # Ensure missing fields have defaults so calculation works
    req_data = {
        "current_age": plan.get("current_age", 30),
        "retirement_age": plan.get("retirement_age", 60),
        "life_expectancy": plan.get("life_expectancy", 85),
        "current_monthly_income": plan.get("current_monthly_income", 0),
        "current_monthly_expenses": plan.get("current_monthly_expenses", 0),
        "current_investments": plan.get("current_investments", 0),
        "inflation_rate": plan.get("inflation_rate", 6.0),
        "expected_return": plan.get("expected_return", 12.0),
        "post_retirement_return": plan.get("post_retirement_return", 7.0),
    }
    
    req = RetirementRequest(**req_data)
    result = calculate_retirement(req)
    
    return {**plan, **req_data, **result, "exists": True}


@router.post("/calculate")
async def calculate_retirement_plan(
    request: RetirementRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = calculate_retirement(request)

    # Save all raw inputs so they can be re-loaded
    await db.retirement_plans.update_one(
        {"user_id": current_user["_id"]},
        {"$set": {
            "user_id": current_user["_id"],
            "current_age": request.current_age,
            "retirement_age": request.retirement_age,
            "life_expectancy": request.life_expectancy,
            "current_monthly_income": request.current_monthly_income,
            "current_monthly_expenses": request.current_monthly_expenses,
            "current_investments": request.current_investments,
            "inflation_rate": request.inflation_rate,
            "expected_return": request.expected_return,
            "post_retirement_return": request.post_retirement_return,
            "computed_corpus_required": result["corpus_required"],
            "computed_corpus_projected": result["corpus_projected"],
            "computed_monthly_investment": result["required_monthly_investment"],
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )

    return {**request.dict(), **result, "exists": True}
