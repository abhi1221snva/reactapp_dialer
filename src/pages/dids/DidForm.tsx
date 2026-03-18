import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, Phone, ArrowRight, User, GitBranch, Users,
  Voicemail, ExternalLink, MessageSquare, Star, Loader2,
  Building2, CheckCircle2, PhoneCall, AlertCircle, Clock, ChevronDown,
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
  default_did: number
  // Out-of-hours routing
  dest_type_ooh: string
  extension_ooh: string
  ivr_id_ooh: string
  voicemail_id_ooh: string
  ingroup_ooh: string
  forward_number_ooh: string
}

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
  sms: 0, default_did: 0,
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
            {/* Icon */}
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all flex-shrink-0',
              active
                ? 'bg-white/20'
                : `bg-gradient-to-br ${dt.gradient}`
            )}>
              <dt.Icon size={20} className={active ? 'text-white' : 'text-white'} />
            </div>
            {/* Label + desc */}
            <div>
              <p className={cn('text-xs font-bold leading-none', active ? 'text-white' : 'text-slate-700')}>
                {dt.label}
              </p>
              <p className={cn('text-[10px] mt-1 leading-snug', active ? 'text-white/70' : 'text-slate-400')}>
                {dt.desc}
              </p>
            </div>
            {/* Selected indicator */}
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

// ─── Live preview sidebar ─────────────────────────────────────────────────────

function PreviewCard({ form, extensions, ivrs, ringGroups }: {
  form: FormState
  extensions: ExtItem[]
  ivrs: IvrItem[]
  ringGroups: RingItem[]
}) {
  const destCfg    = DEST_TYPES.find(d => d.value === form.dest_type)    ?? DEST_TYPES[0]
  const destCfgOoh = DEST_TYPES.find(d => d.value === form.dest_type_ooh) ?? DEST_TYPES[0]
  const opCfg      = OPERATORS.find(o => o.value === form.operator)

  function resolveTarget(type: string, ext: string, ivr: string, queue: string, vm: string, fwd: string) {
    if (type === 'extension') {
      const e = extensions.find(x => String(x.id) === String(ext))
      return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || `Ext ${e.extension}`) : (ext ? `Ext ${ext}` : '')
    }
    if (type === 'ivr') {
      const i = ivrs.find(x => String(x.ivr_id) === String(ivr))
      return i ? (i.ivr_desc || i.ann_id || i.ivr_id) : ivr
    }
    if (type === 'queue') {
      const r = ringGroups.find(x => String(x.id) === String(queue))
      return r ? (r.title || r.name || `Group #${r.id}`) : queue
    }
    if (type === 'voicemail') {
      const e = extensions.find(x => String(x.id) === String(vm))
      return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || `Ext ${e.extension}`) + ' (VM)' : (vm ? `Ext ${vm} (VM)` : '')
    }
    if (type === 'external') return fwd ? formatPhoneNumber(fwd) : ''
    return ''
  }

  const destTarget = resolveTarget(
    form.dest_type, form.extension, form.ivr_id, form.ingroup, form.voicemail_id, form.forward_number
  )
  const oohTarget = resolveTarget(
    form.dest_type_ooh, form.extension_ooh, form.ivr_id_ooh, form.ingroup_ooh, form.voicemail_id_ooh, form.forward_number_ooh
  )

  const hasNumber = form.cli.trim().length > 0

  const checkItems = [
    { label: 'Phone number entered',  done: hasNumber },
    { label: 'Routing type selected', done: true },
    {
      label: 'Routing target set', done: (
        (form.dest_type === 'extension' && !!form.extension)  ||
        (form.dest_type === 'ivr'       && !!form.ivr_id)     ||
        (form.dest_type === 'queue'     && !!form.ingroup)     ||
        (form.dest_type === 'voicemail' && !!form.voicemail_id)||
        (form.dest_type === 'external'  && !!form.forward_number.trim())
      ),
    },
    { label: 'Provider selected', done: form.operator.length > 0 },
  ]
  const allDone = checkItems.every(c => c.done)

  return (
    <div className="sticky top-6 space-y-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Preview</p>

      {/* DID card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', destCfg.gradient)}>
            <Phone size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('font-mono font-black text-lg leading-tight', hasNumber ? 'text-white' : 'text-slate-600')}>
              {hasNumber ? formatPhoneNumber(form.cli) : '+1 (___) ___-____'}
            </p>
            <p className={cn('text-xs mt-0.5', form.cnam ? 'text-slate-400' : 'text-slate-600 italic')}>
              {form.cnam || 'No caller ID name set'}
            </p>
          </div>
        </div>

        {/* Routing */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
            <div className={cn('w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', destCfg.gradient)}>
              <destCfg.Icon size={11} className="text-white" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Route</span>
            <span className="text-[11px] text-slate-300 font-semibold">{destCfg.label}</span>
            {destTarget && (
              <>
                <ArrowRight size={9} className="text-slate-600" />
                <span className="text-[11px] font-bold text-slate-200 truncate">{destTarget}</span>
              </>
            )}
          </div>

          {/* OOH routing (only if configured differently) */}
          {form.dest_type_ooh && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
              <div className={cn('w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', destCfgOoh.gradient)}>
                <Clock size={11} className="text-white" />
              </div>
              <span className="text-[11px] text-slate-400 font-medium">OOH</span>
              <span className="text-[11px] text-slate-300 font-semibold">{destCfgOoh.label}</span>
              {oohTarget && (
                <>
                  <ArrowRight size={9} className="text-slate-600" />
                  <span className="text-[11px] font-bold text-slate-200 truncate">{oohTarget}</span>
                </>
              )}
            </div>
          )}

          {opCfg && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
              <Building2 size={13} className="text-slate-500" />
              <span className="text-[11px] text-slate-400 font-medium">Provider</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className={cn('w-2 h-2 rounded-full', opCfg.dot)} />
                <span className="text-[11px] font-bold text-slate-200 capitalize">{opCfg.label}</span>
              </div>
            </div>
          )}
        </div>

        {(form.sms || form.default_did) && (
          <div className="flex flex-wrap gap-2 mt-3">
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
        )}
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
  // Helper: "John Doe (Ext 1001)"
  const extLabel = (ext: ExtItem) => {
    const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
    return name ? `${name}  (Ext ${ext.extension})` : `Ext ${ext.extension}`
  }

  // Helper: ring group label with agent names
  const rgLabel = (rg: RingItem) => {
    const title = rg.title || rg.name || `Group #${rg.id}`
    if (rg.extension_name) {
      // extension_name = "John Doe-1001,Jane Smith-1002" — strip ext numbers for brevity
      const agents = rg.extension_name
        .split(',')
        .map(s => s.replace(/-\d+$/, '').trim())
        .filter(Boolean)
        .slice(0, 3) // cap at 3 names
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
          <option key={ext.id} value={String(ext.id)}>{extLabel(ext)}</option>
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
          <option key={ext.id} value={String(ext.id)}>{extLabel(ext)}</option>
        ))}
      </select>
      <p className="text-[11px] text-slate-400 mt-1.5">Callers go directly to this agent's voicemail box</p>
      {extensions.length === 0 && <EmptyHint message="No extensions found. Please create an extension first." />}
    </div>
  )

  if (destType === 'external') return (
    <div className="form-group">
      <label className="label">Forward To Number <span className="text-red-500">*</span></label>
      <input
        className="input font-mono"
        value={forward_number}
        onChange={e => onChange('forward_number', e.target.value)}
        placeholder="+1XXXXXXXXXX"
      />
      <p className="text-[11px] text-slate-400 mt-1.5">Enter the full number including country code</p>
    </div>
  )

  return null
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DidForm() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const isEdit     = Boolean(id)
  const [form, setForm]         = useState<FormState>(DEFAULT_FORM)
  const [oohOpen, setOohOpen]   = useState(false)
  // Prevents rendering with DEFAULT_FORM values before API data is applied.
  // Create mode is immediately ready; edit mode waits for the useEffect to run.
  const [formPopulated, setFormPopulated] = useState(!isEdit)
  // Tracks which DID ID has been populated so re-runs (from dependency changes) don't overwrite user edits.
  const didPopulateForId = useRef<string | undefined>(undefined)

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['did', id],
    queryFn: async () => {
      const res = await didService.getById(Number(id))
      // Backend may return { data: {...} } or { data: [{...}] } — unwrap to the record
      const d = res.data?.data ?? res.data
      return (Array.isArray(d) ? d[0] : d) as Record<string, unknown> | null
    },
    enabled: isEdit,
  })
  const { data: extensionsData, isLoading: loadingExtensions } = useQuery({
    queryKey: ['extensions'],
    queryFn:  () => didService.getExtensions(),
  })
  const { data: ivrData, isLoading: loadingIvrs } = useQuery({
    queryKey: ['ivr-list-dropdown'],
    queryFn:  () => didService.getIvrList(),
  })
  const { data: ringGroupData, isLoading: loadingRingGroups } = useQuery({
    queryKey: ['ringgroup-list-dropdown'],
    queryFn:  () => didService.getRingGroups(),
  })

  // GET /extension may return { data: [...] } (flat) while POST endpoints return { data: { data: [...] } }
  const extRaw    = (extensionsData as { data?: unknown })?.data
  const extensions: ExtItem[]  = Array.isArray(extRaw)
    ? (extRaw as ExtItem[])
    : ((extRaw as { data?: ExtItem[] })?.data ?? [])

  // Same flat/nested detection applied to IVR and ring-group endpoints
  const ivrRaw    = (ivrData       as { data?: unknown })?.data
  const ivrs:       IvrItem[]  = Array.isArray(ivrRaw)
    ? (ivrRaw as IvrItem[])
    : ((ivrRaw as { data?: IvrItem[] })?.data ?? [])

  const rgRaw     = (ringGroupData as { data?: unknown })?.data
  const ringGroups: RingItem[] = Array.isArray(rgRaw)
    ? (rgRaw as RingItem[])
    : ((rgRaw as { data?: RingItem[] })?.data ?? [])

  // ── Populate form on edit ────────────────────────────────────────────────────
  // Wait for ALL dropdown data before populating so resolvers have the full lists.
  // The ref guard prevents re-population after user starts editing.
  useEffect(() => {
    if (!isEdit || !existing || typeof existing !== 'object') return
    if (didPopulateForId.current === id) return // already populated — preserve user edits
    if (loadingExtensions || loadingIvrs || loadingRingGroups) return // wait for all lists

    const d = existing as Record<string, unknown>

    // Map numeric dest_type from DB (0=ivr,1=ext,2=vm,4=ext,8=queue) to string key.
    const toStr = (v: unknown): string => {
      if (v === null || v === undefined || v === '') return 'extension'
      if (typeof v === 'number') return DEST_TYPE_FROM_NUM[v] ?? 'extension'
      const n = Number(v)
      if (!isNaN(n) && DEST_TYPE_FROM_NUM[n] !== undefined) return DEST_TYPE_FROM_NUM[n]
      return String(v).toLowerCase() || 'extension'
    }

    // Strict bool — handles number 1, string "1", boolean true.
    const toBool = (v: unknown): 0 | 1 =>
      (v === 1 || v === '1' || v === true || v === 'true' ? 1 : 0)

    // Resolve any backend extension value → ext.id (string).
    // Option values for extension/voicemail selects use String(ext.id) so we must return the ID.
    // Backend may store the extension number ("1001") OR the user_id ("5") — handle both.
    const resolveToId = (rawVal: unknown): string => {
      if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === 0 || rawVal === '0') return ''
      const raw = String(rawVal).trim()
      if (!raw || raw === '0') return ''
      // Direct ID match (backend already stores ext.id / user_id)
      if (extensions.find(e => String(e.id) === raw)) return raw
      // Extension number match — convert to ext.id
      const byExt = extensions.find(e => String(e.extension).trim() === raw)
      return byExt ? String(byExt.id) : ''
    }

    // Resolve ring group: option values are now numeric IDs (String(rg.id)).
    // Try ID match first; fall back to title match for legacy saved data.
    const resolveRg = (rawVal: unknown): string => {
      const raw = String(rawVal ?? '')
      if (!raw) return ''
      if (ringGroups.find(r => String(r.id) === raw)) return raw
      const byTitle = ringGroups.find(r => String(r.title || r.name || '') === raw)
      return byTitle ? String(byTitle.id) : raw
    }

    setForm({
      cli:            String(d.cli            || ''),
      cnam:           String(d.cnam           || ''),
      dest_type:      toStr(d.dest_type),
      // Use || so 0/"" fall through to the next candidate (backend may return 0 for unset)
      extension:      resolveToId(d.extension      || d.ext_number || d.destination_extension),
      ivr_id:         String(d.ivr_id         ?? ''),
      // Voicemail boxes are often stored in the `extension` field with dest_type=2
      voicemail_id:   resolveToId(d.voicemail_id   || d.extension),
      ingroup:        resolveRg(d.ingroup),
      forward_number: String(d.forward_number || ''),
      operator:       String(d.operator       || d.voip_provider || ''),
      sms:            toBool(d.sms ?? d.is_sms ?? d.sms_enabled),
      default_did:    toBool(d.default_did ?? d.is_default ?? d.default),
      dest_type_ooh:      toStr(d.dest_type_ooh),
      extension_ooh:      resolveToId(d.extension_ooh      || d.ext_number_ooh),
      ivr_id_ooh:         String(d.ivr_id_ooh         ?? ''),
      voicemail_id_ooh:   resolveToId(d.voicemail_id_ooh   || d.extension_ooh),
      ingroup_ooh:        resolveRg(d.ingroup_ooh),
      forward_number_ooh: String(d.forward_number_ooh || ''),
    })
    didPopulateForId.current = id
    setFormPopulated(true)
  }, [existing, extensions, ringGroups, loadingExtensions, loadingIvrs, loadingRingGroups, id, isEdit])

  // ── Save mutation ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const destNum    = DEST_TYPE_TO_NUM[form.dest_type]    ?? 1
      const destNumOoh = DEST_TYPE_TO_NUM[form.dest_type_ooh] ?? 1
      const payload: Record<string, unknown> = {
        cli: form.cli, cnam: form.cnam,
        area_code: '', country_code: '',

        dest_type:      destNum,
        ivr_id:         destNum === 0 ? form.ivr_id         : '',
        extension:      destNum === 1 ? (extensions.find(e => String(e.id) === form.extension)?.extension ?? form.extension) : '',
        voicemail_id:   destNum === 2 ? (extensions.find(e => String(e.id) === form.voicemail_id)?.extension ?? form.voicemail_id) : '',
        forward_number: destNum === 4 ? form.forward_number : '',
        conf_id:        '',
        ingroup:        destNum === 8 ? form.ingroup         : '',

        operator:         form.operator,
        operator_check:   form.operator,
        voip_provider:    form.operator,
        phone_number_sid: '',

        sms: form.sms, is_sms: form.sms,
        sms_phone: '', sms_email: '', sms_type: 0,
        default_did: form.default_did,

        call_screening_status: 0, call_screening_ivr_id: 0,
        language: '', voice_name: '', ivr_audio_option: 0, speech_text: '', prompt_option: 0,

        dest_type_ooh:       destNumOoh,
        ivr_id_ooh:          destNumOoh === 0 ? form.ivr_id_ooh         : '',
        extension_ooh:       destNumOoh === 1 ? (extensions.find(e => String(e.id) === form.extension_ooh)?.extension ?? form.extension_ooh) : '',
        voicemail_id_ooh:    destNumOoh === 2 ? (extensions.find(e => String(e.id) === form.voicemail_id_ooh)?.extension ?? form.voicemail_id_ooh) : '',
        forward_number_ooh:  destNumOoh === 4 ? form.forward_number_ooh : '',
        conf_id_ooh:         '',
        ingroup_ooh:         destNumOoh === 8 ? form.ingroup_ooh         : '',
        call_time_department_id: 0, call_time_holiday: 0, redirect_last_agent: 0,
      }
      if (isEdit) payload.did_id = Number(id)
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
    if (!form.cli.trim())                                            { toast.error('Phone number (CLI) is required.'); return }
    if (!form.operator)                                              { toast.error('Please select a VoIP provider.'); return }
    if (form.dest_type === 'extension' && !form.extension)           { toast.error('Please select a target extension.'); return }
    if (form.dest_type === 'ivr'       && !form.ivr_id)              { toast.error('Please select an IVR.'); return }
    if (form.dest_type === 'queue'     && !form.ingroup)             { toast.error('Please select a ring group / queue.'); return }
    if (form.dest_type === 'voicemail' && !form.voicemail_id)        { toast.error('Please select an extension for voicemail.'); return }
    if (form.dest_type === 'external'  && !form.forward_number.trim()){ toast.error('Please enter the external forward number.'); return }
    saveMutation.mutate()
  }

  if (isEdit && (loadingExisting || !formPopulated || loadingExtensions || loadingIvrs || loadingRingGroups)) return <PageLoader />

  const activeDest = DEST_TYPES.find(d => d.value === form.dest_type) ?? DEST_TYPES[0]

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

      {/* ── Two-panel layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ─── LEFT: Form panels ─── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Step 1: Identity ── */}
          <div className="card space-y-5">
            <SectionHead step={1} icon={PhoneCall} title="Phone Identity" sub="The number callers dial and the name shown on outbound calls" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
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
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {isEdit ? 'Cannot be changed after creation' : 'Include country code, e.g. +12125551234'}
                </p>
              </div>
              <div className="form-group">
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

            <div>
              <label className="label mb-3">Routing Type</label>
              <RoutingCards value={form.dest_type} onChange={switchDestType} />

              {/* Active route hint */}
              <div className={cn('mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs', `bg-gradient-to-r ${activeDest.gradient} bg-opacity-10`)}>
                <div className={cn('w-5 h-5 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', activeDest.gradient)}>
                  <activeDest.Icon size={10} className="text-white" />
                </div>
                <span className="font-semibold text-slate-700">{activeDest.label}:</span>
                <span className="text-slate-500">{activeDest.desc}</span>
              </div>
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

          {/* ── Step 3: Provider ── */}
          <div className="card space-y-5">
            <SectionHead step={3} icon={Building2} title="VoIP Provider" sub="Select the carrier that manages this phone number" />

            <div>
              <label className="label mb-3">
                Select Provider <span className="text-red-500">*</span>
              </label>
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

          {/* ── Step 4: Features ── */}
          <div className="card space-y-5">
            <SectionHead step={4} icon={MessageSquare} title="Features" sub="Enable optional capabilities for this number" />
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

          {/* ── Step 5: Out-of-Hours Routing ── */}
          <div className="card">
            <button
              type="button"
              onClick={() => setOohOpen(o => !o)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-xs font-black text-white">5</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-500" />
                  <p className="text-sm font-bold text-slate-900">Out-of-Hours Routing</p>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Where calls go outside business hours</p>
              </div>
              <ChevronDown size={16} className={cn('text-slate-400 flex-shrink-0 transition-transform', oohOpen && 'rotate-180')} />
            </button>

            {oohOpen && (
              <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
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
            )}
          </div>

          {/* ── Bottom actions (secondary) ── */}
          <div className="flex gap-3 pb-2">
            <button onClick={() => navigate('/dids')} className="btn-outline flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : isEdit ? 'Save Changes' : 'Add DID'
              }
            </button>
          </div>
        </div>

        {/* ─── RIGHT: Live preview ─── */}
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
