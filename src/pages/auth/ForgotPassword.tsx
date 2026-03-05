import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authService } from '../../services/auth.service'
import toast from 'react-hot-toast'

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
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Check your email!</h2>
        <p className="text-sm text-slate-500">
          We sent a password reset link to{' '}
          <span className="font-semibold text-slate-700">{email}</span>
        </p>
        <button type="button" onClick={() => navigate('/login')}
          className="inline-flex items-center justify-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
          <KeyRound className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 text-center">Forgot password?</h2>
        <p className="text-sm text-slate-500 text-center mt-1">
          No worries, we&apos;ll send you reset instructions.
        </p>
      </div>
      <div className="form-group">
        <label className="label">Email address</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input type="email" className="input pl-10" placeholder="you@company.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="btn-primary w-full h-11 font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sending...
          </>
        ) : 'Send reset instructions'}
      </button>
      <button type="button" onClick={() => navigate('/login')}
        className="flex items-center justify-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors w-full mt-4">
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
    </form>
  )
}
