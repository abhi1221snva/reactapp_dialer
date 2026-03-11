import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Lock, Phone, Building2, Eye, EyeOff,
  CheckCircle2, ArrowLeft, RefreshCw, Shield, ArrowRight,
} from 'lucide-react'


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
import toast from 'react-hot-toast'
import { registerService } from '../../services/register.service'

// ─── Google Identity Services type declaration ────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'details' | 'google-business' | 'email-verify' | 'phone-verify' | 'success'

interface FormData {
  name: string
  business_name: string
  password: string
  confirm_password: string
  email: string
  country_code: string
  phone: string
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── OTP digit input ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null))

  useEffect(() => { refs[0].current?.focus() }, [])

  const digits = value.padEnd(6, ' ').split('')

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const next = value.slice(0, i) + value.slice(i + 1)
      onChange(next)
      if (i > 0) refs[i - 1].current?.focus()
    }
  }

  function handleChange(i: number, char: string) {
    const d = char.replace(/\D/g, '').slice(-1)
    if (!d) return
    const arr = value.padEnd(6, '').split('')
    arr[i] = d
    onChange(arr.join('').slice(0, 6))
    if (i < 5) refs[i + 1].current?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length) { onChange(text); refs[Math.min(text.length, 5)].current?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {refs.map((ref, i) => (
        <input
          key={i}
          ref={ref}
          maxLength={1}
          value={digits[i]?.trim() || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="auth-otp-input"
        />
      ))}
    </div>
  )
}

// ─── Countdown ────────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [googleFlow, setGoogleFlow] = useState(false)
  const [pendingCredential, setPendingCredential] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const [registrationId, setRegistrationId] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  // Snapshot of the exact payload sent during Send OTP — reused verbatim in Verify OTP
  const [sentOtpPayload, setSentOtpPayload] = useState<{ registration_id: string; country_code: string; phone: string } | null>(null)

  const emailTimer = useCountdown(60)
  const phoneTimer = useCountdown(60)

  const [form, setForm] = useState<FormData>({
    name: '',
    business_name: '',
    password: '',
    confirm_password: '',
    email: '',
    country_code: '+1',
    phone: '',
  })

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // ── GSI init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        callback: (response: { credential: string }) => {
          setPendingCredential(response.credential)
          try {
            const parts = response.credential.split('.')
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            setForm(f => ({
              ...f,
              name:  payload.name ?? payload.given_name ?? '',
              email: payload.email ?? '',
            }))
          } catch { /* ignore decode errors */ }
          setGoogleFlow(true)
          setStep('google-business')
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

  // ── Step 1 — Account details ──────────────────────────────────────────────
  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Full name is required'); return }
    if (!form.business_name.trim()) { toast.error('Business name is required'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      const res = await registerService.registerInit({
        name: form.name,
        business_name: form.business_name,
        password: form.password,
        password_confirmation: form.confirm_password,
      })
      setRegistrationId(res.data?.data?.registration_id ?? '')
      toast.success('Account details saved!')
      setStep('email-verify')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  // ── Google business step ──────────────────────────────────────────────────
  const handleGoogleBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_name.trim()) { toast.error('Business name is required'); return }

    setLoading(true)
    try {
      const res = await registerService.googleRegister(pendingCredential, form.business_name)
      const data = res.data?.data
      setRegistrationId(data?.registration_id ?? '')
      setForm(f => ({
        ...f,
        name:  data?.name  ?? f.name,
        email: data?.email ?? f.email,
      }))
      toast.success('Google account verified!')
      setStep('phone-verify')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  // ── Send email OTP ────────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!form.email.trim()) { toast.error('Email address is required'); return }
    setLoading(true)
    try {
      await registerService.sendEmailOtp(registrationId, form.email)
      setEmailOtpSent(true)
      emailTimer.start()
      toast.success('Verification code sent to your email!')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  // ── Verify email OTP ──────────────────────────────────────────────────────
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailOtp.length < 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      await registerService.verifyEmailOtp(registrationId, form.email, emailOtp)
      toast.success('Email verified!')
      setStep('phone-verify')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const resendEmailOtp = async () => {
    if (!emailTimer.canResend) return
    try {
      await registerService.sendEmailOtp(registrationId, form.email)
      setEmailOtp('')
      emailTimer.start()
      toast.success('Code resent!')
    } catch { /* handled */ }
  }

  // ── Send phone OTP ────────────────────────────────────────────────────────
  const handleSendPhoneOtp = async () => {
    if (!form.phone.trim()) { toast.error('Phone number is required'); return }
    if (!/^\d{7,15}$/.test(form.phone.trim())) {
      toast.error('Phone number must be 7–15 digits (numbers only)')
      return
    }
    setLoading(true)
    try {
      await registerService.sendPhoneOtp2(registrationId, form.country_code, form.phone)
      setSentOtpPayload({ registration_id: registrationId, country_code: form.country_code, phone: form.phone })
      setPhoneOtpSent(true)
      phoneTimer.start()
      toast.success('Verification SMS sent!')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  // ── Verify phone OTP ──────────────────────────────────────────────────────
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneOtp.length < 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      // Use the exact values that were sent during Send OTP — never recompute them
      const snap = sentOtpPayload ?? { registration_id: registrationId, country_code: form.country_code, phone: form.phone }
      console.log('SEND OTP:', snap)
      console.log('VERIFY OTP:', { ...snap, otp: phoneOtp })
      await registerService.verifyPhoneOtp(snap.registration_id, snap.country_code, snap.phone, phoneOtp)
      setStep('success')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const resendPhoneOtp = async () => {
    if (!phoneTimer.canResend) return
    try {
      await registerService.sendPhoneOtp2(registrationId, form.country_code, form.phone)
      setPhoneOtp('')
      phoneTimer.start()
      toast.success('Code resent!')
    } catch { /* handled */ }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="text-center space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Account created!</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Welcome to <span className="font-semibold text-slate-200">DialerCRM</span>.<br />
          A welcome email has been sent to{' '}
          <span className="font-semibold text-slate-200">{form.email}</span>.
        </p>
        <div className="rounded-xl p-3 text-left space-y-1.5"
          style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.16)' }}>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Next steps</p>
          <p className="text-sm text-slate-400">1. Log in with your email and password</p>
          <p className="text-sm text-slate-400">2. Complete the onboarding wizard</p>
          <p className="text-sm text-slate-400">3. Create your first agent</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="auth-btn-primary mt-2"
        >
          Go to Login <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white leading-tight">
          {step === 'details'          ? 'Create your account'  :
           step === 'google-business'  ? 'Almost there!'         :
           step === 'email-verify'     ? 'Verify your email'     :
                                         'Verify your phone'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {step === 'details'         && 'Start analyzing in minutes — no credit card required'}
          {step === 'google-business' && "Just one more detail and you're all set"}
          {step === 'email-verify'    && 'Enter your email and verify with a 6-digit code'}
          {step === 'phone-verify'    && 'Enter your phone number and verify with a 6-digit code'}
        </p>
      </div>

      {/* ── Step 1: Account details ─────────────────────────────────────────── */}
      {step === 'details' && (
        <form onSubmit={handleDetails} className="space-y-3">
          <div>
            <label className="auth-label">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
              <input type="text" className="auth-input pl-10" placeholder="John Smith"
                value={form.name} onChange={set('name')} required maxLength={100} />
            </div>
          </div>

          <div>
            <label className="auth-label">Business Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
              <input type="text" className="auth-input pl-10" placeholder="Acme Corp"
                value={form.business_name} onChange={set('business_name')} required maxLength={100} />
            </div>
          </div>

          <div>
            <label className="auth-label">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
              <input type={showPass ? 'text' : 'password'} className="auth-input pl-10 pr-10"
                placeholder="Min 8 characters"
                value={form.password} onChange={set('password')} required minLength={8} maxLength={64} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="auth-label">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
              <input type="password" className="auth-input pl-10"
                placeholder="Re-enter password"
                value={form.confirm_password} onChange={set('confirm_password')} required />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="auth-btn-primary">
            {loading ? <><Spinner /> Creating account...</> : <>Continue <ArrowRight size={16} /></>}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
            <span className="text-xs text-slate-500 font-medium px-1">or sign up with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
          </div>

          {/* Social sign-up — icon only, one row */}
          <div className="flex gap-2.5">
            {/* Google — native GSI icon button */}
            <div
              className="flex-1 flex items-center justify-center h-11 rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
              title="Sign up with Google"
            >
              {googleLoading
                ? <Spinner />
                : <div ref={googleBtnRef} />
              }
            </div>
            <button
              type="button"
              onClick={() => toast('LinkedIn sign-up coming soon')}
              className="auth-social-icon-btn"
              title="Sign up with LinkedIn"
            >
              <LinkedInIcon />
            </button>
            <button
              type="button"
              onClick={() => toast('Microsoft sign-up coming soon')}
              className="auth-social-icon-btn"
              title="Sign up with Microsoft"
            >
              <MicrosoftIcon />
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      )}

      {/* ── Google business step ─────────────────────────────────────────────── */}
      {step === 'google-business' && (
        <form onSubmit={handleGoogleBusiness} className="space-y-4">
          {/* Google verified badge */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-300">Google account verified</p>
              <p className="text-xs text-emerald-400/70 truncate">{form.email}</p>
            </div>
          </div>

          <div>
            <label className="auth-label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
              <input type="text" className="auth-input pl-10 opacity-60 cursor-not-allowed"
                value={form.name} readOnly />
            </div>
          </div>

          <div>
            <label className="auth-label">Business Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
              <input type="text" className="auth-input pl-10" placeholder="Acme Corp"
                value={form.business_name} onChange={set('business_name')} required maxLength={100} autoFocus />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="auth-btn-primary mt-2">
            {loading ? <><Spinner /> Setting up...</> : <>Continue to Phone Verification <ArrowRight size={16} /></>}
          </button>

          <button type="button"
            onClick={() => { setGoogleFlow(false); setPendingCredential(''); setStep('details') }}
            className="auth-btn-ghost-dark">
            <ArrowLeft size={14} /> Back
          </button>
        </form>
      )}

      {/* ── Step 2: Email verification ──────────────────────────────────────── */}
      {step === 'email-verify' && (
        <div className="space-y-5">
          {!emailOtpSent ? (
            <div className="space-y-4">
              <div>
                <label className="auth-label">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                  <input type="email" className="auth-input pl-10" placeholder="you@company.com"
                    value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <button type="button" onClick={handleSendEmailOtp}
                disabled={loading || !form.email.trim()}
                className="auth-btn-primary">
                {loading ? <><Spinner /> Sending...</> : <><Mail size={16} /> Send Verification Code</>}
              </button>
              <button type="button" onClick={() => setStep('details')}
                className="auth-btn-ghost-dark">
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyEmail} className="space-y-6">
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)' }}>
                <Mail size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-300">
                  Check your inbox at <strong className="text-indigo-200">{form.email}</strong> and enter the 6-digit code below.
                </p>
              </div>

              <OtpInput value={emailOtp} onChange={setEmailOtp} />

              <button type="submit" disabled={loading || emailOtp.length < 6}
                className="auth-btn-primary">
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
                <button type="button" onClick={() => { setEmailOtpSent(false); setEmailOtp('') }}
                  className="auth-btn-ghost-dark text-sm">
                  <ArrowLeft size={14} /> Change email
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Step 3: Phone verification ──────────────────────────────────────── */}
      {step === 'phone-verify' && (
        <div className="space-y-5">
          {googleFlow && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300">
                Email pre-verified via Google: <strong className="text-emerald-200">{form.email}</strong>
              </p>
            </div>
          )}

          {!phoneOtpSent ? (
            <div className="space-y-4">
              <div>
                <label className="auth-label">Phone Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <select
                    className="auth-input w-24 flex-shrink-0 px-2"
                    value={form.country_code}
                    onChange={set('country_code')}
                  >
                    <option value="+1">+1 🇺🇸</option>
                    <option value="+44">+44 🇬🇧</option>
                    <option value="+91">+91 🇮🇳</option>
                    <option value="+61">+61 🇦🇺</option>
                    <option value="+49">+49 🇩🇪</option>
                    <option value="+33">+33 🇫🇷</option>
                    <option value="+52">+52 🇲🇽</option>
                    <option value="+55">+55 🇧🇷</option>
                    <option value="+971">+971 🇦🇪</option>
                    <option value="+92">+92 🇵🇰</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                    <input type="tel" className="auth-input pl-10" placeholder="5551234567"
                      value={form.phone} onChange={set('phone')} required maxLength={15} />
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleSendPhoneOtp}
                disabled={loading || !form.phone.trim()}
                className="auth-btn-primary">
                {loading ? <><Spinner /> Sending...</> : <><Phone size={16} /> Send SMS Code</>}
              </button>
              <button type="button"
                onClick={() => setStep(googleFlow ? 'google-business' : 'email-verify')}
                className="auth-btn-ghost-dark">
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyPhone} className="space-y-6">
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)' }}>
                <Phone size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-300">
                  We sent an SMS to <strong className="text-indigo-200">{form.country_code} {form.phone}</strong>. Enter the code to activate your account.
                </p>
              </div>

              <OtpInput value={phoneOtp} onChange={setPhoneOtp} />

              <button type="submit" disabled={loading || phoneOtp.length < 6}
                className="auth-btn-primary">
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
                <button type="button" onClick={() => { setPhoneOtpSent(false); setPhoneOtp('') }}
                  className="auth-btn-ghost-dark text-sm">
                  <ArrowLeft size={14} /> Change phone number
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
