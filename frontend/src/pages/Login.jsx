import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Eye, EyeOff, Sun, Moon, Code2, ArrowRight, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex">

      {/* ── Left panel (decorative) ── */}
      <div
        className="hidden lg:flex lg:w-[44%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,.3)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,.4)' }} />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full opacity-15" style={{ background: 'rgba(255,255,255,.3)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-14">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Code2 size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg">Repo-Brain</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Talk to your<br />codebase.
          </h1>
          <p className="text-orange-100 text-base leading-relaxed max-w-xs">
            Index any GitHub repo and ask questions in plain English. Find patterns, understand architecture, ship faster.
          </p>
        </div>

        <div className="relative z-10">
          {[
            { q: 'Where is the auth middleware?', a: 'Found in middleware/auth.js — uses JWT tokens with refresh rotation.' },
            { q: 'How do I add a new API route?', a: 'Follow the pattern in routes/users.js — register in app.js line 47.' },
          ].map((item, i) => (
            <div key={i} className="mb-3 last:mb-0 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-orange-100 text-xs font-mono mb-1.5 opacity-80">User asked:</p>
              <p className="text-white text-sm font-medium mb-2">{item.q}</p>
              <p className="text-orange-100 text-xs leading-relaxed opacity-90">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          <div className="lg:hidden flex items-center gap-2">
            <Code2 size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-base text-base">Repo-Brain</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-sub">No account?</span>
            <Link to="/register" className="btn btn-ghost text-sm">Create one</Link>
            <button onClick={toggle} className="btn-icon" aria-label="Toggle theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
              <p className="text-sub text-sm">Sign in to your Repo-Brain account</p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg mb-5 text-sm animate-slide-up"
                   style={{ background: 'var(--bg-secondary)', border: '1px solid #fca5a5', color: '#dc2626' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  EMAIL
                </label>
                <input
                  type="email" required
                  className="field"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    className="field pr-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                  />
                  <button type="button" className="btn-icon absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowPass(s => !s)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6" style={{ padding: '.625rem' }}>
                {loading
                  ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />Signing in…</>
                  : <>Sign In <ArrowRight size={14} /></>
                }
              </button>
            </form>

            <p className="mt-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Powered by Groq · LLaMA 3.3 70B · ChromaDB
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
