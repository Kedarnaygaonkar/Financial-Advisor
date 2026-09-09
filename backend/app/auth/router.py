from fastapi import APIRouter, Depends, Response, Cookie
from typing import Optional
from app.auth.schemas import RegisterRequest, LoginRequest, UpdateProfileRequest, AuthResponse, UserResponse
from app.auth import service
from app.auth.dependencies import get_current_user
from app.config import settings
from app.utils.exceptions import unauthorized, bad_request
from app.utils.security import decode_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_SETTINGS = {
    "httponly": True,
    "samesite": "lax",
    "secure": settings.ENVIRONMENT == "production",
}


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest, response: Response):
    user = await service.register_user(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        account_type=request.account_type,
    )
    user_id = str(user["_id"])
    access_token, refresh_token = service.generate_tokens(user_id)

    response.set_cookie("access_token", access_token, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **COOKIE_SETTINGS)
    response.set_cookie("refresh_token", refresh_token, max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, **COOKIE_SETTINGS)

    return AuthResponse(
        user=UserResponse(
            id=user_id,
            email=user["email"],
            full_name=user["full_name"],
            account_type=user["account_type"],
            created_at=user["created_at"],
        ),
        message="Account created successfully",
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, response: Response):
    user = await service.authenticate_user(request.email, request.password)
    if not user:
        raise bad_request("Invalid email or password")

    user_id = str(user["_id"])
    access_token, refresh_token = service.generate_tokens(user_id)

    response.set_cookie("access_token", access_token, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **COOKIE_SETTINGS)
    response.set_cookie("refresh_token", refresh_token, max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, **COOKIE_SETTINGS)

    return AuthResponse(
        user=UserResponse(
            id=user_id,
            email=user["email"],
            full_name=user["full_name"],
            account_type=user["account_type"],
            created_at=user["created_at"],
        ),
        message="Login successful",
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(response: Response, refresh_token: Optional[str] = Cookie(default=None)):
    if not refresh_token:
        raise unauthorized()
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise unauthorized()

    user_id = payload.get("sub")
    user = await service.get_user_by_id(user_id)
    if not user:
        raise unauthorized()

    from app.utils.security import create_access_token
    new_access_token = create_access_token({"sub": user_id})
    response.set_cookie("access_token", new_access_token, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **COOKIE_SETTINGS)
    return {"message": "Token refreshed"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        account_type=current_user["account_type"],
        created_at=current_user["created_at"],
    )


@router.put("/me")
async def update_me(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    from app.database import get_db
    from datetime import datetime
    db = get_db()
    updates = request.model_dump(exclude_none=True)

    if "full_name" in updates:
        await db.users.update_one(
            {"_id": __import__("bson").ObjectId(current_user["_id"])},
            {"$set": {"full_name": updates["full_name"], "updated_at": datetime.utcnow()}},
        )

    profile_updates = {k: v for k, v in updates.items() if k != "full_name"}
    if profile_updates:
        profile_updates["updated_at"] = datetime.utcnow()
        await db.profiles.update_one(
            {"user_id": current_user["_id"]},
            {"$set": profile_updates},
            upsert=True,
        )

    return {"message": "Profile updated successfully"}
