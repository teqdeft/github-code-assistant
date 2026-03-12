# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from contextlib import asynccontextmanager
# from database import connect_db, close_db
# from routes.auth import router as auth_router
# from routes.repos import router as repo_router
# from routes.chat import router as chat_router

# import traceback

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     try:
#         print("Connecting to database...")
#         await connect_db()
#     except Exception as e:
#         print("DATABASE CONNECTION FAILED:")
#         traceback.print_exc()
#     yield
#     await close_db()

# app = FastAPI(
#     title="GitHub Code Assistant API",
#     description="AI-powered codebase exploration and Q&A",
#     version="1.0.0",
#     lifespan=lifespan,
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# @app.get("/")
# async def root():
#     return {"message": "GitHub Code Assistant API", "status": "running"}


# @app.get("/health")
# async def health():
#     return {"status": "healthy"}


# app.include_router(auth_router)
# app.include_router(repo_router)
# app.include_router(chat_router)




import sys
import os
import logging

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s",
    force=True,
)
log = logging.getLogger("main")

log.info("=== STARTUP BEGIN ===")
log.info(f"Python: {sys.version}")
log.info(f"PORT env: {os.environ.get('PORT', 'NOT SET')}")
log.info(f"Working dir: {os.getcwd()}")
log.info(f"Files: {os.listdir('.')}")

# Test every import individually so we see exactly which one fails
_import_errors = []

def safe_import(name, from_stmt=None):
    try:
        if from_stmt:
            exec(f"from {from_stmt} import {name}")
        else:
            exec(f"import {name}")
        log.info(f"  ✅ {from_stmt or name}")
    except Exception as e:
        log.error(f"  ❌ {from_stmt or name}: {e}")
        _import_errors.append(f"{from_stmt or name}: {e}")

log.info("--- Testing imports ---")
safe_import("fastapi")
safe_import("uvicorn")
safe_import("motor")
safe_import("pymongo")
safe_import("jose")
safe_import("passlib")
safe_import("dotenv")
safe_import("pydantic")
safe_import("connect_db", "database")
safe_import("router", "routes.auth")
safe_import("router", "routes.repos")
safe_import("router", "routes.chat")
log.info("--- Import tests done ---")

# ── Now build the actual app ──────────────────────────────────────────────────
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

try:
    from database import connect_db, close_db
    from routes.auth  import router as auth_router
    from routes.repos import router as repo_router
    from routes.chat  import router as chat_router
    _routers_ok = True
except Exception as e:
    log.exception(f"FATAL router import: {e}")
    _routers_ok = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await connect_db()
        log.info("MongoDB connected ✅")
    except Exception as e:
        log.error(f"MongoDB failed: {e}")
    yield
    try:
        await close_db()
    except Exception:
        pass


app = FastAPI(title="CodeMind API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if _routers_ok:
    app.include_router(auth_router)
    app.include_router(repo_router)
    app.include_router(chat_router)
    log.info("All routers mounted ✅")
else:
    log.error("Routers NOT mounted — check import errors above")


@app.get("/")
async def root():
    return {
        "status": "ok",
        "import_errors": _import_errors,
        "routers_ok": _routers_ok,
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/debug")
async def debug():
    return {
        "python": sys.version,
        "cwd": os.getcwd(),
        "files": os.listdir("."),
        "import_errors": _import_errors,
        "env_vars_set": {
            "MONGODB_URI": bool(os.environ.get("MONGODB_URI")),
            "SECRET_KEY": bool(os.environ.get("SECRET_KEY")),
            "GROQ_API_KEY": bool(os.environ.get("GROQ_API_KEY")),
            "PORT": os.environ.get("PORT"),
            "PYTHON_VERSION": os.environ.get("PYTHON_VERSION"),
        }
    }

log.info("=== APP OBJECT READY — uvicorn binding port now ===")