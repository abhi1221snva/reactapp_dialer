import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Loader2, AlertCircle, Pencil,
  ChevronDown, X, Search, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { userService } from '../../services/user.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'
import { scrollToFirstError } from '../../utils/publicFormValidation'
import { SearchableSelect } from '../../components/ui/SearchableSelect'

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
                  className="rounded accent-blue-600 cursor-pointer w-3.5 h-3.5" />
              </td>
              <td className="px-2 py-1.5">
                <input type="time" value={schedule[day].start} disabled={!schedule[day].enabled}
                  onChange={e => update(day, 'start', e.target.value)}
                  className="cpn-fi text-[11px] !py-1 w-full disabled:cursor-not-allowed" />
              </td>
              <td className="px-2 py-1.5">
                <input type="time" value={schedule[day].end} disabled={!schedule[day].enabled}
                  onChange={e => update(day, 'end', e.target.value)}
                  className="cpn-fi text-[11px] !py-1 w-full disabled:cursor-not-allowed" />
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

const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }

// ─────────────────────────────────────────────
//  UI Helpers
// ─────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
      <AlertCircle size={11} />{message}
    </span>
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
  const selectAll = (e: React.MouseEvent) => { e.stopPropagation(); onChange(dispositions.map(d => d.id)) }
  const clearAll = (e: React.MouseEvent) => { e.stopPropagation(); onChange([]) }
  const allSelected = selected.length === dispositions.length && dispositions.length > 0
  const selectedDisps = dispositions.filter(d => selected.includes(d.id))

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 h-[36px] rounded-lg border text-sm transition-all text-left bg-white',
          open ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300',
        )}>
        {selected.length === 0 ? (
          <span className="flex-1 text-slate-400 text-[13px] truncate">Select dispositions…</span>
        ) : (
          <div className="flex-1 flex items-center gap-1 overflow-hidden min-w-0">
            {selectedDisps.slice(0, 3).map(d => (
              <span key={d.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-md border border-blue-100 flex-shrink-0 max-w-[110px]">
                <span className="truncate">{d.title}</span>
                <span role="button" onClick={e => { e.stopPropagation(); onChange(selected.filter(x => x !== d.id)) }}
                  className="text-blue-400 hover:text-red-500 cursor-pointer flex-shrink-0 leading-none">
                  <X size={9} />
                </span>
              </span>
            ))}
            {selected.length > 3 && (
              <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">+{selected.length - 3}</span>
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
                    isChecked ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50')}>
                  <span className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                    {isChecked && <CheckCircle2 size={9} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{d.title}</span>
                </button>
              )
            })}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{selected.length}/{dispositions.length} selected</span>
            <div className="flex items-center gap-2">
              {allSelected ? (
                <button type="button" onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-700 font-semibold">Deselect All</button>
              ) : (
                <button type="button" onClick={selectAll} className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold">Select All</button>
              )}
              {selected.length > 0 && !allSelected && (
                <button type="button" onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-700 font-semibold">Clear</button>
              )}
            </div>
          </div>
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
  const [editingTimerId, setEditingTimerId] = useState<number | null>(null)
  const [editTimerLoading, setEditTimerLoading] = useState(false)
  const formScrollRef = useRef<HTMLDivElement>(null)
  const [formErrorCount, setFormErrorCount] = useState(0)

  const handleEditSavedTimer = async (timerId: number) => {
    setEditTimerLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await campaignService.getCallTimer(timerId) as any
      const timer = res?.data?.data
      if (timer) {
        setCustomTimerTitle(timer.title || '')
        const wp = timer.week_plan || {}
        const sched = { ...DEFAULT_WEEK_SCHEDULE }
        ALL_DAYS.forEach(day => {
          if (wp[day]) sched[day] = { enabled: true, start: wp[day].start || '09:00', end: wp[day].end || '17:00' }
          else sched[day] = { ...DEFAULT_WEEK_SCHEDULE[day], enabled: false }
        })
        setWeekSchedule(sched)
        setEditingTimerId(timerId)
        setSelectedTimerKey('custom')
      }
    } catch { toast.error('Failed to load timer') }
    setEditTimerLoading(false)
  }

  const handleSaveEditedTimer = async () => {
    if (!editingTimerId) return
    setEditTimerLoading(true)
    try {
      const weekPlan: Record<string, { start: string; end: string }> = {}
      ALL_DAYS.forEach(day => { if (weekSchedule[day].enabled) weekPlan[day] = { start: weekSchedule[day].start, end: weekSchedule[day].end } })
      await campaignService.updateCallTimer(editingTimerId, { title: customTimerTitle.trim() || undefined, week_plan: weekPlan })
      toast.success('Timer updated')
      queryClient.invalidateQueries({ queryKey: ['call-timers-list'] })
      setSelectedTimerKey(editingTimerId)
      setEditingTimerId(null)
    } catch { toast.error('Failed to update timer') }
    setEditTimerLoading(false)
  }

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

  const { data: extensionsData } = useQuery({ queryKey: ['extensions-all', clientId], queryFn: () => campaignService.getExtensions(), enabled: dialMode === 'predictive_dial' || dialMode === 'outbound_ai' })
  const extensions: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> =
    (Array.isArray((extensionsData as { data?: { data?: unknown[] } })?.data?.data) ? (extensionsData as { data: { data: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> } }).data.data : [])

  const { data: ivrData } = useQuery({ queryKey: ['ivr-list', clientId], queryFn: () => campaignService.getIvrList(), enabled: dialMode === 'predictive_dial' || dialMode === 'outbound_ai' })
  const ivrList: Array<{ ivr_id: string; ivr_desc: string }> =
    (Array.isArray((ivrData as { data?: { data?: unknown[] } })?.data?.data) ? (ivrData as { data: { data: Array<{ ivr_id: string; ivr_desc: string }> } }).data.data : [])

  const { data: ringGroupData } = useQuery({ queryKey: ['ring-groups', clientId], queryFn: () => campaignService.getRingGroups(), enabled: dialMode === 'outbound_ai' })
  const ringGroups: Array<{ id: number; title: string }> =
    (Array.isArray((ringGroupData as { data?: { data?: unknown[] } })?.data?.data) ? (ringGroupData as { data: { data: Array<{ id: number; title: string }> } }).data.data : [])

  const { data: voiceTemplatesData } = useQuery({ queryKey: ['voice-templates'], queryFn: () => campaignService.getVoiceTemplates(), enabled: dialMode === 'predictive_dial' || dialMode === 'outbound_ai' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vtRaw = (voiceTemplatesData as any)?.data?.data
  const voiceTemplates: Array<{ templete_id: string; templete_name: string }> =
    Array.isArray(vtRaw) ? vtRaw : Array.isArray(vtRaw?.data) ? vtRaw.data : []

  const { data: audioMessagesData } = useQuery({ queryKey: ['audio-messages'], queryFn: () => campaignService.getAudioMessages(), enabled: dialMode === 'predictive_dial' || dialMode === 'outbound_ai' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amRaw = (audioMessagesData as any)?.data?.data
  const audioMessages: Array<{ ivr_id: string; ivr_desc: string }> =
    Array.isArray(amRaw) ? amRaw : Array.isArray(amRaw?.data) ? amRaw.data : []

  const { data: promptsData } = useQuery({ queryKey: ['prompts-all'], queryFn: () => campaignService.getPrompts(), enabled: dialMode === 'outbound_ai' })
  const prompts: Array<{ id: number; title: string }> =
    (Array.isArray((promptsData as { data?: { data?: unknown[] } })?.data?.data) ? (promptsData as { data: { data: Array<{ id: number; title: string }> } }).data.data : [])

  const { data: callTimersData } = useQuery({ queryKey: ['call-timers-list'], queryFn: () => campaignService.listCallTimers() })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callTimers: Array<{ id: number; title: string }> = Array.isArray((callTimersData as any)?.data?.data?.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (callTimersData as any).data.data.data
    : []

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
        const timerData = (res as { data?: { data?: { title?: string; timezone?: string; week_plan?: Record<string, { start: string; end: string }> } } })?.data?.data
        if (timerData?.title) setCustomTimerTitle(timerData.title)
        if (timerData?.timezone) setValue('timezone', timerData.timezone)
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
      navigate(`/campaigns/${campaignId}/attach-leads`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update campaign')
    },
  })

  if (loadingCampaign) return <PageLoader />

  const isPending = isSubmitting || updateMutation.isPending

  const onSubmit = (data: EditCampaignFormValues) => {
    setFormErrorCount(0)
    updateMutation.mutate(data)
  }

  const onFormError = (errs: Record<string, unknown>) => {
    const keys = Object.keys(errs)
    setFormErrorCount(keys.length)
    scrollToFirstError(keys, formScrollRef.current)
  }

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <div className="-mx-5 -mt-5 flex flex-col animate-fadeIn" style={{ height: 'calc(100vh - 70px)' }}>
      <style>{`
        .cpn-fi{width:100%;height:36px;padding:0 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
        .cpn-fi:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
        .cpn-fi::placeholder{color:#94a3b8}
        .cpn-fi:disabled{opacity:.45;cursor:not-allowed}
        select.cpn-fi{appearance:none;cursor:pointer;padding-right:28px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:13px}
        .cpn-reveal{animation:cpnReveal .25s ease-out}
        @keyframes cpnReveal{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .cpn-toggle{display:inline-flex;background:#f1f5f9;border-radius:8px;padding:2px;gap:2px}
        .cpn-toggle button{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;border:none;cursor:pointer;transition:all .15s;background:transparent;white-space:nowrap}
        .cpn-toggle button.active{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
        .cpn-toggle button:hover:not(.active){color:#475569}
        .cpn-g3{display:grid;grid-template-columns:repeat(1,1fr);gap:12px 16px}
        @media(min-width:640px){.cpn-g3{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:1024px){.cpn-g3{grid-template-columns:repeat(3,1fr)}}
        .cpn-g4{display:grid;grid-template-columns:repeat(1,1fr);gap:12px 16px}
        @media(min-width:640px){.cpn-g4{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:1024px){.cpn-g4{grid-template-columns:repeat(4,1fr)}}
      `}</style>

      {/* Hidden fields */}
      <input type="hidden" {...register('campaign_id', { valueAsNumber: true })} />
      <input type="hidden" {...register('hopper_mode')} />
      <input type="hidden" {...register('max_lead_temp')} />
      <input type="hidden" {...register('min_lead_temp')} />
      <input type="hidden" {...register('percentage_inc_dec')} />
      <input type="hidden" {...register('call_metric')} />
      <input type="hidden" {...register('api')} />
      <input type="hidden" {...register('crm_type')} />
      <input type="hidden" {...register('voip_configuration_id')} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/campaigns')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-[15px] font-semibold text-slate-800">Edit Campaign</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/campaigns')}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors hidden sm:block">Cancel</button>
          <button type="submit" form="edit-campaign-form" disabled={isPending}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isPending ? 'Saving…' : 'Save Campaign'}
          </button>
        </div>
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #bfdbfe, #3b82f6)' }} />

      {/* Form */}
      <form id="edit-campaign-form" onSubmit={handleSubmit(onSubmit, onFormError)} noValidate className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">

          {/* -- LEFT: Main form fields -- */}
          <div ref={formScrollRef} className="overflow-y-auto scroll-smooth border-r border-slate-200 bg-white">
            <div className="p-5">

              {formErrorCount > 0 && (
                <div className="cpn-reveal mb-4" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  Please fix <strong>{formErrorCount}</strong> error{formErrorCount > 1 ? 's' : ''} before saving.
                </div>
              )}

              {/* === Section: Campaign Details === */}
              <section>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Campaign Details
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                <div className="cpn-g4">
                  <div data-field-key="title">
                    <label style={LBL}>Campaign Name <span className="text-red-400">*</span></label>
                    <Controller name="title" control={control}
                      render={({ field }) => (
                        <input
                          value={field.value}
                          onChange={e => {
                            const v = e.target.value
                            field.onChange(v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v)
                          }}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          className={cn('cpn-fi', errors.title && '!border-red-400')}
                          placeholder="e.g. Summer Sales 2026"
                        />
                      )}
                    />
                    <FieldError message={errors.title?.message} />
                  </div>
                  <div data-field-key="dial_mode">
                    <label style={LBL}>Dial Mode <span className="text-red-400">*</span></label>
                    <select {...register('dial_mode')} className={cn('cpn-fi', errors.dial_mode && '!border-red-400')}>
                      <option value="">Select Mode</option>
                      {dialModes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <FieldError message={errors.dial_mode?.message} />
                  </div>
                  <div data-field-key="group_id">
                    <label style={LBL}>Caller Group {dialMode === 'super_power_dial' && <span className="text-red-400">*</span>}</label>
                    <Controller name="group_id" control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={String(field.value ?? '')}
                          onChange={v => field.onChange(v)}
                          options={groups.map(g => ({ value: String(g.id), label: g.group_name ?? g.title ?? '' }))}
                          placeholder="None"
                          className={cn('cpn-fi', errors.group_id && '!border-red-400')}
                          emptyLabel="None"
                        />
                      )}
                    />
                    <FieldError message={errors.group_id?.message as string} />
                  </div>
                  <div>
                    <label style={LBL}>Send Email</label>
                    <select {...register('email', { valueAsNumber: true })} className="cpn-fi">
                      <option value={0}>No</option>
                      <option value={1}>With User Email</option>
                      <option value={2}>With Campaign Email</option>
                      <option value={3}>With System Email</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* === Section: Predictive Dial Settings === */}
              {dialMode === 'predictive_dial' && (
                <section className="cpn-reveal mt-6">
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                      Predictive Dial Settings
                    </h3>
                    <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                  </div>
                  <div className="cpn-g3">
                    <div>
                      <label style={LBL}>Call Ratio</label>
                      <select {...register('call_ratio')} className="cpn-fi">
                        <option value="">Select</option>
                        {PREDICTIVE_CALL_RATIO.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Duration (sec)</label>
                      <select {...register('duration')} className="cpn-fi">
                        <option value="">Select</option>
                        {PREDICTIVE_DURATION.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>No Agent Available</label>
                      <select {...register('no_agent_available_action', { setValueAs: v => v === '' ? null : Number(v) })} className="cpn-fi">
                        <option value="">Select</option>
                        <option value="1">Hang Up</option><option value="2">Voice Drop</option><option value="3">Inbound IVR</option>
                        <option value="4">Extension</option><option value="5">Assistant AI</option>
                      </select>
                    </div>
                    {noAgentAction && noAgentAction !== 1 && (
                      <div className="cpn-reveal">
                        <label style={LBL}>{noAgentAction === 2 ? 'Voice Drop Target' : noAgentAction === 3 ? 'IVR Menu' : noAgentAction === 4 ? 'Extension' : 'Assistant'}</label>
                        <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="cpn-fi">
                          <option value="">Select</option>
                          {noAgentAction === 2 && extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                          {noAgentAction === 3 && ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc}</option>)}
                          {noAgentAction === 4 && extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                          {noAgentAction === 5 && <option value="123">Assistant</option>}
                        </select>
                      </div>
                    )}
                    {amd === '1' && (
                      <div className="cpn-reveal">
                        <label style={LBL}>AMD Drop Action</label>
                        <select {...register('amd_drop_action', { setValueAs: v => v === '' ? null : Number(v) })} className="cpn-fi">
                          <option value="">Select</option>
                          <option value="1">Hang Up</option><option value="2">Audio Message</option><option value="3">Voice Template</option>
                        </select>
                      </div>
                    )}
                    {amd === '1' && amdDropAction === 2 && (
                      <div className="cpn-reveal">
                        <label style={LBL}>Audio Message</label>
                        <select {...register('audio_message_amd', { setValueAs: v => v === '' ? null : v })} className="cpn-fi">
                          <option value="">Select</option>
                          {audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc}</option>)}
                        </select>
                      </div>
                    )}
                    {amd === '1' && amdDropAction === 3 && (
                      <div className="cpn-reveal">
                        <label style={LBL}>Voice Template</label>
                        <select {...register('voice_message_amd', { setValueAs: v => v === '' ? null : v })} className="cpn-fi">
                          <option value="">Select</option>
                          {voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* === Section: Outbound AI Settings === */}
              {dialMode === 'outbound_ai' && (
                <section className="cpn-reveal mt-6">
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                      Outbound AI Settings
                    </h3>
                    <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                  </div>
                  {/* All outbound fields in single row */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* Col: Calls & Duration (shared heading, two inputs) */}
                    <div style={{ flex: '1 1 0' }}>
                      <label style={LBL}>Calls &amp; Duration</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select {...register('call_ratio')} className="cpn-fi" title="Simultaneous Calls">
                          <option value="">Calls</option>
                          {OUTBOUND_CALL_RATIO.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select {...register('duration')} className="cpn-fi" title="Ring Duration">
                          <option value="">Duration</option>
                          {OUTBOUND_DURATION.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Col: Redirect To */}
                    <div style={{ flex: '1 1 0' }}>
                      <label style={LBL}>Redirect To</label>
                      <select {...register('redirect_to')} className="cpn-fi">
                        <option value="">None</option>
                        <option value="1">Audio Message</option><option value="2">Voice Template</option><option value="3">Extension</option>
                        <option value="4">Ring Group</option><option value="5">IVR</option><option value="6">Voice AI</option>
                      </select>
                    </div>
                    {/* Col: Target (dynamic) */}
                    {redirectTo !== '' && (
                      <div style={{ flex: '1 1 0' }} className="cpn-reveal">
                        <label style={LBL}>
                          {redirectTo === '1' ? 'Audio Message' : redirectTo === '2' ? 'Voice Template' : redirectTo === '3' ? 'Extension' : redirectTo === '4' ? 'Ring Group' : redirectTo === '5' ? 'IVR' : 'Voice AI Prompt'}
                        </label>
                        <select {...register('redirect_to_dropdown', { setValueAs: v => v === '' ? null : v })} className="cpn-fi">
                          <option value="">Select</option>
                          {redirectTo === '1' && audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc}</option>)}
                          {redirectTo === '2' && voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                          {redirectTo === '3' && extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                          {redirectTo === '4' && ringGroups.map(rg => <option key={rg.id} value={rg.id}>{rg.title}</option>)}
                          {redirectTo === '5' && ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc}</option>)}
                          {redirectTo === '6' && prompts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>
                    )}
                    {/* Col: AMD Drop Action (dynamic) */}
                    {amd === '1' && (
                      <div style={{ flex: '1 1 0' }} className="cpn-reveal">
                        <label style={LBL}>AMD Drop Action</label>
                        <select {...register('amd_drop_action', { setValueAs: v => v === '' ? null : Number(v) })} className="cpn-fi">
                          <option value="">Select</option>
                          <option value="1">Hang Up</option><option value="2">Audio Message</option><option value="3">Voice Template</option>
                        </select>
                      </div>
                    )}
                    {/* Col: AMD sub-option (dynamic) */}
                    {amd === '1' && amdDropAction === 2 && (
                      <div style={{ flex: '1 1 0' }} className="cpn-reveal">
                        <label style={LBL}>Audio Message</label>
                        <select {...register('audio_message_amd', { setValueAs: v => v === '' ? null : v })} className="cpn-fi">
                          <option value="">Select</option>
                          {audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc}</option>)}
                        </select>
                      </div>
                    )}
                    {amd === '1' && amdDropAction === 3 && (
                      <div style={{ flex: '1 1 0' }} className="cpn-reveal">
                        <label style={LBL}>Voice Template</label>
                        <select {...register('voice_message_amd', { setValueAs: v => v === '' ? null : v })} className="cpn-fi">
                          <option value="">Select</option>
                          {voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* === Section: Caller ID & Settings === */}
              <section className="mt-6">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Caller ID &amp; Settings
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                {/* Row 1: Caller ID + DID + Country Code */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Caller ID Type</label>
                    <select {...register('caller_id')} className="cpn-fi">
                      <option value="area_code">Area Code</option>
                      <option value="area_code_random">Area Code + Random</option>
                      <option value="custom">Custom DID</option>
                    </select>
                  </div>
                  {callerIdType === 'custom' && (
                    <div style={{ flex: '1 1 0' }} className="cpn-reveal" data-field-key="custom_caller_id">
                      <label style={LBL}>Custom DID <span className="text-red-400">*</span></label>
                      <Controller name="custom_caller_id" control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            value={String(field.value ?? '')}
                            onChange={v => field.onChange(v)}
                            options={dids.map(d => ({ value: d.cli, label: d.cli + (d.cnam ? ` — ${d.cnam}` : '') }))}
                            placeholder="Select DID"
                            className={cn('cpn-fi', errors.custom_caller_id && '!border-red-400')}
                            emptyLabel="Select DID"
                          />
                        )}
                      />
                      <FieldError message={errors.custom_caller_id?.message} />
                    </div>
                  )}
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Country Code</label>
                    <Controller name="country_code" control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={String(field.value ?? '')}
                          onChange={v => field.onChange(v)}
                          options={countries.map(c => ({ value: String(c.phonecode), label: `${c.name} (+${c.phonecode})` }))}
                          placeholder="Default"
                          className="cpn-fi"
                          emptyLabel="Default"
                        />
                      )}
                    />
                  </div>
                </div>
                {/* Row 2: Dispositions + Description */}
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Dispositions</label>
                    {dispositionsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 h-[36px]">
                        <div className="w-3.5 h-3.5 border border-slate-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0" /> Loading…
                      </div>
                    ) : (
                      <Controller name="disposition_id" control={control}
                        render={({ field }) => <DispositionMultiSelect dispositions={dispositions} selected={field.value ?? []} onChange={field.onChange} />}
                      />
                    )}
                  </div>
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Description <span className="text-slate-300 font-normal normal-case">optional</span></label>
                    <input {...register('description')} className="cpn-fi" placeholder="Brief campaign description" />
                  </div>
                </div>
                {/* Call Timer */}
                <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedTimerKey !== 'none' ? 12 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: 0.3 }}>Call Timer</span>
                    <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 7, padding: 2, gap: 2, border: '1px solid #e2e8f0' }}>
                      <button type="button" onClick={() => setSelectedTimerKey('none')}
                        style={{ padding: '4px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                          background: selectedTimerKey === 'none' ? '#2563eb' : 'transparent',
                          color: selectedTimerKey === 'none' ? '#fff' : '#64748b' }}>
                        No Limit
                      </button>
                      {callTimers.length > 0 && (
                        <button type="button" onClick={() => setSelectedTimerKey(callTimers[0]?.id ?? 'none')}
                          style={{ padding: '4px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                            background: typeof selectedTimerKey === 'number' ? '#2563eb' : 'transparent',
                            color: typeof selectedTimerKey === 'number' ? '#fff' : '#64748b' }}>
                          Saved
                        </button>
                      )}
                      <button type="button" onClick={() => setSelectedTimerKey('custom')}
                        style={{ padding: '4px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                          background: selectedTimerKey === 'custom' ? '#2563eb' : 'transparent',
                          color: selectedTimerKey === 'custom' ? '#fff' : '#64748b' }}>
                        Custom
                      </button>
                    </div>
                  </div>

                  {/* Saved timer */}
                  {typeof selectedTimerKey === 'number' && (
                    <div className="cpn-reveal" style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 0' }}>
                        <label style={LBL}>Select Timer</label>
                        <select className="cpn-fi" value={String(selectedTimerKey)} onChange={e => setSelectedTimerKey(Number(e.target.value))}>
                          {callTimers.map(t => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 0' }}>
                        <label style={LBL}>Timezone</label>
                        <select {...register('timezone')} className="cpn-fi">
                          <option value="America/New_York">New York (ET)</option><option value="America/Chicago">Chicago (CT)</option>
                          <option value="America/Denver">Denver (MT)</option><option value="America/Los_Angeles">Los Angeles (PT)</option>
                          <option value="America/Phoenix">Phoenix (AZ)</option><option value="America/Anchorage">Anchorage (AK)</option>
                          <option value="Pacific/Honolulu">Honolulu (HI)</option><option value="UTC">UTC</option>
                        </select>
                      </div>
                      <button type="button" disabled={editTimerLoading} onClick={() => handleEditSavedTimer(selectedTimerKey)}
                        style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        {editTimerLoading ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />} Edit
                      </button>
                    </div>
                  )}

                  {/* Custom / Edit timer */}
                  {selectedTimerKey === 'custom' && (
                    <div className="cpn-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {editingTimerId && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Editing saved timer</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => { setEditingTimerId(null); setSelectedTimerKey(editingTimerId); setCustomTimerTitle('') }}
                              style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" disabled={editTimerLoading} onClick={handleSaveEditedTimer}
                              style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#2563eb', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {editTimerLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Timer
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: '1 1 0' }}>
                          <label style={LBL}>Timer Name</label>
                          <input className="cpn-fi" placeholder="e.g. Business Hours" value={customTimerTitle} onChange={e => setCustomTimerTitle(e.target.value)} />
                        </div>
                        <div style={{ flex: '1 1 0' }}>
                          <label style={LBL}>Timezone</label>
                          <select {...register('timezone')} className="cpn-fi">
                            <option value="America/New_York">New York (ET)</option><option value="America/Chicago">Chicago (CT)</option>
                            <option value="America/Denver">Denver (MT)</option><option value="America/Los_Angeles">Los Angeles (PT)</option>
                            <option value="America/Phoenix">Phoenix (AZ)</option><option value="America/Anchorage">Anchorage (AK)</option>
                            <option value="Pacific/Honolulu">Honolulu (HI)</option><option value="UTC">UTC</option>
                          </select>
                        </div>
                      </div>
                      <WeekScheduleGrid schedule={weekSchedule} onChange={setWeekSchedule} />
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>

          {/* -- RIGHT: Toggle/Status sidebar -- */}
          <div style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
            <div className="p-4 space-y-3">
              <div>
                <label style={LBL}>Status</label>
                <Controller name="status" control={control}
                  render={({ field }) => (
                    <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                      <button type="button" className={cn(field.value === 1 && 'active')} style={{ flex: 1, ...(field.value === 1 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(1)}>Active</button>
                      <button type="button" className={cn(field.value === 0 && 'active')} style={{ flex: 1, ...(field.value === 0 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(0)}>Inactive</button>
                    </div>
                  )}
                />
              </div>
              <div>
                <label style={LBL}>Call Transfer</label>
                <Controller name="call_transfer" control={control}
                  render={({ field }) => (
                    <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                      <button type="button" className={cn(field.value === 0 && 'active')} style={{ flex: 1, ...(field.value === 0 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(0)}>No</button>
                      <button type="button" className={cn(field.value === 1 && 'active')} style={{ flex: 1, ...(field.value === 1 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(1)}>Yes</button>
                    </div>
                  )}
                />
              </div>
              {dialMode === 'predictive_dial' && (
                <div className="cpn-reveal">
                  <label style={LBL}>Automated Duration</label>
                  <Controller name="automated_duration" control={control}
                    render={({ field }) => (
                      <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                        <button type="button" className={cn(field.value === '0' && 'active')} style={{ flex: 1, ...(field.value === '0' ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange('0')}>No</button>
                        <button type="button" className={cn(field.value === '1' && 'active')} style={{ flex: 1, ...(field.value === '1' ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange('1')}>Yes</button>
                      </div>
                    )}
                  />
                </div>
              )}
              {(dialMode === 'predictive_dial' || dialMode === 'outbound_ai') && (
                <div className="cpn-reveal">
                  <label style={LBL}>AMD Detection</label>
                  <Controller name="amd" control={control}
                    render={({ field }) => (
                      <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                        <button type="button" className={cn(field.value === '0' && 'active')} style={{ flex: 1, ...(field.value === '0' ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange('0')}>Off</button>
                        <button type="button" className={cn(field.value === '1' && 'active')} style={{ flex: 1, ...(field.value === '1' ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange('1')}>On</button>
                      </div>
                    )}
                  />
                </div>
              )}
              <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
              <div>
                <label style={LBL}>Send SMS</label>
                <Controller name="sms" control={control}
                  render={({ field }) => {
                    const v = Number(field.value)
                    return (
                      <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                        <button type="button" className={cn(v === 0 && 'active')} style={{ flex: 1, ...(v === 0 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(0)}>Off</button>
                        <button type="button" className={cn(v === 1 && 'active')} style={{ flex: 1, ...(v === 1 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(1)}>User Phone</button>
                      </div>
                    )
                  }}
                />
              </div>
              <div>
                <label style={LBL}>Send to CRM</label>
                <Controller name="send_crm" control={control}
                  render={({ field }) => {
                    const v = Number(field.value)
                    return (
                      <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                        <button type="button" className={cn(v === 0 && 'active')} style={{ flex: 1, ...(v === 0 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(0)}>Off</button>
                        <button type="button" className={cn(v === 1 && 'active')} style={{ flex: 1, ...(v === 1 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(1)}>On</button>
                      </div>
                    )
                  }}
                />
              </div>
              <div>
                <label style={LBL}>Send Report</label>
                <Controller name="send_report" control={control}
                  render={({ field }) => {
                    const v = Number(field.value)
                    return (
                      <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                        <button type="button" className={cn(v === 0 && 'active')} style={{ flex: 1, ...(v === 0 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(0)}>Off</button>
                        <button type="button" className={cn(v === 1 && 'active')} style={{ flex: 1, ...(v === 1 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(1)}>On</button>
                      </div>
                    )
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
