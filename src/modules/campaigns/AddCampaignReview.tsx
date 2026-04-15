import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CheckCircle2, Radio, Phone, Clock, Tag, Zap, List,
  Globe, Users, PartyPopper, Trash2, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { listService } from '../../services/list.service'
import { dispositionService } from '../../services/disposition.service'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { showConfirm } from '../../utils/confirmDelete'

interface CampaignData {
  id?: number; title?: string; campaign_name?: string; description?: string; status?: number | string
  dial_mode?: string; group_id?: number | string | null; call_ratio?: string | null
  caller_id?: string; custom_caller_id?: number | string | null
  time_based_calling?: number | string; call_time_start?: string | null; call_time_end?: string | null
  timezone?: string | null
  sms?: number | string; send_crm?: number | string; amd?: string | number; call_metric?: string | number
  disposition?: string[] | Array<{ id: number; title: string }>
  dispositions?: string[] | Array<{ id: number; title: string }>
  crm_type?: string | null
}

interface ListRow {
  id: number; list_id?: number; title?: string; list_name?: string; l_title?: string
  lead_count?: number; rowListData?: number; is_active?: number; is_dialing?: number
  campaign_id?: number
  [key: string]: unknown
}

export function AddCampaignReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setToolbar, headerKey } = useDialerHeader()
  const campaignId = Number(id)

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignService.getById(campaignId),
    enabled: Boolean(campaignId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const c: CampaignData = (campaignData as { data?: { data?: CampaignData } })?.data?.data ?? {}
  const campaignName = c.title || c.campaign_name || ''

  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ['campaign-lists-review', campaignId],
    queryFn: () => listService.listByCampaign(campaignId, { page: 1, limit: 100, search: '', filters: {} }),
    enabled: Boolean(campaignId),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: dispositionsData } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })

  const attachedLists: ListRow[] = (listsData as { data?: { data?: ListRow[] } })?.data?.data ?? []
  const getListId = (row: ListRow) => row.list_id ?? row.id
  const getListName = (row: ListRow) => row.l_title ?? row.title ?? row.list_name ?? `List #${getListId(row)}`
  const getLeadCount = (row: ListRow) => row.lead_count ?? row.rowListData ?? 0
  const totalLeads = attachedLists.reduce((sum, r) => sum + Number(getLeadCount(r)), 0)

  const dialModeDisplay = c.dial_mode
    ? c.dial_mode.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
    : '—'
  const isActive = c.status === 1 || c.status === '1' || c.status === 'active'

  // Dispositions
  const allDispositions: Array<{ id: number; title: string }> =
    (dispositionsData as { data?: { data?: Array<{ id: number; title: string }> } })?.data?.data ?? []
  const rawDisps = c.dispositions ?? c.disposition ?? []
  const campaignDispIds = rawDisps.map(d => typeof d === 'object' ? Number(d.id) : Number(d))
  const dispositions = allDispositions.filter(d => campaignDispIds.includes(d.id))

  // Detach list from campaign (removes from campaign_list pivot)
  const detachMutation = useMutation({
    mutationFn: (listId: number) =>
      campaignService.detachList(campaignId, listId),
    onSuccess: () => {
      toast.success('List removed from campaign')
      qc.invalidateQueries({ queryKey: ['campaign-lists-review', campaignId] })
    },
    onError: () => toast.error('Failed to remove list'),
  })

  const handleDetach = async (row: ListRow) => {
    const lid = getListId(row)
    const name = getListName(row)
    const confirmed = await showConfirm({
      title: 'Remove List?',
      message: `"${name}" will be removed from this campaign. The list itself will not be deleted.`,
      confirmText: 'Yes, remove',
      icon: 'warning',
      danger: true,
    })
    if (confirmed) detachMutation.mutate(lid)
  }

  // ── Toolbar ──
  useEffect(() => {
    setToolbar(
      <>
        <button className="lt-b" onClick={() => navigate(`/campaigns/${campaignId}/attach-leads`)}>
          <ArrowLeft size={13} />
          Back
        </button>

        {/* Step pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { num: '1', label: 'Details', done: true },
            { num: '2', label: 'Leads', done: true },
            { num: '3', label: 'Review', done: false, active: true },
          ].map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <div style={{ width: 12, height: 1, background: '#e2e8f0' }} />}
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                background: s.active ? '#6366f1' : s.done ? '#d1fae5' : '#f1f5f9',
                color: s.active ? '#fff' : s.done ? '#047857' : '#94a3b8',
              }}>
                {s.label}
                {s.done && <CheckCircle2 size={10} />}
              </span>
            </div>
          ))}
        </div>

        <div className="lt-right">
          <button className="lt-b lt-p" onClick={() => navigate('/campaigns')}>
            <PartyPopper size={13} />
            Done
          </button>
        </div>
      </>
    )
  }, [headerKey])

  if (isLoading) return <PageLoader />

  return (
    <div className="flex gap-4" style={{ width: '100%' }}>

      {/* ── LEFT: Attached Lists (main area) ── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <List size={13} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attached Lists</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {attachedLists.length} list{attachedLists.length !== 1 ? 's' : ''} &middot; {totalLeads.toLocaleString()} leads
            </span>
          </div>

          {listsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-8 justify-center">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin flex-shrink-0" />
              Loading lists…
            </div>
          ) : attachedLists.length === 0 ? (
            <div className="text-center py-10 px-6">
              <List size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">No lists attached</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Go back to step 2 to add lead lists.</p>
              <button type="button" onClick={() => navigate(`/campaigns/${campaignId}/attach-leads`)}
                className="mt-3 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mx-auto">
                <ArrowLeft size={11} /> Add Lists
              </button>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem] gap-2 items-center px-4 py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">#</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">List Name</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase text-right">Leads</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Status</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Dialing</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {attachedLists.map((row, idx) => (
                  <div key={getListId(row)} className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem] gap-2 items-center px-4 py-2.5 hover:bg-slate-50/50 transition-colors">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                        <List size={12} className="text-white" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate">{getListName(row)}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 text-right">{Number(getLeadCount(row)).toLocaleString()}</span>
                    <div className="flex justify-center">
                      <Badge variant={row.is_active === 1 ? 'green' : 'gray'}>
                        {row.is_active === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant={row.is_dialing === 1 ? 'blue' : 'gray'}>
                        {row.is_dialing === 1 ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/lists/${getListId(row)}/mapping`)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Edit list"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDetach(row)}
                        disabled={detachMutation.isPending}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Remove from campaign"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total row */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                <div className="flex items-center gap-2">
                  <Users size={11} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-800">{totalLeads.toLocaleString()} leads</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: Campaign Summary (sidebar) ── */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-2">
          <div className="p-4">
            {/* Campaign header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Radio size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xs font-bold text-slate-900 truncate">{campaignName || 'Untitled'}</h2>
                <Badge variant={isActive ? 'green' : 'gray'}>
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {c.description && (
              <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{c.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <List size={11} className="text-emerald-500" />
                <span className="font-semibold">{attachedLists.length}</span> list{attachedLists.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Users size={11} className="text-blue-500" />
                <span className="font-semibold">{totalLeads.toLocaleString()}</span> leads
              </div>
            </div>

            {/* Config items */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Zap size={11} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase">Dial Mode</p>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">{dialModeDisplay}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Phone size={11} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase">Caller ID</p>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">{c.caller_id || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Globe size={11} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase">Timezone</p>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">{c.timezone || 'America/New_York'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock size={11} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase">Schedule</p>
                  <p className="text-[11px] font-semibold text-slate-800 truncate">
                    {Number(c.time_based_calling ?? 0) === 1
                      ? `${c.call_time_start || '08:00'} – ${c.call_time_end || '20:00'}`
                      : 'All Day'}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            {(String(c.amd ?? '0') === '1' || Number(c.sms ?? 0) === 1 || Number(c.send_crm ?? 0) === 1 || Number(c.call_metric ?? 0) === 1) && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                {String(c.amd ?? '0') === '1' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded border border-emerald-200">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> AMD
                  </span>
                )}
                {Number(c.sms ?? 0) === 1 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded border border-emerald-200">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> SMS
                  </span>
                )}
                {Number(c.send_crm ?? 0) === 1 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded border border-emerald-200">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> CRM
                  </span>
                )}
                {Number(c.call_metric ?? 0) === 1 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded border border-emerald-200">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> Metrics
                  </span>
                )}
              </div>
            )}

            {/* Dispositions */}
            {dispositions.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <Tag size={10} className="text-violet-500" />
                <span className="text-[11px] font-semibold text-slate-700">Dispositions ({dispositions.length})</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
