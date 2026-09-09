from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.individual.expenses.schemas import (
    CreateExpenseRequest, UpdateExpenseRequest, ClassifyExpenseRequest
)
from app.ml.expense_classifier.classifier import ExpenseClassifier
from app.ml.expense_anomaly.detector import AnomalyDetector
from app.utils.exceptions import not_found, bad_request

router = APIRouter(prefix="/expenses", tags=["Individual - Expenses"])
classifier = ExpenseClassifier()


@router.get("/")
async def list_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    query = {"user_id": current_user["_id"]}
    if category:
        query["category"] = category.upper()
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"merchant": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.expenses.count_documents(query)
    cursor = db.expenses.find(query).sort("date", -1).skip(skip).limit(limit)
    expenses = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        expenses.append(doc)

    return {
        "data": expenses,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/")
async def create_expense(
    request: CreateExpenseRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    # Auto-classify if category not provided in description
    ml_confidence = None
    classified_cat = request.category.value

    # Run anomaly detection
    anomaly_result = await _check_anomaly(request.amount, classified_cat, current_user["_id"], db)

    doc = {
        "user_id": current_user["_id"],
        "amount": request.amount,
        "category": classified_cat,
        "description": request.description,
        "date": request.date,
        "payment_method": request.payment_method.value,
        "merchant": request.merchant,
        "is_anomaly": anomaly_result["is_anomaly"],
        "anomaly_reason": anomaly_result.get("reason"),
        "ml_category_confidence": ml_confidence,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.expenses.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{expense_id}")
async def update_expense(
    expense_id: str,
    request: UpdateExpenseRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    expense = await db.expenses.find_one(
        {"_id": ObjectId(expense_id), "user_id": current_user["_id"]}
    )
    if not expense:
        raise not_found("Expense")

    updates = request.model_dump(exclude_none=True)
    if "category" in updates:
        updates["category"] = updates["category"].value
    if "payment_method" in updates:
        updates["payment_method"] = updates["payment_method"].value
    updates["updated_at"] = datetime.utcnow()

    await db.expenses.update_one({"_id": ObjectId(expense_id)}, {"$set": updates})
    updated = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.expenses.delete_one(
        {"_id": ObjectId(expense_id), "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise not_found("Expense")
    return {"message": "Expense deleted successfully"}


@router.post("/classify")
async def classify_expense(request: ClassifyExpenseRequest):
    result = classifier.classify(request.text)
    return result


@router.get("/analytics")
async def get_expense_analytics(
    months: int = Query(6, ge=1, le=24),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    from datetime import timedelta
    end = datetime.utcnow()
    start = end - timedelta(days=months * 30)

    pipeline = [
        {"$match": {"user_id": current_user["_id"], "date": {"$gte": start}}},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"},
                    "category": "$category",
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    cursor = db.expenses.aggregate(pipeline)
    raw = [doc async for doc in cursor]

    # Build monthly summary
    monthly_map = {}
    category_map = {}
    for doc in raw:
        key = f"{doc['_id']['year']}-{doc['_id']['month']:02d}"
        cat = doc["_id"]["category"]
        monthly_map.setdefault(key, 0)
        monthly_map[key] += doc["total"]
        category_map.setdefault(cat, 0)
        category_map[cat] += doc["total"]

    monthly_trend = [{"month": k, "total": v} for k, v in sorted(monthly_map.items())]
    category_dist = [{"category": k, "total": round(v, 2)} for k, v in sorted(category_map.items(), key=lambda x: -x[1])]

    # Month-over-month change
    mom_change = None
    if len(monthly_trend) >= 2:
        prev = monthly_trend[-2]["total"]
        curr = monthly_trend[-1]["total"]
        mom_change = round(((curr - prev) / prev) * 100, 1) if prev > 0 else 0

    return {
        "monthly_trend": monthly_trend,
        "category_distribution": category_dist,
        "month_over_month_change_pct": mom_change,
        "average_monthly": round(sum(v["total"] for v in monthly_trend) / len(monthly_trend), 2) if monthly_trend else 0,
        "top_categories": category_dist[:3],
    }


@router.get("/anomalies")
async def get_anomalies(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.expenses.find(
        {"user_id": current_user["_id"], "is_anomaly": True}
    ).sort("date", -1).limit(20)
    anomalies = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        anomalies.append(doc)
    return anomalies


async def _check_anomaly(amount: float, category: str, user_id: str, db) -> dict:
    """Check if expense amount is anomalous based on historical average for that category."""
    from datetime import timedelta
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    pipeline = [
        {"$match": {"user_id": user_id, "category": category, "date": {"$gte": three_months_ago}}},
        {"$group": {"_id": None, "avg": {"$avg": "$amount"}, "std": {"$stdDevPop": "$amount"}, "count": {"$sum": 1}}},
    ]
    result = [doc async for doc in db.expenses.aggregate(pipeline)]
    if not result or result[0]["count"] < 3:
        return {"is_anomaly": False}

    stats = result[0]
    avg = stats["avg"]
    std = stats["std"] or avg * 0.3  # fallback: 30% of avg
    threshold = avg + 2.5 * std

    if amount > threshold:
        return {
            "is_anomaly": True,
            "reason": f"This {category.lower()} expense (₹{amount:,.0f}) is significantly higher than your usual range (avg ₹{avg:,.0f}, std ₹{std:,.0f})",
        }
    return {"is_anomaly": False}
