import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, Phone, ArrowRight, User, GitBranch, Users,
  Voicemail, ExternalLink, MessageSquare, Star, Loader2,
  Building2, CheckCircle2, PhoneCall, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { didService } from '../../services/did.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { cn } from '../../utils/cn'
import { formatPhoneNumber } from '../../utils/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  cli: string
  cnam: string
  dest_type: string
  extension: string       // extension routing target (extension number)
  ivr_id: string          // IVR routing target (ivr_id string)
  voicemail_id: string    // voicemail routing target (extension number)
  ingroup: string         // queue routing target (ring group name)
  forward_number: string  // external routing target (phone number)
  operator: string
  sms: number
  default_did: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DEST_TYPES = [
  {
    value: 'extension', label: 'Extension', Icon: User,
    gradient: 'from-blue-500 to-indigo-600',
    activeBg: 'bg-blue-50', activeText: 'text-blue-700',
    iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    desc: 'Route to a specific agent extension',
  },
  {
    value: 'ivr', label: 'IVR', Icon: GitBranch,
    gradient: 'from-purple-500 to-violet-600',
    activeBg: 'bg-purple-50', activeText: 'text-purple-700',
    iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
    desc: 'Route to an interactive voice response menu',
  },
  {
    value: 'queue', label: 'Queue', Icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    activeBg: 'bg-emerald-50', activeText: 'text-emerald-700',
    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
    desc: 'Route to a ring group / call queue',
  },
  {
    value: 'voicemail', label: 'Voicemail', Icon: Voicemail,
    gradient: 'from-amber-500 to-orange-600',
    activeBg: 'bg-amber-50', activeText: 'text-amber-700',
    iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    desc: "Send callers directly to an extension's voicemail box",
  },
  {
    value: 'external', label: 'External', Icon: ExternalLink,
    gradient: 'from-rose-500 to-pink-600',
    activeBg: 'bg-rose-50', activeText: 'text-rose-700',
    iconBg: 'bg-rose-100', iconColor: 'text-rose-600',
    desc: 'Forward calls to an external phone number',
  },
]

const OPERATORS = [
  { value: 'twilio',  label: 'Twilio',  dot: 'bg-red-400',    active: 'border-red-400    bg-red-50    text-red-700',    inactive: 'border-slate-200 text-slate-500' },
  { value: 'telnyx',  label: 'Telnyx',  dot: 'bg-sky-400',    active: 'border-sky-400    bg-sky-50    text-sky-700',    inactive: 'border-slate-200 text-slate-500' },
  { value: 'plivo',   label: 'Plivo',   dot: 'bg-orange-400', active: 'border-orange-400 bg-orange-50 text-orange-700', inactive: 'border-slate-200 text-slate-500' },
  { value: 'vonage',  label: 'Vonage',  dot: 'bg-violet-400', active: 'border-violet-400 bg-violet-50 text-violet-700', inactive: 'border-slate-200 text-slate-500' },
  { value: 'other',   label: 'Other',   dot: 'bg-slate-400',  active: 'border-slate-400  bg-slate-100 text-slate-700',  inactive: 'border-slate-200 text-slate-500' },
]

const DEFAULT_FORM: FormState = {
  cli: '', cnam: '', dest_type: 'extension',
  extension: '', ivr_id: '', voicemail_id: '', ingroup: '',
  forward_number: '', operator: '',
  sms: 0, default_did: 0,
}

// ─── dest_type numeric conversions ────────────────────────────────────────────
const DEST_TYPE_TO_NUM: Record<string, number> = {
  ivr: 0, extension: 1, voicemail: 2, external: 4, conference: 5, queue: 8, voice_ai: 12,
}
const DEST_TYPE_FROM_NUM: Record<number, string> = {
  0: 'ivr', 1: 'extension', 2: 'voicemail', 4: 'external', 5: 'conference', 8: 'queue', 12: 'voice_ai',
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description, icon: Icon, accent = 'indigo' }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
  icon: React.ElementType
  accent?: string
}) {
  const accentMap: Record<string, { border: string; bg: string; iconBg: string; iconColor: string; track: string }> = {
    indigo: { border: 'border-indigo-400', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', track: 'bg-indigo-500' },
    amber:  { border: 'border-amber-400',  bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  track: 'bg-amber-500' },
  }
  const a = accentMap[accent]
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer select-none transition-all',
        checked ? `${a.border} ${a.bg}` : 'border-slate-200 bg-white hover:border-slate-300'
      )}
      onClick={() => onChange(!checked)}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
        checked ? a.iconBg : 'bg-slate-100')}>
        <Icon size={17} className={checked ? a.iconColor : 'text-slate-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', checked ? 'text-slate-900' : 'text-slate-700')}>{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
      </div>
      <div className={cn('relative w-10 h-6 rounded-full flex-shrink-0 transition-colors flex-shrink-0',
        checked ? a.track : 'bg-slate-200')}>
        <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ icon: Icon, title, sub, step }: {
  icon: React.ElementType; title: string; sub: string; step: number
}) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-indigo-600">{step}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-slate-500" />
          <p className="text-sm font-semibold text-slate-900">{title}</p>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ─── Empty state hint ─────────────────────────────────────────────────────────

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-1.5">
      <AlertCircle size={11} /> {message}
    </p>
  )
}

// ─── Live preview sidebar ─────────────────────────────────────────────────────

function PreviewCard({ form, extensions, ivrs, ringGroups }: {
  form: FormState
  extensions: Array<{ id: number; extension: string; first_name?: string; last_name?: string }>
  ivrs: Array<{ ivr_id: string; ivr_desc: string }>
  ringGroups: Array<{ id: number; name?: string; title?: string }>
}) {
  const destCfg = DEST_TYPES.find(d => d.value === form.dest_type) ?? DEST_TYPES[0]

  // Resolve the human-readable destination label
  let destTarget = ''
  if (form.dest_type === 'extension') {
    const ext = extensions.find(e => e.extension === form.extension)
    destTarget = ext
      ? ([ext.first_name, ext.last_name].filter(Boolean).join(' ') || `Ext ${ext.extension}`)
      : (form.extension ? `Ext ${form.extension}` : '')
  } else if (form.dest_type === 'ivr') {
    const ivr = ivrs.find(i => i.ivr_id === form.ivr_id)
    destTarget = ivr ? ivr.ivr_desc : form.ivr_id
  } else if (form.dest_type === 'queue') {
    const rg = ringGroups.find(r => (r.name || String(r.id)) === form.ingroup)
    destTarget = rg ? (rg.name || rg.title || `Group #${rg.id}`) : form.ingroup
  } else if (form.dest_type === 'voicemail') {
    const ext = extensions.find(e => e.extension === form.voicemail_id)
    destTarget = ext
      ? ([ext.first_name, ext.last_name].filter(Boolean).join(' ') || `Ext ${ext.extension}`) + ' (VM)'
      : (form.voicemail_id ? `Ext ${form.voicemail_id} (VM)` : '')
  } else if (form.dest_type === 'external') {
    destTarget = form.forward_number ? formatPhoneNumber(form.forward_number) : ''
  }

  const hasNumber = form.cli.trim().length > 0
  const opCfg = OPERATORS.find(o => o.value === form.operator)

  const checkItems = [
    { label: 'Phone number entered', done: form.cli.trim().length > 0 },
    { label: 'Routing type selected', done: true },
    {
      label: 'Routing target set', done: (
        (form.dest_type === 'extension' && !!form.extension) ||
        (form.dest_type === 'ivr' && !!form.ivr_id) ||
        (form.dest_type === 'queue' && !!form.ingroup) ||
        (form.dest_type === 'voicemail' && !!form.voicemail_id) ||
        (form.dest_type === 'external' && !!form.forward_number.trim())
      )
    },
    { label: 'Provider selected', done: form.operator.length > 0 },
  ]
  const allDone = checkItems.every(c => c.done)

  return (
    <div className="sticky top-24 space-y-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Preview</p>

      {/* DID card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', destCfg.gradient)}>
            <Phone size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('font-mono font-bold text-lg leading-tight transition-all',
              hasNumber ? 'text-white' : 'text-slate-600')}>
              {hasNumber ? formatPhoneNumber(form.cli) : '+1 (___) ___-____'}
            </p>
            <p className={cn('text-xs mt-1', form.cnam ? 'text-slate-400' : 'text-slate-600 italic')}>
              {form.cnam || 'No caller ID name set'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', destCfg.iconBg)}>
              <destCfg.Icon size={10} className={destCfg.iconColor} />
            </div>
            <span className="text-xs text-slate-400">{destCfg.label}</span>
            {destTarget && (
              <>
                <ArrowRight size={9} className="text-slate-600" />
                <span className="text-xs font-semibold text-slate-200 truncate">{destTarget}</span>
              </>
            )}
          </div>
          {opCfg && (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <Building2 size={12} className="text-slate-500" />
              <span className="text-xs text-slate-400">Provider</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className={cn('w-1.5 h-1.5 rounded-full', opCfg.dot)} />
                <span className="text-xs font-semibold text-slate-200 capitalize">{opCfg.label}</span>
              </div>
            </div>
          )}
        </div>

        {(form.sms || form.default_did) ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {Boolean(form.sms) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                <MessageSquare size={9} /> SMS
              </span>
            )}
            {Boolean(form.default_did) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                <Star size={9} className="fill-amber-400" /> Default DID
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Checklist */}
      <div className="card p-4 space-y-2.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checklist</p>
          {allDone && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Ready to save
            </span>
          )}
        </div>
        {checkItems.map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2">
            <CheckCircle2 size={13} className={done ? 'text-emerald-500' : 'text-slate-200'} />
            <span className={cn('text-xs', done ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DidForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['did', id],
    queryFn: () => didService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: extensionsData } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => didService.getExtensions(),
  })

  const { data: ivrData, isLoading: loadingIvrs } = useQuery({
    queryKey: ['ivr-list-dropdown'],
    queryFn: () => didService.getIvrList(),
  })

  const { data: ringGroupData, isLoading: loadingRingGroups } = useQuery({
    queryKey: ['ringgroup-list-dropdown'],
    queryFn: () => didService.getRingGroups(),
  })

  // ── Populate form on edit ─────────────────────────────────────────────────
  useEffect(() => {
    // Guard: backend may return { success: false, data: [] } as HTTP 200.
    const raw = existing?.data?.data
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      const d = raw as Record<string, unknown>
      const rawDest = d.dest_type
      const destStr = typeof rawDest === 'number'
        ? (DEST_TYPE_FROM_NUM[rawDest] ?? 'extension')
        : (DEST_TYPE_FROM_NUM[Number(rawDest)] ?? String(rawDest || 'extension'))
      setForm({
        cli:            String(d.cli || ''),
        cnam:           String(d.cnam || ''),
        dest_type:      destStr,
        extension:      String(d.extension || ''),
        ivr_id:         String(d.ivr_id || ''),
        voicemail_id:   String(d.voicemail_id || ''),
        ingroup:        String(d.ingroup || ''),
        forward_number: String(d.forward_number || ''),
        operator:       String(d.operator || d.voip_provider || ''),
        sms:            d.sms ? 1 : 0,
        default_did:    d.default_did ? 1 : 0,
      })
    }
  }, [existing])

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const destNum = DEST_TYPE_TO_NUM[form.dest_type] ?? 1
      const payload: Record<string, unknown> = {
        // ── Core identity ─────────────────────────────────────────────────
        cli:                     form.cli,
        cnam:                    form.cnam,
        area_code:               '',
        country_code:            '',

        // ── Routing (backend uses numeric == comparisons) ─────────────────
        dest_type:               destNum,
        ivr_id:                  destNum === 0 ? form.ivr_id : '',
        extension:               destNum === 1 ? form.extension : '',
        voicemail_id:            destNum === 2 ? form.voicemail_id : '',
        forward_number:          destNum === 4 ? form.forward_number : '',
        conf_id:                 '',
        ingroup:                 destNum === 8 ? form.ingroup : '',

        // ── Provider ─────────────────────────────────────────────────────
        operator:                form.operator,
        operator_check:          form.operator,
        voip_provider:           form.operator,
        phone_number_sid:        '',

        // ── Features ─────────────────────────────────────────────────────
        sms:                     form.sms,
        is_sms:                  form.sms,
        sms_phone:               '',
        sms_email:               '',
        sms_type:                0,    // NOT NULL INT — must not be ''
        default_did:             form.default_did,

        // ── Call screening ────────────────────────────────────────────────
        call_screening_status:   0,
        call_screening_ivr_id:   0,

        // ── Audio / TTS ───────────────────────────────────────────────────
        language:                '',
        voice_name:              '',
        ivr_audio_option:        0,
        speech_text:             '',
        prompt_option:           0,

        // ── Out-of-hours (NOT NULL — must always be sent with a value) ────
        dest_type_ooh:           1,
        ivr_id_ooh:              '',
        extension_ooh:           '',
        voicemail_id_ooh:        '',
        forward_number_ooh:      '',
        conf_id_ooh:             '',
        ingroup_ooh:             '',
        call_time_department_id: 0,
        call_time_holiday:       0,
        redirect_last_agent:     0,
      }
      if (isEdit) {
        // Use 'did_id' — NOT 'id'. Backend JwtMiddleware checks body 'id' against
        // the authenticated user's ID; sending the DID record ID as 'id' would
        // cause "Unauthorized." because record ID ≠ user ID.
        payload.did_id = Number(id)
      }
      return isEdit ? didService.update(payload) : didService.create(payload)
    },
    onSuccess: (res) => {
      const succeeded = res?.data?.success
      if (succeeded === false || succeeded === 'false' || succeeded === 0) {
        const errArr = res?.data?.errors
        const firstErr = Array.isArray(errArr) && errArr.length > 0 ? String(errArr[0]) : null
        const isTechnical = firstErr
          ? /SQLSTATE|Exception|Traceback|stack trace|at line \d|mysqli|PDO|undefined|null|Fatal/i.test(firstErr)
          : true
        const fallback = isEdit ? 'Unable to update DID. Please try again.' : 'Unable to add DID. Please try again.'
        const display = (!isTechnical && firstErr && firstErr.length <= 120) ? firstErr : fallback
        console.error('[DID save] API returned success:false', res?.data)
        toast.error(display)
        return
      }
      toast.success(isEdit ? 'DID updated' : 'DID added')
      navigate('/dids')
    },
    onError: (error: unknown) => {
      const responseData = (error as { response?: { data?: unknown } }).response?.data
      if (responseData) console.error('[DID save] server error detail:', responseData)
      const status = (error as { response?: { status?: number } }).response?.status
      if (!status || (status !== 403 && status !== 422 && status < 500)) {
        toast.error(isEdit ? 'Unable to update DID. Please try again.' : 'Unable to add DID. Please try again.')
      }
    },
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (key: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  // Reset all routing target fields when switching dest_type
  const switchDestType = (val: string) => {
    setForm(f => ({ ...f, dest_type: val, extension: '', ivr_id: '', voicemail_id: '', ingroup: '', forward_number: '' }))
  }

  const extensions: Array<{ id: number; extension: string; first_name?: string; last_name?: string }> =
    extensionsData?.data?.data || extensionsData?.data || []
  const ivrs: Array<{ ivr_id: string; ivr_desc: string }> =
    ivrData?.data?.data || ivrData?.data || []
  const ringGroups: Array<{ id: number; name?: string; title?: string }> =
    ringGroupData?.data?.data || ringGroupData?.data || []

  const activeDest = DEST_TYPES.find(d => d.value === form.dest_type) ?? DEST_TYPES[0]

  function handleSave() {
    if (!form.cli.trim()) {
      toast.error('Phone number (CLI) is required.')
      return
    }
    if (!form.operator) {
      toast.error('Please select a VoIP provider before saving.')
      return
    }
    if (form.dest_type === 'extension' && !form.extension) {
      toast.error('Please select a target extension.')
      return
    }
    if (form.dest_type === 'ivr' && !form.ivr_id) {
      toast.error('Please select an IVR.')
      return
    }
    if (form.dest_type === 'queue' && !form.ingroup) {
      toast.error('Please select a ring group / queue.')
      return
    }
    if (form.dest_type === 'voicemail' && !form.voicemail_id) {
      toast.error('Please select an extension for voicemail routing.')
      return
    }
    if (form.dest_type === 'external' && !form.forward_number.trim()) {
      toast.error('Please enter the external forward number.')
      return
    }
    saveMutation.mutate()
  }

  if (isEdit && loadingExisting) return <PageLoader />

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dids')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Phone Number' : 'Add Phone Number'}</h1>
          <p className="page-subtitle">
            {isEdit
              ? 'Update routing, provider, and feature settings'
              : 'Set up a new DID with routing and provider configuration'}
          </p>
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: Form panels ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Step 1: Phone Identity ── */}
          <div className="card space-y-5">
            <SectionHead step={1} icon={PhoneCall} title="Phone Identity" sub="Enter the phone number and caller ID name" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group sm:col-span-1">
                <label className="label">
                  Phone Number (CLI) <span className="text-red-500">*</span>
                </label>
                <input
                  className={cn('input font-mono', isEdit && 'bg-slate-50 text-slate-500 cursor-not-allowed')}
                  value={form.cli}
                  onChange={e => set('cli', e.target.value)}
                  placeholder="+1XXXXXXXXXX"
                  disabled={isEdit}
                />
                {isEdit ? (
                  <p className="text-[11px] text-slate-400 mt-1.5">Cannot be changed after creation</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1.5">Include country code, e.g. +12125551234</p>
                )}
              </div>

              <div className="form-group sm:col-span-1">
                <label className="label">Caller ID Name (CNAM)</label>
                <input
                  className="input"
                  value={form.cnam}
                  onChange={e => set('cnam', e.target.value)}
                  placeholder="e.g. Support Line, Acme Corp"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Shown to recipients on outbound calls</p>
              </div>
            </div>
          </div>

          {/* ── Step 2: Call Routing ── */}
          <div className="card space-y-5">
            <SectionHead step={2} icon={ArrowRight} title="Call Routing" sub="Choose where inbound calls to this number are directed" />

            {/* Routing type buttons */}
            <div>
              <label className="label mb-2">Routing Type</label>
              <div className="grid grid-cols-5 gap-2">
                {DEST_TYPES.map(dt => {
                  const active = form.dest_type === dt.value
                  return (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => switchDestType(dt.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-xl border-2 transition-all text-center',
                        active
                          ? `${dt.activeBg} border-current ${dt.activeText}`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                        active ? dt.iconBg : 'bg-slate-100')}>
                        <dt.Icon size={16} className={active ? dt.iconColor : 'text-slate-400'} />
                      </div>
                      <span className={cn('text-[11px] font-semibold leading-tight',
                        active ? dt.activeText : 'text-slate-500')}>
                        {dt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* Active routing description */}
              <div className={cn('mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs', activeDest.activeBg)}>
                <activeDest.Icon size={12} className={activeDest.iconColor} />
                <span className={cn('font-medium', activeDest.activeText)}>{activeDest.label}:</span>
                <span className="text-slate-600">{activeDest.desc}</span>
              </div>
            </div>

            {/* ── Conditional destination target ── */}

            {/* Extension */}
            {form.dest_type === 'extension' && (
              <div className="form-group">
                <label className="label">
                  Target Extension <span className="text-red-500">*</span>
                </label>
                <select className="input" value={form.extension} onChange={e => set('extension', e.target.value)}>
                  <option value="">— Select an extension —</option>
                  {extensions.map(ext => {
                    const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                    return (
                      <option key={ext.id} value={ext.extension}>
                        Ext {ext.extension}{name ? ` — ${name}` : ''}
                      </option>
                    )
                  })}
                </select>
                {extensions.length === 0 && (
                  <EmptyHint message="No extensions found. Please create an extension first." />
                )}
              </div>
            )}

            {/* IVR */}
            {form.dest_type === 'ivr' && (
              <div className="form-group">
                <label className="label">
                  Select IVR <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={form.ivr_id}
                  onChange={e => set('ivr_id', e.target.value)}
                  disabled={loadingIvrs}
                >
                  <option value="">
                    {loadingIvrs ? 'Loading IVRs…' : '— Select an IVR —'}
                  </option>
                  {ivrs.map(ivr => (
                    <option key={ivr.ivr_id} value={ivr.ivr_id}>
                      {ivr.ivr_desc} ({ivr.ivr_id})
                    </option>
                  ))}
                </select>
                {!loadingIvrs && ivrs.length === 0 && (
                  <EmptyHint message="No IVRs found. Please create an IVR first." />
                )}
              </div>
            )}

            {/* Queue / Ring Group */}
            {form.dest_type === 'queue' && (
              <div className="form-group">
                <label className="label">
                  Select Ring Group / Queue <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={form.ingroup}
                  onChange={e => set('ingroup', e.target.value)}
                  disabled={loadingRingGroups}
                >
                  <option value="">
                    {loadingRingGroups ? 'Loading ring groups…' : '— Select a ring group —'}
                  </option>
                  {ringGroups.map(rg => (
                    <option key={rg.id} value={rg.name || String(rg.id)}>
                      {rg.name || rg.title || `Group #${rg.id}`}
                    </option>
                  ))}
                </select>
                {!loadingRingGroups && ringGroups.length === 0 && (
                  <EmptyHint message="No ring groups found. Please create a ring group first." />
                )}
              </div>
            )}

            {/* Voicemail */}
            {form.dest_type === 'voicemail' && (
              <div className="form-group">
                <label className="label">
                  Voicemail Extension <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={form.voicemail_id}
                  onChange={e => set('voicemail_id', e.target.value)}
                >
                  <option value="">— Select an extension —</option>
                  {extensions.map(ext => {
                    const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                    return (
                      <option key={ext.id} value={ext.extension}>
                        Ext {ext.extension}{name ? ` — ${name}` : ''} (Voicemail)
                      </option>
                    )
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Callers will be sent directly to this extension's voicemail box
                </p>
                {extensions.length === 0 && (
                  <EmptyHint message="No extensions found. Please create an extension first." />
                )}
              </div>
            )}

            {/* External forward */}
            {form.dest_type === 'external' && (
              <div className="form-group">
                <label className="label">
                  Forward To Number <span className="text-red-500">*</span>
                </label>
                <input
                  className="input font-mono"
                  value={form.forward_number}
                  onChange={e => set('forward_number', e.target.value)}
                  placeholder="+1XXXXXXXXXX"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Enter the full number including country code
                </p>
              </div>
            )}
          </div>

          {/* ── Step 3: Provider & Features ── */}
          <div className="card space-y-5">
            <SectionHead step={3} icon={Building2} title="Provider & Features" sub="Select the VoIP carrier and enable optional features" />

            {/* Operator selection */}
            <div className="form-group">
              <label className="label">
                VoIP Provider <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {OPERATORS.map(op => {
                  const active = form.operator === op.value
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => set('operator', active ? '' : op.value)}
                      className={cn(
                        'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all',
                        active ? op.active : op.inactive + ' hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', op.dot)} />
                      {op.label}
                      {active && <CheckCircle2 size={11} />}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Click a provider to select. Click again to deselect.
              </p>
            </div>

            {/* Feature toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                checked={Boolean(form.sms)}
                onChange={v => set('sms', v ? 1 : 0)}
                label="Enable SMS"
                description="Send and receive text messages on this number"
                icon={MessageSquare}
                accent="indigo"
              />
              <Toggle
                checked={Boolean(form.default_did)}
                onChange={v => set('default_did', v ? 1 : 0)}
                label="Set as Default"
                description="Use as the default outbound caller ID"
                icon={Star}
                accent="amber"
              />
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-3 pt-1">
            <button onClick={() => navigate('/dids')} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="btn-primary flex-1"
            >
              {saveMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : isEdit ? 'Update DID' : 'Add DID'
              }
            </button>
          </div>
        </div>

        {/* ── RIGHT: Live preview ── */}
        <div className="hidden lg:block">
          <PreviewCard
            form={form}
            extensions={extensions}
            ivrs={ivrs}
            ringGroups={ringGroups}
          />
        </div>
      </div>
    </div>
  )
}
