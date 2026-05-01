import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User as UserIcon, Mail, Lock, Phone, Eye, EyeOff,
  CheckCircle2, ArrowLeft, RefreshCw, Shield, ArrowRight, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import { registerService } from '../../services/register.service'
import { useAuthStore } from '../../stores/auth.store'
import type { User } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────
type SignupStep = 'credentials' | 'email-otp' | 'profile' | 'phone-otp' | 'provisioning' | 'success'

interface CredentialForm {
  email: string
  password: string
  confirm_password: string
}

interface ProfileForm {
  first_name: string
  last_name: string
  country_code: string
  phone: string
}

// ─── Password policy ──────────────────────────────────────────────────────────
const PASSWORD_RULES = [
  { label: '10+ characters', test: (pw: string) => pw.length >= 10 },
  { label: 'Uppercase',      test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Lowercase',      test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'Number',         test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'Special char',   test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]

function validatePassword(pw: string): string[] {
  return PASSWORD_RULES.filter(r => !r.test(pw)).map(r => r.label)
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score = PASSWORD_RULES.filter(r => r.test(password)).length
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= score
              ? score <= 2 ? '#ef4444' : score <= 3 ? '#f59e0b' : '#10b981'
              : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {PASSWORD_RULES.map(r => (
          <span key={r.label} className={`text-xs ${r.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
            {r.test(password) ? '\u2713' : '\u2717'} {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Country codes ────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { value: '+1',   label: '+1 US/CA' },
  { value: '+44',  label: '+44 UK' },
  { value: '+91',  label: '+91 IN' },
  { value: '+61',  label: '+61 AU' },
  { value: '+49',  label: '+49 DE' },
  { value: '+33',  label: '+33 FR' },
  { value: '+34',  label: '+34 ES' },
  { value: '+39',  label: '+39 IT' },
  { value: '+81',  label: '+81 JP' },
  { value: '+82',  label: '+82 KR' },
  { value: '+86',  label: '+86 CN' },
  { value: '+52',  label: '+52 MX' },
  { value: '+55',  label: '+55 BR' },
  { value: '+54',  label: '+54 AR' },
  { value: '+57',  label: '+57 CO' },
  { value: '+56',  label: '+56 CL' },
  { value: '+63',  label: '+63 PH' },
  { value: '+65',  label: '+65 SG' },
  { value: '+60',  label: '+60 MY' },
  { value: '+62',  label: '+62 ID' },
  { value: '+66',  label: '+66 TH' },
  { value: '+84',  label: '+84 VN' },
  { value: '+971', label: '+971 AE' },
  { value: '+966', label: '+966 SA' },
  { value: '+972', label: '+972 IL' },
  { value: '+92',  label: '+92 PK' },
  { value: '+880', label: '+880 BD' },
  { value: '+27',  label: '+27 ZA' },
  { value: '+234', label: '+234 NG' },
  { value: '+254', label: '+254 KE' },
  { value: '+20',  label: '+20 EG' },
  { value: '+7',   label: '+7 RU' },
  { value: '+48',  label: '+48 PL' },
  { value: '+31',  label: '+31 NL' },
  { value: '+46',  label: '+46 SE' },
  { value: '+47',  label: '+47 NO' },
  { value: '+45',  label: '+45 DK' },
  { value: '+41',  label: '+41 CH' },
  { value: '+43',  label: '+43 AT' },
  { value: '+353', label: '+353 IE' },
  { value: '+64',  label: '+64 NZ' },
]

// ─── Shared components ────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  const digits = value.padEnd(6, ' ').split('')

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const next = value.slice(0, i) + value.slice(i + 1)
      onChange(next)
      if (i > 0) inputRefs.current[i - 1]?.focus()
    }
  }

  function handleChange(i: number, char: string) {
    const d = char.replace(/\D/g, '').slice(-1)
    if (!d) return
    const arr = value.padEnd(6, '').split('')
    arr[i] = d
    onChange(arr.join('').slice(0, 6))
    if (i < 5) inputRefs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length) { onChange(text); inputRefs.current[Math.min(text.length, 5)]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el }}
          maxLength={1}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1} of 6`}
          value={digits[i]?.trim() || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="auth-otp-input"
        />
      ))}
    </div>
  )
}

function useCountdown(initial = 60) {
  const [seconds, setSeconds] = useState(initial)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!active) return
    if (seconds <= 0) { setActive(false); return }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, active])

  const start = () => { setSeconds(initial); setActive(true) }
  return { seconds, canResend: !active || seconds <= 0, start }
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, isGoogleFlow }: { current: SignupStep; isGoogleFlow: boolean }) {
  const steps = isGoogleFlow
    ? [
        { key: 'profile',     label: 'Profile' },
        { key: 'phone-otp',   label: 'Phone' },
      ]
    : [
        { key: 'email-otp',   label: 'Email' },
        { key: 'profile',     label: 'Profile' },
        { key: 'phone-otp',   label: 'Phone' },
      ]

  const currentIdx = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center gap-1 mb-5">
      {steps.map((s, i) => {
        const isDone = i < currentIdx
        const isActive = i === currentIdx
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full gap-1">
                {i > 0 && (
                  <div
                    className="flex-1 h-0.5 rounded-full transition-colors"
                    style={{ background: isDone || isActive ? '#6366f1' : 'rgba(255,255,255,0.08)' }}
                  />
                )}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
                  style={{
                    background: isDone ? '#6366f1' : isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                    border: isActive ? '2px solid #6366f1' : '2px solid transparent',
                    color: isDone ? '#fff' : isActive ? '#a5b4fc' : '#475569',
                  }}
                >
                  {isDone ? '\u2713' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="flex-1 h-0.5 rounded-full transition-colors"
                    style={{ background: isDone ? '#6366f1' : 'rgba(255,255,255,0.08)' }}
                  />
                )}
              </div>
              <span
                className="text-[10px] mt-1 font-medium transition-colors"
                style={{ color: isDone ? '#818cf8' : isActive ? '#a5b4fc' : '#475569' }}
              >
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Google Identity Services declaration ─────────────────────────────────────
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
            theme?: string; size?: string; type?: string; width?: number; text?: string; shape?: string
          }) => void
          prompt: () => void
        }
      }
    }
  }
}

// ─── Email-blocked alert helper ───────────────────────────────────────────────
async function showEmailBlockedAlert(
  code: string,
  navigateFn: ReturnType<typeof useNavigate>,
): Promise<void> {
  if (code === 'ACCOUNT_DEACTIVATED') {
    await Swal.fire({
      title: 'Account Deactivated',
      text: 'This account has been deactivated. Please contact support.',
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#6366f1',
    })
  } else if (code === 'ACCOUNT_INACTIVE') {
    await Swal.fire({
      title: 'Account Not Active',
      text: 'This account is not active. Please contact support.',
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#6366f1',
    })
  } else {
    const result = await Swal.fire({
      title: 'Already Registered',
      text: 'An account with this email already exists. Please sign in instead.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Go to Login',
      cancelButtonText: 'Close',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    })
    if (result.isConfirmed) {
      navigateFn('/login')
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  // ── Step state machine ──────────────────────────────────────────────────
  const [step, setStep] = useState<SignupStep>('credentials')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // ── Google OAuth ────────────────────────────────────────────────────────
  const [googleFlow, setGoogleFlow] = useState(false)
  const [pendingCredential, setPendingCredential] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // ── Registration tracking ──────────────────────────────────────────────
  const [registrationId, setRegistrationId] = useState('')
  const [progressId, setProgressId] = useState<string | null>(null)

  // ── Credential form ─────────────────────────────────────────────────────
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [creds, setCreds] = useState<CredentialForm>({
    email: '',
    password: '',
    confirm_password: '',
  })

  // ── OTP state ──────────────────────────────────────────────────────────
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const emailTimer = useCountdown(60)
  const phoneTimer = useCountdown(60)

  // ── Profile form ───────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    country_code: '+1',
    phone: '',
  })

  // ── Provisioning state ─────────────────────────────────────────────────
  const [provStage, setProvStage] = useState('queued')
  const [provPct, setProvPct] = useState(5)
  const [provLabel, setProvLabel] = useState('Waiting in queue...')
  const [provFailed, setProvFailed] = useState(false)

  // ── Body scroll lock for modal ─────────────────────────────────────────
  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  // ── GSI init ───────────────────────────────────────────────────────────
  const initGoogle = useCallback(() => {
    if (!window.google?.accounts?.id || !googleBtnRef.current) return
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      callback: async (response: { credential: string }) => {
        setPendingCredential(response.credential)
        let decodedEmail = ''
        let decodedName = ''
        try {
          const parts = response.credential.split('.')
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          decodedName = payload.name ?? payload.given_name ?? ''
          decodedEmail = payload.email ?? ''
        } catch { /* ignore */ }

        if (!decodedEmail) {
          toast.error('Could not read email from Google account. Please try again.')
          return
        }

        try {
          await registerService.signupCheckEmail(decodedEmail)
        } catch (err: unknown) {
          const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
          if (code === 'EMAIL_ALREADY_REGISTERED' || code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_INACTIVE') {
            await showEmailBlockedAlert(code, navigate)
          } else {
            toast.error('Unable to verify your email. Please try again.')
          }
          return
        }

        // Pre-fill profile name from Google
        const nameParts = decodedName.split(' ')
        setProfile(f => ({
          ...f,
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
        }))
        setCreds(f => ({ ...f, email: decodedEmail }))

        // Call Google signup endpoint
        setLoading(true)
        try {
          const res = await registerService.signupGoogle(response.credential, decodedName + "'s Business")
          const data = res.data?.data
          setRegistrationId(data?.registration_id ?? '')
          setCreds(f => ({ ...f, email: data?.email ?? decodedEmail }))
          setGoogleFlow(true)
          setStep('profile')
          setShowModal(true)
          toast.success('Google account verified!')
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { code?: string; message?: string } } }
          const code = axiosErr?.response?.data?.code
          if (code === 'EMAIL_ALREADY_REGISTERED' || code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_INACTIVE') {
            await showEmailBlockedAlert(code, navigate)
          } else {
            toast.error(axiosErr?.response?.data?.message || 'Google signup failed. Please try again.')
          }
        } finally {
          setLoading(false)
        }
      },
    })
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'medium',
      type: 'icon',
      shape: 'circle',
    })
  }, [navigate])

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const gsiScript = document.querySelector('script[src*="gsi/client"]')
      gsiScript?.addEventListener('load', initGoogle)
      return () => gsiScript?.removeEventListener('load', initGoogle)
    }
  }, [initGoogle])

  // ════════════════════════════════════════════════════════════════════════
  // STEP HANDLERS
  // ════════════════════════════════════════════════════════════════════════

  // ── Step 1: Submit credentials ──────────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creds.email.trim()) { toast.error('Email is required'); return }
    const pwErrors = validatePassword(creds.password)
    if (pwErrors.length > 0) { toast.error(`Password needs: ${pwErrors.join(', ')}`); return }
    if (creds.password !== creds.confirm_password) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      const res = await registerService.signupInit({
        email: creds.email,
        password: creds.password,
        password_confirmation: creds.confirm_password,
      })
      setRegistrationId(res.data?.data?.registration_id ?? '')
      emailTimer.start()
      setStep('email-otp')
      setShowModal(true)
      toast.success('Verification code sent to your email!')
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      if (code === 'EMAIL_ALREADY_REGISTERED' || code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_INACTIVE') {
        await showEmailBlockedAlert(code, navigate)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify email OTP ────────────────────────────────────────────
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailOtp.length < 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      await registerService.signupVerifyEmail({
        registration_id: registrationId,
        email: creds.email,
        otp: emailOtp,
      })
      toast.success('Email verified!')
      setStep('profile')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const resendEmailOtp = async () => {
    if (!emailTimer.canResend) return
    try {
      await registerService.signupResendOtp({
        registration_id: registrationId,
        type: 'email',
      })
      setEmailOtp('')
      emailTimer.start()
      toast.success('Code resent!')
    } catch { /* handled */ }
  }

  // ── Step 3: Complete profile ────────────────────────────────────────────
  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.first_name.trim()) { toast.error('First name is required'); return }
    if (!profile.last_name.trim()) { toast.error('Last name is required'); return }
    if (!profile.phone.trim()) { toast.error('Phone number is required'); return }
    if (!/^\d{7,15}$/.test(profile.phone.trim())) {
      toast.error('Phone number must be 7\u201315 digits (numbers only)')
      return
    }

    setLoading(true)
    try {
      await registerService.signupCompleteProfile({
        registration_id: registrationId,
        first_name: profile.first_name,
        last_name: profile.last_name,
        country_code: profile.country_code,
        phone: profile.phone,
      })
      phoneTimer.start()
      toast.success('Verification SMS sent!')
      setStep('phone-otp')
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      if (code === 'PHONE_ALREADY_REGISTERED') {
        toast.error('An account with this phone number already exists.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 4: Verify phone OTP ────────────────────────────────────────────
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneOtp.length < 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      const e164Phone = profile.country_code + profile.phone
      const res = await registerService.signupVerifyPhone({
        registration_id: registrationId,
        phone: e164Phone,
        otp: phoneOtp,
      })
      const data = res.data?.data as Record<string, unknown> | undefined

      if (data?.path === 'slow' && data?.progress_id) {
        setProgressId(String(data.progress_id))
        setStep('provisioning')
      } else if (data?.token) {
        const userData = data.user as Record<string, unknown> | undefined
        const user: User = {
          ...(userData ?? {}),
          name: profile.first_name + ' ' + profile.last_name,
          level: Number(userData?.level ?? 6),
        } as User
        localStorage.setItem('auth_token', data.token as string)
        setAuth(data.token as string, user)
        toast.success('Welcome! Your account is ready.')
        navigate('/dashboard')
        return
      } else {
        setStep('success')
      }
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const resendPhoneOtp = async () => {
    if (!phoneTimer.canResend) return
    try {
      await registerService.signupResendOtp({
        registration_id: registrationId,
        type: 'phone',
      })
      setPhoneOtp('')
      phoneTimer.start()
      toast.success('Code resent!')
    } catch { /* handled */ }
  }

  // ── Provisioning polling ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'provisioning' || !progressId) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await registerService.signupGetStatus(progressId)
        const d = res.data?.data
        if (cancelled) return

        setProvStage(d.stage)
        setProvPct(d.progress_pct)
        setProvLabel(d.stage_label)

        if (d.ready) {
          // Auto-login if token is available (same as fast-path)
          if (d.token) {
            const userData = d.user as Record<string, unknown> | undefined
            const user: User = {
              ...(userData ?? {}),
              name: (userData?.first_name || '') + ' ' + (userData?.last_name || ''),
              level: Number(userData?.level ?? 6),
            } as User
            localStorage.setItem('auth_token', d.token as string)
            setAuth(d.token as string, user)
            toast.success('Welcome! Your account is ready.')
            navigate('/dashboard')
            return
          }
          setStep('success')
          return
        }
        if (d.failed) {
          setProvFailed(true)
          return
        }
      } catch {
        // Silently retry
      }
      if (!cancelled) {
        setTimeout(poll, 2500)
      }
    }

    poll()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, progressId])

  // ── Modal close handler ─────────────────────────────────────────────────
  const handleModalClose = () => {
    if (step === 'provisioning') return // can't close during provisioning
    if (step === 'success') {
      navigate('/login')
      return
    }
    // Reset to credentials
    setShowModal(false)
    setStep('credentials')
    setEmailOtp('')
    setPhoneOtp('')
    setGoogleFlow(false)
    setPendingCredential('')
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-fadeIn">
      {/* ── Step 1: Credentials form (full page inside AuthLayout) ──────── */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white leading-tight">Create your account</h2>
        <p className="text-sm text-slate-400 mt-1">Get started in minutes — no credit card required</p>
      </div>

      <form onSubmit={handleCredentials} className="space-y-3">
        <div>
          <label className="auth-label" htmlFor="reg-email">Email Address <span className="text-red-500">*</span></label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
            <input id="reg-email" type="email" className="auth-input pl-10" placeholder="you@company.com"
              autoComplete="email"
              value={creds.email} onChange={e => setCreds(f => ({ ...f, email: e.target.value }))} required />
          </div>
        </div>

        <div>
          <label className="auth-label" htmlFor="reg-password">Password <span className="text-red-500">*</span></label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
            <input id="reg-password" type={showPass ? 'text' : 'password'} className="auth-input pl-10 pr-10"
              placeholder="Min 10 characters"
              autoComplete="new-password"
              value={creds.password} onChange={e => setCreds(f => ({ ...f, password: e.target.value }))} required minLength={10} maxLength={64} />
            <button type="button" onClick={() => setShowPass(s => !s)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrength password={creds.password} />
        </div>

        <div>
          <label className="auth-label" htmlFor="reg-confirm-password">Confirm Password <span className="text-red-500">*</span></label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
            <input id="reg-confirm-password" type={showConfirmPass ? 'text' : 'password'} className="auth-input pl-10 pr-10"
              placeholder="Re-enter password"
              autoComplete="new-password"
              value={creds.confirm_password} onChange={e => setCreds(f => ({ ...f, confirm_password: e.target.value }))} required />
            <button type="button" onClick={() => setShowConfirmPass(s => !s)}
              aria-label={showConfirmPass ? 'Hide password confirmation' : 'Show password confirmation'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? <><Spinner /> Creating account...</> : <>Continue <ArrowRight size={16} /></>}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
          <span className="text-xs text-slate-500 font-medium px-1">or sign up with</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
        </div>

        {/* Google sign-up */}
        <div className="flex justify-center">
          <div
            ref={googleBtnRef}
            className="auth-social-icon-btn"
            style={{ overflow: 'hidden', padding: 0, position: 'relative' }}
            title="Sign up with Google"
          />
        </div>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </form>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL — Steps 2, 3, 4, Provisioning, Success                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="auth-modal-overlay" onClick={() => step !== 'provisioning' && handleModalClose()}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            {/* Close button (hidden during provisioning) */}
            {step !== 'provisioning' && (
              <button onClick={handleModalClose}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors z-10">
                <X size={18} />
              </button>
            )}

            {/* Step indicator */}
            {step !== 'provisioning' && step !== 'success' && (
              <StepIndicator current={step} isGoogleFlow={googleFlow} />
            )}

            {/* ── Step 2: Email OTP ──────────────────────────────────────── */}
            {step === 'email-otp' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-white">Verify your email</h2>
                  <p className="text-sm text-slate-400 mt-1">Enter the 6-digit code sent to your inbox</p>
                </div>

                <div className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)' }}>
                  <Mail size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-indigo-300">
                    Check your inbox at <strong className="text-indigo-200">{creds.email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyEmail} className="space-y-5">
                  <OtpInput value={emailOtp} onChange={setEmailOtp} />

                  <button type="submit" disabled={loading || emailOtp.length < 6} className="auth-btn-primary">
                    {loading ? <><Spinner /> Verifying...</> : <>Verify Email <Shield size={16} /></>}
                  </button>

                  <div className="text-center space-y-2">
                    {emailTimer.canResend ? (
                      <button type="button" onClick={resendEmailOtp}
                        className="inline-flex items-center justify-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mx-auto">
                        <RefreshCw size={14} /> Resend code
                      </button>
                    ) : (
                      <p className="text-sm text-slate-500">Resend in <strong className="text-slate-300">{emailTimer.seconds}s</strong></p>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* ── Step 3: Profile completion ──────────────────────────────── */}
            {step === 'profile' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-white">Complete your profile</h2>
                  <p className="text-sm text-slate-400 mt-1">Just a few more details to set up your account</p>
                </div>

                {/* Email verified badge */}
                <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Email verified: <strong className="text-emerald-200">{creds.email}</strong>
                  </p>
                </div>

                <form onSubmit={handleProfile} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="auth-label" htmlFor="reg-first-name">First Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                        <input id="reg-first-name" type="text" className="auth-input pl-10" placeholder="John"
                          autoComplete="given-name"
                          value={profile.first_name} onChange={e => setProfile(f => ({ ...f, first_name: e.target.value }))} required maxLength={100} autoFocus />
                      </div>
                    </div>
                    <div>
                      <label className="auth-label" htmlFor="reg-last-name">Last Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                        <input id="reg-last-name" type="text" className="auth-input pl-10" placeholder="Smith"
                          autoComplete="family-name"
                          value={profile.last_name} onChange={e => setProfile(f => ({ ...f, last_name: e.target.value }))} required maxLength={100} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="auth-label" htmlFor="reg-phone">Phone Number <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <select
                        className="auth-input w-28 flex-shrink-0 px-2"
                        value={profile.country_code}
                        onChange={e => setProfile(f => ({ ...f, country_code: e.target.value }))}
                        aria-label="Country code"
                      >
                        {COUNTRY_CODES.map(cc => (
                          <option key={cc.value} value={cc.value}>{cc.label}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                        <input id="reg-phone" type="tel" className="auth-input pl-10" placeholder="5551234567"
                          autoComplete="tel-national"
                          inputMode="numeric"
                          value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))} required maxLength={15} />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="auth-btn-primary mt-2">
                    {loading ? <><Spinner /> Saving...</> : <>Continue <ArrowRight size={16} /></>}
                  </button>

                  {!googleFlow && (
                    <button type="button" onClick={() => setStep('email-otp')} className="auth-btn-ghost-dark">
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                </form>
              </div>
            )}

            {/* ── Step 4: Phone OTP ──────────────────────────────────────── */}
            {step === 'phone-otp' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-white">Verify your phone</h2>
                  <p className="text-sm text-slate-400 mt-1">Enter the 6-digit code sent via SMS</p>
                </div>

                <div className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)' }}>
                  <Phone size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-indigo-300">
                    SMS sent to <strong className="text-indigo-200">{profile.country_code} {profile.phone}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyPhone} className="space-y-5">
                  <OtpInput value={phoneOtp} onChange={setPhoneOtp} />

                  <button type="submit" disabled={loading || phoneOtp.length < 6} className="auth-btn-primary">
                    {loading ? <><Spinner /> Verifying...</> : <>Activate Account <CheckCircle2 size={16} /></>}
                  </button>

                  <div className="text-center space-y-2">
                    {phoneTimer.canResend ? (
                      <button type="button" onClick={resendPhoneOtp}
                        className="inline-flex items-center justify-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mx-auto">
                        <RefreshCw size={14} /> Resend SMS
                      </button>
                    ) : (
                      <p className="text-sm text-slate-500">Resend in <strong className="text-slate-300">{phoneTimer.seconds}s</strong></p>
                    )}
                    <button type="button" onClick={() => { setPhoneOtp(''); setStep('profile') }}
                      className="auth-btn-ghost-dark text-sm">
                      <ArrowLeft size={14} /> Change phone number
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Provisioning screen ────────────────────────────────────── */}
            {step === 'provisioning' && (
              <div className="text-center space-y-5 animate-fadeIn">
                {!provFailed ? (
                  <>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)' }}>
                      <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Setting up your account</h2>
                    <p className="text-sm text-slate-400">{provLabel}</p>
                    <div className="w-full rounded-full h-2.5 overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${provPct}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{provPct}% complete</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This usually takes about 30 seconds. Please don't close this page.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)' }}>
                      <Shield className="w-7 h-7 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Setup encountered an issue</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      We couldn't complete your account setup automatically. Our team has been notified.
                      Please try logging in — if your account isn't ready yet, contact support.
                    </p>
                    <button onClick={() => navigate('/login')} className="auth-btn-primary mt-2">
                      Go to Login <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Success screen ──────────────────────────────────────────── */}
            {step === 'success' && (
              <div className="text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Account created!</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Welcome to <span className="font-semibold text-slate-200">DialerCRM</span>.<br />
                  A welcome email has been sent to{' '}
                  <span className="font-semibold text-slate-200">{creds.email}</span>.
                </p>
                <div className="rounded-xl p-3 text-left space-y-1.5"
                  style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.16)' }}>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Next steps</p>
                  <p className="text-sm text-slate-400">1. Log in with your email and password</p>
                  <p className="text-sm text-slate-400">2. Complete the onboarding wizard</p>
                  <p className="text-sm text-slate-400">3. Create your first agent</p>
                </div>
                <button onClick={() => navigate('/login')} className="auth-btn-primary mt-2">
                  Go to Login <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
