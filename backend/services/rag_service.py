import os
from typing import List, Tuple
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from services.indexer import query_repository
from config import settings

os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY

# ── LLM (loaded once) ─────────────────────────────────────────────────────────
_llm = None

def get_llm():
    global _llm
    if _llm is None:
        _llm = init_chat_model("llama-3.3-70b-versatile", model_provider="groq")
    return _llm


SYSTEM_PROMPT = """You are an expert code assistant specialized in analyzing and explaining codebases.
You have deep knowledge of software architecture, design patterns, and multiple programming languages.

When answering questions about a codebase:
1. Be precise and reference specific files/functions from the provided context
2. Explain the "why" behind design decisions, not just the "what"
3. If asked about patterns, show how to extend them with concrete examples
4. Format code snippets with proper markdown code blocks
5. If the context is insufficient, say so clearly and suggest what to look for

Always ground your answers in the provided code context. Do not hallucinate file names or function signatures."""


def build_context(chunks: List[dict]) -> str:
    if not chunks:
        return "No relevant code found."

    parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source", "unknown")
        # Strip leading path (just show relative path from repo root)
        parts.append(
            f"### [{i}] `{source}` (relevance: {chunk.get('relevance', 0):.2f})\n"
            f"```\n{chunk['content']}\n```"
        )
    return "\n\n".join(parts)


async def answer_question(
    question: str,
    repo_id: str,
    repo_url: str,
    chat_history: List[dict] = None,
) -> Tuple[str, List[dict]]:
    """
    Retrieve relevant chunks and generate an answer.
    Returns (answer_text, sources_list)
    """
    # Retrieve relevant code
    chunks = query_repository(repo_id, question, n_results=6)
    context = build_context(chunks)

    # Build messages
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"""Repository: {repo_url}

Relevant code context:
{context}

---

Question: {question}

Please provide a detailed, accurate answer based on the code context above."""
        ),
    ]

    llm = get_llm()
    response = await llm.ainvoke(messages)
    answer = response.content

    # Deduplicate sources by file
    seen = set()
    sources = []
    for chunk in chunks:
        src = chunk.get("source", "")
        if src not in seen and chunk.get("relevance", 0) > 0.2:
            seen.add(src)
            sources.append({"file": src, "relevance": chunk.get("relevance", 0)})

    return answer, sources
