import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react'
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

export function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Missing token/email — show error
  if (!token || !email) {
    return (
      <div className="text-center space-y-4 py-4 animate-fadeIn">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            boxShadow: '0 8px 24px rgba(239,68,68,0.18)',
          }}
        >
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-[1.65rem] font-bold text-white leading-tight">Invalid reset link</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          This password reset link is invalid or has expired.<br />
          Please request a new one.
        </p>
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="auth-btn-primary"
            style={{ maxWidth: '220px' }}
          >
            Request new link
          </button>
        </div>
      </div>
    )
  }

  // Success screen
  if (done) {
    return (
      <div className="text-center space-y-4 py-4 animate-fadeIn">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 8px 24px rgba(16,185,129,0.18)',
          }}
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-[1.65rem] font-bold text-white leading-tight">Password updated!</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Your password has been reset successfully.<br />
          You can now sign in with your new password.
        </p>
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="auth-btn-primary"
            style={{ maxWidth: '180px' }}
          >
            Sign in →
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword({ token, email, password, password_confirmation: confirm })
      setDone(true)
      toast.success('Password reset successfully!')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col items-center mb-7 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.20)',
          }}
        >
          <Lock className="w-7 h-7 text-indigo-400" />
        </div>
        <h2 className="text-[1.65rem] font-bold text-white leading-tight">Set new password</h2>
        <p className="text-sm text-slate-400 mt-2">
          Creating a new password for{' '}
          <span className="font-medium text-slate-300">{email}</span>
        </p>
      </div>

      <div className="space-y-1">
        <label className="auth-label">New password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          <input
            type={showPass ? 'text' : 'password'}
            className="auth-input pl-10 pr-10"
            placeholder="Min 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={64}
          />
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="auth-label">Confirm new password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          <input
            type="password"
            className="auth-input pl-10"
            placeholder="Re-enter password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="auth-btn-primary">
        {loading ? <><Spinner /> Updating password...</> : 'Update password →'}
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
