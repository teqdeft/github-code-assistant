import asyncio
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from database import get_db
from models import RepoIndex, RepoResponse
from auth_utils import get_current_user
from services.indexer import index_repository
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/api/repos", tags=["repos"])


def extract_repo_name(url: str) -> str:
    """Extract repo name from GitHub URL."""
    parts = url.rstrip("/").split("/")
    name = parts[-1] if parts else url
    if name.endswith(".git"):
        name = name[:-4]
    return name or url


async def run_indexing(repo_id: str, repo_url: str, branch: str):
    """Background task that indexes the repo and updates MongoDB."""
    db = get_db()
    try:
        result = await index_repository(repo_url, branch, repo_id)
        await db.repos.update_one(
            {"_id": ObjectId(repo_id)},
            {
                "$set": {
                    "status": "ready",
                    "file_count": result["file_count"],
                    "chunk_count": result["chunk_count"],
                    "indexed_at": datetime.utcnow(),
                    "error": None,
                }
            },
        )
    except Exception as e:
        await db.repos.update_one(
            {"_id": ObjectId(repo_id)},
            {"$set": {"status": "error", "error": str(e)}},
        )


@router.post("/index", response_model=RepoResponse)
async def index_repo(
    data: RepoIndex,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])
    repo_name = extract_repo_name(data.repo_url)

    # Check if already indexed
    existing = await db.repos.find_one({"user_id": user_id, "repo_url": data.repo_url})
    if existing:
        repo_id = str(existing["_id"])
        # Re-index
        await db.repos.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "indexing", "error": None, "branch": data.branch}},
        )
        background_tasks.add_task(run_indexing, repo_id, data.repo_url, data.branch)
        existing["status"] = "indexing"
        return _format_repo(existing)

    repo_doc = {
        "user_id": user_id,
        "repo_url": data.repo_url,
        "branch": data.branch,
        "name": repo_name,
        "status": "indexing",
        "file_count": 0,
        "chunk_count": 0,
        "indexed_at": None,
        "error": None,
        "created_at": datetime.utcnow(),
    }
    result = await db.repos.insert_one(repo_doc)
    repo_id = str(result.inserted_id)

    background_tasks.add_task(run_indexing, repo_id, data.repo_url, data.branch)

    repo_doc["_id"] = result.inserted_id
    return _format_repo(repo_doc)


@router.get("/", response_model=List[RepoResponse])
async def list_repos(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    repos = await db.repos.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
    return [_format_repo(r) for r in repos]


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    repo = await db.repos.find_one({"_id": ObjectId(repo_id), "user_id": user_id})
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return _format_repo(repo)


@router.delete("/{repo_id}")
async def delete_repo(repo_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    result = await db.repos.delete_one({"_id": ObjectId(repo_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Also delete chats
    await db.chats.delete_many({"repo_id": repo_id, "user_id": user_id})
    return {"message": "Repository deleted"}


def _format_repo(doc: dict) -> RepoResponse:
    return RepoResponse(
        id=str(doc["_id"]),
        user_id=doc.get("user_id", ""),
        repo_url=doc.get("repo_url", ""),
        branch=doc.get("branch", "main"),
        name=doc.get("name", ""),
        status=doc.get("status", "indexing"),
        file_count=doc.get("file_count", 0),
        chunk_count=doc.get("chunk_count", 0),
        indexed_at=doc.get("indexed_at"),
        error=doc.get("error"),
    )
