from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth Models ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime


# ── Repo Models ───────────────────────────────────────────────────────────────

class RepoIndex(BaseModel):
    repo_url: str
    branch: str = "main"

class RepoResponse(BaseModel):
    id: str
    user_id: str
    repo_url: str
    branch: str
    name: str
    status: str  # indexing | ready | error
    file_count: int = 0
    chunk_count: int = 0
    indexed_at: Optional[datetime] = None
    error: Optional[str] = None


# ── Chat Models ───────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    repo_id: str
    question: str

class ChatMessageResponse(BaseModel):
    id: str
    user_id: str
    repo_id: str
    question: str
    answer: str
    sources: List[dict] = []
    created_at: datetime

class ChatHistory(BaseModel):
    messages: List[ChatMessageResponse]
