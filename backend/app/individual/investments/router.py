from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from bson import ObjectId
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.utils.exceptions import not_found

router = APIRouter(prefix="/investments", tags=["Individual - Investments"])


class HoldingRequest(BaseModel):
    asset_type: str
    name: str
    symbol: Optional[str] = None
    quantity: float
    purchase_price: float
    purchase_date: datetime
    current_price: float
    notes: Optional[str] = None


@router.get("/portfolio")
async def get_portfolio(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.investments.find({"user_id": current_user["_id"]})
    holdings = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["invested_amount"] = doc["quantity"] * doc["purchase_price"]
        doc["current_value"] = doc["quantity"] * doc["current_price"]
        doc["profit_loss"] = doc["current_value"] - doc["invested_amount"]
        doc["return_pct"] = (
            round(doc["profit_loss"] / doc["invested_amount"] * 100, 2)
            if doc["invested_amount"] > 0 else 0
        )
        holdings.append(doc)

    if not holdings:
        return {
            "holdings": [],
            "summary": {"total_invested": 0, "total_value": 0, "total_pnl": 0, "return_pct": 0},
            "allocation": [],
        }

    total_invested = sum(h["invested_amount"] for h in holdings)
    total_value = sum(h["current_value"] for h in holdings)
    total_pnl = total_value - total_invested

    # Asset type allocation
    allocation_map = {}
    for h in holdings:
        at = h["asset_type"]
        allocation_map.setdefault(at, {"asset_type": at, "value": 0, "invested": 0})
        allocation_map[at]["value"] += h["current_value"]
        allocation_map[at]["invested"] += h["invested_amount"]

    for k in allocation_map:
        v = allocation_map[k]["value"]
        allocation_map[k]["percentage"] = round(v / total_value * 100, 1) if total_value > 0 else 0

    return {
        "holdings": holdings,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_value": round(total_value, 2),
            "total_pnl": round(total_pnl, 2),
            "return_pct": round((total_pnl / total_invested * 100), 2) if total_invested > 0 else 0,
        },
        "allocation": list(allocation_map.values()),
    }


@router.get("/holdings")
async def list_holdings(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.investments.find({"user_id": current_user["_id"]}).sort("asset_type", 1)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


@router.post("/holdings")
async def add_holding(
    request: HoldingRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "asset_type": request.asset_type.upper(),
        "name": request.name,
        "symbol": request.symbol,
        "quantity": request.quantity,
        "purchase_price": request.purchase_price,
        "purchase_date": request.purchase_date,
        "current_price": request.current_price,
        "current_price_updated_at": now,
        "notes": request.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.investments.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/holdings/{holding_id}")
async def update_holding(
    holding_id: str,
    request: HoldingRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    existing = await db.investments.find_one(
        {"_id": ObjectId(holding_id), "user_id": current_user["_id"]}
    )
    if not existing:
        raise not_found("Holding")

    updates = request.model_dump()
    updates["asset_type"] = updates["asset_type"].upper()
    updates["updated_at"] = datetime.utcnow()
    await db.investments.update_one({"_id": ObjectId(holding_id)}, {"$set": updates})
    updated = await db.investments.find_one({"_id": ObjectId(holding_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/holdings/{holding_id}")
async def delete_holding(
    holding_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.investments.delete_one(
        {"_id": ObjectId(holding_id), "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise not_found("Holding")
    return {"message": "Holding deleted"}


@router.get("/liquidity-info")
async def get_liquidity_info(current_user: dict = Depends(get_current_user)):
    """
    Returns external liquidity project info.
    No ML model is implemented here — links to the dedicated liquidity project.
    """
    from app.config import settings
    return {
        "title": "Advanced Portfolio Liquidity Analysis",
        "description": "For detailed liquidity prediction and analysis, use our dedicated liquidity platform.",
        "external_url": settings.LIQUIDITY_PROJECT_URL or None,
        "note": "Liquidity prediction is handled by a separate specialized project.",
    }
