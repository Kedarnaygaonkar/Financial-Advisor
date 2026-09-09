from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.expense import ExpenseCategory, PaymentMethod


class CreateExpenseRequest(BaseModel):
    amount: float
    category: ExpenseCategory
    description: str
    date: datetime
    payment_method: PaymentMethod = PaymentMethod.UPI
    merchant: Optional[str] = None


class UpdateExpenseRequest(BaseModel):
    amount: Optional[float] = None
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    merchant: Optional[str] = None


class ClassifyExpenseRequest(BaseModel):
    text: str


class CreateIncomeRequest(BaseModel):
    source: str
    amount: float
    frequency: str = "MONTHLY"
    description: str
    date: datetime


class UpdateIncomeRequest(BaseModel):
    source: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    is_active: Optional[bool] = None
