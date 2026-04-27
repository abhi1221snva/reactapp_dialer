import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Radio, Pencil, Play, Pause, Copy,
  Users, LayoutList, Phone, Clock, Globe, Tag,
  ChevronRight, X, Mail, Zap, Shield, MessageSquare,
  CheckCircle2, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { campaignService } from '../../services/campaign.service'
import { smtpService, type SmtpSetting } from '../../services/smtp.service'
import { cn } from '../../utils/cn'

interface CampaignDetailData {
  id?: number; title?: string; description?: string; status?: number | string
  dial_mode?: string; call_ratio?: string | null
  duration?: string | null; hopper_mode?: number | null
  max_lead_temp?: number; min_lead_temp?: number
  caller_id?: string; custom_caller_id?: number | string | null
  call_transfer?: number | string; time_based_calling?: number | string
  call_time_start?: string | null; call_time_end?: string | null
  email?: number | string; sms?: number | string; send_crm?: number | string
  send_report?: number | string; call_metric?: string | number; api?: number | string
  amd?: string | number
  disposition?: Array<{ id: number; title: string }>
  total_leads?: number; called_leads?: number; lists_associated?: number
  hopper_count?: number
}

function isActive(status: string | number | undefined): boolean {
  return status === 'active' || status === 1 || status === '1'
}

function formatTime(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function OnOff({ val, label }: { val?: unknown; label: string }) {
  const on = val === 1 || val === '1' || val === true || Number(val) === 1
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold',
        on ? 'text-emerald-600' : 'text-slate-400'
      )}>
        {on
          ? <><CheckCircle2 size={13} className="text-emerald-500" /> Enabled</>
          : <><XCircle size={13} className="text-slate-300" /> Disabled</>
        }
      </span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-xs text-right font-semibold text-slate-800">{value ?? '—'}</span>
    </div>
  )
}

function FeatureRow({ icon: Icon, label, value, on }: {
  icon: React.ElementType; label: string; value?: string; on?: boolean
}) {
  const hasToggle = on !== undefined
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Icon size={13} className="text-white/50 flex-shrink-0" />
      <span className="text-[11px] text-white/70 font-medium flex-1 min-w-0 truncate">{label}</span>
      {hasToggle ? (
        <span className={cn(
          'text-[11px] font-semibold flex items-center gap-1',
          on ? 'text-emerald-300' : 'text-white/40'
        )}>
          {on ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {on ? 'On' : 'Off'}
        </span>
      ) : (
        <span className="text-[11px] font-semibold text-white/90 text-right truncate max-w-[140px]">{value}</span>
      )}
    </div>
  )
}

function SectionCard({ icon: Icon, title, iconColor, children }: {
  icon: React.ElementType; title: string; iconColor: string; children: React.ReactNode
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <Icon size={14} className={iconColor} />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-1">
        {children}
      </div>
    </div>
  )
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', Number(id)],
    queryFn: () => campaignService.getById(Number(id)),
    enabled: !!id,
  })

  const d: CampaignDetailData = (data as { data?: { data?: CampaignDetailData } })?.data?.data ?? {}

  const toggleMutation = useMutation({
    mutationFn: () =>
      campaignService.toggle(Number(id), isActive(d.status) ? 'inactive' : 'active'),
    onSuccess: () => {
      toast.success(isActive(d.status) ? 'Campaign paused' : 'Campaign activated')
      qc.invalidateQueries({ queryKey: ['campaign', Number(id)] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const copyMutation = useMutation({
    mutationFn: () => campaignService.copy(Number(id)),
    onSuccess: () => {
      toast.success('Campaign duplicated')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      navigate('/campaigns')
    },
    onError: () => toast.error('Failed to duplicate'),
  })

  const { data: smtpSettingsData } = useQuery({
    queryKey: ['campaign-smtp-settings'],
    queryFn: async () => {
      const res = await smtpService.list()
      const payload = res.data?.data ?? res.data ?? []
      return (Array.isArray(payload) ? payload : payload.data ?? []) as SmtpSetting[]
    },
  })

  const callerIdLabel: Record<string, string> = {
    area_code: 'Area Code',
    area_code_random: 'Area Code & Randomizer',
    custom: 'Custom',
  }
  const staticEmailLabel: Record<string, string> = {
    '0': 'No', '1': 'With User Email', '2': 'With Campaign Email', '3': 'With System Email',
  }
  const resolveEmailLabel = (val: number | string | undefined): string => {
    const key = String(val ?? '0')
    if (staticEmailLabel[key]) return staticEmailLabel[key]
    const setting = (smtpSettingsData ?? []).find(s => s.id === Number(key))
    if (setting) return setting.from_name ? `${setting.from_name} — ${setting.from_email}` : setting.from_email
    return key === '0' ? 'No' : `SMTP #${key}`
  }
  const hopperModeLabel = d.hopper_mode === 2 ? 'Random' : 'Linear'
  const timeBased = Number(d.time_based_calling) === 1
  const callTimeDisplay = timeBased && d.call_time_start
    ? `${formatTime(d.call_time_start)} – ${formatTime(d.call_time_end)}`
    : 'All Day'
  const dialModeDisplay = d.dial_mode
    ? d.dial_mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '—'

  const total = Number(d.total_leads ?? 0)
  const dialed = Number(d.called_leads ?? 0)

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/campaigns')} className="hover:text-indigo-600 transition-colors">Campaigns</button>
          <ChevronRight size={14} className="text-slate-300" />
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/campaigns')}
          className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Campaigns
        </button>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-900 font-medium truncate">{d.title || `Campaign #${id}`}</span>
      </div>

      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute top-6 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative px-6 py-5">
          {/* Top row: title + actions */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/30 text-white text-xl font-bold flex items-center justify-center flex-shrink-0 shadow-lg">
                <Radio size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate leading-tight">
                  {d.title || `Campaign #${id}`}
                </h1>
                {d.description && (
                  <p className="text-white/70 text-sm truncate mt-0.5">{d.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                    isActive(d.status)
                      ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                      : 'bg-white/10 border-white/20 text-white/60'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', isActive(d.status) ? 'bg-emerald-300' : 'bg-white/40')} />
                    {isActive(d.status) ? 'Active' : 'Inactive'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white/80">
                    <Radio size={11} />
                    {dialModeDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/25 transition-colors"
              >
                {isActive(d.status) ? <Pause size={13} /> : <Play size={13} />}
                {isActive(d.status) ? 'Pause' : 'Activate'}
              </button>
              <button
                onClick={() => navigate(`/campaigns/${id}/edit`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/25 transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => copyMutation.mutate()}
                disabled={copyMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 transition-colors"
              >
                <Copy size={13} /> Duplicate
              </button>
            </div>
          </div>

          {/* Two-column: Stats (left) + Feature Highlights (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-5 pt-4 border-t border-white/15">
            {/* Left — Key numeric stats (3 cols) */}
            <div className="lg:col-span-3 grid grid-cols-3 sm:grid-cols-3 gap-3">
              {/* Total Leads */}
              <div className="bg-white/10 rounded-xl px-3 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-tight">{total.toLocaleString()}</p>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Total Leads</p>
                </div>
              </div>

              {/* Dialed Leads */}
              <div className="bg-white/10 rounded-xl px-3 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Phone size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-tight">{dialed.toLocaleString()}</p>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Dialed</p>
                </div>
              </div>


              {/* Lists */}
              <div className="bg-white/10 rounded-xl px-3 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <LayoutList size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-tight">{d.lists_associated ?? 0}</p>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Lists</p>
                </div>
              </div>

              {/* Hopper Count */}
              <div className="bg-white/10 rounded-xl px-3 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Tag size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-tight">{d.hopper_count ?? 0}</p>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Hopper</p>
                </div>
              </div>

              {/* Hopper Mode */}
              <div className="bg-white/10 rounded-xl px-3 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{hopperModeLabel}</p>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Hopper Mode</p>
                </div>
              </div>
            </div>

            {/* Right — Feature highlights (2 cols) */}
            <div className="lg:col-span-2 bg-white/8 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2.5">Feature Highlights</p>
              <div className="space-y-2">
                <FeatureRow icon={Clock} label="Call Times" value={callTimeDisplay} />
                <FeatureRow icon={Phone} label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
                <FeatureRow icon={Shield} label="AMD Detection" on={Number(d.amd) === 1} />
                <FeatureRow icon={Globe} label="Call Transfer" on={Number(d.call_transfer) === 1} />
                <FeatureRow icon={MessageSquare} label="SMS" on={Number(d.sms) === 1} />
                <FeatureRow icon={Mail} label="Email" value={resolveEmailLabel(d.email)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail sections — 2-col grid matching User View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard icon={Phone} title="Dialing Configuration" iconColor="text-indigo-500">
          <DetailRow label="Dial Mode" value={dialModeDisplay} />
          <DetailRow label="Hopper Mode" value={hopperModeLabel} />
          {!!d.duration && String(d.duration) !== '0' && <DetailRow label="Duration" value={String(d.duration)} />}
          <DetailRow label="Max Lead Temp" value={String(d.max_lead_temp ?? '—')} />
          <DetailRow label="Min Lead Temp" value={String(d.min_lead_temp ?? '—')} />
          <OnOff val={d.amd} label="AMD Detection" />
        </SectionCard>

        <SectionCard icon={Clock} title="Schedule & Caller ID" iconColor="text-sky-500">
          <DetailRow label="Call Times" value={callTimeDisplay} />
          <DetailRow label="Time-Based Calling" value={timeBased ? 'Enabled' : 'Disabled'} />
          <DetailRow label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
          <OnOff val={d.call_transfer} label="Call Transfer" />
          <OnOff val={d.call_metric} label="Call Metrics" />
        </SectionCard>

        <SectionCard icon={Mail} title="Communication" iconColor="text-emerald-500">
          <DetailRow label="Email" value={resolveEmailLabel(d.email)} />
          <OnOff val={d.sms} label="Send SMS" />
          <OnOff val={d.send_crm} label="Send to CRM" />
          <OnOff val={d.send_report} label="Send Report" />
        </SectionCard>

        <SectionCard icon={Tag} title="Dispositions" iconColor="text-violet-500">
          <div className="py-3">
            {d.disposition && d.disposition.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {d.disposition.map(disp => (
                  <span
                    key={disp.id}
                    className="inline-flex items-center px-2.5 py-1 bg-violet-50 text-violet-700 text-[11px] font-semibold rounded-lg border border-violet-200"
                  >
                    {disp.title}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No dispositions assigned</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
