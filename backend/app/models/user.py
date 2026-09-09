from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import EmailStr, Field
from app.models.base import MongoBaseModel, utcnow


class AccountType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    BUSINESS = "BUSINESS"


class BusinessRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    FINANCE_MANAGER = "FINANCE_MANAGER"
    ACCOUNTANT = "ACCOUNTANT"
    VIEWER = "VIEWER"


class RiskProfile(str, Enum):
    CONSERVATIVE = "CONSERVATIVE"
    MODERATE = "MODERATE"
    AGGRESSIVE = "AGGRESSIVE"


class UserDocument(MongoBaseModel):
    email: EmailStr
    password_hash: str
    full_name: str
    account_type: AccountType = AccountType.INDIVIDUAL
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ProfileDocument(MongoBaseModel):
    user_id: str
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    pan_number: Optional[str] = None
    risk_profile: RiskProfile = RiskProfile.MODERATE
    currency: str = "INR"
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
