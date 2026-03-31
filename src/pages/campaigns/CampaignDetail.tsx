import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Radio, Pencil, Play, Pause, Copy,
  Users, LayoutList, Phone, Clock, Globe, Tag,
  ToggleRight, ToggleLeft, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { campaignService } from '../../services/campaign.service'

interface CampaignDetail {
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

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-xs text-right font-semibold text-slate-800">{value ?? '—'}</span>
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

  const d: CampaignDetail = (data as { data?: { data?: CampaignDetail } })?.data?.data ?? {}

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

  const callerIdLabel: Record<string, string> = {
    area_code: 'Area Code',
    area_code_random: 'Area Code & Randomizer',
    custom: 'Custom',
  }
  const emailLabel: Record<string, string> = {
    '0': 'No', '1': 'With User Email', '2': 'With Campaign Email', '3': 'With System Email',
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
  const pct = total > 0 ? Math.min(100, Math.round((dialed / total) * 100)) : 0

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

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Radio size={22} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {d.title || `Campaign #${id}`}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant={isActive(d.status) ? 'green' : 'gray'}>
                  {isActive(d.status) ? 'Active' : 'Inactive'}
                </Badge>
                {d.dial_mode && (
                  <span className="text-xs text-slate-500 capitalize">{dialModeDisplay}</span>
                )}
                {String(d.amd) === '1' && <Badge variant="blue">AMD</Badge>}
                {Number(d.call_metric) === 1 && <Badge variant="purple">Metrics</Badge>}
              </div>
              {d.description && (
                <p className="text-sm text-slate-500 mt-2 max-w-xl">{d.description}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`btn-sm gap-1.5 ${isActive(d.status) ? 'btn-outline text-amber-600 border-amber-200 hover:bg-amber-50' : 'btn-primary'}`}
            >
              {isActive(d.status) ? <Pause size={13} /> : <Play size={13} />}
              {isActive(d.status) ? 'Pause' : 'Activate'}
            </button>
            <button
              onClick={() => navigate(`/campaigns/${id}/edit`)}
              className="btn-outline btn-sm gap-1.5"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => copyMutation.mutate()}
              disabled={copyMutation.isPending}
              className="btn-ghost btn-sm gap-1.5"
            >
              <Copy size={13} /> Duplicate
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users size={16} className="text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{total.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{dialed.toLocaleString()} dialed</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Phone size={16} className="text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{pct}%</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <LayoutList size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lists</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{d.lists_associated ?? 0}</p>
          <p className="text-xs text-slate-400 mt-0.5">attached lists</p>
        </div>
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard icon={Phone} title="Dialing" iconColor="text-indigo-500">
          <DetailRow label="Mode" value={dialModeDisplay} />
          <DetailRow label="Hopper Mode" value={hopperModeLabel} />

          {d.duration && d.duration !== '0' && <DetailRow label="Duration" value={d.duration} />}
          <DetailRow label="Max Lead Temp" value={d.max_lead_temp} />
          <DetailRow label="Min Lead Temp" value={d.min_lead_temp} />
          <DetailRow label="AMD" value={String(d.amd) === '1' ? 'Enabled' : 'Disabled'} />
        </SectionCard>

        <SectionCard icon={Clock} title="Schedule" iconColor="text-sky-500">
          <DetailRow label="Call Times" value={callTimeDisplay} />
          <DetailRow label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
          <DetailRow label="Call Transfer" value={Number(d.call_transfer) === 1 ? 'Yes' : 'No'} />
          <DetailRow label="Metrics" value={Number(d.call_metric) === 1 ? 'Enabled' : 'Disabled'} />
        </SectionCard>

        <SectionCard icon={Globe} title="Communication" iconColor="text-emerald-500">
          <DetailRow label="Email" value={emailLabel[String(d.email ?? '0')] ?? '—'} />
          <DetailRow label="SMS" value={Number(d.sms) === 1 ? 'With User Phone' : 'No'} />
          <DetailRow label="Send to CRM" value={Number(d.send_crm) === 1 ? 'Yes' : 'No'} />
          <DetailRow label="Send Report" value={Number(d.send_report) === 1 ? 'Yes' : 'No'} />
        </SectionCard>

        <SectionCard icon={Tag} title="Dispositions" iconColor="text-violet-500">
          <div className="py-3">
            {d.disposition && d.disposition.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {d.disposition.map(disp => (
                  <span
                    key={disp.id}
                    className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-lg border border-indigo-200"
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

      {/* Status indicators */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          isActive(d.status)
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          {isActive(d.status) ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
          {isActive(d.status) ? 'Campaign Active' : 'Campaign Inactive'}
        </span>
        {String(d.amd) === '1' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
            AMD Enabled
          </span>
        )}
        {Number(d.call_metric) === 1 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
            Metrics On
          </span>
        )}
      </div>
    </div>
  )
}
