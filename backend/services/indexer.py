import os
import shutil
import tempfile
import asyncio
from typing import List
from pathlib import Path

from langchain_community.document_loaders import GitLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter, Language
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings as ChromaSettings

from config import settings

# ── Embedding model (loaded once) ─────────────────────────────────────────────
_embedding_model: SentenceTransformer = None

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


# ── ChromaDB client ────────────────────────────────────────────────────────────
_chroma_client: chromadb.PersistentClient = None

def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
        )
    return _chroma_client


def collection_name(repo_id: str) -> str:
    # ChromaDB collection names: only alphanumeric and underscores
    return f"repo_{repo_id}".replace("-", "_")


# ── File extension → Language mapping ─────────────────────────────────────────
EXT_LANGUAGE_MAP = {
    ".py": Language.PYTHON,
    ".js": Language.JS,
    ".jsx": Language.JS,
    ".ts": Language.JS,
    ".tsx": Language.JS,
    ".java": Language.JAVA,
    ".go": Language.GO,
    ".rb": Language.RUBY,
    ".rs": Language.RUST,
    ".cpp": Language.CPP,
    ".c": Language.C,
    ".cs": Language.CSHARP,
    ".swift": Language.SWIFT,
    ".kt": Language.KOTLIN,
}

CODE_EXTENSIONS = set(EXT_LANGUAGE_MAP.keys()) | {
    ".html", ".css", ".scss", ".json", ".yaml", ".yml",
    ".sh", ".bash", ".md", ".txt", ".env.example", ".toml", ".xml",
}


def is_code_file(path: str) -> bool:
    ext = Path(path).suffix.lower()
    return ext in CODE_EXTENSIONS


def get_splitter(file_path: str):
    ext = Path(file_path).suffix.lower()
    lang = EXT_LANGUAGE_MAP.get(ext)
    if lang:
        try:
            return RecursiveCharacterTextSplitter.from_language(
                language=lang, chunk_size=1000, chunk_overlap=200
            )
        except Exception:
            pass
    return RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)


async def index_repository(repo_url: str, branch: str, repo_id: str) -> dict:
    """
    Clone repo, split code into chunks, embed, store in ChromaDB.
    Returns {"file_count": N, "chunk_count": M}
    """
    tmp_dir = tempfile.mkdtemp()
    try:
        # Run blocking operations in thread pool
        result = await asyncio.get_event_loop().run_in_executor(
            None, _sync_index, repo_url, branch, repo_id, tmp_dir
        )
        return result
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _sync_index(repo_url: str, branch: str, repo_id: str, tmp_dir: str) -> dict:
    """Synchronous indexing – runs in executor."""
    # Load repo
    loader = GitLoader(
        clone_url=repo_url,
        repo_path=tmp_dir,
        branch=branch,
        file_filter=is_code_file,
    )
    documents = loader.load()

    if not documents:
        raise ValueError("No code files found in repository")

    file_count = len(set(d.metadata.get("source", "") for d in documents))

    # Split documents
    all_chunks = []
    for doc in documents:
        file_path = doc.metadata.get("source", "")
        splitter = get_splitter(file_path)
        chunks = splitter.split_documents([doc])
        all_chunks.extend(chunks)

    if not all_chunks:
        raise ValueError("No chunks generated from repository")

    # Embed
    model = get_embedding_model()
    texts = [c.page_content for c in all_chunks]
    embeddings = model.encode(texts, show_progress_bar=False, batch_size=64).tolist()

    # Store in ChromaDB
    client = get_chroma_client()
    col_name = collection_name(repo_id)

    # Delete existing collection if re-indexing
    try:
        client.delete_collection(col_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=col_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Batch upsert
    batch_size = 500
    for i in range(0, len(all_chunks), batch_size):
        batch_chunks = all_chunks[i : i + batch_size]
        batch_embs = embeddings[i : i + batch_size]
        collection.add(
            ids=[f"chunk_{i+j}" for j in range(len(batch_chunks))],
            embeddings=batch_embs,
            documents=[c.page_content for c in batch_chunks],
            metadatas=[
                {
                    "source": c.metadata.get("source", ""),
                    "file_type": Path(c.metadata.get("source", "")).suffix,
                }
                for c in batch_chunks
            ],
        )

    return {"file_count": file_count, "chunk_count": len(all_chunks)}


def query_repository(repo_id: str, question: str, n_results: int = 6) -> List[dict]:
    """Query ChromaDB for relevant code chunks."""
    client = get_chroma_client()
    col_name = collection_name(repo_id)

    try:
        collection = client.get_collection(col_name)
    except Exception:
        return []

    model = get_embedding_model()
    query_embedding = model.encode([question]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "content": doc,
            "source": meta.get("source", ""),
            "file_type": meta.get("file_type", ""),
            "relevance": round(1 - dist, 4),
        })

    return chunks
