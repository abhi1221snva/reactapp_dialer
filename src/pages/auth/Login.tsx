import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Shield, Key } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { useEngineStore } from '../../stores/engine.store'
import { authService } from '../../services/auth.service'
import { twoFactorService } from '../../services/twoFactor.service'
import axios from 'axios'
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
    // Use a standalone axios call to avoid the shared interceptor that redirects on 401.
    // During login, the shared api instance may still hold a stale token from a previous
    // session which could cause an unwanted redirect.
    const baseURL = import.meta.env.VITE_API_URL as string || ''
    const res = await axios.get(`${baseURL}/extension/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
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
  const [loginError, setLoginError] = useState('')

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
  const googleInitialized = useRef(false)

  // Google link state — shown when user needs to verify password before linking
  const [googleLinkStep, setGoogleLinkStep] = useState(false)
  const [googleLinkCredential, setGoogleLinkCredential] = useState('')
  const [googleLinkEmail, setGoogleLinkEmail] = useState('')
  const [googleLinkPassword, setGoogleLinkPassword] = useState('')
  const [googleLinkLoading, setGoogleLinkLoading] = useState(false)

  const googleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true)
    try {
      const res = await authService.googleLogin(response.credential)
      const payload = res.data?.data ?? res.data
      const code = res.data?.code

      // Handle GOOGLE_LINK_REQUIRED — need password verification before linking
      if (code === 'GOOGLE_LINK_REQUIRED') {
        setGoogleLinkCredential(payload?.credential || response.credential)
        setGoogleLinkEmail(payload?.email || '')
        setGoogleLinkStep(true)
        return
      }

      if (!payload?.token) {
        toast.error('Google login failed. Please try again.')
        return
      }
      const user = await buildUser(payload as Record<string, unknown>)
      setAuth(payload.token as string, user, payload.refresh_token as string | undefined)
      const engine = useEngineStore.getState().engine
      navigate(engine === 'crm' ? '/crm/dashboard' : '/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { code?: string; message?: string } } }
      const code = axiosErr?.response?.data?.code
      const status = axiosErr?.response?.status
      const msg = axiosErr?.response?.data?.message

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
      } else if (code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_INACTIVE' || status === 403) {
        Swal.fire({
          title: 'Account Not Active',
          text: msg || 'Your account is not active. Please contact support.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#6366f1',
        })
      } else {
        toast.error(msg || 'Google login failed. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id || googleInitialized.current) return
      googleInitialized.current = true
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        callback: googleCallback,
        auto_select: false,
      })
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'medium',
          type: 'icon',
          shape: 'circle',
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initGoogle()
        }
      }, 200)
      const gsiScript = document.querySelector('script[src*="gsi/client"]')
      const onLoad = () => { clearInterval(interval); initGoogle() }
      gsiScript?.addEventListener('load', onLoad)
      return () => {
        clearInterval(interval)
        gsiScript?.removeEventListener('load', onLoad)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildUser = async (payload: Record<string, unknown>): Promise<User> => {
    const level = payload.level
      ? Number(payload.level)
      : await fetchUserLevel(Number(payload.id), String(payload.token))

    // Extract companyName — may be top-level or nested in permissions[parent_id]
    let companyName = payload.companyName as string | undefined
    if (!companyName && payload.permissions && payload.parent_id) {
      const perms = payload.permissions as Record<string, { companyName?: string }>
      companyName = perms[String(payload.parent_id)]?.companyName
    }

    return {
      ...payload,
      name: `${payload.first_name ?? ''} ${payload.last_name ?? ''}`.trim() || String(payload.email),
      level,
      companyName,
    } as User
  }

  const completeLogin = async (payload: Record<string, unknown>) => {
    // Save token immediately so any API calls during buildUser use the fresh token
    localStorage.setItem('auth_token', payload.token as string)
    if (payload.refresh_token) {
      localStorage.setItem('refresh_token', payload.refresh_token as string)
    }
    const user = await buildUser(payload)
    setAuth(payload.token as string, user, payload.refresh_token as string | undefined)
    // Respect persisted engine preference — navigate to CRM or dialer dashboard
    const engine = useEngineStore.getState().engine
    navigate(engine === 'crm' ? '/crm/dashboard' : '/dashboard')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    // Client-side validation
    if (!email.trim() || !password) {
      setLoginError('Email and password are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await authService.login({ email: email.trim(), password, device: 'desktop_app' })
      const payload = (res.data?.data ?? res.data) as unknown as Record<string, unknown>

      if (!payload) {
        setLoginError('Unexpected response from server')
        return
      }

      if (payload.requires_2fa === 'google_totp') {
        setPendingUserId(Number(payload.user_id))
        setTotpStep(true)
        return
      }

      // Organization requires 2FA but user hasn't set it up yet
      if (payload.requires_2fa_setup) {
        localStorage.setItem('auth_token', payload.token as string)
        const user = await buildUser(payload)
        setAuth(payload.token as string, user)
        toast('Your organization requires two-factor authentication. Please set it up now.', {
          duration: 6000,
          icon: '\u26A0\uFE0F',
        })
        navigate('/profile')
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
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; code?: string } } }
      const status = axiosErr?.response?.status
      const msg = axiosErr?.response?.data?.message
      const code = axiosErr?.response?.data?.code

      if (status === 403) {
        // Deactivated / inactive account
        if (code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_INACTIVE') {
          setLoginError(msg || 'Your account is not active. Please contact support.')
        } else {
          setLoginError(msg || 'Access denied. Please contact support.')
        }
      } else if (status === 401) {
        setLoginError(msg || 'Invalid email or password')
      } else if (status === 429) {
        setLoginError(msg || 'Too many attempts. Please wait a few minutes and try again.')
      } else if (status === 422) {
        setLoginError(msg || 'Please check your input and try again')
      } else if (status && status >= 500) {
        setLoginError('Something went wrong. Please try again later.')
      } else {
        setLoginError('Unable to connect. Please check your internet connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const [otpError, setOtpError] = useState('')

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError('')
    setLoading(true)
    try {
      const res = await authService.verifyOtp({ otp, otpId })
      const payload = (res.data?.data ?? res.data) as Record<string, unknown>
      await completeLogin(payload)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      const status = axiosErr?.response?.status
      const msg = axiosErr?.response?.data?.message
      if (status === 401 || status === 400) {
        setOtpError(msg || 'Invalid verification code. Please try again.')
      } else if (status === 429) {
        setOtpError(msg || 'Too many attempts. Please wait and try again.')
      } else {
        setOtpError('Verification failed. Please try again.')
      }
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!googleLinkPassword.trim()) {
      toast.error('Please enter your password')
      return
    }
    setGoogleLinkLoading(true)
    try {
      const res = await authService.linkGoogle(googleLinkCredential, googleLinkPassword)
      const payload = (res.data?.data ?? res.data) as Record<string, unknown>
      if (!payload?.token) {
        toast.error('Failed to link Google account.')
        return
      }
      toast.success('Google account linked successfully!')
      await completeLogin(payload)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      const msg = axiosErr?.response?.data?.message
      const status = axiosErr?.response?.status
      if (status === 401) {
        toast.error(msg || 'Incorrect password. Please try again.')
      } else {
        toast.error(msg || 'Failed to link Google account.')
      }
      setGoogleLinkPassword('')
    } finally {
      setGoogleLinkLoading(false)
    }
  }

  // ── Google Link password step ──────────────────────────────────────────────
  if (googleLinkStep) {
    return (
      <form onSubmit={handleGoogleLink} className="space-y-5">
        <button type="button" onClick={() => { setGoogleLinkStep(false); setGoogleLinkPassword('') }}
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
            <Lock className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-[1.65rem] font-bold text-white text-center leading-tight">Link Google Account</h2>
          <p className="text-sm text-slate-400 text-center mt-2">
            An account with <strong className="text-white">{googleLinkEmail}</strong> already exists.
            Enter your password to link Google login.
          </p>
        </div>

        <div className="space-y-1">
          <label className="auth-label">Account Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
            <input
              type="password"
              className="auth-input pl-10"
              placeholder="Enter your account password"
              value={googleLinkPassword}
              onChange={e => setGoogleLinkPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        <button type="submit" disabled={googleLinkLoading || !googleLinkPassword.trim()} className="auth-btn-primary">
          {googleLinkLoading ? <><Spinner /> Linking...</> : <><Shield className="w-4 h-4" /> Link & Sign In</>}
        </button>
      </form>
    )
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

        {otpError && (
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5',
            }}
          >
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#f87171' }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{otpError}</span>
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="auth-input h-16 text-center text-3xl tracking-[0.55em] font-mono"
          style={{ borderWidth: '2px' }}
          maxLength={6}
          value={otp}
          onChange={e => { setOtp(e.target.value); setOtpError('') }}
          placeholder="000000"
          required
        />
        <button type="submit" disabled={loading || otp.length < 6} className="auth-btn-primary">
          {loading ? <><Spinner /> Verifying...</> : <><Shield className="w-4 h-4" /> Verify Code</>}
        </button>
        <button type="button" onClick={() => {
          setOtpStep(false)
          setOtp('')
          setOtpId('')
          toast('Please sign in again to receive a new code')
        }}
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

      {/* Login error alert */}
      {loginError && (
        <div
          className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
          }}
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#f87171' }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{loginError}</span>
        </div>
      )}

      {/* Social login — icon only, centered row */}
      <div className="flex justify-center gap-3">
        {/* Google — native rendered button inside a styled container */}
        <div
          ref={googleBtnRef}
          className="auth-social-icon-btn"
          style={{ overflow: 'hidden', padding: 0, position: 'relative' }}
          title="Continue with Google"
        />
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
            onChange={e => { setEmail(e.target.value); setLoginError('') }}
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
            onChange={e => { setPassword(e.target.value); setLoginError('') }}
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
