from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from database import get_db
from models import ChatMessage, ChatMessageResponse
from auth_utils import get_current_user
from services.rag_service import answer_question
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask", response_model=ChatMessageResponse)
async def ask_question(data: ChatMessage, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])

    # Verify repo belongs to user and is ready
    repo = await db.repos.find_one({"_id": ObjectId(data.repo_id), "user_id": user_id})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo["status"] == "indexing":
        raise HTTPException(status_code=400, detail="Repository is still being indexed. Please wait.")
    if repo["status"] == "error":
        raise HTTPException(status_code=400, detail=f"Repository indexing failed: {repo.get('error', 'Unknown error')}")

    # Get recent chat history for context
    recent_chats = await db.chats.find(
        {"user_id": user_id, "repo_id": data.repo_id}
    ).sort("created_at", -1).limit(5).to_list(5)
    chat_history = [
        {"role": "user", "content": c["question"]}
        for c in reversed(recent_chats)
    ]

    # Generate answer
    try:
        answer, sources = await answer_question(
            question=data.question,
            repo_id=data.repo_id,
            repo_url=repo["repo_url"],
            chat_history=chat_history,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")

    # Save to MongoDB
    chat_doc = {
        "user_id": user_id,
        "repo_id": data.repo_id,
        "question": data.question,
        "answer": answer,
        "sources": sources,
        "created_at": datetime.utcnow(),
    }
    result = await db.chats.insert_one(chat_doc)

    return ChatMessageResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        repo_id=data.repo_id,
        question=data.question,
        answer=answer,
        sources=sources,
        created_at=chat_doc["created_at"],
    )


@router.get("/history/{repo_id}", response_model=List[ChatMessageResponse])
async def get_chat_history(
    repo_id: str,
    limit: int = 50,
    current_user=Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])

    # Verify repo access
    repo = await db.repos.find_one({"_id": ObjectId(repo_id), "user_id": user_id})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    chats = await db.chats.find(
        {"user_id": user_id, "repo_id": repo_id}
    ).sort("created_at", 1).limit(limit).to_list(limit)

    return [
        ChatMessageResponse(
            id=str(c["_id"]),
            user_id=c["user_id"],
            repo_id=c["repo_id"],
            question=c["question"],
            answer=c["answer"],
            sources=c.get("sources", []),
            created_at=c["created_at"],
        )
        for c in chats
    ]


@router.delete("/history/{repo_id}")
async def clear_chat_history(repo_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    await db.chats.delete_many({"user_id": user_id, "repo_id": repo_id})
    return {"message": "Chat history cleared"}
