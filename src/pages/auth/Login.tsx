import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, Eye, EyeOff, Mail, Lock, ArrowLeft, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { authService } from '../../services/auth.service'
import api from '../../api/axios'
import type { User } from '../../types'
import toast from 'react-hot-toast'

async function fetchUserLevel(userId: number, token: string): Promise<number> {
  try {
    const res = await api.get(`/extension/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = res.data?.data
    // user_level is the real level field from the backend
    return Number(d?.user_level ?? d?.level ?? 1)
  } catch {
    return 1
  }
}

export function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState('')
  const [pendingData, setPendingData] = useState<(User & { token: string }) | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildUser = async (payload: any): Promise<User> => {
    // Login response already includes `level` from RolesService.
    // Only fall back to the extension API if level is missing (should not happen).
    const level = payload.level
      ? Number(payload.level)
      : await fetchUserLevel(Number(payload.id), String(payload.token))
    return {
      ...payload,
      name: `${payload.first_name ?? ''} ${payload.last_name ?? ''}`.trim() || String(payload.email),
      level,
    } as User
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authService.login({ email, password, device: 'desktop_app' })

      // Backend wraps response: { success, message, data: { ...user, token } }
      const payload = res.data?.data ?? res.data

      if (!payload) {
        toast.error('Unexpected response from server')
        return
      }

      if (payload.otpId) {
        const user = await buildUser(payload)
        setOtpId(payload.otpId)
        setPendingData({ ...user, token: payload.token })
        setOtpStep(true)
        toast.success('OTP sent to your email/phone')
      } else {
        const user = await buildUser(payload)
        setAuth(payload.token, user)
        navigate('/dashboard')
      }
    } catch {
      // errors handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authService.verifyOtp({ otp, otpId })
      const payload = res.data?.data ?? res.data
      const user = await buildUser(payload)
      setAuth(payload.token, user)
      navigate('/dashboard')
    } catch {
      // errors handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  if (otpStep) {
    return (
      <form onSubmit={handleOtp} className="space-y-5">
        <button type="button" onClick={() => setOtpStep(false)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-center">Verify your identity</h2>
          <p className="text-sm text-slate-500 text-center mt-1">Enter the 6-digit code sent to your email</p>
        </div>
        <input type="text" inputMode="numeric" pattern="[0-9]*"
          className="w-full rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none h-14 text-center text-2xl tracking-[0.5em] font-mono px-4 transition-colors"
          maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" required />
        <button type="submit" disabled={loading}
          className="btn-primary w-full h-11 font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Verifying...
            </>
          ) : 'Verify Code'}
        </button>
        <button type="button" onClick={() => toast('Resend not implemented yet')}
          className="btn-ghost w-full mt-2 text-sm">Resend code</button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
          <Phone className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 text-center">Welcome back</h2>
        <p className="text-sm text-slate-500 text-center mt-1">Sign in to your DialerCRM account</p>
      </div>
      <div className="form-group">
        <label className="label">Email address</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input type="email" className="input pl-10" placeholder="you@company.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input type={showPass ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <Link to="/forgot-password"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={loading}
        className="btn-primary w-full h-11 font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Signing in...
          </>
        ) : (
          <>
            <Phone className="w-4 h-4" />
            Sign in
          </>
        )}
      </button>
      <p className="text-sm text-slate-500 text-center mt-2">
        Don&apos;t have an account?{' '}
        <span className="text-indigo-600 font-medium">Contact your administrator</span>
      </p>
    </form>
  )
}
