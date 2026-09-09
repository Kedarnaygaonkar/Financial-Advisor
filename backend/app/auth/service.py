from datetime import datetime
from typing import Optional
from bson import ObjectId
from app.database import get_db
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.utils.exceptions import bad_request, unauthorized, conflict


async def register_user(email: str, password: str, full_name: str, account_type: str) -> dict:
    db = get_db()
    # Check duplicate email
    existing = await db.users.find_one({"email": email.lower()})
    if existing:
        raise conflict("An account with this email already exists")

    now = datetime.utcnow()
    user_doc = {
        "email": email.lower(),
        "password_hash": hash_password(password),
        "full_name": full_name,
        "account_type": account_type,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Create default profile
    await db.profiles.insert_one({
        "user_id": user_id,
        "risk_profile": "MODERATE",
        "currency": "INR",
        "created_at": now,
        "updated_at": now,
    })

    return {**user_doc, "_id": user_id}


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    db = get_db()
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    if not user.get("is_active"):
        return None
    user["_id"] = str(user["_id"])
    return user


async def get_user_by_id(user_id: str) -> Optional[dict]:
    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception:
        return None


def generate_tokens(user_id: str) -> tuple[str, str]:
    data = {"sub": user_id}
    return create_access_token(data), create_refresh_token(data)
