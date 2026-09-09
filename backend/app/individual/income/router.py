from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.individual.expenses.schemas import CreateIncomeRequest, UpdateIncomeRequest
from app.utils.exceptions import not_found

router = APIRouter(prefix="/income", tags=["Individual - Income"])


@router.get("/")
async def list_income(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.income.find({"user_id": current_user["_id"]}).sort("date", -1)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


@router.post("/")
async def create_income(
    request: CreateIncomeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "source": request.source.upper(),
        "amount": request.amount,
        "frequency": request.frequency.upper(),
        "description": request.description,
        "date": request.date,
        "is_active": True,
        "created_at": now,
    }
    result = await db.income.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{income_id}")
async def update_income(
    income_id: str,
    request: UpdateIncomeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    existing = await db.income.find_one({"_id": ObjectId(income_id), "user_id": current_user["_id"]})
    if not existing:
        raise not_found("Income record")

    updates = request.model_dump(exclude_none=True)
    if "source" in updates:
        updates["source"] = updates["source"].upper()
    if "frequency" in updates:
        updates["frequency"] = updates["frequency"].upper()

    await db.income.update_one({"_id": ObjectId(income_id)}, {"$set": updates})
    updated = await db.income.find_one({"_id": ObjectId(income_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{income_id}")
async def delete_income(
    income_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.income.delete_one(
        {"_id": ObjectId(income_id), "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise not_found("Income record")
    return {"message": "Income record deleted"}


@router.get("/summary")
async def get_income_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    from datetime import timedelta
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    pipeline = [
        {"$match": {"user_id": current_user["_id"]}},
        {
            "$group": {
                "_id": "$source",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
    ]
    source_breakdown = [doc async for doc in db.income.aggregate(pipeline)]

    # Current month total
    this_month_pipeline = [
        {"$match": {"user_id": current_user["_id"], "date": {"$gte": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    this_month_result = [doc async for doc in db.income.aggregate(this_month_pipeline)]
    this_month_total = this_month_result[0]["total"] if this_month_result else 0

    last_month_pipeline = [
        {"$match": {"user_id": current_user["_id"], "date": {"$gte": last_month_start, "$lt": this_month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    last_month_result = [doc async for doc in db.income.aggregate(last_month_pipeline)]
    last_month_total = last_month_result[0]["total"] if last_month_result else 0

    mom_change = None
    if last_month_total > 0:
        mom_change = round(((this_month_total - last_month_total) / last_month_total) * 100, 1)

    return {
        "this_month_total": round(this_month_total, 2),
        "last_month_total": round(last_month_total, 2),
        "month_over_month_change_pct": mom_change,
        "source_breakdown": [{"source": d["_id"], "total": round(d["total"], 2)} for d in source_breakdown],
    }
