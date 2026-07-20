import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as any)?.from?.pathname || '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not sign in. Check your credentials and try again.')
    }
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-surface">
      {/* Left: ledger-styled brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
             style={{
               backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 39px, rgba(255,255,255,0.6) 40px)',
             }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono-figures text-accent-400 text-sm tracking-widest">GDT</span>
            <span className="font-display font-semibold text-lg tracking-tight">GNIDERTON</span>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl leading-snug font-semibold">
            Every ledger, one line at a time.
          </p>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Purchasing, sales, delivery, and finance — run from a single
            system of record, built for how distribution actually works.
          </p>
        </div>
        <div className="relative z-10 font-mono-figures text-xs text-white/40 tracking-wide">
          v1.0 — internal operations platform
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <span className="font-mono-figures text-brand-600 text-sm tracking-widest">GDT</span>
            <span className="font-display font-semibold text-lg text-ink-900">GNIDERTON</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-600">Welcome back. Enter your details to continue.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3.5 py-2.5 text-sm text-danger-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-sm font-medium py-2.5 transition disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-xs text-ink-600/70 leading-relaxed">
            Auth endpoint not yet confirmed with backend — see Build Spec §6/§7.
            This screen posts to <code className="font-mono-figures">/api/auth/login</code> as a placeholder.
          </p>
        </div>
      </div>
    </div>
  )
}
