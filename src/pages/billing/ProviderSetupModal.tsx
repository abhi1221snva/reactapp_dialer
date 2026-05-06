import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Globe, Server, Shield, CheckCircle2, AlertTriangle,
  ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, X,
  Zap, CreditCard, PhoneCall, Info, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  billingService,
  type ProviderSetupStatus,
  type ProviderMode,
  type ProviderCredentials,
  type TwilioCredentials,
  type PlivoCredentials,
} from '../../services/billing.service'

// ── Types ────────────────────────────────────────────────────────────────────
type Step = 'choose' | 'byoc-credentials' | 'byoc-validating' | 'done'
type ByocProvider = 'twilio' | 'plivo'

interface Props {
  open: boolean
  onClose: () => void
  onComplete: (status: ProviderSetupStatus) => void
  isFirstTime?: boolean  // true = onboarding, false = switching
  currentMode?: ProviderMode
}

// ── Main Component ───────────────────────────────────────────────────────────
export function ProviderSetupModal({ open, onClose, onComplete, isFirstTime = true, currentMode }: Props) {
  const qc = useQueryClient()

  // State
  const [step, setStep] = useState<Step>('choose')
  const [byocProvider, setByocProvider] = useState<ByocProvider>('twilio')

  // Twilio credentials
  const [twilioSid, setTwilioSid] = useState('')
  const [twilioToken, setTwilioToken] = useState('')
  const [showTwilioToken, setShowTwilioToken] = useState(false)

  // Plivo credentials
  const [plivoAuthId, setPlivoAuthId] = useState('')
  const [plivoToken, setPlivoToken] = useState('')
  const [showPlivoToken, setShowPlivoToken] = useState(false)

  // Validation result
  const [validationResult, setValidationResult] = useState<{ valid: boolean; account_name?: string; error?: string } | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('choose')
      setByocProvider('twilio')
      setTwilioSid('')
      setTwilioToken('')
      setPlivoAuthId('')
      setPlivoToken('')
      setValidationResult(null)
    }
  }, [open])

  // ── Mutations ────────────────────────────────────────────────────────────

  const choosePlatformMutation = useMutation({
    mutationFn: () => billingService.choosePlatform(),
    onSuccess: (res) => {
      const status = res.data?.data
      qc.invalidateQueries({ queryKey: ['billing-subscription'] })
      qc.invalidateQueries({ queryKey: ['provider-setup'] })
      toast.success('Platform VoIP activated!')
      onComplete(status)
    },
    onError: () => toast.error('Failed to activate platform mode'),
  })

  const validateMutation = useMutation({
    mutationFn: (params: { provider: ByocProvider; credentials: ProviderCredentials }) =>
      billingService.validateCredentials(params.provider, params.credentials),
    onSuccess: (res) => {
      const data = res.data?.data
      if (data?.valid) {
        setValidationResult({ valid: true, account_name: data.account_name })
      } else {
        setValidationResult({ valid: false, error: res.data?.message || 'Validation failed' })
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Validation failed'
      setValidationResult({ valid: false, error: msg })
    },
  })

  const setupByocMutation = useMutation({
    mutationFn: (params: { provider: ByocProvider; credentials: ProviderCredentials }) =>
      billingService.setupByoc(params.provider, params.credentials),
    onSuccess: (res) => {
      const status = res.data?.data
      qc.invalidateQueries({ queryKey: ['billing-subscription'] })
      qc.invalidateQueries({ queryKey: ['provider-setup'] })
      toast.success('BYOC provider connected!')
      setStep('done')
      setTimeout(() => onComplete(status), 1200)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to connect provider'
      toast.error(msg)
    },
  })

  const switchMutation = useMutation({
    mutationFn: (params: {
      target_mode: 'platform' | 'byoc'
      confirmed: boolean
      provider?: ByocProvider
      credentials?: ProviderCredentials
    }) => billingService.switchProviderMode(params),
    onSuccess: (res) => {
      const status = res.data?.data
      qc.invalidateQueries({ queryKey: ['billing-subscription'] })
      qc.invalidateQueries({ queryKey: ['provider-setup'] })
      toast.success('Provider mode updated!')
      onComplete(status)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to switch mode'
      toast.error(msg)
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getCredentials = (): ProviderCredentials => {
    if (byocProvider === 'twilio') {
      return { account_sid: twilioSid.trim(), auth_token: twilioToken.trim() } as TwilioCredentials
    }
    return { auth_id: plivoAuthId.trim(), auth_token: plivoToken.trim() } as PlivoCredentials
  }

  const credentialsValid = (): boolean => {
    if (byocProvider === 'twilio') return twilioSid.trim().length >= 10 && twilioToken.trim().length >= 10
    return plivoAuthId.trim().length >= 5 && plivoToken.trim().length >= 5
  }

  const handleValidateAndConnect = () => {
    setValidationResult(null)
    setStep('byoc-validating')
    const creds = getCredentials()
    validateMutation.mutate({ provider: byocProvider, credentials: creds })
  }

  const handleConnectAfterValidation = () => {
    const creds = getCredentials()
    if (!isFirstTime && currentMode !== 'byoc') {
      switchMutation.mutate({
        target_mode: 'byoc',
        confirmed: true,
        provider: byocProvider,
        credentials: creds,
      })
    } else {
      setupByocMutation.mutate({ provider: byocProvider, credentials: creds })
    }
  }

  const handleChoosePlatform = () => {
    if (!isFirstTime && currentMode !== 'platform') {
      switchMutation.mutate({ target_mode: 'platform', confirmed: true })
    } else {
      choosePlatformMutation.mutate()
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!open) return null

  const isLoading = choosePlatformMutation.isPending || setupByocMutation.isPending || switchMutation.isPending

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isFirstTime ? 'Choose Your VoIP Setup' : 'Change Provider Mode'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isFirstTime
                  ? 'Select how you want to handle voice, SMS, and phone numbers.'
                  : 'Switch between Platform VoIP and your own carrier.'}
              </p>
            </div>
            {!isFirstTime && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* ─── Step: Choose ─────────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-4">

              {/* Platform VoIP Card */}
              <button
                onClick={handleChoosePlatform}
                disabled={isLoading}
                className="w-full text-left group"
              >
                <div className="rounded-xl border-2 border-slate-200 hover:border-indigo-400 p-5 transition-all hover:shadow-md group-hover:bg-indigo-50/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Globe size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">Use Platform VoIP</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase">
                          Recommended
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">
                        We handle everything. Make calls, send SMS, and buy phone numbers using your credit balance. No external accounts needed.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Zap size={13} className="text-indigo-500" />
                          <span>Instant setup</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <CreditCard size={13} className="text-indigo-500" />
                          <span>Pay-as-you-go credits</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <PhoneCall size={13} className="text-indigo-500" />
                          <span>Calls, SMS, DIDs included</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Shield size={13} className="text-indigo-500" />
                          <span>60 trial credits free</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-500 mt-1 transition-colors" />
                  </div>
                </div>
              </button>

              {/* BYOC Card */}
              <button
                onClick={() => setStep('byoc-credentials')}
                disabled={isLoading}
                className="w-full text-left group"
              >
                <div className="rounded-xl border-2 border-slate-200 hover:border-emerald-400 p-5 transition-all hover:shadow-md group-hover:bg-emerald-50/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Server size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">Use My Own VoIP Provider</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                          BYOC
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">
                        Connect your own Twilio or Plivo account. Calls and SMS are billed directly by your provider. Only subscription billing applies here.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Server size={13} className="text-emerald-500" />
                          <span>Your own Twilio/Plivo</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <CreditCard size={13} className="text-emerald-500" />
                          <span>No credit deductions</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <PhoneCall size={13} className="text-emerald-500" />
                          <span>Passthrough billing</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Shield size={13} className="text-emerald-500" />
                          <span>Subscription still required</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        Your 60 trial credits remain available for platform DIDs, AI add-ons, and other platform services.
                      </p>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 mt-1 transition-colors" />
                  </div>
                </div>
              </button>

              {/* Hybrid info note */}
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Hybrid mode:</strong> If you use your own carrier but also purchase platform phone numbers (DIDs), those DIDs will still deduct from your credits. Everything else through your carrier is passthrough.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step: BYOC Credentials ───────────────────────────────── */}
          {step === 'byoc-credentials' && (
            <div className="space-y-5">

              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['twilio', 'plivo'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setByocProvider(p); setValidationResult(null) }}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        byocProvider === p
                          ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`text-lg font-bold ${byocProvider === p ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {p === 'twilio' ? 'Twilio' : 'Plivo'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credential Fields */}
              <div className="space-y-3">
                {byocProvider === 'twilio' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Account SID</label>
                      <input
                        type="text"
                        value={twilioSid}
                        onChange={(e) => setTwilioSid(e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        spellCheck={false}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Auth Token</label>
                      <div className="relative">
                        <input
                          type={showTwilioToken ? 'text' : 'password'}
                          value={twilioToken}
                          onChange={(e) => setTwilioToken(e.target.value)}
                          placeholder="Your Twilio Auth Token"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 transition-all"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          onClick={() => setShowTwilioToken(!showTwilioToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showTwilioToken ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Auth ID</label>
                      <input
                        type="text"
                        value={plivoAuthId}
                        onChange={(e) => setPlivoAuthId(e.target.value)}
                        placeholder="Your Plivo Auth ID"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        spellCheck={false}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Auth Token</label>
                      <div className="relative">
                        <input
                          type={showPlivoToken ? 'text' : 'password'}
                          value={plivoToken}
                          onChange={(e) => setPlivoToken(e.target.value)}
                          placeholder="Your Plivo Auth Token"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 transition-all"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPlivoToken(!showPlivoToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPlivoToken ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Where to find creds */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {byocProvider === 'twilio' ? (
                    <>Find your Account SID and Auth Token in the <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">Twilio Console <ExternalLink size={10} /></a>.</>
                  ) : (
                    <>Find your Auth ID and Auth Token in the <a href="https://console.plivo.com/dashboard/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">Plivo Console <ExternalLink size={10} /></a>.</>
                  )}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep('choose')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  onClick={handleValidateAndConnect}
                  disabled={!credentialsValid() || validateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {validateMutation.isPending ? (
                    <><Loader2 size={15} className="animate-spin" /> Validating...</>
                  ) : (
                    <>Validate & Connect</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step: Validating / Result ─────────────────────────────── */}
          {step === 'byoc-validating' && (
            <div className="space-y-5">

              {!validationResult && (
                <div className="text-center py-8">
                  <Loader2 size={36} className="animate-spin text-emerald-500 mx-auto mb-4" />
                  <p className="font-semibold text-slate-800">Validating your {byocProvider === 'twilio' ? 'Twilio' : 'Plivo'} credentials...</p>
                  <p className="text-sm text-slate-500 mt-1">Connecting to the {byocProvider === 'twilio' ? 'Twilio' : 'Plivo'} API to verify your account.</p>
                </div>
              )}

              {validationResult?.valid && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <p className="font-bold text-slate-900 text-lg">Credentials Verified</p>
                    {validationResult.account_name && (
                      <p className="text-sm text-slate-500 mt-1">
                        Account: <span className="font-semibold text-slate-700">{validationResult.account_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Billing explanation */}
                  {!isFirstTime && currentMode === 'platform' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <span className="font-semibold text-sm text-amber-800">Switching to BYOC means:</span>
                      </div>
                      <ul className="text-xs text-amber-800 space-y-1 ml-6 list-disc">
                        <li>Your calls and SMS will be billed directly by your provider</li>
                        <li>Platform credits will no longer deduct for supported BYOC usage</li>
                        <li>Wallet recharge may not be required</li>
                        <li>Existing platform-managed DIDs may still deduct credits</li>
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setStep('byoc-credentials'); setValidationResult(null) }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button
                      onClick={handleConnectAfterValidation}
                      disabled={setupByocMutation.isPending || switchMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {(setupByocMutation.isPending || switchMutation.isPending) ? (
                        <><Loader2 size={15} className="animate-spin" /> Connecting...</>
                      ) : (
                        <>Connect {byocProvider === 'twilio' ? 'Twilio' : 'Plivo'} & Activate BYOC</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {validationResult && !validationResult.valid && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                      <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-lg">Validation Failed</p>
                    <p className="text-sm text-red-600 mt-2">{validationResult.error}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setStep('byoc-credentials'); setValidationResult(null) }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <ArrowLeft size={15} /> Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Step: Done ───────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <p className="font-bold text-slate-900 text-xl">Provider Connected!</p>
              <p className="text-sm text-slate-500 mt-2">Your BYOC setup is complete. Billing mode has been updated.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Switch Confirmation Popup ────────────────────────────────────────────────
// Shown when user wants to switch from one mode to another (not first-time)

interface SwitchConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  targetMode: 'platform' | 'byoc'
  loading?: boolean
}

export function ProviderSwitchConfirmation({ open, onClose, onConfirm, targetMode, loading }: SwitchConfirmProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">
            Switch to {targetMode === 'platform' ? 'Platform VoIP' : 'BYOC'}?
          </h3>
        </div>

        {targetMode === 'byoc' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-5">
            <p className="text-sm font-semibold text-amber-800 mb-2">Switching to BYOC means:</p>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc ml-4">
              <li>Your calls/SMS will be billed directly by your provider</li>
              <li>Platform credits will no longer deduct for supported BYOC usage</li>
              <li>Wallet recharge may not be required</li>
              <li>Existing platform-managed DIDs may still deduct credits</li>
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 mb-5">
            <p className="text-sm font-semibold text-indigo-800 mb-2">Switching to Platform VoIP means:</p>
            <ul className="text-xs text-indigo-800 space-y-1.5 list-disc ml-4">
              <li>All calls/SMS will deduct from your credit balance</li>
              <li>Wallet recharge will be required to maintain service</li>
              <li>Your BYOC provider configuration will be removed</li>
              <li>Trial credits (if remaining) will be usable for all services</li>
            </ul>
          </div>
        )}

        <p className="text-sm text-slate-600 mb-5">Are you sure you want to continue?</p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              targetMode === 'byoc'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Yes, Switch
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Provider Mode Badge ──────────────────────────────────────────────────────

export function ProviderModeBadge({ mode }: { mode: ProviderMode }) {
  const config = {
    platform: { label: 'Platform VoIP', color: 'bg-indigo-100 text-indigo-700', icon: Globe },
    byoc:     { label: 'BYOC', color: 'bg-emerald-100 text-emerald-700', icon: Server },
    hybrid:   { label: 'Hybrid', color: 'bg-amber-100 text-amber-700', icon: Zap },
  }[mode] ?? { label: mode, color: 'bg-slate-100 text-slate-700', icon: Globe }

  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}>
      <Icon size={12} /> {config.label}
    </span>
  )
}
