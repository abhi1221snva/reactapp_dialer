import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Play, Pause, Archive, Pencil, Users, Mail,
  MessageSquare, Eye, MousePointer, AlertTriangle, CheckCircle,
  XCircle, Loader2, Search, UserMinus, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dripService } from '../../services/drip.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import type { DripEnrollment, DripStepAnalytics } from '../../types/drip.types'

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-sky-100 text-sky-700',
  stopped:   'bg-amber-100 text-amber-700',
  failed:    'bg-red-100 text-red-700',
}

export function CrmDripCampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const campaignId = Number(id)

  const [enrollPage, setEnrollPage] = useState(1)
  const [enrollStatus, setEnrollStatus] = useState('')
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollLeadIds, setEnrollLeadIds] = useState('')

  // Fetch campaign
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['drip-campaign', id],
    queryFn: () => dripService.getCampaign(campaignId).then(r => r.data.data),
    enabled: !!id,
  })

  // Fetch step analytics
  const { data: stepStats } = useQuery({
    queryKey: ['drip-step-analytics', id],
    queryFn: () => dripService.getStepAnalytics(campaignId).then(r => r.data.data),
    enabled: !!id,
  })

  // Fetch enrollments
  const { data: enrollData, isLoading: enrollLoading } = useQuery({
    queryKey: ['drip-enrollments', id, enrollPage, enrollStatus],
    queryFn: () => dripService.getEnrollments(campaignId, {
      status: enrollStatus || undefined,
      start: (enrollPage - 1) * 20,
      limit: 20,
    }).then(r => r.data.data),
    enabled: !!id,
  })

  // Actions
  const activateMut = useMutation({
    mutationFn: () => dripService.activateCampaign(campaignId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaign', id] }); toast.success('Campaign activated') },
    onError: (e: unknown) => toast.error((e as Error)?.message || 'Failed'),
  })
  const pauseMut = useMutation({
    mutationFn: () => dripService.pauseCampaign(campaignId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaign', id] }); toast.success('Campaign paused') },
  })
  const archiveMut = useMutation({
    mutationFn: () => dripService.archiveCampaign(campaignId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaign', id] }); toast.success('Archived') },
  })
  const enrollMut = useMutation({
    mutationFn: (leadIds: number[]) => dripService.enrollLeads(campaignId, leadIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drip-enrollments', id] })
      qc.invalidateQueries({ queryKey: ['drip-campaign', id] })
      toast.success('Leads enrolled')
      setShowEnrollModal(false)
      setEnrollLeadIds('')
    },
    onError: (e: unknown) => toast.error((e as Error)?.message || 'Failed to enroll'),
  })
  const unenrollMut = useMutation({
    mutationFn: (enrollmentId: number) => dripService.unenrollLead(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drip-enrollments', id] })
      qc.invalidateQueries({ queryKey: ['drip-campaign', id] })
      toast.success('Lead unenrolled')
    },
  })

  const stats = campaign?.stats as Record<string, number> | undefined

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
  }

  if (!campaign) {
    return <div className="p-6 text-center text-slate-500">Campaign not found</div>
  }

  const enrollColumns: Column<DripEnrollment>[] = [
    { key: 'lead_id', header: 'Lead ID', render: r => <span className="font-mono text-xs">{r.lead_id}</span> },
    {
      key: 'status', header: 'Status',
      render: r => <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span>,
    },
    { key: 'enrolled_via', header: 'Via', render: r => <span className="text-xs text-slate-500 capitalize">{r.enrolled_via}</span> },
    { key: 'next_send_at', header: 'Next Send', render: r => r.next_send_at ? <span className="text-xs text-slate-500">{new Date(r.next_send_at).toLocaleString()}</span> : <span className="text-xs text-slate-300">-</span> },
    { key: 'created_at', header: 'Enrolled At', render: r => <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span> },
    {
      key: 'actions', header: '',
      render: r => r.status === 'active' ? (
        <button onClick={() => unenrollMut.mutate(r.id)} className="text-xs text-red-500 hover:underline flex items-center gap-0.5">
          <UserMinus size={12} /> Unenroll
        </button>
      ) : null,
    },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/crm/drip-campaigns')} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{campaign.name}</h1>
          {campaign.description && <p className="text-xs text-slate-500 mt-0.5">{campaign.description}</p>}
        </div>
        <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
          campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
          campaign.status === 'paused' ? 'bg-amber-100 text-amber-700' :
          campaign.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'
        }`}>{campaign.status}</span>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => navigate(`/crm/drip-campaigns/${campaignId}/edit`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
            <Pencil size={13} /> Edit
          </button>
          {(campaign.status === 'draft' || campaign.status === 'paused') && (
            <button onClick={() => activateMut.mutate()} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Play size={13} /> Activate
            </button>
          )}
          {campaign.status === 'active' && (
            <button onClick={() => pauseMut.mutate()} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600">
              <Pause size={13} /> Pause
            </button>
          )}
          {campaign.status !== 'archived' && (
            <button onClick={() => archiveMut.mutate()} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
              <Archive size={13} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Users} label="Enrolled" value={stats.total_enrolled} />
          <StatCard icon={CheckCircle} label="Active" value={stats.active} color="text-emerald-600" />
          <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="text-sky-600" />
          <StatCard icon={XCircle} label="Stopped" value={stats.stopped} color="text-amber-600" />
          <StatCard icon={Mail} label="Emails Sent" value={stats.emails_sent} />
          <StatCard icon={Eye} label="Opened" value={stats.emails_opened} />
          <StatCard icon={MousePointer} label="Clicked" value={stats.emails_clicked} />
          <StatCard icon={AlertTriangle} label="Bounced" value={stats.emails_bounced} color="text-red-500" />
          <StatCard icon={MessageSquare} label="SMS Sent" value={stats.sms_sent} />
          <StatCard icon={CheckCircle} label="SMS Delivered" value={stats.sms_delivered} color="text-emerald-600" />
          <StatCard icon={XCircle} label="SMS Failed" value={stats.sms_failed} color="text-red-500" />
        </div>
      )}

      {/* Step Funnel */}
      {stepStats && stepStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5"><BarChart3 size={15} /> Step Performance</h2>
          <div className="space-y-2">
            {stepStats.map((s: DripStepAnalytics) => (
              <div key={s.step_id} className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  s.channel === 'email' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'
                }`}>{s.channel === 'email' ? <Mail size={10} /> : <MessageSquare size={10} />} #{s.position}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                  {s.sent > 0 && (
                    <>
                      <div className="absolute inset-y-0 left-0 bg-sky-200 rounded-full" style={{ width: `${Math.min(100, (s.delivered / s.sent) * 100)}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-emerald-300 rounded-full" style={{ width: `${Math.min(100, (s.opened / s.sent) * 100)}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, (s.clicked / s.sent) * 100)}%` }} />
                    </>
                  )}
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-slate-600">
                    {s.sent} sent &middot; {s.opened} opened &middot; {s.clicked} clicked
                  </span>
                </div>
                {s.bounced > 0 && <span className="text-[10px] text-red-500">{s.bounced} bounced</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollments Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700">Enrollments</h2>
          <div className="flex items-center gap-2">
            <select value={enrollStatus} onChange={e => { setEnrollStatus(e.target.value); setEnrollPage(1) }}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
            </select>
            {campaign.status === 'active' && (
              <button onClick={() => setShowEnrollModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <Users size={13} /> Enroll Leads
              </button>
            )}
          </div>
        </div>

        <DataTable<DripEnrollment>
          columns={enrollColumns}
          data={enrollData?.data ?? []}
          loading={enrollLoading}
          keyField="id"
          emptyText="No enrollments yet"
          pagination={{
            page: enrollPage,
            total: enrollData?.total ?? 0,
            perPage: 20,
            onChange: setEnrollPage,
          }}
        />
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEnrollModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-700 mb-3">Enroll Leads</h3>
            <p className="text-xs text-slate-500 mb-2">Enter lead IDs separated by commas</p>
            <textarea value={enrollLeadIds} onChange={e => setEnrollLeadIds(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3"
              placeholder="1001, 1002, 1003" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEnrollModal(false)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => {
                const ids = enrollLeadIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                if (ids.length === 0) { toast.error('Enter at least one lead ID'); return }
                enrollMut.mutate(ids)
              }}
                disabled={enrollMut.isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {enrollMut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: number; color?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} className={color || 'text-slate-400'} />
        <span className="text-[11px] text-slate-500">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-800">{value ?? 0}</span>
    </div>
  )
}
