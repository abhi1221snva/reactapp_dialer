import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Phone, Clock, Tag, Radio,
  ChevronDown, X, Search, CheckCircle2, Zap, Mail, List,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { userService } from '../../services/user.service'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'

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
const campaignSchema = z.object({
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

type CampaignFormValues = z.infer<typeof campaignSchema>

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
export function CreateCampaign() {
  const navigate = useNavigate()
  const clientId = useAuthStore(s => s.user?.parent_id)
  const [selectedTimerKey, setSelectedTimerKey] = useState<'none' | 'custom' | number>('none')
  const [customTimerTitle, setCustomTimerTitle] = useState('')
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE)

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(campaignSchema) as any,
    defaultValues: {
      title: '', description: '', status: 1, dial_mode: '',
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

  const dialMode         = watch('dial_mode')
  const callerIdType     = watch('caller_id')
  const amd              = watch('amd')
  const amdDropAction    = watch('amd_drop_action')
  const redirectTo       = watch('redirect_to')
  const noAgentAction    = watch('no_agent_available_action')

  useEffect(() => {
    setValue('call_ratio', '')
    setValue('duration', dialMode === 'outbound_ai' ? '60' : '')
    setValue('redirect_to', '')
    setValue('redirect_to_dropdown', null)
    setValue('no_agent_dropdown_action', null)
  }, [dialMode, setValue])
  useEffect(() => { setValue('redirect_to_dropdown', null) }, [redirectTo, setValue])
  useEffect(() => { setValue('no_agent_dropdown_action', null) }, [noAgentAction, setValue])

  const showCallRatioDuration = dialMode === 'predictive_dial' || dialMode === 'outbound_ai'
  const showAutomatedDuration = dialMode === 'predictive_dial'
  const showAmd               = dialMode === 'predictive_dial' || dialMode === 'outbound_ai'
  const showNoAgent           = dialMode === 'predictive_dial'
  const showRedirectTo        = dialMode === 'outbound_ai'

  const { data: campaignTypesData } = useQuery({ queryKey: ['campaign-types'], queryFn: () => campaignService.getTypes() })
  const dialModes: Array<{ value: string; label: string }> =
    ((campaignTypesData as { data?: { data?: unknown[] } })?.data?.data as Array<{ title: string; title_url: string }> ?? [])
      .map(t => ({ value: t.title_url, label: t.title }))

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

  const { data: extensionsData } = useQuery({ queryKey: ['extensions-all', clientId], queryFn: () => campaignService.getExtensions(), enabled: showNoAgent || showRedirectTo })
  const extensions: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> =
    (Array.isArray((extensionsData as { data?: { data?: unknown[] } })?.data?.data) ? (extensionsData as { data: { data: Array<{ id: number; first_name?: string; last_name?: string; extension?: string }> } }).data.data : [])

  const { data: ivrData } = useQuery({ queryKey: ['ivr-list', clientId], queryFn: () => campaignService.getIvrList(), enabled: showNoAgent || showRedirectTo })
  const ivrList: Array<{ ivr_id: string; ivr_desc: string }> =
    (Array.isArray((ivrData as { data?: { data?: unknown[] } })?.data?.data) ? (ivrData as { data: { data: Array<{ ivr_id: string; ivr_desc: string }> } }).data.data : [])

  const { data: ringGroupData } = useQuery({ queryKey: ['ring-groups', clientId], queryFn: () => campaignService.getRingGroups(), enabled: showRedirectTo })
  const ringGroups: Array<{ id: number; title: string }> =
    (Array.isArray((ringGroupData as { data?: { data?: unknown[] } })?.data?.data) ? (ringGroupData as { data: { data: Array<{ id: number; title: string }> } }).data.data : [])

  const { data: voiceTemplatesData } = useQuery({ queryKey: ['voice-templates'], queryFn: () => campaignService.getVoiceTemplates(), enabled: showAmd || showRedirectTo })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vtRaw = (voiceTemplatesData as any)?.data?.data
  const voiceTemplates: Array<{ templete_id: string; templete_name: string }> =
    Array.isArray(vtRaw) ? vtRaw : Array.isArray(vtRaw?.data) ? vtRaw.data : []

  const { data: audioMessagesData } = useQuery({ queryKey: ['audio-messages'], queryFn: () => campaignService.getAudioMessages(), enabled: showAmd || showRedirectTo })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amRaw = (audioMessagesData as any)?.data?.data
  const audioMessages: Array<{ ivr_id: string; ivr_desc: string }> =
    Array.isArray(amRaw) ? amRaw : Array.isArray(amRaw?.data) ? amRaw.data : []

  const { data: promptsData } = useQuery({ queryKey: ['prompts-all'], queryFn: () => campaignService.getPrompts(), enabled: showRedirectTo })
  const prompts: Array<{ id: number; title: string }> =
    (Array.isArray((promptsData as { data?: { data?: unknown[] } })?.data?.data) ? (promptsData as { data: { data: Array<{ id: number; title: string }> } }).data.data : [])

  const { data: callTimersData } = useQuery({ queryKey: ['call-timers-list'], queryFn: () => campaignService.listCallTimers() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callTimers: Array<{ id: number; title: string }> = Array.isArray((callTimersData as any)?.data?.data?.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (callTimersData as any).data.data.data
    : []

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      let callScheduleId: number | undefined
      const timeBasedCalling = selectedTimerKey !== 'none' ? 1 : 0

      if (selectedTimerKey === 'custom') {
        const weekPlan: Record<string, { start: string; end: string }> = {}
        ALL_DAYS.forEach(day => {
          if (weekSchedule[day].enabled) weekPlan[day] = { start: weekSchedule[day].start, end: weekSchedule[day].end }
        })
        const timerTitle = customTimerTitle.trim() || `${data.title} Schedule`
        const timerRes = await campaignService.createCallTimer({ title: timerTitle, week_plan: weekPlan })
        callScheduleId = (timerRes as { data?: { data?: { id?: number } } })?.data?.data?.id
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
        ...(callScheduleId ? { call_schedule_id: callScheduleId } : {}),
      }
      return campaignService.create(payload)
    },
    onSuccess: (res: unknown) => {
      const newId = (res as { data?: { data?: { id?: number } } })?.data?.data?.id
      toast.success('Campaign created successfully')
      if (newId) navigate(`/campaigns/${newId}/attach-leads`)
      else navigate('/campaigns')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to create campaign')
    },
  })

  const isPending = isSubmitting || createMutation.isPending
  const callRatioOptions = dialMode === 'predictive_dial' ? PREDICTIVE_CALL_RATIO : OUTBOUND_CALL_RATIO
  const durationOptions  = dialMode === 'predictive_dial' ? PREDICTIVE_DURATION   : OUTBOUND_DURATION

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <div className="w-full animate-fadeIn -mx-5 -mt-3" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <form onSubmit={handleSubmit(d => createMutation.mutate(d))} noValidate>

        {/* ── Compact Header Bar ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/campaigns')}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all">
              <ArrowLeft size={15} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-800 leading-tight">New Campaign</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Configure and launch a new dialing campaign</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">

        {/* ── Premium Step Tabs ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm mb-6 overflow-hidden">
          <div className="flex divide-x divide-slate-100">
            <div className="flex-1 relative px-5 py-4 bg-gradient-to-b from-indigo-50/60 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-600/20">1</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Details</p>
                  <p className="text-[11px] text-slate-400">Basic settings & configuration</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            </div>
            <div className="flex-1 px-5 py-4 cursor-not-allowed">
              <div className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Attach Leads</p>
                  <p className="text-[11px] text-slate-300">Add lead lists to campaign</p>
                </div>
              </div>
            </div>
            <div className="flex-1 px-5 py-4 cursor-not-allowed">
              <div className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Review</p>
                  <p className="text-[11px] text-slate-300">Verify & launch campaign</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">

            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Campaign Name <span className="text-red-400">*</span></label>
                  <input {...register('title')} className={cn('input', errors.title && 'border-red-400')}
                    placeholder="e.g. Summer Sales 2025" />
                  <FieldError message={errors.title?.message} />
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Description</label>
                  <input {...register('description')} className="input" placeholder="Optional description" />
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Status</label>
                  <Controller name="status" control={control}
                    render={({ field }) => <StatusSelector value={field.value} onChange={field.onChange} />} />
                </div>
              </div>
            </section>

            <section>
              <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Dial Mode <span className="text-red-400">*</span></label>
                  <select {...register('dial_mode')} className={cn('input', errors.dial_mode && 'border-red-400')}>
                    <option value="">— Select Mode —</option>
                    {dialModes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <FieldError message={errors.dial_mode?.message} />
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>
                    Caller Group {dialMode === 'super_power_dial' && <span className="text-red-400">*</span>}
                  </label>
                  <select {...register('group_id')} className={cn('input', errors.group_id && 'border-red-400')}>
                    <option value="">— None —</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.group_name ?? g.title}</option>)}
                  </select>
                  <FieldError message={errors.group_id?.message as string} />
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Hopper Mode</label>
                  <select {...register('hopper_mode', { setValueAs: v => v === '' ? null : Number(v) })} className="input">
                    <option value="1">Linear</option>
                    <option value="2">Random</option>
                  </select>
                </div>
              </div>

              {showCallRatioDuration && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3 pt-3">
                  <div className="form-group mb-0">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>{dialMode === 'predictive_dial' ? 'Call Ratio' : 'Simultaneous Calls'}</label>
                    <select {...register('call_ratio')} className="input">
                      <option value="">— Select —</option>
                      {callRatioOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>{dialMode === 'predictive_dial' ? 'Duration (sec)' : 'Duration'}</label>
                    <select {...register('duration')} className="input">
                      <option value="">— Select —</option>
                      {durationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {showAutomatedDuration ? (
                    <div className="form-group mb-0">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Automated Duration</label>
                      <select {...register('automated_duration')} className="input">
                        <option value="0">No</option>
                        <option value="1">Yes</option>
                      </select>
                    </div>
                  ) : showRedirectTo ? (
                    <div className="form-group mb-0">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Redirect To</label>
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
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>AMD Detection</label>
                      <select {...register('amd')} className="input">
                        <option value="0">Off</option>
                        <option value="1">On</option>
                      </select>
                    </div>
                  )}
                  {showAmd && amd === '1' && (
                    <div className="form-group mb-0">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>AMD Drop Action</label>
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
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Audio Message</label>
                      <select {...register('audio_message_amd', { setValueAs: v => v === '' ? null : v })} className="input">
                        <option value="">— Select —</option>
                        {audioMessages.map(a => <option key={a.ivr_id} value={a.ivr_id}>{a.ivr_desc}</option>)}
                      </select>
                    </div>
                  )}
                  {showAmd && amd === '1' && amdDropAction === 3 && (
                    <div className="form-group mb-0">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Voice Template</label>
                      <select {...register('voice_message_amd', { setValueAs: v => v === '' ? null : v })} className="input">
                        <option value="">— Select —</option>
                        {voiceTemplates.map(vt => <option key={vt.templete_id} value={vt.templete_id}>{vt.templete_name}</option>)}
                      </select>
                    </div>
                  )}
                  {showRedirectTo && redirectTo !== '' && (
                    <div className="form-group mb-0">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3 pt-3">
                  <div className="form-group mb-0">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>No Agent Available</label>
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
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Voice Drop Target</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                        <option value="">— Select Extension —</option>
                        {extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                      </select>
                    </div>
                  )}
                  {noAgentAction === 3 && (
                    <div className="form-group mb-0 col-span-2">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Inbound IVR</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                        <option value="">— Select IVR —</option>
                        {ivrList.map(ivr => <option key={ivr.ivr_id} value={ivr.ivr_id}>{ivr.ivr_desc}</option>)}
                      </select>
                    </div>
                  )}
                  {noAgentAction === 4 && (
                    <div className="form-group mb-0 col-span-2">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Extension</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                        <option value="">— Select Extension —</option>
                        {extensions.map(e => <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(' ') || e.extension}</option>)}
                      </select>
                    </div>
                  )}
                  {noAgentAction === 5 && (
                    <div className="form-group mb-0 col-span-2">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Assistant</label>
                      <select {...register('no_agent_dropdown_action', { setValueAs: v => v === '' ? null : v })} className="input">
                        <option value="123">Assistant</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
              </div>
            </section>

            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Caller ID Type <span className="text-red-400">*</span></label>
                  <select {...register('caller_id')} className="input">
                    <option value="area_code">Area Code</option>
                    <option value="area_code_random">Area Code &amp; Randomizer</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Custom DID {callerIdType === 'custom' && <span className="text-red-400">*</span>}</label>
                  <select {...register('custom_caller_id')} disabled={callerIdType !== 'custom'}
                    className={cn('input', callerIdType !== 'custom' && 'opacity-50', errors.custom_caller_id && 'border-red-400')}>
                    <option value="">— Select DID —</option>
                    {dids.map(d => <option key={d.cli} value={d.cli}>{d.cli}{d.cnam ? ` — ${d.cnam}` : ''}</option>)}
                  </select>
                  <FieldError message={errors.custom_caller_id?.message} />
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Country Code</label>
                  <select {...register('country_code')} className="input">
                    <option value="">— Select Country —</option>
                    {countries.map(c => <option key={c.phonecode} value={c.phonecode}>{c.name} (+{c.phonecode})</option>)}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Call Transfer</label>
                  <select {...register('call_transfer', { valueAsNumber: true })} className="input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
                <div className="form-group mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Call Timer</label>
                    <button type="button"
                      onClick={() => setSelectedTimerKey('custom')}
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
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Timezone</label>
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
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Time-Based Calling</label>
                  <select {...register('time_based_calling', { valueAsNumber: true })} className="input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Dispositions <span className="text-red-400">*</span></label>
                  {dispositionsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 h-[38px]">
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
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Timer Name</label>
                      <input className="input" placeholder="e.g. Business Hours"
                        value={customTimerTitle} onChange={e => setCustomTimerTitle(e.target.value)} />
                    </div>
                    <div className="form-group mb-0">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Timezone</label>
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
            </section>

            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Send Email</label>
                  <select {...register('email', { valueAsNumber: true })} className="input">
                    <option value="0">No</option>
                    <option value="1">User Email</option>
                    <option value="2">Campaign Email</option>
                    <option value="3">System Email</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Send SMS</label>
                  <select {...register('sms', { valueAsNumber: true })} className="input">
                    <option value="0">No</option>
                    <option value="1">User Phone</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Send to CRM</label>
                  <select {...register('send_crm', { valueAsNumber: true })} className="input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }}>Send Report</label>
                  <select {...register('send_report', { valueAsNumber: true })} className="input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>
            </section>

        </div>

        {/* ── Bottom Actions ── */}
        <div className="flex justify-end gap-3 pt-4 pb-2">
          <button type="button" onClick={() => navigate('/campaigns')}
            className="btn-outline px-6 py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="btn-primary px-8 py-2.5 flex items-center gap-2">
            <Save size={15} />
            {isPending ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>

        </div>
      </form>
    </div>
  )
}
