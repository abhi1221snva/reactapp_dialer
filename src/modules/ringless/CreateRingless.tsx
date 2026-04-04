import { useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Loader2, AlertCircle, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ringlessService } from '../../services/ringless.service'
import { campaignService } from '../../services/campaign.service'
import { cn } from '../../utils/cn'
import { scrollToFirstError } from '../../utils/publicFormValidation'

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
const ringlessSchema = z.object({
  title: z.string().min(1, 'Campaign name is required').max(255),
  description: z.string().max(255).optional().default(''),
  status: z.number().int().default(1),
  call_ratio: z.string().optional().default('1'),
  duration: z.string().optional().default(''),
  caller_id: z.enum(['area_code', 'area_code_random', 'custom']).default('area_code'),
  custom_caller_id: z.string().optional().default(''),
  country_code: z.string().optional().default('1'),
  voice_template_id: z.string().or(z.number()),
  sip_gateway_id: z.string().or(z.number()).optional().nullable(),
  time_based_calling: z.number().int().default(0),
  call_time_start: z.string().optional().nullable().default('09:00'),
  call_time_end: z.string().optional().nullable().default('17:00'),
  timezone: z.string().max(64).optional().default('America/New_York'),
  timezone_rule: z.number().int().default(0),
}).superRefine((data, ctx) => {
  if (data.caller_id === 'custom' && (!data.custom_caller_id || data.custom_caller_id === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom Caller ID is required', path: ['custom_caller_id'] })
  }
  if (!data.voice_template_id || data.voice_template_id === '') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Voice template is required', path: ['voice_template_id'] })
  }
})

type RinglessFormValues = z.infer<typeof ringlessSchema>

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const CALL_RATIO_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1))

const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
      <AlertCircle size={11} />{message}
    </span>
  )
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export function CreateRingless() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const formScrollRef = useRef<HTMLDivElement>(null)
  const [formErrorCount, setFormErrorCount] = useState(0)

  // Call Timer state
  const [selectedTimerKey, setSelectedTimerKey] = useState<'none' | 'custom' | number>('none')
  const [customTimerTitle, setCustomTimerTitle] = useState('')
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE)
  const [editingTimerId, setEditingTimerId] = useState<number | null>(null)
  const [editTimerLoading, setEditTimerLoading] = useState(false)

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
    register, handleSubmit, control, watch,
    formState: { errors, isSubmitting },
  } = useForm<RinglessFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ringlessSchema) as any,
    defaultValues: {
      title: '', description: '', status: 1,
      call_ratio: '1', duration: '',
      caller_id: 'area_code', custom_caller_id: '', country_code: '1',
      voice_template_id: '', sip_gateway_id: '',
      time_based_calling: 0, call_time_start: '09:00', call_time_end: '17:00',
      timezone: 'America/New_York', timezone_rule: 0,
    },
  })

  const callerIdType = watch('caller_id')

  // Dropdown data
  const { data: templatesData } = useQuery({
    queryKey: ['ringless-voice-templates'],
    queryFn: () => ringlessService.getVoiceTemplates(),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vtRaw = (templatesData as any)?.data?.data
  const templates: Array<{ id?: number; ivr_id?: string | number; title?: string; name?: string; ivr_desc?: string }> =
    Array.isArray(vtRaw) ? vtRaw : Array.isArray(vtRaw?.data) ? vtRaw.data : []

  const { data: sipData } = useQuery({
    queryKey: ['sip-gateways'],
    queryFn: () => ringlessService.getSipGateways(),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sgRaw = (sipData as any)?.data?.data
  const sipGateways: Array<{ id: number; client_name?: string; sip_trunk_name?: string; sip_trunk_host?: string }> =
    Array.isArray(sgRaw) ? sgRaw : Array.isArray(sgRaw?.data) ? sgRaw.data : []

  const { data: didsData } = useQuery({
    queryKey: ['dids-all'],
    queryFn: () => campaignService.getDids(),
    enabled: callerIdType === 'custom',
  })
  const dids: Array<{ cli: string; cnam?: string }> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray((didsData as any)?.data?.data) ? (didsData as any).data.data : []
  )

  const { data: countriesData } = useQuery({
    queryKey: ['country-codes'],
    queryFn: () => ringlessService.getCountryCodes(),
  })
  const countries: Array<{ phonecode: string; name: string }> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray((countriesData as any)?.data?.data) ? (countriesData as any).data.data : []
  )

  const { data: callTimersData } = useQuery({ queryKey: ['call-timers-list'], queryFn: () => campaignService.listCallTimers() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callTimers: Array<{ id: number; title: string }> = Array.isArray((callTimersData as any)?.data?.data?.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (callTimersData as any).data.data.data
    : []

  const createMutation = useMutation({
    mutationFn: async (data: RinglessFormValues) => {
      let callScheduleId: number | undefined
      const timeBasedCalling = selectedTimerKey !== 'none' ? 1 : 0

      if (selectedTimerKey === 'custom') {
        const weekPlan: Record<string, { start: string; end: string }> = {}
        ALL_DAYS.forEach(day => {
          if (weekSchedule[day].enabled) weekPlan[day] = { start: weekSchedule[day].start, end: weekSchedule[day].end }
        })
        const timerTitle = customTimerTitle.trim() || `${data.title} Schedule`
        const timerRes = await campaignService.createCallTimer({ title: timerTitle, week_plan: weekPlan })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callScheduleId = (timerRes as any)?.data?.data?.id
      } else if (typeof selectedTimerKey === 'number') {
        callScheduleId = selectedTimerKey
      }

      const payload: Record<string, unknown> = {
        ...data,
        status: Number(data.status),
        time_based_calling: timeBasedCalling,
        voice_template_id: Number(data.voice_template_id),
        sip_gateway_id: data.sip_gateway_id ? Number(data.sip_gateway_id) : undefined,
        country_code: Number(data.country_code),
        timezone_rule: Number(data.timezone_rule),
        ...(callScheduleId ? { call_schedule_id: callScheduleId } : {}),
      }
      if (data.caller_id !== 'custom') delete payload.custom_caller_id
      return ringlessService.create(payload)
    },
    onSuccess: (res: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['ringless-campaigns'] })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (res as any)?.data
      const nested = d?.data ?? d ?? {}
      const inner = Array.isArray(nested) ? nested[0] ?? {} : nested
      const newId = inner?.id ?? inner?.campaign_id
      toast.success('Campaign created successfully')
      if (newId) navigate(`/ringless/${newId}/attach-leads`)
      else navigate('/ringless')
    },
    onError: (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message
      toast.error(msg || 'Failed to create campaign')
    },
  })

  const onSubmit = (data: RinglessFormValues) => {
    setFormErrorCount(0)
    createMutation.mutate(data)
  }

  const onFormError = (errs: Record<string, unknown>) => {
    const keys = Object.keys(errs)
    setFormErrorCount(keys.length)
    scrollToFirstError(keys, formScrollRef.current)
  }

  const isPending = isSubmitting || createMutation.isPending

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
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/ringless')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-[15px] font-semibold text-slate-800">Create Ringless Campaign</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/ringless')}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors hidden sm:block">Cancel</button>
          <button type="submit" form="create-ringless-form" disabled={isPending}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isPending ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #bfdbfe, #3b82f6)' }} />

      {/* Form */}
      <form id="create-ringless-form" onSubmit={handleSubmit(onSubmit, onFormError)} noValidate className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">

          {/* ── LEFT: Main form fields ── */}
          <div ref={formScrollRef} className="overflow-y-auto scroll-smooth border-r border-slate-200 bg-white">
            <div className="p-5">

              {formErrorCount > 0 && (
                <div className="cpn-reveal mb-4" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', color: '#7f1d1d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  Please fix <strong>{formErrorCount}</strong> error{formErrorCount > 1 ? 's' : ''} before saving.
                </div>
              )}

              {/* ═══ Section: Campaign Details ═══ */}
              <section>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Campaign Details
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                <div className="cpn-g3">
                  <div data-field-key="title">
                    <label style={LBL}>Name <span className="text-red-400">*</span></label>
                    <input {...register('title')} className={cn('cpn-fi', errors.title && '!border-red-400')} placeholder="e.g. April Promo Blast" />
                    <FieldError message={errors.title?.message} />
                  </div>
                  <div data-field-key="voice_template_id">
                    <label style={LBL}>Voice Template <span className="text-red-400">*</span></label>
                    <Controller name="voice_template_id" control={control}
                      render={({ field }) => (
                        <select value={String(field.value ?? '')} onChange={e => field.onChange(e.target.value)} className={cn('cpn-fi', errors.voice_template_id && '!border-red-400')}>
                          <option value="">Select a voice template…</option>
                          {templates.map(t => {
                            const tid = String(t.id ?? '')
                            return (
                              <option key={tid} value={tid}>
                                {t.ivr_desc ?? t.title ?? t.name ?? `Template #${tid}`}
                              </option>
                            )
                          })}
                        </select>
                      )}
                    />
                    <FieldError message={errors.voice_template_id?.message as string} />
                  </div>
                  <div>
                    <label style={LBL}>Description <span className="text-slate-300 font-normal normal-case">optional</span></label>
                    <input {...register('description')} className="cpn-fi" placeholder="Brief campaign description" />
                  </div>
                </div>
              </section>

              {/* ═══ Section: Calling Configuration ═══ */}
              <section className="mt-6">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Calling Configuration
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                <div className="cpn-g3">
                  <div>
                    <label style={LBL}>Call Ratio</label>
                    <select {...register('call_ratio')} className="cpn-fi">
                      <option value="">Select</option>
                      {CALL_RATIO_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Call Duration</label>
                    <select {...register('duration')} className="cpn-fi">
                      <option value="">Default</option>
                      <option value="30">30 sec</option>
                      <option value="60">1 Min</option>
                      <option value="120">2 Min</option>
                      <option value="300">5 Min</option>
                      <option value="600">10 Min</option>
                      <option value="1200">20 Min</option>
                      <option value="1800">30 Min</option>
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>SIP Gateways</label>
                    <select {...register('sip_gateway_id')} className="cpn-fi">
                      <option value="">Auto-select</option>
                      {sipGateways.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.sip_trunk_name ?? g.client_name ?? g.sip_trunk_host ?? `Gateway #${g.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* ═══ Section: Caller ID & Settings ═══ */}
              <section className="mt-6">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Caller ID &amp; Settings
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Caller ID</label>
                    <select {...register('caller_id')} className="cpn-fi">
                      <option value="area_code">Area Code</option>
                      <option value="area_code_random">Area Code + Random</option>
                      <option value="custom">Custom DID</option>
                    </select>
                  </div>
                  {callerIdType === 'custom' && (
                    <div style={{ flex: '1 1 0' }} className="cpn-reveal" data-field-key="custom_caller_id">
                      <label style={LBL}>Custom Caller ID (Select DID) <span className="text-red-400">*</span></label>
                      <select {...register('custom_caller_id')} className={cn('cpn-fi', errors.custom_caller_id && '!border-red-400')}>
                        <option value="">Select DID</option>
                        {dids.map(d => <option key={d.cli} value={d.cli}>{d.cli}{d.cnam ? ` — ${d.cnam}` : ''}</option>)}
                      </select>
                      <FieldError message={errors.custom_caller_id?.message} />
                    </div>
                  )}
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Country Code</label>
                    <select {...register('country_code')} className="cpn-fi">
                      <option value="">Default</option>
                      {countries.map(c => <option key={c.phonecode} value={c.phonecode}>{c.name} (+{c.phonecode})</option>)}
                    </select>
                  </div>
                </div>

                {/* Call Timer — exact match with Campaign Management */}
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

          {/* ── RIGHT: Toggle/Status sidebar ── */}
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
              <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
              <div>
                <label style={LBL}>Time Zone Rule</label>
                <Controller name="timezone_rule" control={control}
                  render={({ field }) => (
                    <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                      <button type="button" className={cn(field.value === 0 && 'active')} style={{ flex: 1, ...(field.value === 0 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(0)}>No</button>
                      <button type="button" className={cn(field.value === 1 && 'active')} style={{ flex: 1, ...(field.value === 1 ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => field.onChange(1)}>Yes</button>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
