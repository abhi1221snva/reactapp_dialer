import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, Radio, Eye, Clock, Search,
  LayoutList, X, Tag, Users, Zap, Globe,
  Phone, Mail,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { campaignService } from '../../services/campaign.service'
import { dispositionService } from '../../services/disposition.service'
import { emailSettingsService, type EmailSetting } from '../../services/emailSettings.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { cn, capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

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
//  View helpers (matching User Management View)
// ─────────────────────────────────────────────
function CampaignOnOff({ val, label }: { val?: unknown; label: string }) {
  const on = val === 1 || val === '1' || val === true || Number(val) === 1
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
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

function CampaignSectionCard({ icon: Icon, title, iconColor, children }: {
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

function CampaignDetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-xs text-right font-semibold text-slate-800">{value ?? '—'}</span>
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
    staleTime: 5 * 60 * 1000,
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

  const { data: emailSettingsData } = useQuery({
    queryKey: ['campaign-email-settings'],
    queryFn: async () => {
      const res = await emailSettingsService.list()
      const payload = res.data?.data ?? res.data ?? {}
      return (payload.list ?? []) as EmailSetting[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const callerIdLabel: Record<string, string> = {
    area_code: 'Area Code',
    area_code_random: 'Area Code & Randomizer',
    custom: 'Custom',
  }
  const staticEmailLabel: Record<string, string> = {
    '0': 'No', '1': 'User Email', '2': 'Campaign Email', '3': 'System Email',
  }
  const resolveEmailLabel = (val: number | string | undefined): string => {
    const key = String(val ?? '0')
    if (staticEmailLabel[key]) return staticEmailLabel[key]
    const setting = (emailSettingsData ?? []).find(s => s.id === Number(key))
    if (setting) return setting.sender_name ? `${setting.sender_name} — ${setting.sender_email}` : setting.sender_email
    return key === '0' ? 'No' : `SMTP #${key}`
  }

  const hopperModeLabel = d.hopper_mode === 2 ? 'Random' : 'Linear'
  const timeBased = Number(d.time_based_calling) === 1
  const callTimeDisplay = timeBased && d.call_time_start
    ? `${formatTime(d.call_time_start)} – ${formatTime(d.call_time_end)}`
    : 'All Day'

  const active = isActive(d.status ?? campaign.status)
  const dialModeDisplay = formatDialMode(d.dial_mode || campaign.dial_mode)
  const campaignName = d.title || campaign.title || campaign.campaign_name || '—'

  const totalLeads = Number(d.total_leads ?? campaign.total_leads ?? 0)
  const dialedLeads = Number(d.called_leads ?? 0)
  const listsCount = Number(d.lists_associated ?? campaign.lists_associated ?? 0)
  const hopperCount = Number(d.hopper_count ?? campaign.hopper_count ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Blue Header Banner ── */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-6 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <X size={16} />
          </button>

          <div className="relative px-5 pt-4 pb-3">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-white/30 rounded animate-pulse w-36" />
                  <div className="h-3 bg-white/20 rounded animate-pulse w-48" />
                </div>
              </div>
            ) : (
              <>
                {/* Title + badges + stats all compact */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 text-white flex items-center justify-center flex-shrink-0">
                    <Radio size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white truncate leading-tight">{campaignName}</h2>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        active
                          ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                          : 'bg-white/10 border-white/20 text-white/60'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-300' : 'bg-white/40')} />
                        {active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 border border-white/20 text-white/80">
                        <Radio size={9} />
                        {dialModeDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact stats strip */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15 flex-wrap">
                  {[
                    { icon: Users, val: totalLeads.toLocaleString(), lbl: 'Leads' },
                    { icon: Phone, val: dialedLeads.toLocaleString(), lbl: 'Dialed' },
                    { icon: Globe, val: d.country_code ? `+${d.country_code}` : '—', lbl: 'Country' },
                    { icon: LayoutList, val: String(listsCount), lbl: 'Lists' },
                    { icon: Tag, val: String(hopperCount), lbl: 'Hopper' },
                    { icon: Zap, val: hopperModeLabel, lbl: 'Mode' },
                  ].map(({ icon: SIcon, val, lbl }) => (
                    <div key={lbl} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                      <SIcon size={12} className="text-white/60" />
                      <span className="text-xs font-bold text-white leading-none">{val}</span>
                      <span className="text-[9px] text-white/50 font-medium leading-none">{lbl}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${55 + (i % 4) * 12}%` }} />
              ))}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Schedule & Caller ID */}
              <CampaignSectionCard icon={Clock} title="Schedule & Caller ID" iconColor="text-sky-500">
                <CampaignDetailRow label="Call Times" value={callTimeDisplay} />
                {timeBased && <CampaignDetailRow label="Timezone" value={d.timezone || 'America/New_York'} />}
                <CampaignOnOff val={d.time_based_calling} label="Time-Based Calling" />
                <CampaignDetailRow label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
                <CampaignOnOff val={d.call_transfer} label="Call Transfer" />
                <CampaignOnOff val={d.call_metric} label="Call Metrics" />
              </CampaignSectionCard>

              {/* Communication */}
              <CampaignSectionCard icon={Mail} title="Communication" iconColor="text-violet-500">
                <CampaignDetailRow label="Email" value={resolveEmailLabel(d.email)} />
                <CampaignOnOff val={d.sms} label="Send SMS" />
                <CampaignOnOff val={d.send_crm} label="Send to CRM" />
                <CampaignOnOff val={d.send_report} label="Send Report" />
              </CampaignSectionCard>

              {/* Dispositions — full width */}
              <div className="md:col-span-2">
                <CampaignSectionCard icon={Tag} title="Dispositions" iconColor="text-violet-500">
                  <div className="py-3">
                    {displayDispositions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {displayDispositions.map(disp => (
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
                </CampaignSectionCard>
              </div>

            </div>
          )}
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
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search campaigns…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => navigate('/campaigns/create')} className="lt-b lt-p">
            <Plus size={13} /> Add Campaign
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string | number }) =>
      campaignService.toggle(id, isActive(status) ? 'inactive' : 'active'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const columns: Column<Campaign>[] = [
    {
      key: 'name', header: 'Campaign', sortable: true,
      sortValue: (row) => String(row.title || row.campaign_name || '').toLowerCase(),
      render: (row) => {
        const name = row.title || row.campaign_name || '—'
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Radio size={14} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 leading-tight truncate">{capFirst(name)}</p>
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
        <div
          className="flex items-center gap-1.5 cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${row.id}/add-review`) }}
        >
          <LayoutList size={13} className="text-slate-400 flex-shrink-0 group-hover:text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 underline-offset-2 group-hover:underline">{row.lists_associated ?? 0}</span>
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
          hideToolbar
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
