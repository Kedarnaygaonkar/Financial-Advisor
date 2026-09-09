from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    account_type: str = "INDIVIDUAL"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("account_type")
    @classmethod
    def account_type_valid(cls, v):
        if v not in ("INDIVIDUAL", "BUSINESS"):
            raise ValueError("account_type must be INDIVIDUAL or BUSINESS")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    risk_profile: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    account_type: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
