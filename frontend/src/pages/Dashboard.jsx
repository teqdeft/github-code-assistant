import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { reposAPI } from '../api/client'
import RepoSidebar from '../components/RepoSidebar'
import ChatInterface from '../components/ChatInterface'
import {
  Code2, LogOut, Sun, Moon, Menu, X,
  Github, FileCode, GitBranch, Clock, ChevronRight,
  Cpu, MessageSquare, Zap, Database
} from 'lucide-react'

/* ── Topbar ── */
function Topbar({ user, onLogout, onMenuClick, sidebarOpen, isDark, toggleTheme }) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b flex-shrink-0"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', zIndex: 40 }}>
      <div className="flex items-center gap-3">
        <button className="btn-icon lg:hidden" onClick={onMenuClick}>
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
        <div className="flex items-center gap-2">
          <Code2 size={17} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Repo-Brain</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* User chip */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono"
             style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold"
               style={{ background: 'var(--accent)', fontSize: 9 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          {user?.username}
        </div>

        <button onClick={toggleTheme} className="btn-icon tooltip" data-tip={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button onClick={onLogout} className="btn-icon tooltip" data-tip="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

/* ── Repo stats panel (right panel) ── */
function RepoStats({ repo }) {
  if (!repo || repo.status !== 'ready') return null
  const lines = [
    { icon: FileCode, label: 'Files indexed', value: repo.file_count.toLocaleString() },
    { icon: Database, label: 'Code chunks', value: repo.chunk_count.toLocaleString() },
    { icon: GitBranch, label: 'Branch', value: repo.branch },
    { icon: Cpu, label: 'Embedding model', value: 'MiniLM-L6-v2' },
    { icon: Zap, label: 'LLM', value: 'LLaMA 3.3 70B' },
  ]
  return (
    <aside className="hidden xl:flex flex-col w-60 border-l flex-shrink-0"
           style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>REPO INFO</p>
      </div>
      <div className="flex-1 px-4 py-4 space-y-4">
        {lines.map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon size={11} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <p className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Repo URL */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>REPOSITORY</p>
        <a href={repo.repo_url} target="_blank" rel="noreferrer"
           className="flex items-center gap-1.5 text-xs font-mono hover:underline"
           style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
          <Github size={10} />
          {repo.repo_url.replace('https://github.com/', '')}
        </a>
      </div>
    </aside>
  )
}

/* ── Welcome / no selection ── */
function Welcome() {
   const text = "Welcome to Repo-Brain";
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 80); // typing speed (ms)

      return () => clearTimeout(timeout);
    }
  });
  const features = [
    { icon: Github, title: 'Index any repo', desc: 'Paste a GitHub URL and we clone, split, and embed it.' },
    { icon: Database, title: 'Semantic search', desc: 'Sentence Transformers find the most relevant code.' },
    { icon: Cpu, title: 'LLaMA 70B answers', desc: 'Groq-powered LLM generates precise, grounded responses.' },
    { icon: MessageSquare, title: 'Per-user history', desc: 'Chats are saved to MongoDB per user & per repo.' },
  ]
  return (
    <div className="flex-1 flex items-center justify-center p-8 animate-fade-in" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
             style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-light)' }}>
          <Code2 className='animate-pulse' size={26} style={{ color: 'var(--accent)' }} />
        </div>
         <h2
      className="text-2xl font-bold mb-2"
      style={{ color: "var(--text-primary)" }}
    >
      {displayedText}
      <span className="animate-pulse">|</span>
    </h2>
        <p className="text-sub text-sm mb-8 max-w-sm mx-auto leading-relaxed">
          Index a GitHub repository from the sidebar, then ask questions about the code in plain English.
        </p>

   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
  {features.map(({ icon: Icon, title, desc }) => (
    <div
      key={title}
      className="p-4 rounded-xl transition-all duration-300 ease-out
                 hover:-translate-y-1 hover:shadow-lg hover:scale-[1.02]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} style={{ color: "var(--accent)" }} />
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
      </div>
      <p className="text-xs text-sub leading-relaxed">{desc}</p>
    </div>
  ))}
</div>

        <p className="mt-6 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          ← Click "Add" in the sidebar to get started
        </p>
      </div>
    </div>
  )
}

/* ── Dashboard ── */
export default function Dashboard() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const [repos, setRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const fetchRepos = useCallback(async () => {
    try {
      const res = await reposAPI.list()
      setRepos(res.data)
      // Keep selected repo up to date
      if (selectedRepo) {
        const updated = res.data.find(r => r.id === selectedRepo.id)
        if (updated) setSelectedRepo(updated)
      }
    } catch (_) {}
    finally { setInitialLoading(false) }
  }, [selectedRepo?.id])

  useEffect(() => { fetchRepos() }, [])

  // Poll for indexing repos
  useEffect(() => {
    const hasIndexing = repos.some(r => r.status === 'indexing')
    if (!hasIndexing) return
    const t = setInterval(fetchRepos, 5000)
    return () => clearInterval(t)
  }, [repos, fetchRepos])

  const handleRepoDeleted = (id) => {
    setRepos(p => p.filter(r => r.id !== id))
    if (selectedRepo?.id === id) setSelectedRepo(null)
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
      <Topbar
        user={user} onLogout={logout}
        onMenuClick={() => setSidebarOpen(s => !s)}
        sidebarOpen={sidebarOpen}
        isDark={isDark} toggleTheme={toggle}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`
          flex-shrink-0 w-64 border-r flex flex-col overflow-hidden
          ${sidebarOpen ? 'absolute inset-y-0 left-0 z-30 shadow-lg' : 'hidden'}
          lg:flex lg:static lg:shadow-none
        `} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <RepoSidebar
            repos={repos}
            selectedRepo={selectedRepo}
            onSelect={repo => { setSelectedRepo(repo); setSidebarOpen(false) }}
            onReposChange={fetchRepos}
            onRepoDeleted={handleRepoDeleted}
          />
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/40 z-20"
               onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {initialLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="spinner spinner-lg" />
            </div>
          ) : selectedRepo ? (
            <ChatInterface repo={selectedRepo} key={selectedRepo.id} />
          ) : (
            <Welcome />
          )}
        </main>

        {/* Right stats panel */}
        <RepoStats repo={selectedRepo} />
      </div>
    </div>
  )
}
