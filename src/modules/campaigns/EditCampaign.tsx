import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Save, Radio, Phone, Clock, Settings2, Tag, Globe, ChevronDown, X, Search, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { userService } from '../../services/user.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useAuthStore } from '../../stores/auth.store'

// ─────────────────────────────────────────────
//  Week Schedule Types
// ─────────────────────────────────────────────
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type DaySchedule = { enabled: boolean; start: string; end: string }
type WeekSchedule = Record<DayKey, DaySchedule>
const ALL_DAYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  monday:    { enabled: true,  start: '09:00', end: '17:00' },
  tuesday:   { enabled: true,  start: '09:00', end: '17:00' },
  wednesday: { enabled: true,  start: '09:00', end: '17:00' },
  thursday:  { enabled: true,  start: '09:00', end: '17:00' },
  friday:    { enabled: true,  start: '09:00', end: '17:00' },
  saturday:  { enabled: false, start: '09:00', end: '17:00' },
  sunday:    { enabled: false, start: '09:00', end: '17:00' },
}

function WeekScheduleGrid({ schedule, onChange }: { schedule: WeekSchedule; onChange: (s: WeekSchedule) => void }) {
  const update = (day: DayKey, field: keyof DaySchedule, value: boolean | string) =>
    onChange({ ...schedule, [day]: { ...schedule[day], [field]: value } })
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Day</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">On</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Start</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">End</th>
          </tr>
        </thead>
        <tbody>
          {ALL_DAYS.map(day => (
            <tr key={day} className={`border-b border-slate-100 last:border-0 transition-opacity ${!schedule[day].enabled ? 'opacity-40' : ''}`}>
              <td className="px-3 py-2 font-medium text-slate-700 capitalize text-xs">{day}</td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" checked={schedule[day].enabled}
                  onChange={e => update(day, 'enabled', e.target.checked)}
                  className="rounded accent-indigo-600 cursor-pointer" />
              </td>
              <td className="px-3 py-1.5">
                <input type="time" value={schedule[day].start} disabled={!schedule[day].enabled}
                  onChange={e => update(day, 'start', e.target.value)}
                  className="input text-xs py-1 w-full disabled:cursor-not-allowed" />
              </td>
              <td className="px-3 py-1.5">
                <input type="time" value={schedule[day].end} disabled={!schedule[day].enabled}
                  onChange={e => update(day, 'end', e.target.value)}
                  className="input text-xs py-1 w-full disabled:cursor-not-allowed" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Zod Schema
// ─────────────────────────────────────────────
const editCampaignSchema = z
  .object({
    campaign_id: z.number().int(),
    title: z.string().min(1, 'Campaign title is required').max(255),
    description: z.string().max(255).optional().default(''),
    status: z.number().int().default(1),
    dial_mode: z.string().min(1, 'Dial mode is required'),
    group_id: z.string().or(z.number()).optional().nullable(),
    call_ratio: z.string().optional().default(''),
    duration: z.string().optional().default(''),
    automated_duration: z.string().optional().default(''),
    hopper_mode: z.number().int().optional().nullable(),
    max_lead_temp: z.number().int().min(0).max(10000).default(100),
    min_lead_temp: z.number().int().min(0).max(10000).default(500),
    percentage_inc_dec: z.string().optional().default(''),
    caller_id: z.enum(['area_code', 'area_code_random', 'custom']).default('area_code'),
    custom_caller_id: z.string().optional().default(''),
    country_code: z.string().optional().default(''),
    voip_configuration_id: z.string().or(z.number()).optional().nullable(),
    call_transfer: z.number().int().default(0),
    time_based_calling: z.number().int().default(0),
    call_time_start: z.string().optional().nullable(),
    call_time_end: z.string().optional().nullable(),
    timezone: z.string().max(64).optional().default('America/New_York'),
    email: z.number().int().default(0),
    sms: z.number().int().default(0),
    send_crm: z.number().int().default(0),
    send_report: z.number().int().default(0),
    call_metric: z.enum(['0', '1']).default('0'),
    api: z.number().int().default(1),
    amd: z.enum(['0', '1']).default('0'),
    amd_drop_action: z.number().int().optional().nullable(),
    audio_message_amd: z.string().or(z.number()).optional().nullable(),
    voice_message_amd: z.string().or(z.number()).optional().nullable(),
    redirect_to: z.string().optional().default(''),
    redirect_to_dropdown: z.string().or(z.number()).optional().nullable(),
    no_agent_available_action: z.number().int().optional().nullable(),
    no_agent_dropdown_action: z.string().or(z.number()).optional().nullable(),
    disposition_id: z.array(z.number()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.dial_mode === 'super_power_dial' && (!data.group_id || data.group_id === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Caller group is required for Super Power Dial', path: ['group_id'] })
    }
    if (data.caller_id === 'custom' && (!data.custom_caller_id || data.custom_caller_id === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom Caller ID is required', path: ['custom_caller_id'] })
    }
    if (data.time_based_calling === 1) {
      if (!data.call_time_start) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Start time is required', path: ['call_time_start'] })
      if (!data.call_time_end) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time is required', path: ['call_time_end'] })
    }
  })

type EditCampaignFormValues = z.infer<typeof editCampaignSchema>

interface CampaignApiData {
  id?: number; title?: string; description?: string; status?: number | string
  dial_mode?: string; group_id?: number | string | null; call_ratio?: string | null
  duration?: string | null; automated_duration?: string | null; hopper_mode?: number | null
  max_lead_temp?: number; min_lead_temp?: number; percentage_inc_dec?: string | null
  caller_id?: string; custom_caller_id?: number | string | null
  country_code?: number | string | null; voip_configuration_id?: number | string | null
  call_transfer?: number | string; time_based_calling?: number | string
  call_time_start?: string | null; call_time_end?: string | null; timezone?: string | null
  email?: number | string; sms?: number | string; send_crm?: number | string
  send_report?: number | string; call_metric?: string | number; api?: number | string
  amd?: string | number; amd_drop_action?: number | null
  audio_message_amd?: number | string | null; voice_message_amd?: number | string | null
  redirect_to?: string | null; redirect_to_dropdown?: number | string | null
  no_agent_available_action?: number | null; no_agent_dropdown_action?: number | string | null
  disposition?: Array<{ id: number; title: string }>
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const PREDICTIVE_CALL_RATIO = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']
const OUTBOUND_CALL_RATIO = Array.from({ length: 30 }, (_, i) => String(i + 1))
const PREDICTIVE_DURATION = Array.from({ length: 16 }, (_, i) => ({ value: String(i), label: `${i}` }))
const OUTBOUND_DURATION = [
  { value: '60', label: '1 Min' }, { value: '120', label: '2 Min' },
  { value: '300', label: '5 Min' }, { value: '600', label: '10 Min' },
  { value: '1200', label: '20 Min' }, { value: '1800', label: '30 Min' },
]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[11px] text-red-500">{message}</p>
}

function CardSection({
  icon: Icon, title, description, children, className = '',
}: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}
      style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-800 leading-none">{title}</h3>
          {description && <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}>
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      {label && <span className={`text-xs font-medium ${checked ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</span>}
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-slate-700 leading-none">{label}</p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={checked ? 'On' : 'Off'} />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Disposition Multi-Select Dropdown
// ─────────────────────────────────────────────
function DispositionMultiSelect({
  dispositions,
  selected,
  onChange,
}: {
  dispositions: Array<{ id: number; title: string }>
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = dispositions.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const removeOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(x => x !== id))
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const selectedDisps = dispositions.filter(d => selected.includes(d.id))

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
        } bg-white`}
      >
        <span className={`flex-1 truncate ${selected.length === 0 ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
          {selected.length === 0
            ? 'Select dispositions…'
            : `${selected.length} disposition${selected.length !== 1 ? 's' : ''} selected`}
        </span>
        {selected.length > 0 && (
          <span
            onClick={clearAll}
            className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded cursor-pointer"
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dispositions…"
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No dispositions found</p>
            ) : (
              filtered.map(d => {
                const isChecked = selected.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggle(d.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors ${
                      isChecked ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {isChecked && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{d.title}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">{selected.length} selected</span>
              <button type="button" onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selectedDisps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedDisps.map(d => (
            <span key={d.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-200">
              {d.title}
              <button type="button" onClick={(e) => removeOne(d.id, e)} className="hover:text-red-600 transition-colors ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export function EditCampaign() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const campaignId = Number(id)
  const clientId = useAuthStore(s => s.user?.parent_id)
  const [scheduleMode, setScheduleMode] = useState<'simple' | 'per_day'>('simple')
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE)
  const [existingTimerId, setExistingTimerId] = useState<number | null>(null)

  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editCampaignSchema) as any,
    defaultValues: {
      campaign_id: campaignId, title: '', description: '', status: 1, dial_mode: '',
      group_id: '', call_ratio: '', duration: '', automated_duration: '',
      hopper_mode: 1, max_lead_temp: 100, min_lead_temp: 500, percentage_inc_dec: '',
      caller_id: 'area_code', custom_caller_id: '', country_code: '', voip_configuration_id: '',
      call_transfer: 0, time_based_calling: 0, call_time_start: '08:00', call_time_end: '20:00', timezone: 'America/New_York',
      email: 0, sms: 0, send_crm: 0, send_report: 0, call_metric: '0', api: 1,
      amd: '0', amd_drop_action: null, audio_message_amd: null, voice_message_amd: null,
      redirect_to: '', redirect_to_dropdown: null,
      no_agent_available_action: null, no_agent_dropdown_action: null,
      disposition_id: [],
    },
  })

  const dialMode = watch('dial_mode')
  const callerIdType = watch('caller_id')
  const timeBasedCalling = watch('time_based_calling')
  const amd = watch('amd')
  const amdDropAction = watch('amd_drop_action')
  const redirectTo = watch('redirect_to')
  const noAgentAction = watch('no_agent_available_action')

  // Derived flags
  const showCallRatioDuration = dialMode === 'predictive_dial' || dialMode === 'outbound_ai'
  const showAutomatedDuration = dialMode === 'predictive_dial'
  const showAmd = dialMode === 'predictive_dial' || dialMode === 'outbound_ai'
  const showNoAgent = dialMode === 'predictive_dial'
  const showRedirectTo = dialMode === 'outbound_ai'
  const showAdvanced = showCallRatioDuration

  // Dropdown queries
  const { data: campaignTypesData } = useQuery({ queryKey: ['campaign-types'], queryFn: () => campaignService.getTypes() })
  const dialModes: Array<{ value: string; label: string }> =
    ((campaignTypesData as { data?: { data?: unknown[] } })?.data?.data as Array<{ title: string; title_url: string }> ?? [])
      .map(t => ({ value: t.title_url, label: t.title }))

  const { data: campaignData, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignService.getById(campaignId),
    enabled: Boolean(campaignId),
  })

  const { data: groupsData } = useQuery({ queryKey: ['extension-groups', clientId], queryFn: () => userService.getGroups() })
  const groups: Array<{ id: number; group_name?: string; title?: string }> =
    (groupsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; group_name?: string; title?: string }> ?? []

  const { data: dispositionsData, isLoading: dispositionsLoading } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })
  const dispositions: Array<{ id: number; title: string }> =
    (dispositionsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title: string }> ?? []

  const { data: didsData } = useQuery({ queryKey: ['dids-all'], queryFn: () => campaignService.getDids() })
  const dids: Array<{ cli: string; cnam?: string }> =
    ((didsData as { data?: { data?: unknown[] } })?.data?.data ?? (didsData as { data?: unknown[] })?.data ?? []) as Array<{ cli: string; cnam?: string }>

  const { data: countriesData } = useQuery({ queryKey: ['country-codes'], queryFn: () => campaignService.getCountryCodes() })
  const countries: Array<{ phonecode: string; name: string }> =
    ((countriesData as { data?: { data?: unknown[] } })?.data?.data ?? (countriesData as { data?: unknown[] })?.data ?? []) as Array<{ phonecode: string; name: string }>

  const { data: extensionsData } = useQuery({ queryKey: ['extensions-all', clientId], queryFn: () => campaignService.getExtensions() })
  const extensions: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> =
    ((extensionsData as { data?: { data?: unknown[] } })?.data?.data ?? (extensionsData as { data?: unknown[] })?.data ?? []) as Array<{ id: number; first_name?: string; last_name?: string; extension?: string }>

  const { data: ivrData } = useQuery({ queryKey: ['ivr-list', clientId], queryFn: () => campaignService.getIvrList() })
  const ivrList: Array<{ ivr_id: string; ivr_desc: string }> =
    ((ivrData as { data?: { data?: unknown[] } })?.data?.data ?? (ivrData as { data?: unknown[] })?.data ?? []) as Array<{ ivr_id: string; ivr_desc: string }>

  const { data: ringGroupData } = useQuery({ queryKey: ['ring-groups', clientId], queryFn: () => campaignService.getRingGroups() })
  const ringGroups: Array<{ id: number; title: string; description?: string }> =
    ((ringGroupData as { data?: { data?: unknown[] } })?.data?.data ?? (ringGroupData as { data?: unknown[] })?.data ?? []) as Array<{ id: number; title: string; description?: string }>

  const { data: voiceTemplatesData } = useQuery({ queryKey: ['voice-templates'], queryFn: () => campaignService.getVoiceTemplates() })
  const voiceTemplates: Array<{ templete_id: string; templete_name: string }> =
    ((voiceTemplatesData as { data?: { data?: unknown[] } })?.data?.data ?? (voiceTemplatesData as { data?: unknown[] })?.data ?? []) as Array<{ templete_id: string; templete_name: string }>

  const { data: audioMessagesData } = useQuery({ queryKey: ['audio-messages'], queryFn: () => campaignService.getAudioMessages() })
  const audioMessages: Array<{ ivr_id: string; ivr_desc: string }> =
    ((audioMessagesData as { data?: { data?: unknown[] } })?.data?.data ?? (audioMessagesData as { data?: unknown[] })?.data ?? []) as Array<{ ivr_id: string; ivr_desc: string }>

  const { data: promptsData } = useQuery({ queryKey: ['prompts-all'], queryFn: () => campaignService.getPrompts() })
  const prompts: Array<{ id: number; title: string }> =
    ((promptsData as { data?: { data?: unknown[] } })?.data?.data ?? (promptsData as { data?: unknown[] })?.data ?? []) as Array<{ id: number; title: string }>

  // Populate form from API data
  useEffect(() => {
    const raw = (campaignData as { data?: { data?: CampaignApiData } })?.data?.data
    if (!raw) return
    const c = raw as CampaignApiData & { dispositions?: unknown[] }
    // Backend sends 'dispositions' (plural) as an array of string IDs e.g. ["1","3","5"]
    const existingDispositionIds = Array.isArray(c.dispositions)
      ? c.dispositions.map(d => Number(d))
      : Array.isArray(c.disposition) ? c.disposition.map(d => d.id) : []
    reset({
      campaign_id: campaignId,
      title: c.title ?? '',
      description: c.description ?? '',
      status: Number(c.status ?? 1),
      dial_mode: c.dial_mode ?? '',
      group_id: c.group_id != null ? String(c.group_id) : '',
      call_ratio: c.call_ratio ?? '',
      duration: c.duration ?? '',
      automated_duration: c.automated_duration ?? '',
      hopper_mode: c.hopper_mode ?? 1,
      max_lead_temp: Number(c.max_lead_temp ?? 100),
      min_lead_temp: Number(c.min_lead_temp ?? 500),
      percentage_inc_dec: c.percentage_inc_dec ?? '',
      caller_id: (c.caller_id as 'area_code' | 'area_code_random' | 'custom') ?? 'area_code',
      custom_caller_id: c.custom_caller_id != null ? String(c.custom_caller_id) : '',
      country_code: c.country_code != null ? String(c.country_code) : '',
      voip_configuration_id: c.voip_configuration_id != null ? String(c.voip_configuration_id) : '',
      call_transfer: Number(c.call_transfer ?? 0),
      time_based_calling: Number(c.time_based_calling ?? 0),
      call_time_start: c.call_time_start ? c.call_time_start.substring(0, 5) : '08:00',
      call_time_end: c.call_time_end ? c.call_time_end.substring(0, 5) : '20:00',
      timezone: (c.timezone as string) || 'America/New_York',
      email: Number(c.email ?? 0),
      sms: Number(c.sms ?? 0),
      send_crm: Number(c.send_crm ?? 0),
      send_report: Number(c.send_report ?? 0),
      call_metric: (String(c.call_metric ?? '0') as '0' | '1'),
      api: Number(c.api ?? 1),
      amd: (String(c.amd ?? '0') as '0' | '1'),
      amd_drop_action: c.amd_drop_action ?? null,
      audio_message_amd: c.audio_message_amd != null ? String(c.audio_message_amd) : null,
      voice_message_amd: c.voice_message_amd != null ? String(c.voice_message_amd) : null,
      // Always coerce to string — DB stores as integer but JSX uses strict string comparisons ('1','2',…)
      redirect_to: c.redirect_to != null ? String(c.redirect_to) : '',
      redirect_to_dropdown: c.redirect_to_dropdown != null ? String(c.redirect_to_dropdown) : null,
      no_agent_available_action: c.no_agent_available_action ?? null,
      no_agent_dropdown_action: c.no_agent_dropdown_action != null ? String(c.no_agent_dropdown_action) : null,
      disposition_id: existingDispositionIds,
    })

    // Load existing per-day schedule if campaign has call_schedule_id
    const schedId = (c as Record<string, unknown>).call_schedule_id
    if (schedId) {
      setExistingTimerId(Number(schedId))
      setScheduleMode('per_day')
      campaignService.getCallTimer(Number(schedId)).then((res: unknown) => {
        const wp = (res as { data?: { data?: { week_plan?: Record<string, { start: string; end: string }> } } })?.data?.data?.week_plan
        if (wp && typeof wp === 'object') {
          const merged = { ...DEFAULT_WEEK_SCHEDULE }
          ALL_DAYS.forEach(day => {
            if (wp[day]) merged[day] = { enabled: true, start: wp[day].start, end: wp[day].end }
            else merged[day] = { ...merged[day], enabled: false }
          })
          setWeekSchedule(merged)
        }
      }).catch(() => {/* ignore */})
    }
  }, [campaignData, campaignId, reset])

  // Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditCampaignFormValues) => {
      let callScheduleId: number | undefined

      if (Number(data.time_based_calling) === 1 && scheduleMode === 'per_day') {
        const weekPlan: Record<string, { start: string; end: string }> = {}
        ALL_DAYS.forEach(day => {
          if (weekSchedule[day].enabled) weekPlan[day] = { start: weekSchedule[day].start, end: weekSchedule[day].end }
        })
        if (existingTimerId) {
          await campaignService.updateCallTimer(existingTimerId, { week_plan: weekPlan })
          callScheduleId = existingTimerId
        } else {
          const timerRes = await campaignService.createCallTimer({ title: `${data.title} Schedule`, week_plan: weekPlan })
          callScheduleId = (timerRes as { data?: { data?: { id?: number } } })?.data?.data?.id
        }
      }

      const payload: Record<string, unknown> = {
        ...data,
        group_id: data.group_id ? Number(data.group_id) : 0,
        // DB NOT NULL columns — send safe defaults instead of null
        amd_drop_action: data.amd_drop_action ?? 1,
        no_agent_available_action: data.no_agent_available_action ?? 1,
        no_agent_dropdown_action: data.no_agent_dropdown_action ? Number(data.no_agent_dropdown_action) : 0,
        voicedrop_option_user_id: 0,
        country_code: data.country_code ? Number(data.country_code) : undefined,
        voip_configuration_id: data.voip_configuration_id ? Number(data.voip_configuration_id) : undefined,
        redirect_to_dropdown: data.redirect_to_dropdown ? Number(data.redirect_to_dropdown) : undefined,
        audio_message_amd: data.audio_message_amd ? Number(data.audio_message_amd) : undefined,
        voice_message_amd: data.voice_message_amd ? Number(data.voice_message_amd) : undefined,
        // exclude empty string — backend validates as numeric
        custom_caller_id: data.custom_caller_id || undefined,
        // truncate HH:MM:SS → HH:MM — backend validates as date_format:H:i
        call_time_start: data.call_time_start ? data.call_time_start.substring(0, 5) : undefined,
        call_time_end: data.call_time_end ? data.call_time_end.substring(0, 5) : undefined,
        ...(callScheduleId ? { call_schedule_id: callScheduleId } : {}),
      }
      return campaignService.update(payload)
    },
    onSuccess: () => {
      toast.success('Campaign updated successfully')
      navigate('/campaigns')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update campaign')
    },
  })

  const onSubmit = (data: EditCampaignFormValues) => updateMutation.mutate(data)

  if (loadingCampaign) return <PageLoader />

  const isPending = isSubmitting || updateMutation.isPending
  const callRatioOptions = dialMode === 'predictive_dial' ? PREDICTIVE_CALL_RATIO : OUTBOUND_CALL_RATIO
  const durationOptions = dialMode === 'predictive_dial' ? PREDICTIVE_DURATION : OUTBOUND_DURATION

  return (
    <div className="w-full space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/campaigns')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-none">Edit Campaign</h1>
          <p className="text-xs text-slate-500 mt-1">Campaign #{campaignId}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" {...register('campaign_id', { valueAsNumber: true })} />

        {/* ── Campaign Overview ── */}
        <CardSection icon={Radio} title="Campaign Overview" description="Name and basic configuration" className="mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 form-group">
              <label className="label text-xs">Campaign Name <span className="text-red-500">*</span></label>
              <input {...register('title')} className={`input text-sm py-2 ${errors.title ? 'border-red-400' : ''}`} placeholder="e.g. Summer Sales 2025" />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="lg:col-span-5 form-group">
              <label className="label text-xs">Description</label>
              <input {...register('description')} className="input text-sm py-2" placeholder="Brief campaign description (optional)" />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-1 justify-center">
              <Controller name="status" control={control}
                render={({ field }) => (
                  <ToggleRow label="Active" checked={field.value === 1} onChange={v => field.onChange(v ? 1 : 0)} />
                )}
              />
              <Controller name="send_report" control={control}
                render={({ field }) => (
                  <ToggleRow label="Send Report" checked={field.value === 1} onChange={v => field.onChange(v ? 1 : 0)} />
                )}
              />
            </div>
          </div>
        </CardSection>

        {/* ── Row 2: Dialing | Caller ID | Schedule ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Dialing Card */}
          <CardSection icon={Phone} title="Dialing Mode" description="Dial strategy & lead flow">
            <div className="space-y-3">
              <div className="form-group">
                <label className="label text-xs">Dialing Mode <span className="text-red-500">*</span></label>
                <select {...register('dial_mode')} className={`input text-sm py-2 ${errors.dial_mode ? 'border-red-400' : ''}`}>
                  <option value="">— Select Mode —</option>
                  {dialModes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <FieldError message={errors.dial_mode?.message} />
              </div>

              <div className="form-group">
                <label className="label text-xs">Caller Group {dialMode === 'super_power_dial' && <span className="text-red-500">*</span>}</label>
                <select {...register('group_id')} className={`input text-sm py-2 ${errors.group_id ? 'border-red-400' : ''}`}>
                  <option value="">— None —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.group_name ?? g.title}</option>)}
                </select>
                <FieldError message={errors.group_id?.message as string} />
              </div>

              <div className="form-group">
                <label className="label text-xs">Hopper Mode</label>
                <select {...register('hopper_mode', { setValueAs: v => v === '' ? null : Number(v) })} className="input text-sm py-2">
                  <option value="1">Linear</option>
                  <option value="2">Random</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="label text-xs">Max Lead Temp</label>
                  <input type="number" {...register('max_lead_temp', { valueAsNumber: true })} className="input text-sm py-2" min={0} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Min Lead Temp</label>
                  <input type="number" {...register('min_lead_temp', { valueAsNumber: true })} className="input text-sm py-2" min={0} />
                </div>
              </div>
            </div>
          </CardSection>

          {/* Caller ID Card */}
          <CardSection icon={Globe} title="Caller ID" description="Outbound identification">
            <div className="space-y-3">
              <div className="form-group">
                <label className="label text-xs">Caller ID Type <span className="text-red-500">*</span></label>
                <select {...register('caller_id')} className="input text-sm py-2">
                  <option value="area_code">Area Code</option>
                  <option value="area_code_random">Area Code &amp; Randomizer</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label text-xs">Custom Caller ID {callerIdType === 'custom' && <span className="text-red-500">*</span>}</label>
                <select
                  {...register('custom_caller_id')}
                  disabled={callerIdType !== 'custom'}
                  className={`input text-sm py-2 ${callerIdType !== 'custom' ? 'opacity-50' : ''} ${errors.custom_caller_id ? 'border-red-400' : ''}`}
                >
                  <option value="">— Select DID —</option>
                  {dids.map(d => (
                    <option key={d.cli} value={d.cli}>{d.cli}{d.cnam ? ` — ${d.cnam}` : ''}</option>
                  ))}
                </select>
                <FieldError message={errors.custom_caller_id?.message} />
              </div>

              <div className="form-group">
                <label className="label text-xs">Country Code</label>
                <select {...register('country_code')} className="input text-sm py-2">
                  <option value="">— Select Country —</option>
                  {countries.map(c => (
                    <option key={c.phonecode} value={c.phonecode}>{c.name} (+{c.phonecode})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label text-xs">Call Transfer</label>
                <select {...register('call_transfer', { valueAsNumber: true })} className="input text-sm py-2">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>
          </CardSection>

          {/* Schedule & Communication Card */}
          <CardSection icon={Clock} title="Schedule & Communication" description="Call timing & messaging">
            <div className="space-y-3">
              <div className="form-group">
                <label className="label text-xs">Time Based Calling</label>
                <select {...register('time_based_calling', { valueAsNumber: true })} className="input text-sm py-2">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>

              {Number(timeBasedCalling) === 1 && (
                <>
                  {/* Schedule Mode selector */}
                  <div className="form-group">
                    <label className="label text-xs">Schedule Type</label>
                    <select value={scheduleMode} onChange={e => setScheduleMode(e.target.value as 'simple' | 'per_day')} className="input text-sm py-2">
                      <option value="simple">Simple — same time every day</option>
                      <option value="per_day">Per Day — different times per day</option>
                    </select>
                  </div>

                  {scheduleMode === 'simple' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-group">
                        <label className="label text-xs">Start Time <span className="text-red-500">*</span></label>
                        <input type="time" {...register('call_time_start')} className={`input text-sm py-2 ${errors.call_time_start ? 'border-red-400' : ''}`} />
                        <FieldError message={errors.call_time_start?.message} />
                      </div>
                      <div className="form-group">
                        <label className="label text-xs">End Time <span className="text-red-500">*</span></label>
                        <input type="time" {...register('call_time_end')} className={`input text-sm py-2 ${errors.call_time_end ? 'border-red-400' : ''}`} />
                        <FieldError message={errors.call_time_end?.message} />
                      </div>
                    </div>
                  )}

                  {scheduleMode === 'per_day' && (
                    <WeekScheduleGrid schedule={weekSchedule} onChange={setWeekSchedule} />
                  )}

                  <div className="form-group">
                    <label className="label text-xs">Timezone</label>
                    <select {...register('timezone')} className="input text-sm py-2">
                      <option value="America/New_York">America/New_York (ET)</option>
                      <option value="America/Chicago">America/Chicago (CT)</option>
                      <option value="America/Denver">America/Denver (MT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                      <option value="America/Phoenix">America/Phoenix (AZ)</option>
                      <option value="America/Anchorage">America/Anchorage (AK)</option>
                      <option value="Pacific/Honolulu">Pacific/Honolulu (HI)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="label text-xs">Send Email</label>
                <select {...register('email', { valueAsNumber: true })} className="input text-sm py-2">
                  <option value="0">No</option>
                  <option value="1">With User Email</option>
                  <option value="2">With Campaign Email</option>
                  <option value="3">With System Email</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label text-xs">Send SMS</label>
                <select {...register('sms', { valueAsNumber: true })} className="input text-sm py-2">
                  <option value="0">No</option>
                  <option value="1">With User Phone No</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label text-xs">Send to CRM</label>
                <select {...register('send_crm', { valueAsNumber: true })} className="input text-sm py-2">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <Controller name="call_metric" control={control}
                  render={({ field }) => (
                    <ToggleRow label="Call Metrics" hint="Track detailed performance" checked={field.value === '1'} onChange={v => field.onChange(v ? '1' : '0')} />
                  )}
                />
              </div>
            </div>
          </CardSection>
        </div>

        {/* ── Advanced: Call Ratio, AMD, No-Agent, Redirect ── */}
        {showAdvanced && (
          <CardSection icon={Settings2} title="Advanced Dialing Settings" description="Call ratio, AMD, and routing" className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Call Ratio & Duration */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {dialMode === 'predictive_dial' ? 'Call Ratio & Duration' : 'Simultaneous Calls & Interval'}
                </p>
                <div className="form-group">
                  <label className="label text-xs">{dialMode === 'predictive_dial' ? 'Call Ratio' : 'Simultaneous Calls'}</label>
                  <select {...register('call_ratio')} className="input text-sm py-2">
                    <option value="">— Select —</option>
                    {callRatioOptions.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label text-xs">{dialMode === 'predictive_dial' ? 'Duration (sec)' : 'Duration'}</label>
                  <select {...register('duration')} className="input text-sm py-2">
                    <option value="">— Select —</option>
                    {durationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {showAutomatedDuration && (
                  <div className="form-group">
                    <label className="label text-xs">Automated Duration</label>
                    <select {...register('automated_duration')} className="input text-sm py-2">
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>
                )}
              </div>

              {/* AMD Section */}
              {showAmd && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AMD Detection</p>
                  <div className="form-group">
                    <label className="label text-xs">AMD</label>
                    <select {...register('amd')} className="input text-sm py-2">
                      <option value="0">Off</option>
                      <option value="1">On</option>
                    </select>
                  </div>
                  {amd === '1' && (
                    <>
                      <div className="form-group">
                        <label className="label text-xs">AMD Drop Action</label>
                        <select {...register('amd_drop_action', { setValueAs: v => v === '' ? null : Number(v) })} className="input text-sm py-2">
                          <option value="">— Select —</option>
                          <option value="1">Hang Up</option>
                          <option value="2">Audio Message</option>
                          <option value="3">Voice Template</option>
                        </select>
                      </div>
                      {amdDropAction === 2 && (
                        <div className="form-group">
                          <label className="label text-xs">Audio Message AMD</label>
                          <select {...register('audio_message_amd', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                            <option value="">— Select —</option>
                            {audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc} — {a.ivr_id}</option>)}
                          </select>
                        </div>
                      )}
                      {amdDropAction === 3 && (
                        <div className="form-group">
                          <label className="label text-xs">Voice Template AMD</label>
                          <select {...register('voice_message_amd', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                            <option value="">— Select —</option>
                            {voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* No Agent Action (predictive only) */}
              {showNoAgent && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Agent Available</p>
                  <div className="form-group">
                    <label className="label text-xs">No Agent Action</label>
                    <select {...register('no_agent_available_action', { setValueAs: v => v === '' ? null : Number(v) })} className="input text-sm py-2">
                      <option value="">— Select —</option>
                      <option value="1">Hang Up</option>
                      <option value="2">Voice Drop</option>
                      <option value="3">Inbound IVR</option>
                      <option value="4">Extension</option>
                      <option value="5">Assistant AI</option>
                    </select>
                  </div>
                  {noAgentAction === 2 && (
                    <div className="form-group">
                      <label className="label text-xs">Voice Drop Option</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select Extension —</option>
                        {extensions.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.extension}</option>)}
                      </select>
                    </div>
                  )}
                  {noAgentAction === 3 && (
                    <div className="form-group">
                      <label className="label text-xs">Inbound IVR Option</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select IVR —</option>
                        {ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc} — {ivr.ivr_id}</option>)}
                      </select>
                    </div>
                  )}
                  {noAgentAction === 4 && (
                    <div className="form-group">
                      <label className="label text-xs">Extension</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select Extension —</option>
                        {extensions.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.extension}</option>)}
                      </select>
                    </div>
                  )}
                  {noAgentAction === 5 && (
                    <div className="form-group">
                      <label className="label text-xs">Assistant ID</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="123">Assistant</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Redirect To (outbound_ai only) */}
              {showRedirectTo && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Redirect To</p>
                  <div className="form-group">
                    <label className="label text-xs">Redirect To</label>
                    <select {...register('redirect_to')} className="input text-sm py-2">
                      <option value="">— Select —</option>
                      <option value="1">Audio Message</option>
                      <option value="2">Voice Template</option>
                      <option value="3">Extension</option>
                      <option value="4">Ring Group</option>
                      <option value="5">IVR</option>
                      <option value="6">Voice AI</option>
                    </select>
                  </div>
                  {redirectTo === '1' && (
                    <div className="form-group">
                      <label className="label text-xs">Audio Message</label>
                      <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select —</option>
                        {audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc} — {a.ivr_id}</option>)}
                      </select>
                    </div>
                  )}
                  {redirectTo === '2' && (
                    <div className="form-group">
                      <label className="label text-xs">Voice Message</label>
                      <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select —</option>
                        {voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                      </select>
                    </div>
                  )}
                  {redirectTo === '3' && (
                    <div className="form-group">
                      <label className="label text-xs">Extension</label>
                      <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select —</option>
                        {extensions.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.extension}</option>)}
                      </select>
                    </div>
                  )}
                  {redirectTo === '4' && (
                    <div className="form-group">
                      <label className="label text-xs">Ring Group</label>
                      <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select —</option>
                        {ringGroups.map(rg => <option key={rg.id} value={rg.id}>{rg.description} — {rg.title}</option>)}
                      </select>
                    </div>
                  )}
                  {redirectTo === '5' && (
                    <div className="form-group">
                      <label className="label text-xs">IVR</label>
                      <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select —</option>
                        {ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc} — {ivr.ivr_id}</option>)}
                      </select>
                    </div>
                  )}
                  {redirectTo === '6' && (
                    <div className="form-group">
                      <label className="label text-xs">Voice AI</label>
                      <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input text-sm py-2">
                        <option value="">— Select Prompt —</option>
                        {prompts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardSection>
        )}

        {/* ── Dispositions ── compact row, NO overflow-hidden wrapper ── */}
        <div
          className="bg-white rounded-2xl border border-slate-200 px-5 py-4 mb-4"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-start gap-4">
            {/* Label */}
            <div className="flex items-center gap-2.5 w-32 flex-shrink-0 pt-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Tag size={14} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 leading-none">Dispositions</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Call outcomes</p>
              </div>
            </div>

            {/* Dropdown — rendered outside overflow-hidden so it never gets clipped */}
            <div className="flex-1 min-w-0">
              {dispositionsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <div className="w-3.5 h-3.5 border border-slate-200 border-t-indigo-500 rounded-full animate-spin flex-shrink-0" />
                  Loading dispositions…
                </div>
              ) : (
                <Controller name="disposition_id" control={control}
                  render={({ field }) => (
                    <DispositionMultiSelect
                      dispositions={dispositions}
                      selected={field.value ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-2.5 py-2">
          <button type="button" onClick={() => navigate('/campaigns')} className="btn-outline px-6">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary px-6">
            <Save size={15} />
            {isPending ? 'Saving…' : 'Update Campaign'}
          </button>
        </div>
      </form>
    </div>
  )
}
