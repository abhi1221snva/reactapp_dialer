import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Copy, Check, Download, ArrowLeft, CheckCircle2,
  Smartphone, Key, AlertTriangle, Eye, EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { twoFactorService } from '../../services/twoFactor.service'
import type { TwoFactorSetupData } from '../../services/twoFactor.service'

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── OTP digit input (6-box) ──────────────────────────────────────────────────
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
          className="w-11 h-12 text-center text-lg font-bold border-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all border-slate-200"
        />
      ))}
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
type PageStep = 'setup' | 'verify' | 'backup-codes'

export function TwoFactorSetup() {
  const navigate = useNavigate()

  const [pageStep, setPageStep] = useState<PageStep>('setup')
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null)
  const [setupLoading, setSetupLoading] = useState(true)
  const [otp, setOtp] = useState('')
  const [enabling, setEnabling] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showSecret, setShowSecret] = useState(false)

  // Auto-call setup on mount
  useEffect(() => {
    const init = async () => {
      setSetupLoading(true)
      try {
        const res = await twoFactorService.setup()
        setSetupData(res.data?.data ?? null)
      } catch {
        toast.error('Failed to initialize 2FA setup. Please try again.')
      } finally {
        setSetupLoading(false)
      }
    }
    init()
  }, [])

  // ── Enable 2FA ────────────────────────────────────────────────────────────
  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) { toast.error('Enter the 6-digit code from your authenticator app'); return }
    setEnabling(true)
    try {
      const res = await twoFactorService.enable(otp)
      const codes = res.data?.data?.backup_codes ?? []
      setBackupCodes(codes)
      toast.success('Two-factor authentication enabled!')
      setPageStep('backup-codes')
    } catch {
      setOtp('')
    } finally {
      setEnabling(false)
    }
  }

  // ── Download backup codes ─────────────────────────────────────────────────
  const downloadCodes = () => {
    const text = [
      'DialerCRM — 2FA Backup Codes',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Keep these codes safe. Each code can only be used once.',
      '',
      ...backupCodes.map((c, i) => `${i + 1}. ${c}`),
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dialercrm-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
      toast.success('All backup codes copied!')
    })
  }

  // ── QR code URL (use qrserver.com since qrcode.react is not installed) ────
  const qrImageUrl = setupData?.qr_code_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qr_code_url)}`
    : null

  // ─────────────────────────────────────────────────────────────────────────
  // Page: Backup Codes
  // ─────────────────────────────────────────────────────────────────────────
  if (pageStep === 'backup-codes') {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">2FA Enabled!</h1>
            <p className="text-sm text-slate-500">Save your backup codes before continuing</p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Save these codes now.</strong> Each backup code can only be used once to sign in if you lose access to your authenticator app. They will not be shown again.
          </p>
        </div>

        {/* Backup codes grid */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">Backup Codes</h3>
            <span className="text-xs text-slate-500">{backupCodes.length} codes</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {backupCodes.map((code, i) => (
              <div key={i} className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-center tracking-wider select-all">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={copyAllCodes}
              className="btn-outline flex-1 gap-2 text-sm"
            >
              <Copy size={13} /> Copy All
            </button>
            <button
              type="button"
              onClick={downloadCodes}
              className="btn-outline flex-1 gap-2 text-sm"
            >
              <Download size={13} /> Download
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/settings/security')}
          className="btn-primary w-full h-11 font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          Done — Go to Security Settings
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page: Setup + Verify
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/settings/security')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Set up Two-Factor Authentication</h1>
          <p className="text-sm text-slate-500">Protect your account with Google Authenticator</p>
        </div>
      </div>

      {setupLoading ? (
        <div className="card animate-pulse space-y-4">
          <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
          <div className="h-48 bg-slate-100 rounded-xl" />
          <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
        </div>
      ) : setupData ? (
        <>
          {/* Step 1: Instructions */}
          <div className="card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Install an authenticator app</p>
                <p className="text-xs text-slate-500">Google Authenticator, Authy, or 1Password</p>
              </div>
              <Smartphone size={18} className="text-slate-400 ml-auto" />
            </div>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">2</div>
              <p className="text-sm font-semibold text-slate-900">Scan the QR code below</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4 py-2">
              {qrImageUrl ? (
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm inline-block">
                  <img
                    src={qrImageUrl}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                    className="block"
                  />
                </div>
              ) : (
                <div className="w-[200px] h-[200px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                  QR unavailable
                </div>
              )}

              {/* Manual entry secret */}
              <div className="w-full">
                <p className="text-xs text-slate-500 text-center mb-2">
                  Can't scan? Enter this key manually:
                </p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Key size={13} className="text-slate-400 flex-shrink-0" />
                  <code className="flex-1 text-sm font-mono text-slate-700 select-all tracking-wider text-center">
                    {showSecret ? setupData.secret : '••••  ••••  ••••  ••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowSecret(s => !s)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {showSecret && <CopyButton text={setupData.secret} />}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Verify */}
          <div className="card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Enter your first verification code</p>
                <p className="text-xs text-slate-500">Open your authenticator app and enter the 6-digit code</p>
              </div>
            </div>

            <form onSubmit={handleEnable} className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} />

              <button
                type="submit"
                disabled={enabling || otp.length < 6}
                className="btn-primary w-full h-11 font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {enabling ? <><Spinner /> Enabling 2FA...</> : <><Shield size={16} /> Enable Two-Factor Authentication</>}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="card text-center py-10 space-y-3">
          <AlertTriangle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Failed to load 2FA setup</p>
          <p className="text-xs text-slate-500">Please go back and try again.</p>
          <button
            type="button"
            onClick={() => navigate('/settings/security')}
            className="btn-outline mx-auto"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  )
}
