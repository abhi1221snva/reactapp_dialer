import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, Radio, Eye, Clock,
  LayoutList, X, Globe, Tag, Settings2, Users, Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'

interface Campaign {
  id: number
  title?: string
  campaign_name?: string
  dial_mode?: string
  status?: string | number
  dial_ratio?: number
  total_leads?: number
  called_leads?: number
  lists_associated?: number
  hopper_mode?: number
  hopper_count?: number
  call_time_start?: string
  call_time_end?: string
  time_based_calling?: number | string
  [key: string]: unknown
}

interface CampaignDetail {
  id?: number; title?: string; description?: string; status?: number | string
  dial_mode?: string; group_id?: number | string | null; call_ratio?: string | null
  duration?: string | null; automated_duration?: string | null; hopper_mode?: number | null
  max_lead_temp?: number; min_lead_temp?: number
  caller_id?: string; custom_caller_id?: number | string | null
  country_code?: number | string | null
  call_transfer?: number | string; time_based_calling?: number | string
  call_time_start?: string | null; call_time_end?: string | null; timezone?: string | null
  email?: number | string; sms?: number | string; send_crm?: number | string
  send_report?: number | string; call_metric?: string | number; api?: number | string
  amd?: string | number
  disposition?: Array<{ id: number; title: string }>
  dispositions?: unknown[]
  total_leads?: number; called_leads?: number; lists_associated?: number
  hopper_count?: number
}

function isActive(status: string | number | undefined): boolean {
  return status === 'active' || status === 1 || status === '1'
}

const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

function formatTime(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDialMode(mode?: string): string {
  if (!mode) return '—'
  return mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─────────────────────────────────────────────
//  Info Row — modal detail item
// ─────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Detail Section Card — modal
// ─────────────────────────────────────────────
function DetailCard({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100"
        style={{ backgroundColor: `${color}09` }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: `${color}18`, color }}>
          <Icon size={12} />
        </div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Campaign Detail Modal
// ─────────────────────────────────────────────
function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['campaign-view', campaign.id],
    queryFn: () => campaignService.getById(campaign.id),
    staleTime: 0,
  })

  const { data: allDispositionsData } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })
  const allDispositions: Array<{ id: number; title: string }> =
    (allDispositionsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title: string }> ?? []

  const raw = (detailData as { data?: { data?: CampaignDetail } })?.data?.data ?? {}
  const d = raw as CampaignDetail

  // Resolve dispositions from either 'disposition' (objects) or 'dispositions' (IDs or objects)
  const rawDisps: unknown[] = (Array.isArray(d.disposition) && d.disposition.length > 0)
    ? d.disposition
    : Array.isArray(d.dispositions) ? d.dispositions : []
  const displayDispositions: Array<{ id: number; title: string }> = rawDisps
    .map(disp => {
      if (typeof disp === 'object' && disp !== null && 'id' in disp) return disp as { id: number; title: string }
      const found = allDispositions.find(x => x.id === Number(disp))
      return found ?? null
    })
    .filter(Boolean) as Array<{ id: number; title: string }>

  const callerIdLabel: Record<string, string> = {
    area_code: 'Area Code',
    area_code_random: 'Area Code & Randomizer',
    custom: 'Custom',
  }
  const emailLabel: Record<string, string> = {
    '0': 'No', '1': 'User Email', '2': 'Campaign Email', '3': 'System Email',
  }

  const hopperModeLabel = d.hopper_mode === 2 ? 'Random' : 'Linear'
  const timeBased = Number(d.time_based_calling) === 1
  const callTimeDisplay = timeBased && d.call_time_start
    ? `${formatTime(d.call_time_start)} – ${formatTime(d.call_time_end)}`
    : 'All Day'

  const active = isActive(d.status ?? campaign.status)
  const dialModeDisplay = formatDialMode(d.dial_mode || campaign.dial_mode)
  const campaignName = d.title || campaign.title || campaign.campaign_name || '—'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
        style={{ maxHeight: '90vh' }}
      >

        {/* Close — at panel level so overflow-hidden on hero cannot block it */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
        >
          <X size={15} />
        </button>

        {/* ── Hero Banner ── */}
        <div className="relative px-6 pt-5 pb-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 overflow-hidden flex-shrink-0">
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-3 right-16 w-10 h-10 rounded-full bg-white/5 pointer-events-none" />

          {/* Identity */}
          <div className="flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Radio size={24} className="text-white" />
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <h2 className="text-lg font-bold text-white leading-tight truncate">{campaignName}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  active
                    ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-white/10 text-white/60 border-white/20'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: active ? '#6ee7b7' : 'rgba(255,255,255,0.4)' }} />
                  {active ? 'Active' : 'Inactive'}
                </span>
                {dialModeDisplay !== '—' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-indigo-100 border border-white/15">
                    {dialModeDisplay}
                  </span>
                )}
                {d.description && (
                  <span className="text-indigo-200/70 text-[11px] truncate max-w-[200px]">{d.description}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Strip ── */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/70">
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            {[
              {
                icon: Users, label: 'Total Leads',
                value: isLoading ? '—' : Number(d.total_leads ?? campaign.total_leads ?? 0).toLocaleString(),
                sub: isLoading ? '' : (Number(d.called_leads ?? 0) > 0 ? `${Number(d.called_leads ?? 0).toLocaleString()} dialed` : ''),
                color: '#6366f1',
              },
              {
                icon: LayoutList, label: 'Lists',
                value: isLoading ? '—' : String(d.lists_associated ?? campaign.lists_associated ?? 0),
                sub: 'attached',
                color: '#10b981',
              },
              {
                icon: Settings2, label: 'Hopper',
                value: isLoading ? '—' : Number(d.hopper_count ?? campaign.hopper_count ?? 0).toLocaleString(),
                sub: isLoading ? '' : hopperModeLabel,
                color: '#f59e0b',
              },
            ].map((stat) => (
              <div key={stat.label} className="px-5 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${stat.color}15`, outline: `1px solid ${stat.color}25` }}>
                    <stat.icon size={12} style={{ color: stat.color }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="pl-8 flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-slate-800">{stat.value}</span>
                  {stat.sub && <span className="text-xs text-slate-400">{stat.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading campaign details…</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* Dialing */}
                <DetailCard icon={Zap} title="Dialing Configuration" color="#6366f1">
                  <InfoRow label="Mode" value={dialModeDisplay} />
                  <InfoRow label="Hopper Mode" value={hopperModeLabel} />

                  {d.duration && d.duration !== '0' && <InfoRow label="Duration" value={`${d.duration}s`} />}
                </DetailCard>

                {/* Schedule */}
                <DetailCard icon={Clock} title="Call Schedule" color="#0ea5e9">
                  <InfoRow label="Call Times" value={callTimeDisplay} />
                  {timeBased && <InfoRow label="Timezone" value={d.timezone || 'America/New_York'} />}
                  <InfoRow label="Time-Based Calling" value={timeBased ? 'Yes' : 'No'} />
                  <InfoRow label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
                  <InfoRow label="Call Transfer" value={Number(d.call_transfer) === 1 ? 'Yes' : 'No'} />
                  <InfoRow label="AMD Detection" value={String(d.amd) === '1' ? 'Enabled' : 'Disabled'} />
                </DetailCard>

                {/* Communication */}
                <DetailCard icon={Globe} title="Communication" color="#10b981">
                  <InfoRow label="Email" value={emailLabel[String(d.email ?? '0')] ?? '—'} />
                  <InfoRow label="SMS" value={Number(d.sms) === 1 ? 'User Phone' : 'No'} />
                  <InfoRow label="Send to CRM" value={Number(d.send_crm) === 1 ? 'Yes' : 'No'} />
                  <InfoRow label="Send Report" value={Number(d.send_report) === 1 ? 'Yes' : 'No'} />
                </DetailCard>

                {/* Dispositions */}
                <DetailCard icon={Tag} title="Dispositions" color="#8b5cf6">
                  {displayDispositions.length > 0 ? (
                    <div className="py-2.5 flex flex-wrap gap-1.5">
                      {displayDispositions.map(disp => (
                        <span
                          key={disp.id}
                          className="inline-flex items-center px-2 py-0.5 bg-violet-50 text-violet-700 text-[11px] font-semibold rounded-lg border border-violet-200"
                        >
                          {disp.title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3.5">
                      <p className="text-xs text-slate-400 italic">No dispositions assigned</p>
                    </div>
                  )}
                </DetailCard>

              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-outline text-sm px-5">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Campaigns Page
// ─────────────────────────────────────────────
export function Campaigns() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null)

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string | number }) =>
      campaignService.toggle(id, isActive(status) ? 'inactive' : 'active'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const columns: Column<Campaign>[] = [
    {
      key: 'name', header: 'Campaign',
      render: (row) => {
        const name = row.title || row.campaign_name || '—'
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Radio size={14} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 leading-tight truncate">{name}</p>
              {row.dial_mode && (
                <p className="text-[11px] text-indigo-500 font-medium mt-0.5">{formatDialMode(row.dial_mode)}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'call_times', header: 'Call Times',
      render: (row) => {
        const timeBased = row.time_based_calling === 1 || row.time_based_calling === '1'
        if (!timeBased || !row.call_time_start) {
          return (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-slate-300 flex-shrink-0" />
              <span className="text-xs text-slate-400">All Day</span>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-indigo-400 flex-shrink-0" />
            <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
              {formatTime(row.call_time_start)} – {formatTime(row.call_time_end)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'lists_associated', header: 'Lists',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <LayoutList size={13} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-700">{row.lists_associated ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'leads', header: 'Leads',
      render: (row) => {
        const total = Number(row.total_leads ?? 0)
        const dialed = Number(row.called_leads ?? 0)
        const pct = total > 0 ? Math.min(100, (dialed / total) * 100) : 0
        if (total === 0) return <span className="text-sm text-slate-400">—</span>
        return (
          <div className="min-w-[80px]">
            <p className="text-sm font-semibold text-slate-800">
              {dialed.toLocaleString()}{' '}
              <span className="text-slate-400 font-normal text-xs">/ {total.toLocaleString()}</span>
            </p>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'hopper', header: 'Hopper',
      render: (row) => {
        const count = Number(row.hopper_count ?? 0)
        const mode = row.hopper_mode === 2 ? 'Random' : 'Linear'
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{count.toLocaleString()}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 whitespace-nowrap">
              {mode}
            </span>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <button
          onClick={() => toggleMutation.mutate({ id: row.id, status: row.status ?? 0 })}
          disabled={toggleMutation.isPending}
          title={isActive(row.status) ? 'Click to deactivate' : 'Click to activate'}
          className="cursor-pointer hover:opacity-75 transition-opacity"
        >
          <Badge variant={isActive(row.status) ? 'green' : 'gray'}>
            {isActive(row.status) ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'View',
            icon: <Eye size={13} />,
            variant: 'view',
            onClick: () => setViewCampaign(row),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => navigate(`/campaigns/${row.id}/edit`),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => { if (await confirmDelete()) deleteMutation.mutate(row.id) },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      <div className="space-y-5">
        <div className="page-header">
          <div>
            <h1 className="page-title">Campaigns</h1>
            <p className="page-subtitle">Manage your dialing campaigns</p>
          </div>
        </div>

        <ServerDataTable<Campaign>
          queryKey={['campaigns']}
          queryFn={(params) => campaignService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: Campaign[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total_rows?: number } }
            return r?.data?.total_rows ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search campaigns…"
          filters={[
            { key: 'status', label: 'All Status', options: STATUS_FILTERS },
          ]}
          emptyText="No campaigns found"
          emptyIcon={<Radio size={40} />}
          search={table.search}
          onSearchChange={table.setSearch}
          activeFilters={table.filters}
          onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters}
          hasActiveFilters={table.hasActiveFilters}
          page={table.page}
          limit={table.limit}
          onPageChange={table.setPage}
          headerActions={
            <button onClick={() => navigate('/campaigns/create')} className="btn-primary">
              <Plus size={15} /> New Campaign
            </button>
          }
        />
      </div>

      {viewCampaign && (
        <CampaignDetailModal
          campaign={viewCampaign}
          onClose={() => setViewCampaign(null)}
        />
      )}
    </>
  )
}
