import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, CheckCircle2, Save, Voicemail, Phone, Clock, Mail, List,
  Globe, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ringlessService } from '../../services/ringless.service'
import { listService } from '../../services/list.service'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/LoadingSpinner'

interface CampaignData {
  id?: number; title?: string; description?: string; status?: number | string
  caller_id?: string; custom_caller_id?: number | string | null
  country_code?: number | string | null
  time_based_calling?: number | string; call_time_start?: string | null; call_time_end?: string | null
  timezone?: string | null; timezone_rule?: number | string
  voice_template_id?: number | string; voice_template_name?: string
  sip_gateway_id?: number | string; call_ratio?: string | null; duration?: string | null
  rowcount_lead_report?: number; ringless_lead_temps_count?: number; ringless_lead_report_count?: number
}

interface ListRow {
  id: number; list_id?: number; title?: string; list_name?: string; l_title?: string
  lead_count?: number; rowListData?: number; is_active?: number; is_dialing?: number
  updated_at?: string
  [key: string]: unknown
}

function InfoItem({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function TogglePill({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
      on
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-500 border-slate-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {label}
    </span>
  )
}

function formatTime(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export function RinglessEditReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const campaignId = Number(id)

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['ringless-campaign', campaignId],
    queryFn: () => ringlessService.getById(campaignId),
    enabled: Boolean(campaignId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outerData = (campaignData as any)?.data
  const nested = outerData?.data ?? outerData ?? {}
  const rawCamp = Array.isArray(nested) ? nested[0] ?? {} : nested
  const c: CampaignData = { ...rawCamp, title: rawCamp.title ?? '' }

  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ['ringless-lists-review', campaignId],
    queryFn: () => listService.listByCampaign(campaignId, { page: 1, limit: 100, search: '', filters: {} }),
    enabled: Boolean(campaignId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const attachedLists: ListRow[] = (listsData as { data?: { data?: ListRow[] } })?.data?.data ?? []

  const getListName = (row: ListRow) => row.l_title ?? row.title ?? row.list_name ?? `List #${row.list_id ?? row.id}`
  const getLeadCount = (row: ListRow) => row.lead_count ?? row.rowListData ?? 0
  const totalLeads = attachedLists.reduce((sum, r) => sum + Number(getLeadCount(r)), 0)

  const callerIdLabel: Record<string, string> = {
    area_code: 'Area Code', area_code_random: 'Area Code + Randomizer', custom: 'Custom DID',
  }
  const isActive = c.status === 1 || c.status === '1' || c.status === 'active'
  const timeBased = Number(c.time_based_calling ?? 0) === 1
  const callTimeDisplay = timeBased && c.call_time_start
    ? `${formatTime(c.call_time_start)} – ${formatTime(c.call_time_end)}`
    : 'All Day'

  if (isLoading) return <PageLoader />

  return (
    <div className="w-full animate-fadeIn space-y-5">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(`/ringless/${campaignId}/manage-lists`)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Review & Update</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {c.title ? `${c.title} — ` : ''}Ringless Campaign #{campaignId}
            </p>
          </div>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">1</span>
          Details
          <CheckCircle2 size={13} className="text-emerald-500" />
        </span>
        <span className="w-6 h-px bg-slate-200" />
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">2</span>
          Manage Lead Lists
          <CheckCircle2 size={13} className="text-emerald-500" />
        </span>
        <span className="w-6 h-px bg-slate-200" />
        <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
          Review & Update
        </span>
      </div>

      {/* ── Campaign Identity Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Voicemail size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{c.title || 'Untitled Campaign'}</h2>
              <Badge variant={isActive ? 'green' : 'gray'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}

            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Voicemail size={12} className="text-blue-500" />
                Ringless VM
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <List size={12} className="text-blue-500" />
                {attachedLists.length} list{attachedLists.length !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={12} className="text-blue-500" />
                {totalLeads.toLocaleString()} total leads
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Campaign Configuration Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-slate-50/80 to-transparent border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: '#3b82f618', color: '#3b82f6' }}>
            <Voicemail size={15} />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Configuration</span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
            {/* Column 1: Calling */}
            <div>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Phone size={10} /> Calling Setup
              </p>
              <div className="divide-y divide-slate-100">
                <InfoItem label="Voice Template" value={c.voice_template_name ?? (c.voice_template_id ? `#${c.voice_template_id}` : '—')} />
                <InfoItem label="SIP Gateway" value={c.sip_gateway_id ? `#${c.sip_gateway_id}` : 'Auto'} />
                {c.call_ratio && <InfoItem label="Call Ratio" value={c.call_ratio} />}
                {c.duration && c.duration !== '0' && <InfoItem label="Duration" value={c.duration} />}
              </div>
            </div>

            {/* Column 2: Caller ID */}
            <div>
              <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Phone size={10} /> Caller ID
              </p>
              <div className="divide-y divide-slate-100">
                <InfoItem label="Caller ID Type" value={callerIdLabel[c.caller_id ?? ''] ?? '—'} />
                {c.caller_id === 'custom' && <InfoItem label="Custom DID" value={String(c.custom_caller_id ?? '—')} />}
                <InfoItem label="Country Code" value={c.country_code ? `+${c.country_code}` : 'Default'} />
              </div>
            </div>

            {/* Column 3: Schedule */}
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Clock size={10} /> Schedule
              </p>
              <div className="divide-y divide-slate-100">
                <InfoItem label="Call Times" value={callTimeDisplay} />
                <InfoItem label="Timezone" value={c.timezone ?? 'America/New_York'} icon={Globe} />
                <InfoItem label="Timezone Rule" value={Number(c.timezone_rule ?? 0) === 1 ? 'Yes' : 'No'} icon={Mail} />
              </div>
            </div>
          </div>

          {/* Feature toggles */}
          {(Number(c.time_based_calling ?? 0) === 1 || Number(c.timezone_rule ?? 0) === 1) && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              Features
            </p>
            <div className="flex flex-wrap gap-2">
              {Number(c.time_based_calling ?? 0) === 1 && <TogglePill label="Time-Based Calling" on />}
              {Number(c.timezone_rule ?? 0) === 1 && <TogglePill label="Timezone Rule" on />}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ── Attached Lists ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50/80 to-transparent border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: '#3b82f618', color: '#3b82f6' }}>
              <List size={15} />
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attached Lists</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              {attachedLists.length} list{attachedLists.length !== 1 ? 's' : ''} &middot; {totalLeads.toLocaleString()} leads
            </span>
          </div>
        </div>

        {listsLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-10 justify-center">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
            Loading lists…
          </div>
        ) : attachedLists.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <List size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No lists attached</p>
            <p className="text-xs text-slate-400 mt-1">Go back to step 2 to add lead lists to this campaign.</p>
            <button type="button" onClick={() => navigate(`/ringless/${campaignId}/manage-lists`)}
              className="mt-4 btn-outline btn-sm text-xs px-4">
              <ArrowLeft size={13} />
              Add Lists
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">List Name</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dialing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attachedLists.map((row, idx) => (
                  <tr key={row.list_id ?? row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <List size={13} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{getListName(row)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-bold text-slate-700">{Number(getLeadCount(row)).toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={row.is_active === 1 ? 'green' : 'gray'}>
                        {row.is_active === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={row.is_dialing === 1 ? 'blue' : 'gray'}>
                        {row.is_dialing === 1 ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/80 border-t border-slate-200">
                  <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Total</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">{totalLeads.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Actions ── */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <button type="button" onClick={() => navigate(`/ringless/${campaignId}/manage-lists`)}
          className="btn-outline px-5 flex items-center gap-2">
          <ArrowLeft size={15} />
          Back to Lists
        </button>
        <button type="button"
          onClick={() => { toast.success('Campaign updated successfully'); navigate('/ringless') }}
          className="btn-primary px-6">
          <Save size={15} />
          Update Campaign
        </button>
      </div>
    </div>
  )
}
