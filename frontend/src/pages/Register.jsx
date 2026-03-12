import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Eye, EyeOff, Sun, Moon, Code2, ArrowRight, AlertCircle, Check } from 'lucide-react'

const FEATURES = [
  'Semantic code search across entire repos',
  'LLaMA 70B-powered answers with source refs',
  'Per-user chat history & multiple repos',
  'Dark & light mode, keyboard shortcuts',
]

export default function Register() {
  const { register } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex">

      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between p-12 relative overflow-hidden"
           style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Code2 size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Repo-Brain</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: 'var(--text-primary)' }}>
            Understand any<br />codebase instantly.
          </h1>
          <p className="text-sub text-sm leading-relaxed mb-8">
            Stop digging through unfamiliar repos. Ask natural-language questions and get precise answers grounded in real code.
          </p>
          <div className="space-y-2.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                     style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-light)' }}>
                  <Check size={10} style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
                </div>
                <span className="text-sm text-sub">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Free to get started. No credit card.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="lg:hidden flex items-center gap-2">
            <Code2 size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-base">Repo-Brain</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-sub">Have an account?</span>
            <Link to="/login" className="btn btn-ghost text-sm">Sign in</Link>
            <button onClick={toggle} className="btn-icon" aria-label="Toggle theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Create account</h2>
              <p className="text-sub text-sm">Get started with Repo-Brain for free</p>
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
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>USERNAME</label>
                <input type="text" required minLength={3} maxLength={30}
                  className="field" placeholder="yourname"
                  value={form.username} onChange={e => set('username', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>EMAIL</label>
                <input type="email" required
                  className="field" placeholder="you@company.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>PASSWORD</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required minLength={6}
                    className="field pr-10" placeholder="Min. 6 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="btn-icon absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowPass(s => !s)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6" style={{ padding: '.625rem' }}>
                {loading
                  ? <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />Creating account…</>
                  : <>Create Account <ArrowRight size={14} /></>}
              </button>
            </form>

            <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              By creating an account you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
