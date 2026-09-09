from typing import Optional
from fastapi import Cookie, Depends, Request
from bson import ObjectId
from app.database import get_db
from app.utils.security import decode_token
from app.utils.exceptions import unauthorized


async def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(default=None),
    db=Depends(get_db),
) -> dict:
    """Extract and validate JWT from:
    1. X-Access-Token custom header (frontend localStorage → Vercel proxy)
    2. Authorization: Bearer header
    3. httpOnly cookie (fallback)
    """
    token = None

    # 1. Custom header (most reliable through Vercel proxy)
    x_token = request.headers.get("X-Access-Token", "")
    if x_token:
        token = x_token

    # 2. Authorization: Bearer header
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    # 3. httpOnly cookie fallback
    if not token and access_token:
        token = access_token

    if not token:
        raise unauthorized()

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise unauthorized()

    user_id: str = payload.get("sub")
    if not user_id:
        raise unauthorized()

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active"):
        raise unauthorized()

    user["_id"] = str(user["_id"])
    return user



async def get_current_individual_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Require INDIVIDUAL account type."""
    if current_user.get("account_type") not in ("INDIVIDUAL", "BUSINESS"):
        raise unauthorized()
    return current_user


async def get_company_user(
    company_id: str,
    required_roles: list[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> dict:
    """Verify user has access to the given company with optional role check."""
    company_user = await db.company_users.find_one(
        {"company_id": company_id, "user_id": current_user["_id"]}
    )
    if not company_user:
        from app.utils.exceptions import forbidden
        raise forbidden()

    if required_roles and company_user["role"] not in required_roles:
        from app.utils.exceptions import forbidden
        raise forbidden()

    return company_user
