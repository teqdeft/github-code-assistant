from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime
from bson import ObjectId
from typing import List
from database import get_db
from models import RepoIndex, RepoResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/repos", tags=["repos"])


def _name(url: str) -> str:
    n = url.rstrip("/").split("/")[-1]
    return n[:-4] if n.endswith(".git") else n


def _fmt(doc: dict) -> RepoResponse:
    return RepoResponse(
        id=str(doc["_id"]), user_id=doc.get("user_id", ""),
        repo_url=doc.get("repo_url", ""), branch=doc.get("branch", "main"),
        name=doc.get("name", ""), status=doc.get("status", "indexing"),
        file_count=doc.get("file_count", 0), chunk_count=doc.get("chunk_count", 0),
        indexed_at=doc.get("indexed_at"), error=doc.get("error"),
    )


async def _run_index(repo_id: str, repo_url: str, branch: str):
    # ← Import INSIDE the function so it never runs at module load time
    from services.indexer import index_repository
    db = get_db()
    try:
        r = await index_repository(repo_url, branch, repo_id)
        await db.repos.update_one(
            {"_id": ObjectId(repo_id)},
            {"$set": {
                "status": "ready",
                "file_count": r["file_count"],
                "chunk_count": r["chunk_count"],
                "indexed_at": datetime.utcnow(),
                "error": None,
            }},
        )
    except Exception as e:
        await db.repos.update_one(
            {"_id": ObjectId(repo_id)},
            {"$set": {"status": "error", "error": str(e)}},
        )


@router.post("/index", response_model=RepoResponse)
async def index_repo(data: RepoIndex, bg: BackgroundTasks, u=Depends(get_current_user)):
    db = get_db()
    uid = str(u["_id"])
    existing = await db.repos.find_one({"user_id": uid, "repo_url": data.repo_url})
    if existing:
        rid = str(existing["_id"])
        await db.repos.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "indexing", "error": None, "branch": data.branch}},
        )
        bg.add_task(_run_index, rid, data.repo_url, data.branch)
        existing["status"] = "indexing"
        return _fmt(existing)
    doc = {
        "user_id": uid, "repo_url": data.repo_url, "branch": data.branch,
        "name": _name(data.repo_url), "status": "indexing",
        "file_count": 0, "chunk_count": 0,
        "indexed_at": None, "error": None,
        "created_at": datetime.utcnow(),
    }
    res = await db.repos.insert_one(doc)
    rid = str(res.inserted_id)
    bg.add_task(_run_index, rid, data.repo_url, data.branch)
    doc["_id"] = res.inserted_id
    return _fmt(doc)


@router.get("/", response_model=List[RepoResponse])
async def list_repos(u=Depends(get_current_user)):
    db = get_db()
    docs = await db.repos.find({"user_id": str(u["_id"])}).sort("created_at", -1).to_list(50)
    return [_fmt(d) for d in docs]


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str, u=Depends(get_current_user)):
    db = get_db()
    doc = await db.repos.find_one({"_id": ObjectId(repo_id), "user_id": str(u["_id"])})
    if not doc:
        raise HTTPException(404, "Not found")
    return _fmt(doc)


@router.delete("/{repo_id}")
async def delete_repo(repo_id: str, u=Depends(get_current_user)):
    db = get_db()
    uid = str(u["_id"])
    r = await db.repos.delete_one({"_id": ObjectId(repo_id), "user_id": uid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    await db.chats.delete_many({"repo_id": repo_id, "user_id": uid})
    return {"message": "Deleted"}