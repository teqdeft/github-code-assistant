# 🧠 Repo-Brain — AI-Powered GitHub Codebase Explorer

A full-stack application that lets you index any GitHub repository and chat with it using natural language AI. Built with FastAPI, React, LangChain, ChromaDB, Sentence Transformers, and Groq's LLaMA 70B.


## ⚡ Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be available at `http://localhost:5173`

---

## 🔧 Configuration

The backend `.env` file is pre-configured:

```env
MONGODB_URI=mongodb+srv://...
SECRET_KEY=...
GROQ_API_KEY=...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CHROMA_PERSIST_DIR=./chroma_db
```

---


## 💡 Example Questions

- "Where is the authentication logic?"
- "How do I add a new API route based on the existing pattern?"
- "What database schema is used?"
- "How are errors handled in this application?"
- "Show me the main entry point and how the app bootstraps"

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + Uvicorn |
| Auth | JWT (python-jose) + bcrypt |
| Database | MongoDB (Motor async driver) |
| Git Loading | LangChain GitLoader |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| Vector Store | ChromaDB (persistent) |
| LLM | Groq LLaMA 3.3 70B via LangChain |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Custom cyberpunk theme |

---

## ⚠️ Notes

- First-time indexing downloads the sentence transformer model (~90MB)
- Large repos may take 2-5 minutes to index
- ChromaDB data persists in `backend/chroma_db/`
- MongoDB stores users, repo metadata, and chat history
