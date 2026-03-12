from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import List
from database import get_db
from models import ChatMessage, ChatMessageResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask", response_model=ChatMessageResponse)
async def ask(data: ChatMessage, u=Depends(get_current_user)):
    # ← Import INSIDE the function so it never runs at module load time
    from services.rag_service import answer_question

    db = get_db()
    uid = str(u["_id"])
    repo = await db.repos.find_one({"_id": ObjectId(data.repo_id), "user_id": uid})
    if not repo:
        raise HTTPException(404, "Repository not found")
    if repo["status"] == "indexing":
        raise HTTPException(400, "Repository is still being indexed, please wait")
    if repo["status"] == "error":
        raise HTTPException(400, f"Indexing failed: {repo.get('error', 'unknown error')}")

    try:
        answer, sources = await answer_question(data.question, data.repo_id, repo["repo_url"])
    except Exception as e:
        raise HTTPException(500, f"Failed to generate answer: {str(e)}")

    doc = {
        "user_id": uid, "repo_id": data.repo_id,
        "question": data.question, "answer": answer,
        "sources": sources, "created_at": datetime.utcnow(),
    }
    res = await db.chats.insert_one(doc)
    return ChatMessageResponse(id=str(res.inserted_id), **{k: v for k, v in doc.items()})


@router.get("/history/{repo_id}", response_model=List[ChatMessageResponse])
async def history(repo_id: str, limit: int = 50, u=Depends(get_current_user)):
    db = get_db()
    uid = str(u["_id"])
    repo = await db.repos.find_one({"_id": ObjectId(repo_id), "user_id": uid})
    if not repo:
        raise HTTPException(404, "Repository not found")
    docs = await db.chats.find(
        {"user_id": uid, "repo_id": repo_id}
    ).sort("created_at", 1).limit(limit).to_list(limit)
    return [
        ChatMessageResponse(
            id=str(d["_id"]), user_id=d["user_id"], repo_id=d["repo_id"],
            question=d["question"], answer=d["answer"],
            sources=d.get("sources", []), created_at=d["created_at"],
        )
        for d in docs
    ]


@router.delete("/history/{repo_id}")
async def clear(repo_id: str, u=Depends(get_current_user)):
    db = get_db()
    await db.chats.delete_many({"user_id": str(u["_id"]), "repo_id": repo_id})
    return {"message": "Cleared"}