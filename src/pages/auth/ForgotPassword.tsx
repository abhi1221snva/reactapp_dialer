import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { authService } from '../../services/auth.service'
import toast from 'react-hot-toast'

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
      toast.success('Password reset link sent!')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4 animate-fadeIn">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 8px 24px rgba(16,185,129,0.18)',
          }}
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-[1.65rem] font-bold text-white leading-tight">Check your email</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          We sent a password reset link to{' '}
          <span className="font-semibold text-slate-200">{email}</span>
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="auth-btn-ghost-dark"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Icon header */}
      <div className="flex flex-col items-center mb-7 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.20)',
          }}
        >
          <KeyRound className="w-7 h-7 text-indigo-400" />
        </div>
        <h2 className="text-[1.65rem] font-bold text-white leading-tight">Forgot password?</h2>
        <p className="text-sm text-slate-400 mt-2">
          No worries — we&apos;ll send you reset instructions.
        </p>
      </div>

      <div className="space-y-1">
        <label className="auth-label">Email address</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          <input
            type="email"
            className="auth-input pl-10"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? (
          <><Spinner /> Sending reset link...</>
        ) : <><Mail className="w-4 h-4" /> Send reset instructions</>}
      </button>

      <button
        type="button"
        onClick={() => navigate('/login')}
        className="auth-btn-ghost-dark"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
    </form>
  )
}
