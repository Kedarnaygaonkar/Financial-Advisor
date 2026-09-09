from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel, utcnow


class BusinessRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    FINANCE_MANAGER = "FINANCE_MANAGER"
    ACCOUNTANT = "ACCOUNTANT"
    VIEWER = "VIEWER"


class CompanyDocument(MongoBaseModel):
    name: str
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    industry: Optional[str] = None
    founded_year: Optional[int] = None
    address: Optional[str] = None
    website: Optional[str] = None
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class CompanyUserDocument(MongoBaseModel):
    company_id: str
    user_id: str
    role: BusinessRole = BusinessRole.VIEWER
    joined_at: datetime = Field(default_factory=utcnow)


class CustomerDocument(MongoBaseModel):
    company_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class VendorDocument(MongoBaseModel):
    company_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class InvoiceStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class InvoiceDocument(MongoBaseModel):
    company_id: str
    customer_id: str
    invoice_number: str
    amount: float
    tax_amount: float = 0.0
    total_amount: float
    status: InvoiceStatus = InvoiceStatus.DRAFT
    due_date: datetime
    issued_date: datetime
    items: list[dict] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
