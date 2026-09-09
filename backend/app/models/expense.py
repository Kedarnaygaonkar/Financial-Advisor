from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, utcnow


class ExpenseCategory(str, Enum):
    FOOD = "FOOD"
    TRAVEL = "TRAVEL"
    SHOPPING = "SHOPPING"
    BILLS = "BILLS"
    RENT = "RENT"
    EMI = "EMI"
    MEDICAL = "MEDICAL"
    EDUCATION = "EDUCATION"
    ENTERTAINMENT = "ENTERTAINMENT"
    INVESTMENT = "INVESTMENT"
    OTHER = "OTHER"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    OTHER = "OTHER"


class IncomeSource(str, Enum):
    SALARY = "SALARY"
    FREELANCE = "FREELANCE"
    BUSINESS = "BUSINESS"
    INTEREST = "INTEREST"
    DIVIDENDS = "DIVIDENDS"
    CAPITAL_GAINS = "CAPITAL_GAINS"
    OTHER = "OTHER"


class IncomeFrequency(str, Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUAL = "ANNUAL"
    ONE_TIME = "ONE_TIME"


class ExpenseDocument(MongoBaseModel):
    user_id: str
    amount: float
    category: ExpenseCategory
    description: str
    date: datetime
    payment_method: PaymentMethod = PaymentMethod.UPI
    merchant: Optional[str] = None
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    ml_category_confidence: Optional[float] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class IncomeDocument(MongoBaseModel):
    user_id: str
    source: IncomeSource
    amount: float
    frequency: IncomeFrequency = IncomeFrequency.MONTHLY
    description: str
    date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
