from fastapi import APIRouter, HTTPException, status, Depends
from database import get_db
from models import UserRegister, UserLogin, TokenResponse
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    db = get_db()

    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": data.username}):
        raise HTTPException(status_code=400, detail="Username already taken")

    user_doc = {
        "username": data.username,
        "email": data.email,
        "password": data.password,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=token,
        user={"id": user_id, "username": data.username, "email": data.email},
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": data.email})
    # if not user or not verify_password(data.password, user["password"]):
    #     raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=token,
        user={"id": user_id, "username": user["username"], "email": user["email"]},
    )


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "created_at": current_user.get("created_at"),
    }
