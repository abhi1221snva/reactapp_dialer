import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Shield, Key } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { authService } from '../../services/auth.service'
import { twoFactorService } from '../../services/twoFactor.service'
import api from '../../api/axios'
import type { User } from '../../types'
import { LEVELS } from '../../utils/permissions'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

// Google Identity Services type declaration
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (element: HTMLElement, config: {
            theme?: string
            size?: string
            type?: string
            width?: number
            text?: string
            shape?: string
          }) => void
          prompt: () => void
        }
      }
    }
  }
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Social icons ─────────────────────────────────────────────────────────────
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
      <rect width="11" height="11" fill="#f25022" />
      <rect x="12" width="11" height="11" fill="#7fba00" />
      <rect y="12" width="11" height="11" fill="#00a4ef" />
      <rect x="12" y="12" width="11" height="11" fill="#ffb900" />
    </svg>
  )
}


async function fetchUserLevel(userId: number, token: string): Promise<number> {
  try {
    const res = await api.get(`/extension/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = res.data?.data
    return Number(d?.user_level ?? d?.level ?? 1)
  } catch {
    return 1
  }
}

// ─── TOTP 2FA step ────────────────────────────────────────────────────────────
function TotpStep({
  userId,
  onSuccess,
  onBack,
}: {
  userId: number
  onSuccess: (payload: Record<string, unknown>) => void
  onBack: () => void
}) {
  const [otp, setOtp] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.trim()
    if (!code) { toast.error('Enter your verification code'); return }
    if (!useBackup && code.length < 6) { toast.error('Enter the 6-digit code from your authenticator app'); return }

    setLoading(true)
    try {
      const res = await twoFactorService.verify(userId, code)
      const payload = res.data?.data ?? res.data
      if (!payload?.token) {
        toast.error('Verification failed. Check your code and try again.')
        return
      }
      onSuccess(payload as Record<string, unknown>)
    } catch {
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>

      <div className="flex flex-col items-center mb-7">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.20)',
          }}
        >
          {useBackup
            ? <Key className="w-7 h-7 text-indigo-400" />
            : <Shield className="w-7 h-7 text-indigo-400" />
          }
        </div>
        <h2 className="text-[1.65rem] font-bold text-white text-center leading-tight">Two-Factor Authentication</h2>
        <p className="text-sm text-slate-400 text-center mt-2">
          {useBackup
            ? 'Enter one of your 8-character backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>
      </div>

      {useBackup ? (
        <div>
          <label className="auth-label">Backup Code</label>
          <input
            type="text"
            inputMode="text"
            className="auth-input h-14 text-center text-xl tracking-[0.4em] font-mono"
            style={{ borderWidth: '2px' }}
            maxLength={12}
            value={otp}
            onChange={e => setOtp(e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="XXXXXXXX"
            required
          />
        </div>
      ) : (
        <div>
          <label className="auth-label block text-center">Authenticator Code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="auth-input h-14 text-center text-2xl tracking-[0.5em] font-mono"
            style={{ borderWidth: '2px' }}
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !otp.trim()}
        className="auth-btn-primary"
      >
        {loading ? <><Spinner /> Verifying...</> : <><Shield className="w-4 h-4" /> Verify</>}
      </button>

      <button
        type="button"
        onClick={() => { setUseBackup(b => !b); setOtp('') }}
        className="auth-btn-ghost-dark w-full text-sm"
      >
        {useBackup ? 'Use authenticator app instead' : 'Use a backup code instead'}
      </button>
    </form>
  )
}

// ─── Main Login component ─────────────────────────────────────────────────────
export function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Legacy SMS/email OTP step
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingData, setPendingData] = useState<(User & { token: string }) | null>(null)

  // 2FA TOTP step
  const [totpStep, setTotpStep] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<number | null>(null)

  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        callback: async (response: { credential: string }) => {
          setGoogleLoading(true)
          try {
            const res = await authService.googleLogin(response.credential)
            const payload = res.data?.data ?? res.data
            if (!payload?.token) {
              toast.error('Google login failed. Please try again.')
              return
            }
            const user = await buildUser(payload as Record<string, unknown>)
            setAuth(payload.token as string, user)
            navigate(user.level === LEVELS.ADMIN ? '/crm/dashboard' : '/dashboard')
          } catch (err: unknown) {
            // Check for ACCOUNT_NOT_FOUND — show SweetAlert with Register option
            const axiosErr = err as { response?: { data?: { code?: string; message?: string } } }
            const code = axiosErr?.response?.data?.code
            if (code === 'ACCOUNT_NOT_FOUND') {
              const result = await Swal.fire({
                title: 'Account Not Found',
                text: 'This Google account is not registered in the system. Please sign up first or contact your administrator.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Register',
                cancelButtonText: 'Close',
                confirmButtonColor: '#6366f1',
                cancelButtonColor: '#64748b',
                reverseButtons: true,
              })
              if (result.isConfirmed) {
                navigate('/register')
              }
            }
            // All other errors are handled by the Axios interceptor
          } finally {
            setGoogleLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        type: 'icon',
        shape: 'square',
      })
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const gsiScript = document.querySelector('script[src*="gsi/client"]')
      gsiScript?.addEventListener('load', initGoogle)
      return () => gsiScript?.removeEventListener('load', initGoogle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildUser = async (payload: Record<string, unknown>): Promise<User> => {
    const level = payload.level
      ? Number(payload.level)
      : await fetchUserLevel(Number(payload.id), String(payload.token))
    return {
      ...payload,
      name: `${payload.first_name ?? ''} ${payload.last_name ?? ''}`.trim() || String(payload.email),
      level,
    } as User
  }

  const completeLogin = async (payload: Record<string, unknown>) => {
    const user = await buildUser(payload)
    setAuth(payload.token as string, user)
    navigate(user.level === LEVELS.ADMIN ? '/crm/dashboard' : '/dashboard')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authService.login({ email, password, device: 'desktop_app' })
      const payload = (res.data?.data ?? res.data) as unknown as Record<string, unknown>

      if (!payload) {
        toast.error('Unexpected response from server')
        return
      }

      if (payload.requires_2fa === 'google_totp') {
        setPendingUserId(Number(payload.user_id))
        setTotpStep(true)
        return
      }

      if (payload.otpId) {
        const user = await buildUser(payload)
        setOtpId(payload.otpId as string)
        setPendingData({ ...user, token: payload.token as string })
        setOtpStep(true)
        toast.success('OTP sent to your email/phone')
        return
      }

      await completeLogin(payload)
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
      const payload = (res.data?.data ?? res.data) as Record<string, unknown>
      await completeLogin(payload)
    } catch {
      // errors handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  // ── 2FA TOTP step ─────────────────────────────────────────────────────────
  if (totpStep && pendingUserId !== null) {
    return (
      <TotpStep
        userId={pendingUserId}
        onSuccess={completeLogin}
        onBack={() => { setTotpStep(false); setPendingUserId(null) }}
      />
    )
  }

  // ── Legacy OTP step ───────────────────────────────────────────────────────
  if (otpStep) {
    return (
      <form onSubmit={handleOtp} className="space-y-5">
        <button type="button" onClick={() => setOtpStep(false)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 8px 24px rgba(99,102,241,0.20)',
            }}
          >
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-[1.65rem] font-bold text-white text-center leading-tight">Verify your identity</h2>
          <p className="text-sm text-slate-400 text-center mt-2">
            Enter the 6-digit code sent to your email
          </p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="auth-input h-16 text-center text-3xl tracking-[0.55em] font-mono"
          style={{ borderWidth: '2px' }}
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value)}
          placeholder="000000"
          required
        />
        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <><Spinner /> Verifying...</> : <><Shield className="w-4 h-4" /> Verify Code</>}
        </button>
        <button type="button" onClick={() => toast('Resend not implemented yet')}
          className="auth-btn-ghost-dark w-full mt-2 text-sm">Resend code</button>
      </form>
    )
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white leading-tight">Welcome back</h2>
        <p className="text-sm text-slate-400 mt-1">Sign in to your account to continue</p>
      </div>

      {/* Social login — icon only, one row */}
      <div className="flex gap-2.5">
        {/* Google — native GSI icon button */}
        <div
          className="flex-1 flex items-center justify-center h-11 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
          title="Continue with Google"
        >
          {googleLoading
            ? <Spinner />
            : <div ref={googleBtnRef} />
          }
        </div>
        <button
          type="button"
          onClick={() => toast('LinkedIn sign-in coming soon')}
          className="auth-social-icon-btn"
          title="Continue with LinkedIn"
        >
          <LinkedInIcon />
        </button>
        <button
          type="button"
          onClick={() => toast('Microsoft sign-in coming soon')}
          className="auth-social-icon-btn"
          title="Continue with Microsoft"
        >
          <MicrosoftIcon />
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <span className="text-xs text-slate-500 font-medium px-1">or continue with email</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
      </div>

      {/* Email */}
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

      {/* Password */}
      <div className="space-y-1">
        <label className="auth-label">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          <input
            type={showPass ? 'text' : 'password'}
            className="auth-input pl-10 pr-10"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer accent-indigo-500"
          />
          <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors select-none">
            Remember me
          </span>
        </label>
        <Link
          to="/forgot-password"
          className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* Sign in button */}
      <button type="submit" disabled={loading} className="auth-btn-primary mt-1">
        {loading ? <><Spinner /> Signing in...</> : 'Sign in →'}
      </button>

      {/* Sign up link */}
      <p className="text-sm text-slate-500 text-center pt-0.5">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
          Create one free
        </Link>
      </p>
    </form>
  )
}
