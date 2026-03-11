import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  User, Lock, Shield, Mail, Phone, Clock, Globe, Camera, Eye, EyeOff,
  Save, CheckCircle2, AlertCircle, LogOut, Monitor, Smartphone, Tablet,
  Chrome, Link2, RefreshCw, KeyRound, Unlink, Loader2, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/auth.store'
import { Badge } from '../../components/ui/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { cn } from '../../utils/cn'
import { formatDateTime, timeAgo } from '../../utils/format'
import { showConfirm } from '../../utils/confirmDelete'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  first_name: string
  last_name: string
  email: string
  mobile: string
  extension: string
  timezone: string
}

interface PasswordForm {
  old_password: string
  password: string
  password_confirmation: string
}

interface Session {
  id: string | number
  device: string
  browser: string
  ip_address: string
  location?: string
  last_active: string
  is_current?: boolean
  [key: string]: unknown
}

interface Integration {
  provider: 'gmail' | 'google_calendar'
  label: string
  description: string
  icon: string
  connected: boolean
  account?: string
  connected_at?: string
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const SECTIONS = [
  { key: 'profile',      label: 'Profile Info',     icon: User },
  { key: 'password',     label: 'Change Password',  icon: Lock },
  { key: 'sessions',     label: 'Active Sessions',  icon: Monitor },
  { key: '2fa',          label: 'Two-Factor Auth',  icon: Shield },
  { key: 'integrations', label: 'Integrations',     icon: Link2 },
] as const

type SectionKey = typeof SECTIONS[number]['key']

function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase()
  if (d.includes('mobile') || d.includes('phone')) return <Smartphone size={16} className="text-slate-500" />
  if (d.includes('tablet') || d.includes('ipad')) return <Tablet size={16} className="text-slate-500" />
  return <Monitor size={16} className="text-slate-500" />
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function ProfileInfoSection({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const qc = useQueryClient()
  const { updateUser } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ProfileForm>({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    mobile:     user?.mobile     || user?.phone || '',
    extension:  user?.extension  || '',
    timezone:   'UTC',
  })
  const [preview, setPreview] = useState<string | null>(user?.profile_pic || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Fetch full profile to populate timezone etc.
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => authService.getProfile(),
  })

  useEffect(() => {
    const p = profileData?.data?.data || profileData?.data
    if (p) {
      setForm((f) => ({
        ...f,
        first_name: p.first_name || f.first_name,
        last_name:  p.last_name  || f.last_name,
        email:      p.email      || f.email,
        mobile:     p.mobile     || p.phone || f.mobile,
        extension:  p.extension  || f.extension,
        timezone:   p.timezone   || 'UTC',
      }))
      if (p.profile_pic) setPreview(p.profile_pic)
    }
  }, [profileData])

  const updateMutation = useMutation({
    mutationFn: (data: FormData | Record<string, unknown>) => authService.updateProfile(data),
    onSuccess: (res) => {
      const updated = res.data?.data || res.data
      if (updated) updateUser(updated)
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Profile updated successfully')
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) { toast.error('First name is required'); return }
    if (!form.email.trim()) { toast.error('Email is required'); return }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (avatarFile) fd.append('profile_pic', avatarFile)
    updateMutation.mutate(fd)
  }

  const avatarLabel = [form.first_name, form.last_name]
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center ring-2 ring-indigo-200">
            {preview ? (
              <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-600">{avatarLabel}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center hover:bg-indigo-50 transition-colors"
          >
            <Camera size={13} className="text-indigo-600" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{form.first_name} {form.last_name}</p>
          <p className="text-sm text-slate-500">{form.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or GIF — max 2 MB</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">First Name</label>
            <input
              className="input" value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              placeholder="John"
            />
          </div>
          <div className="form-group">
            <label className="label">Last Name</label>
            <input
              className="input" value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              placeholder="Doe"
            />
          </div>
          <div className="form-group">
            <label className="label">
              <Mail size={13} className="inline mr-1.5 text-slate-400" />Email Address
            </label>
            <input
              className="input" type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label className="label">
              <Phone size={13} className="inline mr-1.5 text-slate-400" />Phone / Mobile
            </label>
            <input
              className="input font-mono" value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="form-group">
            <label className="label">Extension</label>
            <input
              className="input font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
              value={form.extension} readOnly
              title="Extension is managed by your administrator"
            />
            <p className="text-xs text-slate-400 mt-1">Managed by your administrator</p>
          </div>
          <div className="form-group">
            <label className="label">
              <Globe size={13} className="inline mr-1.5 text-slate-400" />Timezone
            </label>
            <select
              className="input" value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="btn-primary gap-2 min-w-[130px]"
        >
          {updateMutation.isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Saving…</>
          ) : (
            <><Save size={15} /> Save Changes</>
          )}
        </button>
      </div>
    </form>
  )
}

function PasswordSection() {
  const [form, setForm] = useState<PasswordForm>({
    old_password: '', password: '', password_confirmation: '',
  })
  const [show, setShow] = useState({ old: false, new: false, confirm: false })

  const mutation = useMutation({
    mutationFn: (data: PasswordForm) => authService.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setForm({ old_password: '', password: '', password_confirmation: '' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.old_password) { toast.error('Current password is required'); return }
    if (form.password.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (form.password !== form.password_confirmation) { toast.error('Passwords do not match'); return }
    mutation.mutate(form)
  }

  const strength = (() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (p.length >= 12) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    return s
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500', 'bg-emerald-600'][strength]

  const toggle = (field: 'old' | 'new' | 'confirm') =>
    setShow((s) => ({ ...s, [field]: !s[field] }))

  const EyeToggle = ({ field }: { field: 'old' | 'new' | 'confirm' }) => (
    <button
      type="button"
      onClick={() => toggle(field)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
    >
      {show[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Choose a strong password with at least 8 characters, including uppercase letters, numbers, and symbols.
        </p>
      </div>

      <div className="form-group">
        <label className="label">Current Password</label>
        <div className="relative">
          <input
            className="input pr-10" type={show.old ? 'text' : 'password'}
            value={form.old_password} placeholder="Enter current password"
            onChange={(e) => setForm((f) => ({ ...f, old_password: e.target.value }))}
          />
          <EyeToggle field="old" />
        </div>
      </div>

      <div className="form-group">
        <label className="label">New Password</label>
        <div className="relative">
          <input
            className="input pr-10" type={show.new ? 'text' : 'password'}
            value={form.password} placeholder="Enter new password"
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <EyeToggle field="new" />
        </div>
        {form.password && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-all',
                    i < strength ? strengthColor : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
            <p className={cn('text-xs font-medium', strength < 3 ? 'text-amber-600' : 'text-emerald-600')}>
              {strengthLabel}
            </p>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="label">Confirm New Password</label>
        <div className="relative">
          <input
            className="input pr-10" type={show.confirm ? 'text' : 'password'}
            value={form.password_confirmation} placeholder="Repeat new password"
            onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))}
          />
          <EyeToggle field="confirm" />
        </div>
        {form.password_confirmation && form.password !== form.password_confirmation && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle size={11} /> Passwords do not match
          </p>
        )}
        {form.password_confirmation && form.password === form.password_confirmation && form.password && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> Passwords match
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-primary gap-2"
      >
        {mutation.isPending ? (
          <><Loader2 size={15} className="animate-spin" /> Updating…</>
        ) : (
          <><KeyRound size={15} /> Update Password</>
        )}
      </button>
    </form>
  )
}

function SessionsSection() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions'),
    retry: 1,
  })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string | number) =>
      api.post('/revoke-session', { session_id: sessionId }),
    onSuccess: () => {
      toast.success('Session revoked')
      refetch()
    },
    onError: () => toast.error('Could not revoke session'),
  })

  const revokeAllMutation = useMutation({
    mutationFn: () => api.post('/revoke-all-sessions'),
    onSuccess: () => {
      toast.success('All other sessions revoked')
      refetch()
    },
    onError: () => toast.error('Could not revoke sessions'),
  })

  const sessions: Session[] = data?.data?.data || data?.data || []

  const columns: Column<Session>[] = [
    {
      key: 'device',
      header: 'Device / Browser',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <DeviceIcon device={r.device || ''} />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {r.browser || r.device || 'Unknown browser'}
              {r.is_current && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-md bg-indigo-50 text-indigo-600 font-semibold">
                  Current
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400">{r.device || 'Unknown device'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (r) => (
        <span className="font-mono text-xs text-slate-600">{r.ip_address || '—'}</span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (r) => (
        <span className="text-sm text-slate-600">{r.location || '—'}</span>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Active',
      render: (r) => (
        <div>
          <p className="text-sm text-slate-700">{timeAgo(r.last_active)}</p>
          <p className="text-xs text-slate-400">{formatDateTime(r.last_active)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        r.is_current ? null : (
          <button
            onClick={() => revokeMutation.mutate(r.id)}
            disabled={revokeMutation.isPending}
            className="btn-ghost btn-sm text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5"
          >
            <LogOut size={13} /> Revoke
          </button>
        ),
    },
  ]

  const fallbackSessions: Session[] = [
    {
      id: 'current',
      device: 'Desktop',
      browser: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 40) : 'Chrome',
      ip_address: '—',
      location: 'Current Session',
      last_active: new Date().toISOString(),
      is_current: true,
    },
  ]

  const displaySessions = sessions.length > 0 ? sessions : (isLoading ? [] : fallbackSessions)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {displaySessions.length} active session{displaySessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-ghost btn-sm p-2"
            title="Refresh"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          {displaySessions.filter((s) => !s.is_current).length > 0 && (
            <button
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
              className="btn-outline text-red-600 border-red-200 hover:bg-red-50 gap-1.5 btn-sm"
            >
              <LogOut size={13} /> Revoke All Others
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={displaySessions as unknown as Session[]}
          loading={isLoading}
          keyField="id"
          emptyText="No active sessions found"
        />
      </div>
    </div>
  )
}

function TwoFactorSection({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const { updateUser } = useAuthStore()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle')

  const isEnabled = !!(user?.is_2fa_google_enabled || user?.two_factor_enabled)

  const enableMutation = useMutation({
    mutationFn: () => api.post('/2fa/setup'),
    onSuccess: (res) => {
      const qr = res.data?.data?.qr_code || res.data?.qr_code
      if (qr) { setQrCode(qr); setStep('verify') }
      else { toast.error('Could not generate QR code — please try again') }
    },
    onError: () => toast.error('Could not initiate 2FA setup'),
  })

  const verifyMutation = useMutation({
    mutationFn: (code: string) => api.post('/2fa/enable', { otp: code }),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled')
      updateUser({ is_2fa_google_enabled: 1 })
      setStep('idle')
      setQrCode(null)
      setOtpInput('')
    },
    onError: () => toast.error('Invalid code — please try again'),
  })

  const disableMutation = useMutation({
    mutationFn: () => api.post('/2fa/disable'),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled')
      updateUser({ is_2fa_google_enabled: 0 })
    },
    onError: () => toast.error('Could not disable 2FA'),
  })

  const handleToggle = async () => {
    if (isEnabled) {
      if (await showConfirm({ message: 'Are you sure you want to disable two-factor authentication? This will make your account less secure.', confirmText: 'Yes, disable it' })) {
        disableMutation.mutate()
      }
    } else {
      setStep('setup')
      enableMutation.mutate()
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Status card */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-2xl border-2 transition-all',
        isEnabled
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-slate-50'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isEnabled ? 'bg-emerald-100' : 'bg-slate-200'
          )}>
            <Shield size={20} className={isEnabled ? 'text-emerald-600' : 'text-slate-500'} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Authenticator App</p>
            <p className="text-sm text-slate-500">
              {isEnabled ? 'Active — your account is protected' : 'Not enabled — recommended for security'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isEnabled ? 'green' : 'gray'}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <button
            onClick={handleToggle}
            disabled={enableMutation.isPending || disableMutation.isPending}
            className={cn('btn-sm gap-1.5', isEnabled ? 'btn-outline text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary')}
          >
            {enableMutation.isPending || disableMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isEnabled ? (
              'Disable'
            ) : (
              'Enable 2FA'
            )}
          </button>
        </div>
      </div>

      {/* Setup flow */}
      {step === 'setup' && enableMutation.isPending && (
        <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Setting up authenticator…</span>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4 p-5 rounded-2xl border border-indigo-200 bg-indigo-50/50">
          <h4 className="font-semibold text-slate-900">Scan the QR Code</h4>
          <p className="text-sm text-slate-600">
            Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below, then enter the 6-digit code to confirm.
          </p>
          {qrCode && (
            <div className="flex justify-center py-2">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="label">Verification Code</label>
            <input
              className="input font-mono tracking-widest text-center text-lg max-w-xs"
              placeholder="000 000"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => verifyMutation.mutate(otpInput)}
              disabled={otpInput.length !== 6 || verifyMutation.isPending}
              className="btn-primary gap-2"
            >
              {verifyMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Verifying…</>
              ) : (
                <><CheckCircle2 size={14} /> Confirm & Enable</>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setStep('idle'); setQrCode(null); setOtpInput('') }}
              className="btn-ghost btn-sm text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">About Two-Factor Authentication</h4>
        {[
          'Adds a second layer of security beyond just your password',
          'Required each time you sign in from a new device',
          'Works with Google Authenticator, Authy, and other TOTP apps',
          'Backup codes can be generated in case you lose access to your app',
        ].map((text, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}

function IntegrationsSection() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations'),
    retry: 1,
  })

  const connectMutation = useMutation({
    mutationFn: (provider: string) => api.post('/connect-integration', { provider }),
    onSuccess: (res) => {
      const url = res.data?.data?.redirect_url || res.data?.redirect_url
      if (url) window.location.href = url
      else { toast.success('Integration connected'); refetch() }
    },
    onError: () => toast.error('Could not connect integration'),
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => api.post('/disconnect-integration', { provider }),
    onSuccess: () => {
      toast.success('Integration disconnected')
      refetch()
    },
    onError: () => toast.error('Could not disconnect integration'),
  })

  const apiIntegrations: Integration[] = data?.data?.data || data?.data || []

  const defaultIntegrations: Integration[] = [
    {
      provider: 'gmail',
      label: 'Gmail',
      description: 'Sync emails, send from Gmail, and log email activity to contacts.',
      icon: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
      connected: false,
    },
    {
      provider: 'google_calendar',
      label: 'Google Calendar',
      description: 'Schedule follow-ups, sync call reminders, and manage your availability.',
      icon: 'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png',
      connected: false,
    },
  ]

  const integrations: Integration[] = defaultIntegrations.map((def) => {
    const found = apiIntegrations.find((i) => i.provider === def.provider)
    return found ? { ...def, ...found } : def
  })

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        integrations.map((intg) => (
          <div
            key={intg.provider}
            className={cn(
              'flex items-center justify-between p-4 rounded-2xl border-2 transition-all',
              intg.connected ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <img
                  src={intg.icon}
                  alt={intg.label}
                  className="w-7 h-7 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{intg.label}</p>
                  {intg.connected && <Badge variant="green">Connected</Badge>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{intg.description}</p>
                {intg.connected && intg.account && (
                  <p className="text-xs text-slate-400 mt-1 font-mono">{intg.account}</p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {intg.connected ? (
                <button
                  onClick={() => disconnectMutation.mutate(intg.provider)}
                  disabled={disconnectMutation.isPending}
                  className="btn-outline text-red-600 border-red-200 hover:bg-red-50 gap-1.5 btn-sm"
                >
                  <Unlink size={13} />
                  {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={() => connectMutation.mutate(intg.provider)}
                  disabled={connectMutation.isPending}
                  className="btn-primary btn-sm gap-1.5"
                >
                  {connectMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Chrome size={13} />
                  )}
                  Connect
                </button>
              )}
            </div>
          </div>
        ))
      )}

      <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
        <Shield size={11} />
        All integrations use OAuth 2.0 — we never store your passwords.
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Profile() {
  const { user } = useAuth()
  const [section, setSection] = useState<SectionKey>('profile')
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()

  // Handle OAuth callback redirect params (e.g. ?integration=google_calendar&status=success)
  useEffect(() => {
    const integration = searchParams.get('integration')
    const status = searchParams.get('status')
    const message = searchParams.get('message')

    if (integration) {
      setSection('integrations')
      if (status === 'success') {
        toast.success(`${integration === 'google_calendar' ? 'Google Calendar' : 'Integration'} connected successfully`)
        qc.invalidateQueries({ queryKey: ['integrations'] })
      } else if (status === 'error') {
        toast.error(message ? decodeURIComponent(message) : 'Integration connection failed')
      }
      // Clear the query params from the URL
      setSearchParams({}, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sectionTitles: Record<SectionKey, { title: string; subtitle: string }> = {
    profile:      { title: 'Profile Information',     subtitle: 'Update your personal details and avatar' },
    password:     { title: 'Change Password',         subtitle: 'Keep your account secure with a strong password' },
    sessions:     { title: 'Active Sessions',         subtitle: 'Manage devices and login history' },
    '2fa':        { title: 'Two-Factor Authentication', subtitle: 'Add an extra layer of security to your account' },
    integrations: { title: 'Connected Integrations',  subtitle: 'Link third-party services to your account' },
  }

  const avatarLabel = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n![0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Profile card + nav */}
      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <div className="w-64 flex-shrink-0 space-y-1">
          {/* Mini profile */}
          <div className="card mb-4 text-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center mx-auto ring-2 ring-indigo-200">
              {user?.profile_pic ? (
                <img src={user.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-indigo-600">{avatarLabel}</span>
              )}
            </div>
            <p className="font-semibold text-slate-900 mt-3">
              {user?.first_name || ''} {user?.last_name || ''}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            {user?.extension && (
              <Badge variant="blue" className="mt-2">
                Ext. {user.extension}
              </Badge>
            )}
          </div>

          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                section === key
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon size={16} className={section === key ? 'text-indigo-600' : 'text-slate-400'} />
              {label}
              {key === '2fa' && user?.two_factor_enabled ? (
                <CheckCircle2 size={13} className="ml-auto text-emerald-500" />
              ) : null}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="card">
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
              {(() => {
                const sec = SECTIONS.find((s) => s.key === section)
                const Icon = sec?.icon || User
                return (
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Icon size={18} className="text-indigo-600" />
                  </div>
                )
              })()}
              <div>
                <h2 className="font-semibold text-slate-900 text-base">
                  {sectionTitles[section].title}
                </h2>
                <p className="text-xs text-slate-500">{sectionTitles[section].subtitle}</p>
              </div>
            </div>

            {section === 'profile'      && <ProfileInfoSection user={user} />}
            {section === 'password'     && <PasswordSection />}
            {section === 'sessions'     && <SessionsSection />}
            {section === '2fa'          && <TwoFactorSection user={user} />}
            {section === 'integrations' && <IntegrationsSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
