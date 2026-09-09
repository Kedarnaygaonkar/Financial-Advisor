"""
Seed Data Script — Realistic Indian Individual User
Run: python scripts/seed_data.py
Creates a demo user with 6 months of realistic financial data.

Demo credentials:
  Email: demo@financialos.in
  Password: Demo@1234
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import connect_to_mongodb, get_db
from app.utils.security import hash_password

DEMO_EMAIL = "demo@financialos.in"
DEMO_PASSWORD = "Demo@1234"
DEMO_NAME = "Arjun Mehta"


async def seed():
    await connect_to_mongodb()
    db = get_db()

    # ── Clean existing demo user ─────────────────────────────────────────────
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        user_id = str(existing["_id"])
        await db.income.delete_many({"user_id": user_id})
        await db.expenses.delete_many({"user_id": user_id})
        await db.investments.delete_many({"user_id": user_id})
        await db.credit_profiles.delete_many({"user_id": user_id})
        await db.financial_goals.delete_many({"user_id": user_id})
        await db.retirement_plans.delete_many({"user_id": user_id})
        await db.tax_profiles.delete_many({"user_id": user_id})
        await db.financial_health_scores.delete_many({"user_id": user_id})
        await db.users.delete_one({"_id": existing["_id"]})
        await db.profiles.delete_one({"user_id": user_id})
        print(f"🗑️  Removed existing demo user: {user_id}")

    # ── Create User ──────────────────────────────────────────────────────────
    now = datetime.utcnow()
    user_result = await db.users.insert_one({
        "email": DEMO_EMAIL,
        "password_hash": hash_password(DEMO_PASSWORD),
        "full_name": DEMO_NAME,
        "account_type": "INDIVIDUAL",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })
    user_id = str(user_result.inserted_id)
    print(f"✅ Created user: {user_id}")

    # Profile
    await db.profiles.insert_one({
        "user_id": user_id,
        "phone": "+91-9876543210",
        "date_of_birth": datetime(1992, 5, 15),
        "pan_number": "XXXXX1234X",
        "risk_profile": "MODERATE",
        "currency": "INR",
        "created_at": now,
        "updated_at": now,
    })

    # ── Income — 6 months ────────────────────────────────────────────────────
    income_records = []
    for i in range(6):
        month_date = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        # Salary
        income_records.append({
            "user_id": user_id,
            "source": "SALARY",
            "amount": 100000.0,
            "frequency": "MONTHLY",
            "description": "Monthly salary from TechCorp India Pvt Ltd",
            "date": month_date.replace(day=1),
            "is_active": True,
            "created_at": month_date,
        })
        # Freelance (occasional)
        if i % 2 == 0:
            income_records.append({
                "user_id": user_id,
                "source": "FREELANCE",
                "amount": random.choice([15000, 20000, 25000]),
                "frequency": "ONE_TIME",
                "description": "Freelance web development project",
                "date": month_date.replace(day=15),
                "is_active": True,
                "created_at": month_date.replace(day=15),
            })

    await db.income.insert_many(income_records)
    print(f"✅ Seeded {len(income_records)} income records")

    # ── Expenses — 6 months ──────────────────────────────────────────────────
    expense_templates = [
        # Fixed monthly
        ("RENT", "House rent - Andheri West", "NETBANKING", 28000, 0),
        ("BILLS", "Electricity bill - MSEDCL", "UPI", 1800, 200),
        ("BILLS", "Jio broadband & mobile", "UPI", 999, 0),
        ("BILLS", "Netflix + Hotstar subscription", "CARD", 799, 0),
        ("EMI", "Home loan EMI - SBI", "NETBANKING", 12500, 0),
        ("EMI", "Personal loan EMI - HDFC", "NETBANKING", 5000, 0),
        # Variable
        ("FOOD", "Swiggy food orders", "UPI", 3500, 1000),
        ("FOOD", "Grocery - BigBasket", "UPI", 4500, 800),
        ("FOOD", "Restaurant - weekend outings", "CARD", 2500, 1000),
        ("TRAVEL", "Uber/Ola rides", "UPI", 3000, 500),
        ("TRAVEL", "Petrol for car", "CARD", 4000, 500),
        ("SHOPPING", "Amazon shopping", "CARD", 3000, 2000),
        ("SHOPPING", "Myntra clothes", "CARD", 2000, 1500),
        ("MEDICAL", "Pharmacy & medicines", "UPI", 1200, 400),
        ("ENTERTAINMENT", "Movie tickets - PVR", "UPI", 1000, 500),
        ("ENTERTAINMENT", "Gym membership", "NETBANKING", 2000, 0),
        ("EDUCATION", "Udemy courses", "CARD", 1500, 500),
        ("INVESTMENT", "Zerodha - SIP deposit", "NETBANKING", 10000, 0),
    ]

    expense_records = []
    for i in range(6):
        base_date = now.replace(day=1) - timedelta(days=i * 30)
        for cat, desc, method, base_amt, variance in expense_templates:
            amount = base_amt + random.randint(-variance, variance) if variance else base_amt
            day = random.randint(1, 28)
            expense_date = base_date.replace(day=day)
            expense_records.append({
                "user_id": user_id,
                "amount": float(max(amount, 100)),
                "category": cat,
                "description": desc,
                "date": expense_date,
                "payment_method": method,
                "merchant": desc.split(" - ")[0] if " - " in desc else desc.split(" ")[0],
                "is_anomaly": False,
                "anomaly_reason": None,
                "ml_category_confidence": 0.85,
                "created_at": expense_date,
                "updated_at": expense_date,
            })

    # Add one anomaly this month
    expense_records.append({
        "user_id": user_id,
        "amount": 18500.0,
        "category": "SHOPPING",
        "description": "Apple Watch Series 9 - Croma",
        "date": now.replace(day=10),
        "payment_method": "CARD",
        "merchant": "Croma",
        "is_anomaly": True,
        "anomaly_reason": "This shopping expense (₹18,500) is significantly higher than your usual range (avg ₹2,500, std ₹1,500)",
        "ml_category_confidence": 0.92,
        "created_at": now.replace(day=10),
        "updated_at": now.replace(day=10),
    })

    await db.expenses.insert_many(expense_records)
    print(f"✅ Seeded {len(expense_records)} expense records")

    # ── Investments ──────────────────────────────────────────────────────────
    investments = [
        {
            "user_id": user_id,
            "asset_type": "STOCKS",
            "name": "Reliance Industries",
            "symbol": "RELIANCE.NS",
            "quantity": 10.0,
            "purchase_price": 2450.0,
            "purchase_date": datetime(2023, 3, 15),
            "current_price": 2890.0,
            "current_price_updated_at": now,
        },
        {
            "user_id": user_id,
            "asset_type": "STOCKS",
            "name": "HDFC Bank",
            "symbol": "HDFCBANK.NS",
            "quantity": 15.0,
            "purchase_price": 1580.0,
            "purchase_date": datetime(2023, 6, 1),
            "current_price": 1650.0,
            "current_price_updated_at": now,
        },
        {
            "user_id": user_id,
            "asset_type": "STOCKS",
            "name": "Infosys",
            "symbol": "INFY.NS",
            "quantity": 20.0,
            "purchase_price": 1350.0,
            "purchase_date": datetime(2023, 9, 10),
            "current_price": 1520.0,
            "current_price_updated_at": now,
        },
        {
            "user_id": user_id,
            "asset_type": "MUTUAL_FUNDS",
            "name": "Mirae Asset Large Cap Fund",
            "symbol": None,
            "quantity": 850.0,
            "purchase_price": 95.0,
            "purchase_date": datetime(2022, 12, 1),
            "current_price": 118.0,
            "current_price_updated_at": now,
            "notes": "Monthly SIP of ₹5,000",
        },
        {
            "user_id": user_id,
            "asset_type": "MUTUAL_FUNDS",
            "name": "Axis Midcap Fund",
            "symbol": None,
            "quantity": 420.0,
            "purchase_price": 72.0,
            "purchase_date": datetime(2023, 1, 5),
            "current_price": 88.0,
            "current_price_updated_at": now,
            "notes": "Monthly SIP of ₹3,000",
        },
        {
            "user_id": user_id,
            "asset_type": "FD",
            "name": "SBI Fixed Deposit",
            "symbol": None,
            "quantity": 1.0,
            "purchase_price": 200000.0,
            "purchase_date": datetime(2023, 4, 1),
            "current_price": 214000.0,  # 7% p.a.
            "current_price_updated_at": now,
            "notes": "3-year FD at 7.1% p.a.",
        },
        {
            "user_id": user_id,
            "asset_type": "GOLD",
            "name": "Sovereign Gold Bond",
            "symbol": None,
            "quantity": 5.0,  # 5 grams
            "purchase_price": 5600.0,
            "purchase_date": datetime(2023, 7, 1),
            "current_price": 6400.0,
            "current_price_updated_at": now,
            "notes": "SGB 2023-24 Series II",
        },
    ]
    for inv in investments:
        inv.setdefault("notes", None)
        inv["created_at"] = inv["purchase_date"]
        inv["updated_at"] = now

    await db.investments.insert_many(investments)
    print(f"✅ Seeded {len(investments)} investments")

    # ── Credit Profile ───────────────────────────────────────────────────────
    await db.credit_profiles.insert_one({
        "user_id": user_id,
        "monthly_income": 100000.0,
        "total_loans": 2400000.0,  # 24L (home + personal)
        "monthly_emi": 17500.0,
        "credit_utilization_pct": 22.0,
        "repayment_history_pct": 98.0,
        "num_credit_accounts": 4,
        "num_missed_payments": 0,
        "estimated_credit_score": 762,
        "risk_category": "LOW",
        "suggestions": [
            "Reduce credit utilization below 20% for a small boost",
            "Maintain 100% on-time payment record",
        ],
        "component_scores": {
            "repayment_history": 34.3,
            "credit_utilization": 23.4,
            "debt_to_income": 13.0,
            "credit_mix": 8.0,
            "payment_consistency": 5.0,
        },
        "trajectory": "STABLE",
        "computed_at": now,
        "created_at": now,
        "updated_at": now,
    })
    print("✅ Seeded credit profile")

    # ── Financial Goals ──────────────────────────────────────────────────────
    goals = [
        {
            "user_id": user_id,
            "name": "Dream House - Pune",
            "goal_type": "HOUSE",
            "target_amount": 8000000.0,
            "current_amount": 450000.0,
            "target_date": datetime(2030, 12, 31),
            "inflation_rate": 7.0,
            "expected_return": 12.0,
            "monthly_contribution": 15000.0,
            "is_active": True,
        },
        {
            "user_id": user_id,
            "name": "Emergency Fund",
            "goal_type": "EMERGENCY_FUND",
            "target_amount": 360000.0,  # 6 months expenses
            "current_amount": 120000.0,
            "target_date": datetime(2025, 12, 31),
            "inflation_rate": 5.0,
            "expected_return": 6.5,
            "monthly_contribution": 10000.0,
            "is_active": True,
        },
        {
            "user_id": user_id,
            "name": "Europe Vacation",
            "goal_type": "TRAVEL",
            "target_amount": 250000.0,
            "current_amount": 45000.0,
            "target_date": datetime(2026, 6, 30),
            "inflation_rate": 5.0,
            "expected_return": 7.0,
            "monthly_contribution": 8000.0,
            "is_active": True,
        },
        {
            "user_id": user_id,
            "name": "Retirement Corpus",
            "goal_type": "RETIREMENT",
            "target_amount": 50000000.0,  # 5 Cr
            "current_amount": 800000.0,
            "target_date": datetime(2052, 5, 15),
            "inflation_rate": 6.0,
            "expected_return": 12.0,
            "monthly_contribution": 10000.0,
            "is_active": True,
        },
    ]
    for g in goals:
        g["created_at"] = now
        g["updated_at"] = now
    await db.financial_goals.insert_many(goals)
    print(f"✅ Seeded {len(goals)} goals")

    # ── Tax Profile ──────────────────────────────────────────────────────────
    await db.tax_profiles.insert_one({
        "user_id": user_id,
        "financial_year": "2024-25",
        "gross_income": 1200000.0,  # 12L annual
        "deductions_80c": 150000.0,
        "deductions_80d": 25000.0,
        "other_deductions": 0.0,
        "capital_gains_stcg": 15000.0,
        "capital_gains_ltcg": 28000.0,
        "home_loan_interest": 120000.0,
        "hra_exemption": 120000.0,
        "preferred_regime": "OLD",
        "updated_at": now,
    })
    print("✅ Seeded tax profile")

    # ── Retirement Plan ──────────────────────────────────────────────────────
    await db.retirement_plans.insert_one({
        "user_id": user_id,
        "current_age": 32,
        "retirement_age": 60,
        "current_monthly_income": 100000.0,
        "current_monthly_expenses": 65000.0,
        "current_investments": 800000.0,
        "inflation_rate": 6.0,
        "expected_return": 12.0,
        "computed_corpus_required": 0.0,
        "computed_corpus_projected": 0.0,
        "computed_monthly_investment": 0.0,
        "updated_at": now,
    })
    print("✅ Seeded retirement plan")

    print("\n" + "="*50)
    print("🎉 Seed data complete!")
    print(f"   Email:    {DEMO_EMAIL}")
    print(f"   Password: {DEMO_PASSWORD}")
    print(f"   User ID:  {user_id}")
    print("="*50)


if __name__ == "__main__":
    asyncio.run(seed())
