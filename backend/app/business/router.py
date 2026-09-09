from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.database import get_db

router = APIRouter(prefix="/business", tags=["Business"])


@router.get("/dashboard")
async def business_dashboard(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Basic business dashboard with aggregated financials."""
    # Get companies this user has access to
    company_user_cursor = db.company_users.find({"user_id": current_user["_id"]})
    company_ids = [cu["company_id"] async for cu in company_user_cursor]

    if not company_ids:
        return {
            "has_company": False,
            "message": "No company found. Create a company profile to get started.",
        }

    company_id = company_ids[0]
    company = await db.companies.find_one({"_id": __import__("bson").ObjectId(company_id)})

    # Basic aggregations
    customer_count = await db.customers.count_documents({"company_id": company_id})
    vendor_count = await db.vendors.count_documents({"company_id": company_id})
    invoice_count = await db.invoices.count_documents({"company_id": company_id})

    # Revenue from paid invoices
    rev_pipeline = [
        {"$match": {"company_id": company_id, "status": "PAID"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    rev_result = [d async for d in db.invoices.aggregate(rev_pipeline)]
    revenue = rev_result[0]["total"] if rev_result else 0

    # Pending receivables
    rec_pipeline = [
        {"$match": {"company_id": company_id, "status": {"$in": ["SENT", "OVERDUE"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    rec_result = [d async for d in db.invoices.aggregate(rec_pipeline)]
    receivables = rec_result[0]["total"] if rec_result else 0

    return {
        "has_company": True,
        "company_name": company["name"] if company else "Your Company",
        "company_id": company_id,
        "metrics": {
            "revenue": round(revenue, 2),
            "receivables": round(receivables, 2),
            "expenses": 0,  # Placeholder
            "profit": round(revenue, 2),  # Simplified
        },
        "counts": {
            "customers": customer_count,
            "vendors": vendor_count,
            "invoices": invoice_count,
        },
        "placeholders": {
            "accounting": {"status": "coming_soon", "label": "Full Accounting"},
            "gst_tax": {"status": "coming_soon", "label": "GST & Tax"},
            "payroll": {"status": "coming_soon", "label": "Payroll"},
            "cash_flow": {"status": "coming_soon", "label": "Advanced Cash Flow"},
            "ai_cfo": {"status": "coming_soon", "label": "AI CFO"},
        },
    }


@router.get("/profile")
async def get_company_profile(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    company_user = await db.company_users.find_one({"user_id": current_user["_id"]})
    if not company_user:
        return {"exists": False}

    company = await db.companies.find_one({"_id": __import__("bson").ObjectId(company_user["company_id"])})
    if not company:
        return {"exists": False}

    company["_id"] = str(company["_id"])
    return {**company, "exists": True, "user_role": company_user["role"]}


@router.get("/customers")
async def list_customers(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cu = await db.company_users.find_one({"user_id": current_user["_id"]})
    if not cu:
        return []
    cursor = db.customers.find({"company_id": cu["company_id"]})
    items = [doc async for doc in cursor]
    for doc in items:
        doc["_id"] = str(doc["_id"])
    return items


@router.get("/vendors")
async def list_vendors(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cu = await db.company_users.find_one({"user_id": current_user["_id"]})
    if not cu:
        return []
    cursor = db.vendors.find({"company_id": cu["company_id"]})
    items = [doc async for doc in cursor]
    for doc in items:
        doc["_id"] = str(doc["_id"])
    return items


@router.get("/invoices")
async def list_invoices(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cu = await db.company_users.find_one({"user_id": current_user["_id"]})
    if not cu:
        return []
    cursor = db.invoices.find({"company_id": cu["company_id"]}).sort("created_at", -1).limit(50)
    items = [doc async for doc in cursor]
    for doc in items:
        doc["_id"] = str(doc["_id"])
    return items


@router.get("/reports/summary")
async def business_reports_summary(
    current_user: dict = Depends(get_current_user),
):
    return {
        "message": "Basic reports available",
        "available_reports": ["Revenue Summary", "Invoice Status", "Customer List", "Vendor List"],
        "coming_soon": ["P&L Statement", "Balance Sheet", "Cash Flow", "GST Report", "Payroll Report"],
    }
