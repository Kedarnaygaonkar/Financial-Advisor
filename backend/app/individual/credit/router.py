from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from bson import ObjectId
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.ml.credit_model.scorer import CreditScorer
from app.utils.exceptions import not_found

router = APIRouter(prefix="/credit", tags=["Individual - Credit"])
scorer = CreditScorer()


class CreditProfileRequest(BaseModel):
    monthly_income: float
    total_loans: float = 0.0
    monthly_emi: float = 0.0
    credit_utilization_pct: float = 0.0
    repayment_history_pct: float = 100.0
    num_credit_accounts: int = 0
    num_missed_payments: int = 0


@router.get("/profile")
async def get_credit_profile(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    profile = await db.credit_profiles.find_one({"user_id": current_user["_id"]})
    if not profile:
        return {"message": "No credit profile found. Please set up your credit profile.", "exists": False}
    profile["_id"] = str(profile["_id"])
    return {**profile, "exists": True}


@router.put("/profile")
async def update_credit_profile(
    request: CreditProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    # Run scoring immediately
    result = scorer.score(
        monthly_income=request.monthly_income,
        total_loans=request.total_loans,
        monthly_emi=request.monthly_emi,
        credit_utilization_pct=request.credit_utilization_pct,
        repayment_history_pct=request.repayment_history_pct,
        num_credit_accounts=request.num_credit_accounts,
        num_missed_payments=request.num_missed_payments,
    )

    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "monthly_income": request.monthly_income,
        "total_loans": request.total_loans,
        "monthly_emi": request.monthly_emi,
        "credit_utilization_pct": request.credit_utilization_pct,
        "repayment_history_pct": request.repayment_history_pct,
        "num_credit_accounts": request.num_credit_accounts,
        "num_missed_payments": request.num_missed_payments,
        "estimated_credit_score": result["estimated_credit_score"],
        "risk_category": result["risk_category"],
        "suggestions": result["suggestions"],
        "component_scores": result["component_scores"],
        "trajectory": result["trajectory"],
        "computed_at": now,
        "updated_at": now,
    }

    await db.credit_profiles.update_one(
        {"user_id": current_user["_id"]},
        {"$set": doc},
        upsert=True,
    )
    doc.update(result)
    return doc


@router.post("/analyze")
async def analyze_credit(
    request: CreditProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run credit analysis without saving to DB."""
    result = scorer.score(
        monthly_income=request.monthly_income,
        total_loans=request.total_loans,
        monthly_emi=request.monthly_emi,
        credit_utilization_pct=request.credit_utilization_pct,
        repayment_history_pct=request.repayment_history_pct,
        num_credit_accounts=request.num_credit_accounts,
        num_missed_payments=request.num_missed_payments,
    )
    return result
