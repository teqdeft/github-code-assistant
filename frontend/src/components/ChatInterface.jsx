import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { chatAPI } from '../api/client'
import { useTheme } from '../contexts/ThemeContext'
import {
  Send, Bot, User, FileCode, ChevronDown, ChevronUp,
  Loader2, Trash2, Copy, Check, RotateCcw,
  Keyboard, X, Lightbulb, MessageSquare, Zap
} from 'lucide-react'

/* ── Suggestions ── */
const SUGGESTIONS = [
  { icon: '🔐', text: 'Where is the authentication logic?' },
  { icon: '🛣️', text: 'How do I add a new API route?' },
  { icon: '🗄️', text: 'How is the database connected?' },
  { icon: '⚠️', text: 'How are errors handled in this app?' },
  { icon: '🏗️', text: 'Explain the overall architecture' },
  { icon: '🔄', text: 'What design patterns are used here?' },
]

/* ── Copy button ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="btn-icon tooltip" data-tip={copied ? 'Copied!' : 'Copy'}
            style={{ position: 'absolute', top: 8, right: 8 }}>
      {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
    </button>
  )
}

/* ── Code block ── */
function CodeBlock({ isDark, children, language }) {
  const code = String(children).replace(/\n$/, '')
  return (
    <div className="relative">
      <CopyBtn text={code} />
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          fontSize: '.78rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: isDark ? '#1c1917' : '#fafaf9',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

/* ── Source files panel ── */
function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false)
  if (!sources?.length) return null
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(s => !s)}
        className="flex items-center gap-1.5 text-xs font-mono transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <FileCode size={11} />
        {sources.length} source{sources.length > 1 ? 's' : ''}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 animate-fade-in">
          {sources.map((src, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent)' }}>›</span>
              <span className="max-w-[200px] truncate" title={src.file}>{src.file.split('/').slice(-2).join('/')}</span>
              <span style={{ color: 'var(--text-muted)' }}>{Math.round(src.relevance * 100)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Single message ── */
function Message({ msg, isDark, onResend }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 mb-6 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5
        ${isUser
          ? 'text-white'
          : 'border'
        }`}
        style={isUser
          ? { background: 'var(--accent)' }
          : { background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
        }
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {isUser ? (
          <div className="bubble-user">
            <p>{msg.content}</p>
          </div>
        ) : (
          <div className="bubble-ai">
            <div className="md-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const lang = /language-(\w+)/.exec(className || '')?.[1]
                    return !inline && lang
                      ? <CodeBlock isDark={isDark} language={lang}>{children}</CodeBlock>
                      : <code className={className}>{children}</code>
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
            <SourcesPanel sources={msg.sources} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isUser && (
            <button className="btn-icon text-xs flex items-center gap-1"
                    style={{ fontSize: '0.7rem' }}
                    onClick={() => navigator.clipboard.writeText(msg.content)}>
              <Copy size={10} /> Copy
            </button>
          )}
          {isUser && (
            <button className="btn-icon text-xs flex items-center gap-1"
                    style={{ fontSize: '0.7rem' }}
                    onClick={() => onResend(msg.content)}>
              <RotateCcw size={10} /> Resend
            </button>
          )}
          {msg.created_at && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Thinking ── */
function Thinking() {
  return (
    <div className="flex gap-3 mb-6">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border"
           style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Bot size={13} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className="bubble-ai flex items-center gap-2.5" style={{ padding: '.75rem 1rem' }}>
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Analyzing codebase…</span>
        <div className="flex gap-1 ml-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)', animation: `blink 1.2s step-end ${i * .4}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Keyboard shortcuts modal ── */
function ShortcutsModal({ onClose }) {
  const shorts = [
    ['K', 'Focus chat input'],
    ['Enter', 'Send message'],
    ['Shift+Enter', 'New line'],
    ['Escape', 'Close modal'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card p-5 w-80 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h3>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="space-y-2">
          {shorts.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-sub">{desc}</span>
              <kbd className="px-2 py-0.5 rounded text-xs font-mono"
                   style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Empty state ── */
function EmptyState({ repo, onSend }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
           style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-light)' }}>
        <Zap size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
        Ask about <span style={{ color: 'var(--accent)' }}>{repo.name}</span>
      </h3>
      <p className="text-sm text-sub text-center max-w-xs mb-6">
        {repo.chunk_count} chunks from {repo.file_count} files are indexed and ready.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => onSend(s.text)}
                  className="text-left p-3 rounded-xl text-sm transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <span className="mr-1.5">{s.icon}</span>{s.text}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main ChatInterface ── */
export default function ChatInterface({ repo }) {
  const { isDark } = useTheme()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const MAX_CHARS = 2000

  /* Load history */
  useEffect(() => {
    if (!repo) return
    setLoadingHistory(true)
    setMessages([])
    chatAPI.history(repo.id)
      .then(res => {
        const msgs = []
        res.data.forEach(m => {
          msgs.push({ role: 'user', content: m.question, created_at: m.created_at, id: m.id + '_q' })
          msgs.push({ role: 'assistant', content: m.answer, sources: m.sources, created_at: m.created_at, id: m.id + '_a' })
        })
        setMessages(msgs)
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [repo?.id])

  /* Scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'k' && !e.metaKey && !e.ctrlKey && !e.shiftKey
          && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setShowShortcuts(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const sendMessage = useCallback(async (question) => {
    if (!question.trim() || loading || !repo) return
    const q = question.trim()
    setInput('')
    setCharCount(0)
    setMessages(prev => [...prev, { role: 'user', content: q, id: Date.now() + '_q' }])
    setLoading(true)
    try {
      const res = await chatAPI.ask({ repo_id: repo.id, question: q })
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.data.answer,
        sources: res.data.sources, created_at: res.data.created_at, id: res.data.id + '_a'
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${err.response?.data?.detail || err.message}`,
        id: Date.now() + '_err'
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading, repo])

  const clearHistory = async () => {
    if (!confirm('Clear all chat history for this repository?')) return
    try { await chatAPI.clearHistory(repo.id); setMessages([]) } catch (_) {}
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    setCharCount(e.target.value.length)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  /* Loading state */
  if (!repo) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <MessageSquare size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
        <p className="text-sm text-sub">Select a repository from the sidebar</p>
      </div>
    </div>
  )

  if (repo.status === 'indexing') return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center"
             style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-light)' }}>
          <Loader2 size={22} style={{ color: 'var(--accent)' }} className="animate-spin" />
        </div>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Indexing {repo.name}</h3>
        <p className="text-sm text-sub">Cloning repo, embedding code chunks…</p>
        <p className="text-xs font-mono mt-3 animate-pulse" style={{ color: 'var(--accent)' }}>This may take a few minutes</p>
      </div>
    </div>
  )

  if (repo.status === 'error') return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="text-3xl mb-3">⚠️</div>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Indexing Failed</h3>
        <p className="text-sm" style={{ color: '#dc2626' }}>{repo.error || 'Unknown error'}</p>
      </div>
    </div>
  )

  return (
    <>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <div className="flex flex-col h-full">
        {/* Chat topbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
             style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 6px #22c55e' }} />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{repo.name}</span>
              <span className="text-xs font-mono ml-2" style={{ color: 'var(--text-muted)' }}>
                {repo.file_count}f · {repo.chunk_count} chunks
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-icon tooltip" data-tip="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}>
              <Keyboard size={14} />
            </button>
            {messages.length > 0 && (
              <button className="btn-icon tooltip" data-tip="Clear chat" onClick={clearHistory}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ background: 'var(--bg)' }}>
          {loadingHistory ? (
            <div className="space-y-6">
              {[1,2].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full skeleton flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 rounded w-3/4" />
                    <div className="skeleton h-4 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <EmptyState repo={repo} onSend={sendMessage} />
          ) : (
            <>
              {messages.map(msg => (
                <Message key={msg.id} msg={msg} isDark={isDark} onResend={sendMessage} />
              ))}
              {loading && <Thinking />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div className="px-5 py-4 border-t flex-shrink-0"
             style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
                }}
                placeholder="Ask anything about this codebase…"
                disabled={loading}
                maxLength={MAX_CHARS}
                rows={1}
                className="field resize-none w-full pr-16 leading-relaxed"
                style={{ minHeight: 44, maxHeight: 160, overflow: 'hidden' }}
              />
              <div className="absolute right-3 bottom-2.5 flex items-center gap-1.5">
                {input.length > 100 && (
                  <span className="text-xs font-mono" style={{ color: charCount > MAX_CHARS * .9 ? '#dc2626' : 'var(--text-muted)' }}>
                    {charCount}/{MAX_CHARS}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="btn btn-primary flex-shrink-0"
              style={{ height: 44, width: 44, padding: 0, borderRadius: 10 }}
            >
              {loading
                ? <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />
                : <Send size={15} />
              }
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              <kbd className="px-1 rounded" style={{ background: 'var(--bg-tertiary)' }}>Enter</kbd> to send ·{' '}
              <kbd className="px-1 rounded" style={{ background: 'var(--bg-tertiary)' }}>Shift+Enter</kbd> for new line
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Llama 3.3 70B
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
