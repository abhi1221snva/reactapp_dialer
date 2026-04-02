import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ArrowRight, Save, Phone, Clock, Tag,
  ChevronDown, X, Search, CheckCircle2, Zap, Mail,
  Radio,
} from 'lucide-react'
import { List, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { userService } from '../../services/user.service'
import { listService } from '../../services/list.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'
import { CampaignListsSection } from './CampaignListsSection'
import { Badge } from '../../components/ui/Badge'

// ─────────────────────────────────────────────
//  Week Schedule
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
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Day</th>
            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">On</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Start</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">End</th>
          </tr>
        </thead>
        <tbody>
          {ALL_DAYS.map(day => (
            <tr key={day} className={cn('border-b border-slate-100 last:border-0 transition-opacity', !schedule[day].enabled && 'opacity-40')}>
              <td className="px-3 py-1.5 font-medium text-slate-700 capitalize text-xs">{day}</td>
              <td className="px-3 py-1.5 text-center">
                <input type="checkbox" checked={schedule[day].enabled}
                  onChange={e => update(day, 'enabled', e.target.checked)}
                  className="rounded accent-indigo-600 cursor-pointer w-3.5 h-3.5" />
              </td>
              <td className="px-2 py-1.5">
                <input type="time" value={schedule[day].start} disabled={!schedule[day].enabled}
                  onChange={e => update(day, 'start', e.target.value)}
                  className="input text-[11px] py-1 w-full disabled:cursor-not-allowed" />
              </td>
              <td className="px-2 py-1.5">
                <input type="time" value={schedule[day].end} disabled={!schedule[day].enabled}
                  onChange={e => update(day, 'end', e.target.value)}
                  className="input text-[11px] py-1 w-full disabled:cursor-not-allowed" />
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
const editCampaignSchema = z.object({
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
  crm_type: z.string().optional().default(''),
}).superRefine((data, ctx) => {
  if (data.dial_mode === 'super_power_dial' && (!data.group_id || data.group_id === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Caller group required for Super Power Dial', path: ['group_id'] })
  }
  if (data.caller_id === 'custom' && (!data.custom_caller_id || data.custom_caller_id === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom Caller ID is required', path: ['custom_caller_id'] })
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
  crm_type?: string | null
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const PREDICTIVE_CALL_RATIO = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']
const OUTBOUND_CALL_RATIO = Array.from({ length: 30 }, (_, i) => String(i + 1))
const PREDICTIVE_DURATION = Array.from({ length: 16 }, (_, i) => ({ value: String(i), label: `${i}` }))
const OUTBOUND_DURATION = [
  { value: '60', label: '1 Min' }, { value: '120', label: '2 Min' },
  { value: '300', label: '5 Min' }, { value: '600', label: '10 Min' },
  { value: '1200', label: '20 Min' }, { value: '1800', label: '30 Min' },
]

// ─────────────────────────────────────────────
//  UI Helpers
// ─────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[11px] text-red-500 font-medium">{message}</p>
}

// ─────────────────────────────────────────────
//  Status Segmented Control
// ─────────────────────────────────────────────
function StatusSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts = [
    { v: 1, label: 'Active', on: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    { v: 0, label: 'Inactive', on: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all',
            value === o.v ? o.on : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300',
          )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', value === o.v ? o.dot : 'bg-slate-300')} />
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Compact Disposition Multi-Select
// ─────────────────────────────────────────────
function DispositionMultiSelect({
  dispositions, selected, onChange,
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

  const filtered = dispositions.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  const clearAll = (e: React.MouseEvent) => { e.stopPropagation(); onChange([]) }
  const selectedDisps = dispositions.filter(d => selected.includes(d.id))

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 h-[38px] rounded-lg border text-sm transition-all text-left bg-white',
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300',
        )}>
        {selected.length === 0 ? (
          <span className="flex-1 text-slate-400 text-sm truncate">Select dispositions…</span>
        ) : (
          <div className="flex-1 flex items-center gap-1 overflow-hidden min-w-0">
            {selectedDisps.slice(0, 2).map(d => (
              <span key={d.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded border border-indigo-100 flex-shrink-0 max-w-[100px]">
                <span className="truncate">{d.title}</span>
                <span role="button" onClick={e => { e.stopPropagation(); onChange(selected.filter(x => x !== d.id)) }}
                  className="text-indigo-400 hover:text-red-500 cursor-pointer flex-shrink-0 leading-none">
                  <X size={9} />
                </span>
              </span>
            ))}
            {selected.length > 2 && (
              <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">+{selected.length - 2} more</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {selected.length > 0 && (
            <span onClick={clearAll} className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer p-0.5 leading-none">
              <X size={12} />
            </span>
          )}
          <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
            <Search size={12} className="text-slate-400 flex-shrink-0" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search dispositions…"
              className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400" />
            {search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600"><X size={11} /></button>}
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No dispositions found</p>
            ) : filtered.map(d => {
              const isChecked = selected.includes(d.id)
              return (
                <button key={d.id} type="button" onClick={() => toggle(d.id)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors',
                    isChecked ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50')}>
                  <span className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300')}>
                    {isChecked && <CheckCircle2 size={9} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{d.title}</span>
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{selected.length} selected</span>
              <button type="button" onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-700 font-semibold">Clear all</button>
            </div>
          )}
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
  const queryClient = useQueryClient()
  const [selectedTimerKey, setSelectedTimerKey] = useState<'none' | 'custom' | number>('none')
  const [customTimerTitle, setCustomTimerTitle] = useState('')
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE)
  const [existingTimerId, setExistingTimerId] = useState<number | null>(null)

  type StepKey = 'details' | 'lists' | 'review'
  const [activeStep, setActiveStep] = useState<StepKey>('details')

  const {
    register, handleSubmit, control, watch, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditCampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editCampaignSchema) as any,
    defaultValues: {
      campaign_id: campaignId, title: '', description: '', status: 1, dial_mode: '',
      group_id: '', call_ratio: '', duration: '60', automated_duration: '',
      hopper_mode: 1, max_lead_temp: 100, min_lead_temp: 500, percentage_inc_dec: '',
      caller_id: 'area_code', custom_caller_id: '', country_code: '', voip_configuration_id: '',
      call_transfer: 0, time_based_calling: 0, call_time_start: '09:00', call_time_end: '17:00',
      timezone: 'America/New_York', email: 0, sms: 0, send_crm: 0, send_report: 0,
      call_metric: '0', api: 1, amd: '0', amd_drop_action: null,
      audio_message_amd: null, voice_message_amd: null,
      redirect_to: '', redirect_to_dropdown: null,
      no_agent_available_action: null, no_agent_dropdown_action: null,
      disposition_id: [], crm_type: '',
    },
  })

  const dialMode             = watch('dial_mode')
  const callerIdType         = watch('caller_id')
  const amd                  = watch('amd')
  const amdDropAction        = watch('amd_drop_action')
  const redirectTo           = watch('redirect_to')
  const noAgentAction        = watch('no_agent_available_action')

  // Reset dependent dropdowns when parent changes
  useEffect(() => { setValue('redirect_to_dropdown', null) }, [redirectTo, setValue])
  useEffect(() => { setValue('no_agent_dropdown_action', null) }, [noAgentAction, setValue])

  // Derived flags
  const showCallRatioDuration = dialMode === 'predictive_dial' || dialMode === 'outbound_ai'
  const showAutomatedDuration = dialMode === 'predictive_dial'
  const showAmd               = dialMode === 'predictive_dial' || dialMode === 'outbound_ai'
  const showNoAgent           = dialMode === 'predictive_dial'
  const showRedirectTo        = dialMode === 'outbound_ai'

  // Dropdown queries
  const { data: campaignTypesData } = useQuery({ queryKey: ['campaign-types'], queryFn: () => campaignService.getTypes() })
  const dialModes: Array<{ value: string; label: string }> =
    ((campaignTypesData as { data?: { data?: unknown[] } })?.data?.data as Array<{ title: string; title_url: string }> ?? [])
      .map(t => ({ value: t.title_url, label: t.title }))

  const { data: campaignData, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignService.getById(campaignId),
    enabled: Boolean(campaignId),
    staleTime: 0,
    refetchOnMount: 'always',
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
    (Array.isArray((didsData as { data?: { data?: unknown[] } })?.data?.data) ? (didsData as { data: { data: Array<{ cli: string; cnam?: string }> } }).data.data : [])

  const { data: countriesData } = useQuery({ queryKey: ['country-codes'], queryFn: () => campaignService.getCountryCodes() })
  const countries: Array<{ phonecode: string; name: string }> =
    (Array.isArray((countriesData as { data?: { data?: unknown[] } })?.data?.data) ? (countriesData as { data: { data: Array<{ phonecode: string; name: string }> } }).data.data : [])

  const { data: extensionsData } = useQuery({ queryKey: ['extensions-all', clientId], queryFn: () => campaignService.getExtensions() })
  const extensions: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> =
    (Array.isArray((extensionsData as { data?: { data?: unknown[] } })?.data?.data) ? (extensionsData as { data: { data: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> } }).data.data : [])

  const { data: ivrData } = useQuery({ queryKey: ['ivr-list', clientId], queryFn: () => campaignService.getIvrList() })
  const ivrList: Array<{ ivr_id: string; ivr_desc: string }> =
    (Array.isArray((ivrData as { data?: { data?: unknown[] } })?.data?.data) ? (ivrData as { data: { data: Array<{ ivr_id: string; ivr_desc: string }> } }).data.data : [])

  const { data: ringGroupData } = useQuery({ queryKey: ['ring-groups', clientId], queryFn: () => campaignService.getRingGroups() })
  const ringGroups: Array<{ id: number; title: string }> =
    (Array.isArray((ringGroupData as { data?: { data?: unknown[] } })?.data?.data) ? (ringGroupData as { data: { data: Array<{ id: number; title: string }> } }).data.data : [])

  const { data: voiceTemplatesData } = useQuery({ queryKey: ['voice-templates'], queryFn: () => campaignService.getVoiceTemplates() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vtRaw = (voiceTemplatesData as any)?.data?.data
  const voiceTemplates: Array<{ templete_id: string; templete_name: string }> =
    Array.isArray(vtRaw) ? vtRaw : Array.isArray(vtRaw?.data) ? vtRaw.data : []

  const { data: audioMessagesData } = useQuery({ queryKey: ['audio-messages'], queryFn: () => campaignService.getAudioMessages() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amRaw = (audioMessagesData as any)?.data?.data
  const audioMessages: Array<{ ivr_id: string; ivr_desc: string }> =
    Array.isArray(amRaw) ? amRaw : Array.isArray(amRaw?.data) ? amRaw.data : []

  const { data: promptsData } = useQuery({ queryKey: ['prompts-all'], queryFn: () => campaignService.getPrompts() })
  const prompts: Array<{ id: number; title: string }> =
    (Array.isArray((promptsData as { data?: { data?: unknown[] } })?.data?.data) ? (promptsData as { data: { data: Array<{ id: number; title: string }> } }).data.data : [])

  const { data: callTimersData } = useQuery({ queryKey: ['call-timers-list'], queryFn: () => campaignService.listCallTimers() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callTimers: Array<{ id: number; title: string }> = Array.isArray((callTimersData as any)?.data?.data?.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (callTimersData as any).data.data.data
    : []

  // Review tab: fetch lists attached to this campaign
  const { data: listsData } = useQuery({
    queryKey: ['campaign-lists-review', campaignId],
    queryFn: () => listService.listByCampaign(campaignId, { page: 1, limit: 100, search: '', filters: {} }),
    enabled: Boolean(campaignId) && activeStep === 'review',
    staleTime: 0,
  })

  // Populate form from API
  useEffect(() => {
    const raw = (campaignData as { data?: { data?: CampaignApiData } })?.data?.data
    if (!raw) return
    const c = raw as CampaignApiData & { dispositions?: unknown[] }
    const existingDispositionIds = Array.isArray(c.dispositions)
      ? c.dispositions.map(d => {
          if (typeof d === 'object' && d !== null && 'id' in d) return Number((d as { id?: number }).id ?? 0)
          return Number(d)
        }).filter(n => n > 0)
      : Array.isArray(c.disposition) ? c.disposition.map(d => d.id) : []
    reset({
      campaign_id: campaignId,
      title: c.title ?? '', description: c.description ?? '',
      status: Number(c.status ?? 1),
      dial_mode: c.dial_mode ?? '',
      group_id: c.group_id != null ? String(c.group_id) : '',
      call_ratio: c.call_ratio != null ? String(c.call_ratio) : '',
      duration: c.duration != null ? String(c.duration) : '',
      automated_duration: c.automated_duration != null ? String(c.automated_duration) : '',
      hopper_mode: c.hopper_mode ?? 1,
      max_lead_temp: Number(c.max_lead_temp ?? 100), min_lead_temp: Number(c.min_lead_temp ?? 500),
      percentage_inc_dec: c.percentage_inc_dec != null ? String(c.percentage_inc_dec) : '',
      caller_id: (c.caller_id as 'area_code' | 'area_code_random' | 'custom') ?? 'area_code',
      custom_caller_id: c.custom_caller_id != null ? String(c.custom_caller_id) : '',
      country_code: c.country_code != null ? String(c.country_code) : '',
      voip_configuration_id: c.voip_configuration_id != null ? String(c.voip_configuration_id) : '',
      call_transfer: Number(c.call_transfer ?? 0),
      time_based_calling: Number(c.time_based_calling ?? 0),
      call_time_start: c.call_time_start ? c.call_time_start.substring(0, 5) : '09:00',
      call_time_end: c.call_time_end ? c.call_time_end.substring(0, 5) : '17:00',
      timezone: (c.timezone as string) || 'America/New_York',
      email: Number(c.email ?? 0), sms: Number(c.sms ?? 0),
      send_crm: Number(c.send_crm ?? 0), send_report: Number(c.send_report ?? 0),
      call_metric: (String(c.call_metric ?? '0') as '0' | '1'),
      api: Number(c.api ?? 1),
      amd: (String(c.amd ?? '0') as '0' | '1'),
      amd_drop_action: c.amd_drop_action ?? null,
      audio_message_amd: c.audio_message_amd != null ? String(c.audio_message_amd) : null,
      voice_message_amd: c.voice_message_amd != null ? String(c.voice_message_amd) : null,
      redirect_to: c.redirect_to != null ? String(c.redirect_to) : '',
      redirect_to_dropdown: c.redirect_to_dropdown != null ? String(c.redirect_to_dropdown) : null,
      no_agent_available_action: c.no_agent_available_action ?? null,
      no_agent_dropdown_action: c.no_agent_dropdown_action != null ? String(c.no_agent_dropdown_action) : null,
      disposition_id: existingDispositionIds,
      crm_type: c.crm_type ?? '',
    })
    const schedId = (c as Record<string, unknown>).call_schedule_id
    if (schedId) {
      setExistingTimerId(Number(schedId))
      setSelectedTimerKey(Number(schedId))
      campaignService.getCallTimer(Number(schedId)).then((res: unknown) => {
        const timerData = (res as { data?: { data?: { title?: string; week_plan?: Record<string, { start: string; end: string }> } } })?.data?.data
        if (timerData?.title) setCustomTimerTitle(timerData.title)
        const wp = timerData?.week_plan
        if (wp && typeof wp === 'object') {
          const merged = { ...DEFAULT_WEEK_SCHEDULE }
          ALL_DAYS.forEach(day => {
            if (wp[day]) merged[day] = { enabled: true, start: wp[day].start, end: wp[day].end }
            else merged[day] = { ...merged[day], enabled: false }
          })
          setWeekSchedule(merged)
        }
      }).catch(() => {/* ignore */})
    } else if (Number(c.time_based_calling) === 1) {
      setSelectedTimerKey('custom')
    }
  }, [campaignData, campaignId, reset])

  // When callTimers loads, if selectedTimerKey is a numeric ID not in the list, switch to custom mode
  useEffect(() => {
    if (typeof selectedTimerKey === 'number' && callTimers.length > 0) {
      const found = callTimers.some(t => t.id === selectedTimerKey)
      if (!found) {
        setExistingTimerId(selectedTimerKey)
        setSelectedTimerKey('custom')
      }
    }
  }, [callTimers, selectedTimerKey])

  const updateMutation = useMutation({
    mutationFn: async (data: EditCampaignFormValues) => {
      let callScheduleId: number | undefined
      const timeBasedCalling = selectedTimerKey !== 'none' ? 1 : 0

      if (selectedTimerKey === 'custom') {
        const weekPlan: Record<string, { start: string; end: string }> = {}
        ALL_DAYS.forEach(day => {
          if (weekSchedule[day].enabled) weekPlan[day] = { start: weekSchedule[day].start, end: weekSchedule[day].end }
        })
        const timerTitle = customTimerTitle.trim() || `${data.title} Schedule`
        if (existingTimerId) {
          await campaignService.updateCallTimer(existingTimerId, { title: timerTitle, week_plan: weekPlan })
          callScheduleId = existingTimerId
        } else {
          const timerRes = await campaignService.createCallTimer({ title: timerTitle, week_plan: weekPlan })
          callScheduleId = (timerRes as { data?: { data?: { id?: number } } })?.data?.data?.id
        }
      } else if (typeof selectedTimerKey === 'number') {
        callScheduleId = selectedTimerKey
      }

      const payload: Record<string, unknown> = {
        ...data,
        time_based_calling: timeBasedCalling,
        group_id: data.group_id ? Number(data.group_id) : 0,
        amd_drop_action: data.amd_drop_action ?? 1,
        no_agent_available_action: data.no_agent_available_action ?? 1,
        no_agent_dropdown_action: data.no_agent_dropdown_action ? Number(data.no_agent_dropdown_action) : 0,
        voicedrop_option_user_id: 0,
        country_code: data.country_code ? Number(data.country_code) : undefined,
        voip_configuration_id: data.voip_configuration_id ? Number(data.voip_configuration_id) : undefined,
        redirect_to_dropdown: data.redirect_to_dropdown ? Number(data.redirect_to_dropdown) : undefined,
        audio_message_amd: data.audio_message_amd ? Number(data.audio_message_amd) : undefined,
        voice_message_amd: data.voice_message_amd ? Number(data.voice_message_amd) : undefined,
        custom_caller_id: data.custom_caller_id || undefined,
        ...(callScheduleId ? { call_schedule_id: callScheduleId } : {}),
      }
      return campaignService.update(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      toast.success('Campaign updated')
      setActiveStep('lists')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update campaign')
    },
  })

  if (loadingCampaign) return <PageLoader />

  const isPending = isSubmitting || updateMutation.isPending
  const callRatioOptions = dialMode === 'predictive_dial' ? PREDICTIVE_CALL_RATIO : OUTBOUND_CALL_RATIO
  const durationOptions  = dialMode === 'predictive_dial' ? PREDICTIVE_DURATION   : OUTBOUND_DURATION

  const STEPS: Array<{ key: StepKey; num: number; label: string; sub: string }> = [
    { key: 'details', num: 1, label: 'Details', sub: 'Basic settings & configuration' },
    { key: 'lists', num: 2, label: 'Manage Lists', sub: 'Add lead lists to campaign' },
    { key: 'review', num: 3, label: 'Review', sub: 'Verify & launch campaign' },
  ]

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <div className="w-full animate-fadeIn space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/campaigns')}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-none">Edit Campaign</h1>
          <p className="text-xs text-slate-400 mt-0.5">Campaign #{campaignId}</p>
        </div>
      </div>

      {/* ── Premium Step Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex divide-x divide-slate-100">
          {STEPS.map(step => (
            <button key={step.key} type="button" onClick={() => setActiveStep(step.key)}
              className={cn(
                'flex-1 relative px-5 py-4 text-left transition-all',
                activeStep === step.key
                  ? 'bg-gradient-to-b from-indigo-50/60 to-white'
                  : 'hover:bg-slate-50/50',
              )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all',
                  activeStep === step.key
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-100 text-slate-400',
                )}>{step.num}</div>
                <div>
                  <p className={cn('text-sm font-semibold', activeStep === step.key ? 'text-slate-900' : 'text-slate-500')}>{step.label}</p>
                  <p className={cn('text-[11px]', activeStep === step.key ? 'text-slate-400' : 'text-slate-300')}>{step.sub}</p>
                </div>
              </div>
              {activeStep === step.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB 1: Campaign Details Form ═══ */}
      {activeStep === 'details' && (
        <form onSubmit={handleSubmit(
          d => updateMutation.mutate(d),
          (errs) => {
            const msgs = Object.values(errs).map(e => e?.message).filter(Boolean)
            toast.error((msgs[0] as string) || 'Please fix the highlighted fields before saving')
          }
        )} noValidate>
          <input type="hidden" {...register('campaign_id', { valueAsNumber: true })} />

          <div className="space-y-5">

            {/* ── Card 1: Campaign Identity ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-transparent">
                <h3 className="text-sm font-semibold text-slate-800">Campaign Identity</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Name your campaign and set its initial status</p>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Campaign Name <span className="text-red-400">*</span></label>
                    <input {...register('title')} className={cn('input', errors.title && 'border-red-400')}
                      placeholder="e.g. Summer Sales 2025" />
                    <FieldError message={errors.title?.message} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                    <input {...register('description')} className="input" placeholder="Optional description" />
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                    <Controller name="status" control={control}
                      render={({ field }) => <StatusSelector value={field.value} onChange={field.onChange} />} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Dialing Configuration ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Dialing Configuration</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Set up dial mode and call behavior</p>
                </div>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Dial Mode <span className="text-red-400">*</span></label>
                    <select {...register('dial_mode')} className={cn('input', errors.dial_mode && 'border-red-400')}>
                      <option value="">— Select Mode —</option>
                      {dialModes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <FieldError message={errors.dial_mode?.message} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">
                      Caller Group {dialMode === 'super_power_dial' && <span className="text-red-400">*</span>}
                    </label>
                    <select {...register('group_id')} className={cn('input', errors.group_id && 'border-red-400')}>
                      <option value="">— None —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.group_name ?? g.title}</option>)}
                    </select>
                    <FieldError message={errors.group_id?.message as string} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Hopper Mode</label>
                    <select {...register('hopper_mode', { setValueAs: v => v === '' ? null : Number(v) })} className="input">
                      <option value="1">Linear</option>
                      <option value="2">Random</option>
                    </select>
                  </div>
                </div>

                {showCallRatioDuration && (
                  <div className="grid grid-cols-3 gap-x-5 gap-y-5 pt-5 border-t border-slate-100">
                    <div className="form-group mb-0">
                      <label className="label text-xs font-semibold text-slate-600 mb-1.5">{dialMode === 'predictive_dial' ? 'Call Ratio' : 'Simultaneous Calls'}</label>
                      <select {...register('call_ratio')} className="input">
                        <option value="">— Select —</option>
                        {callRatioOptions.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="form-group mb-0">
                      <label className="label text-xs font-semibold text-slate-600 mb-1.5">{dialMode === 'predictive_dial' ? 'Duration (sec)' : 'Duration'}</label>
                      <select {...register('duration')} className="input">
                        <option value="">— Select —</option>
                        {durationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    {showAutomatedDuration ? (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Automated Duration</label>
                        <select {...register('automated_duration')} className="input">
                          <option value="0">No</option>
                          <option value="1">Yes</option>
                        </select>
                      </div>
                    ) : showRedirectTo ? (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Redirect To</label>
                        <select {...register('redirect_to')} className="input">
                          <option value="">— None —</option>
                          <option value="1">Audio Message</option>
                          <option value="2">Voice Template</option>
                          <option value="3">Extension</option>
                          <option value="4">Ring Group</option>
                          <option value="5">IVR</option>
                          <option value="6">Voice AI</option>
                        </select>
                      </div>
                    ) : null}
                    {showAmd && (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">AMD Detection</label>
                        <select {...register('amd')} className="input">
                          <option value="0">Off</option>
                          <option value="1">On</option>
                        </select>
                      </div>
                    )}
                    {showAmd && amd === '1' && (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">AMD Drop Action</label>
                        <select {...register('amd_drop_action', { setValueAs: v => v === '' ? null : Number(v) })} className="input">
                          <option value="">— Select —</option>
                          <option value="1">Hang Up</option>
                          <option value="2">Audio Message</option>
                          <option value="3">Voice Template</option>
                        </select>
                      </div>
                    )}
                    {showAmd && amd === '1' && amdDropAction === 2 && (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Audio Message</label>
                        <select {...register('audio_message_amd', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="">— Select —</option>
                          {audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc}</option>)}
                        </select>
                      </div>
                    )}
                    {showAmd && amd === '1' && amdDropAction === 3 && (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Voice Template</label>
                        <select {...register('voice_message_amd', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="">— Select —</option>
                          {voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                        </select>
                      </div>
                    )}
                    {showRedirectTo && redirectTo !== '' && (
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">
                          {redirectTo === '1' ? 'Audio Message' : redirectTo === '2' ? 'Voice Template' : redirectTo === '3' ? 'Extension' : redirectTo === '4' ? 'Ring Group' : redirectTo === '5' ? 'IVR' : 'Voice AI Prompt'}
                        </label>
                        <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="">— Select —</option>
                          {redirectTo === '1' && audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc}</option>)}
                          {redirectTo === '2' && voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                          {redirectTo === '3' && extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                          {redirectTo === '4' && ringGroups.map(rg => <option key={rg.id} value={rg.id}>{rg.title}</option>)}
                          {redirectTo === '5' && ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc}</option>)}
                          {redirectTo === '6' && prompts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {showNoAgent && (
                  <div className="grid grid-cols-3 gap-x-5 gap-y-5 pt-5 border-t border-slate-100">
                    <div className="form-group mb-0">
                      <label className="label text-xs font-semibold text-slate-600 mb-1.5">No Agent Available</label>
                      <select {...register('no_agent_available_action', { setValueAs: v => v === '' ? null : Number(v) })} className="input">
                        <option value="">— Select —</option>
                        <option value="1">Hang Up</option>
                        <option value="2">Voice Drop</option>
                        <option value="3">Inbound IVR</option>
                        <option value="4">Extension</option>
                        <option value="5">Assistant AI</option>
                      </select>
                    </div>
                    {noAgentAction === 2 && (
                      <div className="form-group mb-0 col-span-2">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Voice Drop Target</label>
                        <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="">— Select Extension —</option>
                          {extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                        </select>
                      </div>
                    )}
                    {noAgentAction === 3 && (
                      <div className="form-group mb-0 col-span-2">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Inbound IVR</label>
                        <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="">— Select IVR —</option>
                          {ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc}</option>)}
                        </select>
                      </div>
                    )}
                    {noAgentAction === 4 && (
                      <div className="form-group mb-0 col-span-2">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Extension</label>
                        <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="">— Select Extension —</option>
                          {extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                        </select>
                      </div>
                    )}
                    {noAgentAction === 5 && (
                      <div className="form-group mb-0 col-span-2">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Assistant</label>
                        <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                          <option value="123">Assistant</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Card 3: Caller ID & Routing ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={16} className="text-sky-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Caller ID & Routing</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Configure caller identification and call routing</p>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-4 gap-x-5 gap-y-5">
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Caller ID Type <span className="text-red-400">*</span></label>
                    <select {...register('caller_id')} className="input">
                      <option value="area_code">Area Code</option>
                      <option value="area_code_random">Area Code &amp; Randomizer</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Custom DID {callerIdType === 'custom' && <span className="text-red-400">*</span>}</label>
                    <select {...register('custom_caller_id')} disabled={callerIdType !== 'custom'}
                      className={cn('input', callerIdType !== 'custom' && 'opacity-50', errors.custom_caller_id && 'border-red-400')}>
                      <option value="">— Select DID —</option>
                      {dids.map(d => <option key={d.cli} value={d.cli}>{d.cli}{d.cnam ? ` — ${d.cnam}` : ''}</option>)}
                    </select>
                    <FieldError message={errors.custom_caller_id?.message} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Country Code</label>
                    <select {...register('country_code')} className="input">
                      <option value="">— Select Country —</option>
                      {countries.map(c => <option key={c.phonecode} value={c.phonecode}>{c.name} (+{c.phonecode})</option>)}
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Call Transfer</label>
                    <select {...register('call_transfer', { valueAsNumber: true })} className="input">
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 4: Call Schedule ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Call Schedule & Dispositions</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Set time-based calling rules, schedules and disposition mapping</p>
                </div>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  <div className="form-group mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label text-xs font-semibold text-slate-600 mb-0">Call Timer</label>
                      <button type="button"
                        onClick={() => { setSelectedTimerKey('custom'); setExistingTimerId(null) }}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md transition-colors">
                        + Custom
                      </button>
                    </div>
                    <select
                      className="input"
                      value={selectedTimerKey === 'none' || selectedTimerKey === 'custom' ? '' : String(selectedTimerKey)}
                      onChange={e => {
                        const v = e.target.value
                        if (v === '') setSelectedTimerKey('none')
                        else setSelectedTimerKey(Number(v))
                      }}
                    >
                      <option value="">No Limit (calls anytime)</option>
                      {callTimers.map(t => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
                    </select>
                  </div>
                  {selectedTimerKey !== 'none' && selectedTimerKey !== 'custom' && (
                    <div className="form-group mb-0">
                      <label className="label text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                      <select {...register('timezone')} className="input">
                        <option value="America/New_York">New York (ET)</option>
                        <option value="America/Chicago">Chicago (CT)</option>
                        <option value="America/Denver">Denver (MT)</option>
                        <option value="America/Los_Angeles">Los Angeles (PT)</option>
                        <option value="America/Phoenix">Phoenix (AZ)</option>
                        <option value="America/Anchorage">Anchorage (AK)</option>
                        <option value="Pacific/Honolulu">Honolulu (HI)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Time-Based Calling</label>
                    <select {...register('time_based_calling', { valueAsNumber: true })} className="input">
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Dispositions <span className="text-red-400">*</span></label>
                    {dispositionsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 h-[38px]">
                        <div className="w-3.5 h-3.5 border border-slate-200 border-t-indigo-500 rounded-full animate-spin flex-shrink-0" />
                        Loading dispositions...
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
                {selectedTimerKey === 'custom' && (
                  <div className="border border-sky-100 bg-sky-50/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-sky-700">New Custom Timer</span>
                      <button type="button" onClick={() => setSelectedTimerKey('none')}
                        className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors rounded">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Timer Name</label>
                        <input className="input" placeholder="e.g. Business Hours"
                          value={customTimerTitle} onChange={e => setCustomTimerTitle(e.target.value)} />
                      </div>
                      <div className="form-group mb-0">
                        <label className="label text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                        <select {...register('timezone')} className="input">
                          <option value="America/New_York">New York (ET)</option>
                          <option value="America/Chicago">Chicago (CT)</option>
                          <option value="America/Denver">Denver (MT)</option>
                          <option value="America/Los_Angeles">Los Angeles (PT)</option>
                          <option value="America/Phoenix">Phoenix (AZ)</option>
                          <option value="America/Anchorage">Anchorage (AK)</option>
                          <option value="Pacific/Honolulu">Honolulu (HI)</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    </div>
                    <WeekScheduleGrid schedule={weekSchedule} onChange={setWeekSchedule} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Card 5: Communication ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Communication</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Email, SMS and reporting preferences</p>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-4 gap-x-5 gap-y-5">
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Send Email</label>
                    <select {...register('email', { valueAsNumber: true })} className="input">
                      <option value="0">No</option>
                      <option value="1">User Email</option>
                      <option value="2">Campaign Email</option>
                      <option value="3">System Email</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Send SMS</label>
                    <select {...register('sms', { valueAsNumber: true })} className="input">
                      <option value="0">No</option>
                      <option value="1">User Phone</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Send to CRM</label>
                    <select {...register('send_crm', { valueAsNumber: true })} className="input">
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="label text-xs font-semibold text-slate-600 mb-1.5">Send Report</label>
                    <select {...register('send_report', { valueAsNumber: true })} className="input">
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom actions for Tab 1 */}
          <div className="flex justify-end gap-3 pt-6 pb-2">
            <button type="button" onClick={() => navigate('/campaigns')} className="btn-outline px-6 py-2.5">Cancel</button>
            <button type="submit" disabled={isPending}
              className="btn-primary px-6 flex items-center gap-2">
              {isPending ? (
                <><Save size={15} /> Saving...</>
              ) : (
                <>Save & Continue <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ═══ TAB 2: Manage Lists ═══ */}
      {activeStep === 'lists' && (
        <div className="space-y-4">
          <CampaignListsSection campaignId={campaignId} />
          <div className="flex justify-between pt-2 pb-2">
            <button type="button" onClick={() => setActiveStep('details')} className="btn-outline px-5 flex items-center gap-2">
              <ArrowLeft size={15} /> Back to Details
            </button>
            <button type="button" onClick={() => setActiveStep('review')} className="btn-primary px-6 flex items-center gap-2">
              Next: Review <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: Review ═══ */}
      {activeStep === 'review' && (() => {
        const c = (campaignData as { data?: { data?: Record<string, unknown> } })?.data?.data ?? {} as Record<string, unknown>
        const attachedLists = (listsData as { data?: { data?: Array<Record<string, unknown>> } })?.data?.data ?? []
        const getListName = (row: Record<string, unknown>) => (row.l_title ?? row.title ?? row.list_name ?? `List #${row.list_id ?? row.id}`) as string
        const getLeadCount = (row: Record<string, unknown>) => Number(row.lead_count ?? row.rowListData ?? 0)
        const totalLeads = attachedLists.reduce((sum, r) => sum + getLeadCount(r), 0)
        const dialModeDisplay = c.dial_mode ? String(c.dial_mode).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()) : '--'
        const isActive = c.status === 1 || c.status === '1' || c.status === 'active'
        const callerIdLabel: Record<string, string> = { area_code: 'Area Code', area_code_random: 'Area Code + Randomizer', custom: 'Custom DID' }
        const emailLabel: Record<string, string> = { '0': 'Disabled', '1': 'User Email', '2': 'Campaign Email', '3': 'System Email' }

        // Resolve dispositions
        const rawDisps: unknown[] = (c.dispositions ?? c.disposition ?? []) as unknown[]
        const campaignDispIds = rawDisps.map(d => typeof d === 'object' && d !== null && 'id' in d ? Number((d as {id:number}).id) : Number(d))
        const resolvedDispositions = dispositions.filter(d => campaignDispIds.includes(d.id))

        return (
          <div className="space-y-5">
            {/* Campaign Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Radio size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">{(c.title as string) || 'Untitled Campaign'}</h2>
                    <Badge variant={isActive ? 'green' : 'gray'}>{isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {c.description ? <p className="text-sm text-slate-500 mt-1">{String(c.description)}</p> : null}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><List size={12} className="text-emerald-500" />{attachedLists.length} list{attachedLists.length !== 1 ? 's' : ''}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Users size={12} className="text-blue-500" />{totalLeads.toLocaleString()} total leads</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-0 gap-y-1">
                <div className="md:pr-6">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Zap size={10} /> Dialing Setup</p>
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-start justify-between py-2.5"><span className="text-xs text-slate-500 font-medium">Dial Mode</span><span className="text-xs font-semibold text-slate-800 text-right">{dialModeDisplay}</span></div>
                    <div className="flex items-start justify-between py-2.5"><span className="text-xs text-slate-500 font-medium">Hopper Mode</span><span className="text-xs font-semibold text-slate-800 text-right">{Number(c.hopper_mode) === 2 ? 'Random' : 'Linear'}</span></div>
                  </div>
                </div>
                <div className="md:border-l md:border-slate-100 md:px-6">
                  <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Phone size={10} /> Caller ID & Transfer</p>
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-start justify-between py-2.5"><span className="text-xs text-slate-500 font-medium">Caller ID</span><span className="text-xs font-semibold text-slate-800 text-right">{callerIdLabel[c.caller_id as string ?? ''] ?? '--'}</span></div>
                    <div className="flex items-start justify-between py-2.5"><span className="text-xs text-slate-500 font-medium">Call Transfer</span><span className="text-xs font-semibold text-slate-800 text-right">{Number(c.call_transfer ?? 0) === 1 ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>
                <div className="md:border-l md:border-slate-100 md:pl-6">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={10} /> Schedule & Communication</p>
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-start justify-between py-2.5"><span className="text-xs text-slate-500 font-medium">Timezone</span><span className="text-xs font-semibold text-slate-800 text-right">{(c.timezone as string) ?? 'America/New_York'}</span></div>
                    <div className="flex items-start justify-between py-2.5"><span className="text-xs text-slate-500 font-medium">Email</span><span className="text-xs font-semibold text-slate-800 text-right">{emailLabel[String(c.email ?? '0')] ?? '--'}</span></div>
                  </div>
                </div>
              </div>

              {/* Features & Dispositions row */}
              {(String(c.amd ?? '0') === '1' || Number(c.time_based_calling ?? 0) === 1 || Number(c.sms ?? 0) === 1 || Number(c.send_report ?? 0) === 1 || Number(c.send_crm ?? 0) === 1 || resolvedDispositions.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-0">
                  {(String(c.amd ?? '0') === '1' || Number(c.time_based_calling ?? 0) === 1 || Number(c.sms ?? 0) === 1 || Number(c.send_report ?? 0) === 1 || Number(c.send_crm ?? 0) === 1) && (
                    <div className={cn("pr-5", resolvedDispositions.length > 0 && "md:border-r md:border-slate-100")}>
                      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Features</p>
                      <div className="flex flex-wrap gap-1.5">
                        {String(c.amd ?? '0') === '1' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />AMD Detection</span>}
                        {Number(c.time_based_calling ?? 0) === 1 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Time-Based Calling</span>}
                        {Number(c.sms ?? 0) === 1 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Send SMS</span>}
                        {Number(c.send_report ?? 0) === 1 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Send Report</span>}
                        {Number(c.send_crm ?? 0) === 1 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Send to CRM</span>}
                      </div>
                    </div>
                  )}
                  {resolvedDispositions.length > 0 && (
                    <div className="pl-5 max-md:pt-4 max-md:mt-4 max-md:border-t max-md:border-slate-100 max-md:pl-0">
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag size={10} /> Dispositions ({resolvedDispositions.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {resolvedDispositions.map(d => (
                          <span key={d.id} className="inline-flex items-center px-2.5 py-1 bg-violet-50 text-violet-700 text-[11px] font-semibold rounded-lg border border-violet-200">{d.title}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attached Lists Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50/80 to-transparent border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: '#3b82f618', color: '#3b82f6' }}>
                    <List size={15} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attached Lists</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{attachedLists.length} list{attachedLists.length !== 1 ? 's' : ''} · {totalLeads.toLocaleString()} leads</span>
              </div>
              {attachedLists.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><List size={24} className="text-slate-300" /></div>
                  <p className="text-sm font-medium text-slate-500">No lists attached</p>
                  <p className="text-xs text-slate-400 mt-1">Go back to Manage Lists to add lead lists.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">List Name</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {attachedLists.map((row, idx) => (
                        <tr key={(row.list_id ?? row.id) as number} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-medium text-slate-400">{idx + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm"><List size={13} className="text-white" /></div>
                              <span className="text-sm font-semibold text-slate-800">{getListName(row)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right"><span className="text-sm font-bold text-slate-700">{getLeadCount(row).toLocaleString()}</span></td>
                          <td className="px-5 py-3.5 text-center"><Badge variant={(row.is_active as number) === 1 ? 'green' : 'gray'}>{(row.is_active as number) === 1 ? 'Active' : 'Inactive'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-slate-50/80 border-t border-slate-200">
                      <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Total</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">{totalLeads.toLocaleString()}</td>
                      <td />
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Actions for Review */}
            <div className="flex items-center justify-between pt-1 pb-4">
              <button type="button" onClick={() => setActiveStep('lists')} className="btn-outline px-5 flex items-center gap-2"><ArrowLeft size={15} /> Back to Lists</button>
              <button type="button" onClick={() => { toast.success('Campaign updated successfully'); navigate('/campaigns') }} className="btn-primary px-6 flex items-center gap-2"><Save size={15} /> Update Campaign</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
