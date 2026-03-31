import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth.store'
import {
  ArrowLeft, GitBranch, Users,
  Voicemail, ExternalLink, MessageSquare, Star, Loader2,
  CheckCircle2, PhoneCall, AlertCircle, Clock,
  Upload, Mic, History, Lock, User, PhoneIncoming,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { didService } from '../../services/did.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  cli: string
  cnam: string
  // Main routing
  dest_type: string
  extension: string
  ivr_id: string
  voicemail_id: string
  ingroup: string
  forward_number: string
  // Provider & features
  operator: string
  sms: number
  sms_user_id: string           // stored in sms_email — user ID assigned to receive SMS
  default_did: number
  // Call times
  call_time_enabled: number     // UI toggle: 1 = call times active
  call_time_department_id: string
  call_time_holiday: number     // 1 = respect holiday calendar
  // Call screening
  call_screening_status: number
  call_screening_mode: string       // 'ivr' | 'upload' | 'speech'
  call_screening_ivr_id: string
  speech_text: string
  language: string
  voice_name: string
  // Redirect to last agent
  redirect_last_agent: number
  // Out-of-hours routing
  dest_type_ooh: string
  extension_ooh: string
  ivr_id_ooh: string
  voicemail_id_ooh: string
  ingroup_ooh: string
  forward_number_ooh: string
}

type DeptItem = { id: number; name: string; description?: string }

// ─── Config ───────────────────────────────────────────────────────────────────

const DEST_TYPES = [
  {
    value: 'extension', label: 'Extension', Icon: User,
    gradient:   'from-blue-500 to-indigo-600',
    activeBg:   'bg-gradient-to-br from-blue-500 to-indigo-600',
    iconBg:     'bg-blue-100',   iconColor:  'text-blue-600',
    activeText: 'text-white',    ringColor:  'ring-blue-400',
    desc: 'Route to a specific agent extension',
  },
  {
    value: 'ivr', label: 'IVR', Icon: GitBranch,
    gradient:   'from-purple-500 to-violet-600',
    activeBg:   'bg-gradient-to-br from-purple-500 to-violet-600',
    iconBg:     'bg-purple-100', iconColor:  'text-purple-600',
    activeText: 'text-white',    ringColor:  'ring-purple-400',
    desc: 'Interactive voice response menu',
  },
  {
    value: 'queue', label: 'Queue', Icon: Users,
    gradient:   'from-emerald-500 to-teal-600',
    activeBg:   'bg-gradient-to-br from-emerald-500 to-teal-600',
    iconBg:     'bg-emerald-100', iconColor: 'text-emerald-600',
    activeText: 'text-white',     ringColor: 'ring-emerald-400',
    desc: 'Ring group or call queue',
  },
  {
    value: 'voicemail', label: 'Voicemail', Icon: Voicemail,
    gradient:   'from-amber-500 to-orange-600',
    activeBg:   'bg-gradient-to-br from-amber-500 to-orange-600',
    iconBg:     'bg-amber-100',  iconColor:  'text-amber-600',
    activeText: 'text-white',    ringColor:  'ring-amber-400',
    desc: 'Send directly to voicemail',
  },
  {
    value: 'external', label: 'External', Icon: ExternalLink,
    gradient:   'from-rose-500 to-pink-600',
    activeBg:   'bg-gradient-to-br from-rose-500 to-pink-600',
    iconBg:     'bg-rose-100',   iconColor:  'text-rose-600',
    activeText: 'text-white',    ringColor:  'ring-rose-400',
    desc: 'Forward to external number',
  },
]

const OPERATORS = [
  { value: 'twilio',  label: 'Twilio',  dot: 'bg-red-400',
    active: 'bg-red-50    border-red-400    text-red-700',
    check:  'text-red-500' },
  { value: 'telnyx',  label: 'Telnyx',  dot: 'bg-sky-400',
    active: 'bg-sky-50    border-sky-400    text-sky-700',
    check:  'text-sky-500' },
  { value: 'plivo',   label: 'Plivo',   dot: 'bg-orange-400',
    active: 'bg-orange-50 border-orange-400 text-orange-700',
    check:  'text-orange-500' },
  { value: 'vonage',  label: 'Vonage',  dot: 'bg-violet-400',
    active: 'bg-violet-50 border-violet-400 text-violet-700',
    check:  'text-violet-500' },
  { value: 'other',   label: 'Other',   dot: 'bg-slate-400',
    active: 'bg-slate-100 border-slate-400  text-slate-700',
    check:  'text-slate-500' },
]

const DEFAULT_FORM: FormState = {
  cli: '', cnam: '', dest_type: 'extension',
  extension: '', ivr_id: '', voicemail_id: '', ingroup: '',
  forward_number: '', operator: '',
  sms: 0, sms_user_id: '', default_did: 0,
  call_time_enabled: 0, call_time_department_id: '', call_time_holiday: 0,
  call_screening_status: 0, call_screening_mode: 'ivr', call_screening_ivr_id: '',
  speech_text: '', language: 'en-US', voice_name: 'Joanna',
  redirect_last_agent: 0,
  dest_type_ooh: 'extension',
  extension_ooh: '', ivr_id_ooh: '', voicemail_id_ooh: '',
  ingroup_ooh: '', forward_number_ooh: '',
}

const DEST_TYPE_TO_NUM: Record<string, number> = {
  ivr: 0, extension: 1, voicemail: 2, external: 4, conference: 5, queue: 8, voice_ai: 12,
}
const DEST_TYPE_FROM_NUM: Record<number, string> = {
  0: 'ivr', 1: 'extension', 2: 'voicemail', 4: 'external', 5: 'conference', 8: 'queue', 12: 'voice_ai',
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-1.5">
      <AlertCircle size={11} /> {message}
    </p>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ icon: Icon, title, sub, step }: {
  icon: React.ElementType; title: string; sub: string; step: number
}) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-xs font-black text-white">{step}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-slate-500" />
          <p className="text-sm font-bold text-slate-900">{title}</p>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ─── Routing type card grid ───────────────────────────────────────────────────

function RoutingCards({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {DEST_TYPES.map(dt => {
        const active = value === dt.value
        return (
          <button
            key={dt.value}
            type="button"
            onClick={() => onChange(dt.value)}
            className={cn(
              'relative flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl border-2 transition-all text-center select-none cursor-pointer',
              active
                ? `${dt.activeBg} border-transparent shadow-lg ring-2 ring-offset-1 ${dt.ringColor}`
                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all flex-shrink-0',
              active ? 'bg-white/20' : `bg-gradient-to-br ${dt.gradient}`
            )}>
              <dt.Icon size={20} className={active ? 'text-white' : 'text-white'} />
            </div>
            <div>
              <p className={cn('text-xs font-bold leading-none', active ? 'text-white' : 'text-slate-700')}>
                {dt.label}
              </p>
              <p className={cn('text-[10px] mt-1 leading-snug', active ? 'text-white/70' : 'text-slate-400')}>
                {dt.desc}
              </p>
            </div>
            {active && (
              <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 size={13} className={dt.iconColor} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Feature toggle ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description, icon: Icon, accent = 'indigo' }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
  icon: React.ElementType
  accent?: string
}) {
  const A: Record<string, { border: string; bg: string; iconBg: string; iconColor: string; track: string }> = {
    indigo: { border: 'border-indigo-400', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', track: 'bg-indigo-500' },
    amber:  { border: 'border-amber-400',  bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  track: 'bg-amber-500' },
  }
  const a = A[accent]
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
      <div className={cn('relative w-10 h-6 rounded-full flex-shrink-0 transition-colors',
        checked ? a.track : 'bg-slate-200')}>
        <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
    </div>
  )
}

// ─── US phone formatter ───────────────────────────────────────────────────────

function formatUSPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// ─── Routing target selector ──────────────────────────────────────────────────

type ExtItem  = { id: number; extension: string; first_name?: string; last_name?: string }
type IvrItem  = { ivr_id: string; ivr_desc?: string; ann_id?: string }
type RingItem = { id: number; title?: string; name?: string; extension_name?: string }

function RoutingTarget({
  destType, extension, ivr_id, voicemail_id, ingroup, forward_number,
  extensions, ivrs, ringGroups, loadingIvrs, loadingRingGroups,
  onChange,
}: {
  destType: string
  extension: string; ivr_id: string; voicemail_id: string
  ingroup: string; forward_number: string
  extensions: ExtItem[]
  ivrs: IvrItem[]
  ringGroups: RingItem[]
  loadingIvrs: boolean
  loadingRingGroups: boolean
  onChange: (key: string, value: string) => void
}) {
  const extLabel = (ext: ExtItem) => {
    const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
    return name || `Ext ${ext.extension}`
  }

  const rgLabel = (rg: RingItem) => {
    const title = rg.title || rg.name || `Group #${rg.id}`
    if (rg.extension_name) {
      const agents = rg.extension_name
        .split(',')
        .map(s => s.replace(/-\d+$/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
      const suffix = agents.length ? `  — ${agents.join(', ')}` : ''
      return `${title}${suffix}`
    }
    return title
  }

  if (destType === 'extension') return (
    <div className="form-group">
      <label className="label">Target Agent / Extension <span className="text-red-500">*</span></label>
      <select className="input" value={extension} onChange={e => onChange('extension', e.target.value)}>
        <option value="">— Select an agent —</option>
        {extensions.map(ext => (
          <option key={ext.id} value={String(ext.extension)}>{extLabel(ext)}</option>
        ))}
      </select>
      <p className="text-[11px] text-slate-400 mt-1.5">{extensions.length} agent{extensions.length !== 1 ? 's' : ''} available</p>
      {extensions.length === 0 && <EmptyHint message="No extensions found. Please create an extension first." />}
    </div>
  )

  if (destType === 'ivr') return (
    <div className="form-group">
      <label className="label">Select IVR Menu <span className="text-red-500">*</span></label>
      <select className="input" value={ivr_id} onChange={e => onChange('ivr_id', e.target.value)} disabled={loadingIvrs}>
        <option value="">{loadingIvrs ? 'Loading IVR menus…' : '— Select an IVR menu —'}</option>
        {ivrs.map(ivr => (
          <option key={ivr.ivr_id} value={String(ivr.ivr_id)}>
            {ivr.ivr_desc || ivr.ann_id || ivr.ivr_id}
          </option>
        ))}
      </select>
      {!loadingIvrs && ivrs.length > 0 && (
        <p className="text-[11px] text-slate-400 mt-1.5">{ivrs.length} IVR menu{ivrs.length !== 1 ? 's' : ''} available</p>
      )}
      {!loadingIvrs && ivrs.length === 0 && <EmptyHint message="No IVRs found. Please create an IVR first." />}
    </div>
  )

  if (destType === 'queue') return (
    <div className="form-group">
      <label className="label">Select Ring Group / Queue <span className="text-red-500">*</span></label>
      <select className="input" value={ingroup} onChange={e => onChange('ingroup', e.target.value)} disabled={loadingRingGroups}>
        <option value="">{loadingRingGroups ? 'Loading ring groups…' : '— Select a ring group —'}</option>
        {ringGroups.map(rg => (
          <option key={rg.id} value={String(rg.id)}>
            {rgLabel(rg)}
          </option>
        ))}
      </select>
      {!loadingRingGroups && ringGroups.length > 0 && (
        <p className="text-[11px] text-slate-400 mt-1.5">{ringGroups.length} ring group{ringGroups.length !== 1 ? 's' : ''} available</p>
      )}
      {!loadingRingGroups && ringGroups.length === 0 && <EmptyHint message="No ring groups found. Please create one first." />}
    </div>
  )

  if (destType === 'voicemail') return (
    <div className="form-group">
      <label className="label">Voicemail Box <span className="text-red-500">*</span></label>
      <select className="input" value={voicemail_id} onChange={e => onChange('voicemail_id', e.target.value)}>
        <option value="">— Select an agent / extension —</option>
        {extensions.map(ext => (
          <option key={ext.id} value={String(ext.extension)}>{extLabel(ext)}</option>
        ))}
      </select>
      <p className="text-[11px] text-slate-400 mt-1.5">Callers go directly to this agent's voicemail box</p>
      {extensions.length === 0 && <EmptyHint message="No extensions found. Please create an extension first." />}
    </div>
  )

  if (destType === 'external') {
    const digits = forward_number.replace(/\D/g, '')
    return (
      <div className="form-group">
        <label className="label">Forward To Number <span className="text-red-500">*</span></label>
        <input
          className="input font-mono"
          value={forward_number}
          onChange={e => onChange('forward_number', formatUSPhone(e.target.value))}
          placeholder="(XXX) XXX-XXXX"
          maxLength={14}
          inputMode="numeric"
        />
        <p className={cn('text-[11px] mt-1.5', digits.length === 10 ? 'text-emerald-600' : 'text-slate-400')}>
          {digits.length}/10 digits{digits.length === 10 ? ' ✓' : ' · US format (XXX) XXX-XXXX'}
        </p>
      </div>
    )
  }

  return null
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DidForm() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const isEdit     = Boolean(id)
  // Scope all lookup queries to the current client so switching tenants
  // never serves another client's agents/IVRs/groups from the cache.
  const clientId   = useAuthStore(s => s.user?.parent_id)
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [formPopulated, setFormPopulated] = useState(!isEdit)
  const didPopulateForId = useRef<string | undefined>(undefined)

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['did', id],
    queryFn: async () => {
      const res = await didService.getById(Number(id))
      const d = res.data?.data ?? res.data
      return (Array.isArray(d) ? d[0] : d) as Record<string, unknown> | null
    },
    enabled: isEdit,
  })
  const { data: extensionsData, isLoading: loadingExtensions } = useQuery({
    queryKey: ['extensions', clientId],
    queryFn:  () => didService.getExtensions(),
  })
  const { data: ivrData, isLoading: loadingIvrs } = useQuery({
    queryKey: ['ivr-list-dropdown', clientId],
    queryFn:  () => didService.getIvrList(),
  })
  const { data: ringGroupData, isLoading: loadingRingGroups } = useQuery({
    queryKey: ['ringgroup-list-dropdown', clientId],
    queryFn:  () => didService.getRingGroups(),
  })
  const { data: deptData } = useQuery({
    queryKey: ['department-list', clientId],
    queryFn:  () => didService.getDepartments(),
  })

  const extRaw    = (extensionsData as { data?: unknown })?.data
  const extensions: ExtItem[]  = Array.isArray(extRaw)
    ? (extRaw as ExtItem[])
    : ((extRaw as { data?: ExtItem[] })?.data ?? [])

  const ivrRaw    = (ivrData       as { data?: unknown })?.data
  const ivrs:       IvrItem[]  = Array.isArray(ivrRaw)
    ? (ivrRaw as IvrItem[])
    : ((ivrRaw as { data?: IvrItem[] })?.data ?? [])

  const rgRaw     = (ringGroupData as { data?: unknown })?.data
  const ringGroups: RingItem[] = Array.isArray(rgRaw)
    ? (rgRaw as RingItem[])
    : ((rgRaw as { data?: RingItem[] })?.data ?? [])

  const deptRaw  = (deptData as { data?: unknown })?.data
  const departments: DeptItem[] = Array.isArray(deptRaw)
    ? (deptRaw as DeptItem[])
    : ((deptRaw as { data?: DeptItem[] })?.data ?? [])

  // ── Populate form on edit ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !existing || typeof existing !== 'object') return
    if (didPopulateForId.current === id) return
    if (loadingExtensions || loadingIvrs || loadingRingGroups) return

    const d = existing as Record<string, unknown>

    console.log('[DID Edit] raw API record keys:', Object.keys(d))
    console.log('[DID Edit] raw API record:', JSON.stringify(d, null, 2))

    const toStr = (v: unknown): string => {
      if (v === null || v === undefined || v === '') return 'extension'
      if (typeof v === 'number') return DEST_TYPE_FROM_NUM[v] ?? 'extension'
      const n = Number(v)
      if (!isNaN(n) && DEST_TYPE_FROM_NUM[n] !== undefined) return DEST_TYPE_FROM_NUM[n]
      return String(v).toLowerCase() || 'extension'
    }

    const toBool = (v: unknown): 0 | 1 =>
      (v === 1 || v === '1' || v === true || v === 'true' ? 1 : 0)

    const resolveRg = (rawVal: unknown): string => {
      const raw = String(rawVal ?? '')
      if (!raw) return ''
      if (ringGroups.find(r => String(r.id) === raw)) return raw
      const byTitle = ringGroups.find(r => String(r.title || r.name || '') === raw)
      return byTitle ? String(byTitle.id) : raw
    }

    const resolveExtension = (val: unknown): string => {
      if (!val && val !== false) return ''
      const raw = String(val).trim()
      if (!raw || raw === '0') return ''
      if (extensions.find(e => String(e.extension) === raw)) return raw
      const byId = extensions.find(e => String(e.id) === raw)
      return byId ? String(byId.extension) : raw
    }

    const mainDestType = toStr(d.dest_type)
    const oohDestType  = toStr(d.dest_type_ooh)

    const dest = d.destination

    const rawExt = (
      d.extension       || d.extension_id    || d.ext_number     ||
      d.destination_extension || d.agent_id  ||
      d.ext_no          || d.sip_extension   || d.ext_id         ||
      (mainDestType === 'extension' ? dest : null)
    ) || null

    const rawVm = (
      d.voicemail_id || d.vm_id || d.voicemail ||
      (mainDestType === 'voicemail' ? dest : null)
    ) || null

    const resolvedIvrId = String(
      d.ivr_id ?? (mainDestType === 'ivr' ? dest : '') ?? ''
    )

    const resolvedIngroup = resolveRg(
      d.ingroup ?? (mainDestType === 'queue' ? dest : null)
    )

    const resolvedForward = String(
      d.forward_number ?? (mainDestType === 'external' ? dest : '') ?? ''
    )

    const rawExtOoh = (
      d.extension_ooh    || d.extension_id_ooh || d.ext_number_ooh ||
      d.user_id_ooh      || d.agent_id_ooh     || d.dest_id_ooh    ||
      d.destination_ooh  || d.ext_ooh
    ) || null

    const rawVmOoh = (
      d.voicemail_id_ooh || d.vm_id_ooh || d.voicemail_ooh ||
      (oohDestType === 'voicemail' ? (d.extension_ooh || d.user_id_ooh) : null)
    ) || null

    const resolvedSmsUserId = String(d.assigned_user_id ?? d.sms_email ?? '')

    const deptId = String(d.call_time_department_id ?? '')
    const rawAudioOpt = String(d.ivr_audio_option ?? '')
    const screeningMode = ['upload', 'speech'].includes(rawAudioOpt) ? rawAudioOpt : 'ivr'

    setForm({
      cli:            String(d.cli            ?? ''),
      cnam:           String(d.cnam           ?? ''),
      dest_type:      mainDestType,
      extension:      resolveExtension(rawExt),
      ivr_id:         resolvedIvrId,
      voicemail_id:   resolveExtension(rawVm),
      ingroup:        resolvedIngroup,
      forward_number: resolvedForward,
      operator:       String(d.operator       ?? d.voip_provider ?? ''),
      sms:            toBool(d.sms ?? d.is_sms ?? d.sms_enabled),
      sms_user_id:    resolvedSmsUserId,
      default_did:    toBool(d.default_did ?? d.is_default ?? d.default),
      call_time_enabled:       deptId && deptId !== '0' ? 1 : 0,
      call_time_department_id: deptId === '0' ? '' : deptId,
      call_time_holiday:       toBool(d.call_time_holiday),
      call_screening_status:   toBool(d.call_screening_status),
      call_screening_mode:     screeningMode,
      call_screening_ivr_id:   String(d.call_screening_ivr_id ?? ''),
      speech_text:             String(d.speech_text   ?? ''),
      language:                String(d.language      ?? 'en-US'),
      voice_name:              String(d.voice_name    ?? 'Joanna'),
      redirect_last_agent:     toBool(d.redirect_last_agent),
      dest_type_ooh:      oohDestType,
      extension_ooh:      resolveExtension(rawExtOoh),
      ivr_id_ooh:         String(d.ivr_id_ooh         ?? ''),
      voicemail_id_ooh:   resolveExtension(rawVmOoh),
      ingroup_ooh:        resolveRg(d.ingroup_ooh),
      forward_number_ooh: String(d.forward_number_ooh ?? ''),
    })
    didPopulateForId.current = id
    setFormPopulated(true)
  }, [existing, extensions, ringGroups, loadingExtensions, loadingIvrs, loadingRingGroups, id, isEdit])

  // ── Save mutation ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const destNum    = DEST_TYPE_TO_NUM[form.dest_type]    ?? 1
      const destNumOoh = DEST_TYPE_TO_NUM[form.dest_type_ooh] ?? 1

      const toExtNum = (val: string): string => {
        if (!val) return ''
        if (extensions.find(e => String(e.extension) === val)) return val
        const byId = extensions.find(e => String(e.id) === val)
        return byId ? String(byId.extension) : val
      }

      const oohEnabled = Boolean(form.call_time_holiday)

      const rawDigits = form.cli.replace(/\D/g, '')
      const cliValue = !isEdit && rawDigits.length === 10 ? `+1${rawDigits}` : form.cli

      const payload: Record<string, unknown> = {
        cli: cliValue, cnam: form.cnam,
        area_code: '', country_code: '',

        dest_type:      destNum,
        ivr_id:         destNum === 0 ? form.ivr_id             : '',
        extension:      destNum === 1 ? toExtNum(form.extension)      : '',
        voicemail_id:   destNum === 2 ? toExtNum(form.voicemail_id)   : '',
        forward_number: destNum === 4 ? form.forward_number : '',
        conf_id:        '',
        ingroup:        destNum === 8 ? form.ingroup         : '',

        operator:         form.operator,
        operator_check:   form.operator,
        voip_provider:    form.operator,
        phone_number_sid: '',

        sms: form.sms, is_sms: form.sms,
        sms_phone: '',
        sms_email: form.sms ? form.sms_user_id : '',
        sms_type: 0,
        default_did: form.default_did,

        call_screening_status: form.call_screening_status,
        call_screening_ivr_id: form.call_screening_status && oohEnabled && form.call_screening_mode === 'ivr'
          ? form.call_screening_ivr_id : '',
        ivr_audio_option: form.call_screening_status && oohEnabled ? form.call_screening_mode : '',
        speech_text:  form.call_screening_status && oohEnabled && form.call_screening_mode === 'speech' ? form.speech_text  : '',
        language:     form.call_screening_status && oohEnabled && form.call_screening_mode === 'speech' ? form.language     : '',
        voice_name:   form.call_screening_status && oohEnabled && form.call_screening_mode === 'speech' ? form.voice_name   : '',
        prompt_option: 0,

        redirect_last_agent: form.redirect_last_agent,

        dest_type_ooh:      oohEnabled ? destNumOoh : 1,
        ivr_id_ooh:         oohEnabled && destNumOoh === 0 ? form.ivr_id_ooh         : '',
        extension_ooh:      oohEnabled && destNumOoh === 1 ? toExtNum(form.extension_ooh)    : '',
        voicemail_id_ooh:   oohEnabled && destNumOoh === 2 ? toExtNum(form.voicemail_id_ooh) : '',
        forward_number_ooh: oohEnabled && destNumOoh === 4 ? form.forward_number_ooh : '',
        conf_id_ooh:        '',
        ingroup_ooh:        oohEnabled && destNumOoh === 8 ? form.ingroup_ooh : '',

        call_time_department_id: form.call_time_enabled ? form.call_time_department_id : 0,
        call_time_holiday:       form.call_time_enabled ? form.call_time_holiday        : 0,
      }
      if (isEdit) payload.did_id = Number(id)

      if (form.call_screening_status && oohEnabled && form.call_screening_mode === 'upload' && audioFile) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v ?? '')))
        fd.append('audio_file', audioFile)
        return isEdit ? didService.update(fd) : didService.create(fd)
      }

      return isEdit ? didService.update(payload) : didService.create(payload)
    },
    onSuccess: (res) => {
      const succeeded = res?.data?.success
      if (succeeded === false || succeeded === 'false' || succeeded === 0) {
        const errArr   = res?.data?.errors
        const firstErr = Array.isArray(errArr) && errArr.length > 0 ? String(errArr[0]) : null
        const isTech   = firstErr
          ? /SQLSTATE|Exception|Traceback|stack trace|at line \d|mysqli|PDO|undefined|null|Fatal/i.test(firstErr)
          : true
        const fallback = isEdit ? 'Unable to update DID.' : 'Unable to add DID.'
        toast.error((!isTech && firstErr && firstErr.length <= 120) ? firstErr : fallback)
        return
      }
      toast.success(isEdit ? 'DID updated' : 'DID added')
      navigate('/dids')
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } }).response?.status
      if (!status || (status !== 403 && status !== 422 && status < 500)) {
        toast.error(isEdit ? 'Unable to update DID.' : 'Unable to add DID.')
      }
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const set = (key: keyof FormState, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const switchDestType = (val: string) =>
    setForm(f => ({ ...f, dest_type: val, extension: '', ivr_id: '', voicemail_id: '', ingroup: '', forward_number: '' }))

  const switchDestTypeOoh = (val: string) =>
    setForm(f => ({ ...f, dest_type_ooh: val, extension_ooh: '', ivr_id_ooh: '', voicemail_id_ooh: '', ingroup_ooh: '', forward_number_ooh: '' }))

  function handleSave() {
    if (!isEdit) {
      const rawDigits = form.cli.replace(/\D/g, '')
      if (rawDigits.length !== 10) {
        toast.error('Enter a valid 10-digit US phone number (e.g. 2125551234).')
        return
      }
    }
    if (!form.operator)    { toast.error('Please select a VoIP provider.'); return }
    if (!form.redirect_last_agent) {
      if (form.dest_type === 'extension' && !form.extension)            { toast.error('Please select a target extension.'); return }
      if (form.dest_type === 'ivr'       && !form.ivr_id)               { toast.error('Please select an IVR.'); return }
      if (form.dest_type === 'queue'     && !form.ingroup)              { toast.error('Please select a ring group / queue.'); return }
      if (form.dest_type === 'voicemail' && !form.voicemail_id)         { toast.error('Please select an extension for voicemail.'); return }
      if (form.dest_type === 'external') {
        if (!form.forward_number.trim()) { toast.error('Please enter the external forward number.'); return }
        if (form.forward_number.replace(/\D/g, '').length !== 10) { toast.error('External number must be exactly 10 digits.'); return }
      }
    }
    if (Boolean(form.call_time_holiday) && form.dest_type_ooh === 'external') {
      if (!form.forward_number_ooh.trim()) { toast.error('Please enter the out-of-hours external forward number.'); return }
      if (form.forward_number_ooh.replace(/\D/g, '').length !== 10) { toast.error('Out-of-hours external number must be exactly 10 digits.'); return }
    }
    const screeningActive = Boolean(form.call_screening_status) && Boolean(form.call_time_holiday)
    if (screeningActive) {
      if (form.call_screening_mode === 'ivr' && !form.call_screening_ivr_id) {
        toast.error('Please select an IVR announcement for call screening.'); return
      }
      if (form.call_screening_mode === 'upload' && !audioFile && !isEdit) {
        toast.error('Please upload an audio file for call screening.'); return
      }
      if (form.call_screening_mode === 'speech' && !form.speech_text.trim()) {
        toast.error('Please enter the screening message text.'); return
      }
    }
    saveMutation.mutate()
  }

  if (isEdit && (loadingExisting || !formPopulated || loadingExtensions || loadingIvrs || loadingRingGroups)) return <PageLoader />

  const holidayActive = Boolean(form.call_time_holiday)

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/dids')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">{isEdit ? 'Edit Phone Number' : 'Add Phone Number'}</h1>
        </div>
      </div>

      {/* ── Vertical form sections ── */}
      <div className="space-y-4">

        {/* ─── Section 1: Phone Identity ─── */}
        <div className="card p-5 space-y-5">
          <SectionHead icon={PhoneIncoming} title="Phone Identity" sub="Set the phone number, caller ID, and provider" step={1} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="label">
                Phone Number (CLI) <span className="text-red-500">*</span>
              </label>
              <input
                className={cn('input font-mono', isEdit && 'bg-slate-50 text-slate-500 cursor-not-allowed')}
                value={form.cli}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  set('cli', digits)
                }}
                placeholder="2125551234"
                disabled={isEdit}
                maxLength={10}
                inputMode="numeric"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                {isEdit
                  ? 'Cannot be changed after creation'
                  : 'Enter 10-digit US number without country code (e.g. 2125551234)'}
              </p>
            </div>
            <div className="form-group mb-0">
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

          {/* Provider */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              VoIP Provider <span className="text-red-500 normal-case font-normal">*</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {OPERATORS.map(op => {
                const active = form.operator === op.value
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => set('operator', active ? '' : op.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all select-none cursor-pointer',
                      active
                        ? `${op.active} shadow-sm`
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                    )}
                  >
                    <span className={cn('w-3.5 h-3.5 rounded-full shadow-sm', op.dot)} />
                    <span className={cn('text-xs font-bold', active ? '' : 'text-slate-600')}>{op.label}</span>
                    {active && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 size={11} className={op.check} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5">Click to select. Click again to deselect.</p>
          </div>
        </div>

        {/* ─── Section 2: Call Routing ─── */}
        <div className="card p-5 space-y-5">
          <SectionHead icon={GitBranch} title="Call Routing" sub="Configure where inbound calls are directed" step={2} />

          <Toggle
            checked={Boolean(form.redirect_last_agent)}
            onChange={v => set('redirect_last_agent', v ? 1 : 0)}
            label="Redirect to Last Spoken"
            description="Reconnect callers with the last agent they spoke with on this number"
            icon={History}
            accent="indigo"
          />

          {!Boolean(form.redirect_last_agent) ? (
            <div className="space-y-5">
              <div>
                <label className="label mb-3">Routing Type</label>
                <RoutingCards value={form.dest_type} onChange={switchDestType} />
              </div>
              <RoutingTarget
                destType={form.dest_type}
                extension={form.extension} ivr_id={form.ivr_id}
                voicemail_id={form.voicemail_id} ingroup={form.ingroup}
                forward_number={form.forward_number}
                extensions={extensions} ivrs={ivrs} ringGroups={ringGroups}
                loadingIvrs={loadingIvrs} loadingRingGroups={loadingRingGroups}
                onChange={(key, val) => set(key as keyof FormState, val)}
              />
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <History size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700 leading-relaxed">
                <span className="font-bold">Redirect to Last Spoken is active.</span> Calls will automatically route to the last agent the caller spoke with. Disable the toggle above to configure manual routing.
              </p>
            </div>
          )}
        </div>

        {/* ─── Section 3: Features ─── */}
        <div className="card p-5 space-y-5">
          <SectionHead icon={Star} title="Features" sub="Enable optional features for this number" step={3} />

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

          {Boolean(form.sms) && (
            <div className="form-group mb-0">
              <label className="label">Assign SMS to User</label>
              <select
                className="input"
                value={form.sms_user_id}
                onChange={e => set('sms_user_id', e.target.value)}
              >
                <option value="">— Select a user —</option>
                {extensions.map(ext => {
                  const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                  return (
                    <option key={ext.id} value={String(ext.id)}>
                      {name || `User #${ext.id}`}
                    </option>
                  )
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">Incoming SMS for this number will be routed to this user</p>
              {extensions.length === 0 && <EmptyHint message="No users found." />}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Toggle
              checked={Boolean(form.call_time_enabled)}
              onChange={v => set('call_time_enabled', v ? 1 : 0)}
              label="Call Times"
              description="Enforce business-hours routing for this number"
              icon={Clock}
              accent="indigo"
            />
            <Toggle
              checked={Boolean(form.call_time_holiday)}
              onChange={v => set('call_time_holiday', v ? 1 : 0)}
              label="Holiday Calendar"
              description="Apply out-of-hours routing on configured holidays"
              icon={Clock}
              accent="amber"
            />
          </div>

          {Boolean(form.call_time_enabled) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="form-group mb-0">
                <label className="label">Business Hours Schedule</label>
                <select
                  className="input"
                  value={form.call_time_department_id}
                  onChange={e => set('call_time_department_id', e.target.value)}
                >
                  <option value="">— Select a schedule / department —</option>
                  {departments.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
                {departments.length === 0 && <EmptyHint message="No call-time schedules found. Create one under Call Timings first." />}
              </div>
            </div>
          )}

          {holidayActive && (<>
            <Toggle
              checked={Boolean(form.call_screening_status)}
              onChange={v => set('call_screening_status', v ? 1 : 0)}
              label="Call Screening"
              description="Play a prompt to announce the caller before connecting"
              icon={PhoneCall}
              accent="indigo"
            />

            {Boolean(form.call_screening_status) && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <label className="label mb-2">Screening Method</label>
                  <div className="flex gap-2">
                    {([
                      { value: 'ivr',    label: 'Use IVR',      Icon: GitBranch },
                      { value: 'upload', label: 'Upload Audio',  Icon: Upload },
                      { value: 'speech', label: 'Text-to-Audio', Icon: Mic },
                    ] as const).map(m => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set('call_screening_mode', m.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all',
                          form.call_screening_mode === m.value
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <m.Icon size={12} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.call_screening_mode === 'ivr' && (
                  <div className="form-group mb-0">
                    <label className="label">IVR Announcement <span className="text-red-500">*</span></label>
                    <select
                      className="input"
                      value={form.call_screening_ivr_id}
                      onChange={e => set('call_screening_ivr_id', e.target.value)}
                      disabled={loadingIvrs}
                    >
                      <option value="">{loadingIvrs ? 'Loading IVRs…' : '— Select an IVR announcement —'}</option>
                      {ivrs.map(ivr => (
                        <option key={ivr.ivr_id} value={String(ivr.ivr_id)}>
                          {ivr.ivr_desc || ivr.ann_id || ivr.ivr_id}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1.5">Caller hears this IVR; agent hears caller name before accepting</p>
                    {!loadingIvrs && ivrs.length === 0 && <EmptyHint message="No IVRs found. Create an IVR menu first." />}
                  </div>
                )}

                {form.call_screening_mode === 'upload' && (
                  <div className="form-group mb-0">
                    <label className="label">Upload Screening Audio {!isEdit && <span className="text-red-500">*</span>}</label>
                    <label className={cn(
                      'mt-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                      audioFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                    )}>
                      <Upload size={16} className={audioFile ? 'text-indigo-500' : 'text-slate-400'} />
                      <span className={cn('text-xs font-medium flex-1 truncate', audioFile ? 'text-indigo-700' : 'text-slate-500')}>
                        {audioFile ? audioFile.name : 'Choose audio file (mp3, wav, ogg)…'}
                      </span>
                      {audioFile && (
                        <button type="button" onClick={e => { e.preventDefault(); setAudioFile(null) }} className="text-slate-400 hover:text-red-500 text-xs flex-shrink-0">
                          Remove
                        </button>
                      )}
                      <input type="file" accept=".mp3,.wav,.ogg" className="sr-only" onChange={e => setAudioFile(e.target.files?.[0] ?? null)} />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {isEdit ? 'Leave empty to keep existing audio. Upload to replace.' : 'Audio is played when a call connects to this number.'}
                    </p>
                  </div>
                )}

                {form.call_screening_mode === 'speech' && (
                  <div className="space-y-3">
                    <div className="form-group mb-0">
                      <label className="label">Screening Message <span className="text-red-500">*</span></label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        value={form.speech_text}
                        onChange={e => set('speech_text', e.target.value)}
                        placeholder="e.g. You have a call from a new customer. Press 1 to accept."
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">This text will be converted to speech and played to the caller</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="form-group mb-0">
                        <label className="label">Language</label>
                        <select className="input" value={form.language} onChange={e => set('language', e.target.value)}>
                          <option value="en-US">English (US)</option>
                          <option value="en-GB">English (UK)</option>
                          <option value="es-ES">Spanish</option>
                          <option value="fr-FR">French</option>
                          <option value="de-DE">German</option>
                          <option value="pt-BR">Portuguese (BR)</option>
                        </select>
                      </div>
                      <div className="form-group mb-0">
                        <label className="label">Voice</label>
                        <select className="input" value={form.voice_name} onChange={e => set('voice_name', e.target.value)}>
                          <option value="Joanna">Joanna (Female)</option>
                          <option value="Matthew">Matthew (Male)</option>
                          <option value="Amy">Amy (Female, UK)</option>
                          <option value="Brian">Brian (Male, UK)</option>
                          <option value="Salli">Salli (Female)</option>
                          <option value="Joey">Joey (Male)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>)}
        </div>

        {/* ─── Section 4: Out of Hours ─── */}
        <div className="card p-5 space-y-5">
          <SectionHead icon={Clock} title="Out of Hours" sub="Routing applied outside business hours on holidays" step={4} />

          {holidayActive ? (
            <div className="space-y-5">
              <div>
                <label className="label mb-3">Out-of-Hours Routing Type</label>
                <RoutingCards value={form.dest_type_ooh} onChange={switchDestTypeOoh} />
              </div>
              <RoutingTarget
                destType={form.dest_type_ooh}
                extension={form.extension_ooh} ivr_id={form.ivr_id_ooh}
                voicemail_id={form.voicemail_id_ooh} ingroup={form.ingroup_ooh}
                forward_number={form.forward_number_ooh}
                extensions={extensions} ivrs={ivrs} ringGroups={ringGroups}
                loadingIvrs={loadingIvrs} loadingRingGroups={loadingRingGroups}
                onChange={(key, val) => set(`${key}_ooh` as keyof FormState, val)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Lock size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1.5">Holiday Calendar Required</p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Enable the <span className="font-medium text-slate-500">Holiday Calendar</span> toggle
                in the Features section above to unlock out-of-hours routing.
              </p>
            </div>
          )}
        </div>

        {/* ─── Save / Cancel ─── */}
        <div className="flex items-center justify-end gap-2 pb-2">
          <button type="button" onClick={() => navigate('/dids')} className="btn-outline px-5">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-1.5 px-5"
          >
            {saveMutation.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : isEdit ? 'Save Changes' : 'Add DID'
            }
          </button>
        </div>

      </div>
    </div>
  )
}
