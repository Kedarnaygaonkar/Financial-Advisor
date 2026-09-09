import math
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from bson import ObjectId
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.utils.exceptions import not_found

router = APIRouter(prefix="/goals", tags=["Individual - Goals"])


class GoalRequest(BaseModel):
    name: str
    goal_type: str = "OTHER"
    target_amount: float
    current_amount: float = 0.0
    target_date: datetime
    inflation_rate: float = 6.0
    expected_return: float = 12.0
    monthly_contribution: float = 0.0


def calculate_goal_projection(
    target_amount: float,
    current_amount: float,
    target_date: datetime,
    inflation_rate: float,
    expected_return: float,
    monthly_contribution: float,
) -> dict:
    months_remaining = max(1, int((target_date - datetime.utcnow()).days / 30))
    monthly_rate = expected_return / 100 / 12
    monthly_inflation = inflation_rate / 100 / 12

    # Inflation-adjusted target
    inflation_adjusted_target = target_amount * ((1 + monthly_inflation) ** months_remaining)

    # Future value of current savings
    fv_current = current_amount * ((1 + monthly_rate) ** months_remaining)

    # Future value of monthly contributions
    if monthly_rate > 0:
        fv_contributions = monthly_contribution * (((1 + monthly_rate) ** months_remaining - 1) / monthly_rate)
    else:
        fv_contributions = monthly_contribution * months_remaining

    projected_total = fv_current + fv_contributions
    shortfall = max(0, inflation_adjusted_target - projected_total)
    progress_pct = min(100, (current_amount / target_amount) * 100) if target_amount > 0 else 0

    # Required monthly contribution to meet the inflation-adjusted target
    if monthly_rate > 0 and months_remaining > 0:
        remaining_needed = max(0, inflation_adjusted_target - fv_current)
        req_monthly = remaining_needed * monthly_rate / (((1 + monthly_rate) ** months_remaining) - 1)
    else:
        req_monthly = max(0, inflation_adjusted_target - current_amount) / max(1, months_remaining)

    return {
        "months_remaining": months_remaining,
        "inflation_adjusted_target": round(inflation_adjusted_target, 2),
        "projected_amount": round(projected_total, 2),
        "shortfall": round(shortfall, 2),
        "progress_pct": round(progress_pct, 1),
        "required_monthly_contribution": round(req_monthly, 2),
        "on_track": shortfall == 0,
    }


@router.get("/")
async def list_goals(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.financial_goals.find({"user_id": current_user["_id"], "is_active": True})
    goals = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Attach projection
        proj = calculate_goal_projection(
            doc["target_amount"], doc["current_amount"], doc["target_date"],
            doc.get("inflation_rate", 6.0), doc.get("expected_return", 12.0),
            doc.get("monthly_contribution", 0),
        )
        doc["projection"] = proj
        goals.append(doc)
    return goals


@router.post("/")
async def create_goal(
    request: GoalRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "name": request.name,
        "goal_type": request.goal_type.upper(),
        "target_amount": request.target_amount,
        "current_amount": request.current_amount,
        "target_date": request.target_date,
        "inflation_rate": request.inflation_rate,
        "expected_return": request.expected_return,
        "monthly_contribution": request.monthly_contribution,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.financial_goals.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["projection"] = calculate_goal_projection(
        request.target_amount, request.current_amount, request.target_date,
        request.inflation_rate, request.expected_return, request.monthly_contribution,
    )
    return doc


@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    request: GoalRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    existing = await db.financial_goals.find_one(
        {"_id": ObjectId(goal_id), "user_id": current_user["_id"]}
    )
    if not existing:
        raise not_found("Goal")

    updates = request.model_dump()
    updates["goal_type"] = updates["goal_type"].upper()
    updates["updated_at"] = datetime.utcnow()
    await db.financial_goals.update_one({"_id": ObjectId(goal_id)}, {"$set": updates})
    updated = await db.financial_goals.find_one({"_id": ObjectId(goal_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.financial_goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": current_user["_id"]},
        {"$set": {"is_active": False}},
    )
    if result.matched_count == 0:
        raise not_found("Goal")
    return {"message": "Goal deleted"}


@router.get("/{goal_id}/projection")
async def get_goal_projection(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    goal = await db.financial_goals.find_one(
        {"_id": ObjectId(goal_id), "user_id": current_user["_id"]}
    )
    if not goal:
        raise not_found("Goal")
    return calculate_goal_projection(
        goal["target_amount"], goal["current_amount"], goal["target_date"],
        goal.get("inflation_rate", 6.0), goal.get("expected_return", 12.0),
        goal.get("monthly_contribution", 0),
    )
