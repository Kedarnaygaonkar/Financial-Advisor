from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from bson import ObjectId
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.individual.tax.engine.fy_2024_25 import calculate_old_regime, calculate_new_regime, TaxInput
from app.utils.exceptions import not_found

router = APIRouter(prefix="/tax", tags=["Individual - Tax"])


class TaxProfileRequest(BaseModel):
    financial_year: str = "2024-25"
    gross_income: float = 0.0
    deductions_80c: float = 0.0
    deductions_80d: float = 0.0
    other_deductions: float = 0.0
    capital_gains_stcg: float = 0.0
    capital_gains_ltcg: float = 0.0
    home_loan_interest: float = 0.0
    hra_exemption: float = 0.0
    preferred_regime: Optional[str] = None


@router.get("/profile")
async def get_tax_profile(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    profile = await db.tax_profiles.find_one({"user_id": current_user["_id"]})
    if not profile:
        return {"user_id": current_user["_id"], "financial_year": "2024-25"}
    profile["_id"] = str(profile["_id"])
    return profile


@router.put("/profile")
async def update_tax_profile(
    request: TaxProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    data = request.model_dump()
    data["user_id"] = current_user["_id"]
    data["updated_at"] = datetime.utcnow()

    await db.tax_profiles.update_one(
        {"user_id": current_user["_id"]},
        {"$set": data},
        upsert=True,
    )
    return {"message": "Tax profile updated", **data}


@router.post("/calculate")
async def calculate_tax(
    request: TaxProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Calculate tax under both Old and New regime and compare.
    This is a TAX ESTIMATION TOOL — not an authorized filing service.
    """
    inp = TaxInput(
        gross_income=request.gross_income,
        deductions_80c=request.deductions_80c,
        deductions_80d=request.deductions_80d,
        other_deductions=request.other_deductions,
        capital_gains_stcg=request.capital_gains_stcg,
        capital_gains_ltcg=request.capital_gains_ltcg,
        home_loan_interest=request.home_loan_interest,
        hra_exemption=request.hra_exemption,
    )
    old = calculate_old_regime(inp)
    new = calculate_new_regime(inp)

    recommended = "OLD" if old.total_tax <= new.total_tax else "NEW"
    savings = abs(old.total_tax - new.total_tax)

    return {
        "disclaimer": "This is a tax estimation tool. Consult a CA for official filing.",
        "financial_year": request.financial_year,
        "old_regime": {
            "taxable_income": old.taxable_income,
            "total_tax": old.total_tax,
            "effective_rate": old.effective_rate,
            "total_deductions": old.total_deductions,
            "cess": old.cess,
            "take_home_monthly": old.take_home_monthly,
            "slab_breakdown": old.slab_breakdown,
            "suggestions": old.suggestions,
        },
        "new_regime": {
            "taxable_income": new.taxable_income,
            "total_tax": new.total_tax,
            "effective_rate": new.effective_rate,
            "total_deductions": new.total_deductions,
            "cess": new.cess,
            "take_home_monthly": new.take_home_monthly,
            "slab_breakdown": new.slab_breakdown,
            "suggestions": new.suggestions,
        },
        "recommended_regime": recommended,
        "tax_savings_by_switching": round(savings, 2),
    }
