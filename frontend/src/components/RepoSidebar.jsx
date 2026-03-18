import React, { useState, useRef, useEffect } from 'react'
import { reposAPI } from '../api/client'
import {
  Plus, Github, GitBranch, Loader2, Trash2, RefreshCw,
  FileCode, ChevronDown, ChevronRight, AlertCircle, X
} from 'lucide-react'

function StatusDot({ status }) {
  const map = {
    ready:    { cls: 'status-ready',    dot: 'bg-green-500', label: 'Ready' },
    indexing: { cls: 'status-indexing', dot: 'bg-yellow-500 animate-pulse', label: 'Indexing' },
    error:    { cls: 'status-error',    dot: 'bg-red-500',   label: 'Error' },
  }
  const s = map[status] || map.error
  return (
    <span className={`status-pill ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} inline-block`} />
      {s.label}
    </span>
  )
}

function AddRepoModal({ onClose, onAdded }) {
  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const urlRef = useRef(null)

  useEffect(() => { urlRef.current?.focus() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await reposAPI.index({ repo_url: url.trim(), branch: branch.trim() || 'main' })
      onAdded(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start indexing')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Index Repository</h3>
            <p className="text-xs text-sub mt-0.5">Paste a public GitHub URL to get started</p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg mb-4 text-xs"
               style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>GITHUB URL</label>
            <div className="relative">
              <Github size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input ref={urlRef} type="url" required className="field pl-8 text-sm"
                     placeholder="https://github.com/user/repo"
                     value={url} onChange={e => setUrl(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>BRANCH</label>
            <div className="relative">
              <GitBranch size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="text" className="field pl-8 text-sm"
                     placeholder="main"
                     value={branch} onChange={e => setBranch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-ghost flex-1 text-sm" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1 text-sm">
              {loading ? <><div className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />Indexing…</> : 'Start Indexing'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs text-muted">Try: <span className="font-mono" style={{ color: 'var(--accent)' }}>https://github.com/tiangolo/fastapi</span></p>
        </div>
      </div>
    </div>
  )
}

export default function RepoSidebar({ repos, selectedRepo, onSelect, onReposChange, onRepoDeleted }) {
  const [showModal, setShowModal] = useState(false)

  const handleAdded = (repo) => {
    onReposChange()
    onSelect(repo)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this repository and its chat history?')) return
    try { await reposAPI.delete(id); onRepoDeleted(id); onReposChange() } catch (_) {}
  }

  const handleReindex = async (e, repo) => {
    e.stopPropagation()
    try { await reposAPI.index({ repo_url: repo.repo_url, branch: repo.branch }); onReposChange() } catch (_) {}
  }

  return (
    <>
      {showModal && <AddRepoModal onClose={() => setShowModal(false)} onAdded={handleAdded} />}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
              REPOSITORIES ({repos.length})
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary text-xs gap-1"
              style={{ padding: '.3rem .6rem', borderRadius: 6 }}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {repos.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                   style={{ background: 'var(--bg-tertiary)' }}>
                <Github size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No repos yet</p>
              <p className="text-xs text-sub">Click "Add" to index a GitHub repository</p>
            </div>
          ) : (
            repos.map(repo => (
              <button
                key={repo.id}
                onClick={() => onSelect(repo)}
                className={`repo-item group w-full mb-1 ${selectedRepo?.id === repo.id ? 'active' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Github size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {repo.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusDot status={repo.status} />
                      {repo.status === 'ready' && (
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {repo.file_count}f · {repo.chunk_count}c
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ">
                    <button className="btn-icon tooltip " data-tip="Re-index" onClick={e => handleReindex(e, repo)}>
                      <RefreshCw size={11} />
                    </button>
                    <button className="btn-icon tooltip" data-tip="Delete"
                            style={{ '--hover-bg': '#fee2e2' }}
                            onClick={e => handleDelete(e, repo.id)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {repo.status === 'ready' && repo.branch && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <GitBranch size={10} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{repo.branch}</span>
                  </div>
                )}

                {repo.status === 'error' && (
                  <p className="text-xs mt-1 truncate" style={{ color: '#dc2626' }}>Try again later</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
            Tip: Press <kbd className="px-1 py-0.5 rounded text-xs"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>K</kbd> to focus chat
          </p>
        </div>
      </div>
    </>
  )
}
