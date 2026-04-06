import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, Radio, Eye, Clock, Search,
  LayoutList, X, Users, Voicemail,
  CheckCircle2, XCircle, Mail,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { ringlessService } from '../../services/ringless.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { cn } from '../../utils/cn'

interface RinglessCampaign {
  id?: number
  campaign_id?: number
  title?: string
  campaign_name?: string
  name?: string
  description?: string
  status?: number | string
  caller_id?: string
  custom_caller_id?: string | number
  time_based_calling?: number | string
  call_time_start?: string | null
  call_time_end?: string | null
  voice_template_id?: number | string
  voice_template_name?: string
  sip_gateway_id?: number | string
  country_code?: number | string
  rowcount_lead_report?: number
  lists_associated?: number
  list_count?: number
  ringless_lead_temps_count?: number
  ringless_lead_report_count?: number
  total_leads?: number
  lead_count?: number
  hopper_count?: number
  [key: string]: unknown
}

function isActive(status: string | number | undefined): boolean {
  return status === 1 || status === '1' || status === 'active'
}

function getCId(row: RinglessCampaign): number {
  return Number(row.id ?? row.campaign_id ?? 0)
}

function getCName(row: RinglessCampaign): string {
  return (row.title || row.campaign_name || row.name || '—') as string
}

function getListsCount(row: RinglessCampaign): number {
  const r = row as Record<string, unknown>
  // Primary: use eagerly loaded ringless_list array
  const lists = r.ringless_list ?? r.ringlessList
  if (Array.isArray(lists)) return lists.length
  // Fallback: withCount fields (snake_case from Laravel toArray)
  return Number(r.row_count_lead_report ?? r.rowCountLeadReport ?? r.lists_count ?? 0)
}

function getLeadsQueued(row: RinglessCampaign): number {
  const r = row as Record<string, unknown>
  return Number(r.ringless_lead_temps_count ?? r.ringlessLeadTemps_count ?? r.ringlessLeadTempsCount ?? 0)
}

function getLeadsDelivered(row: RinglessCampaign): number {
  const r = row as Record<string, unknown>
  return Number(r.ringless_lead_report_count ?? r.ringlessLeadReport_count ?? r.ringlessLeadReportCount ?? 0)
}

function getTotalLeadsFromLists(row: RinglessCampaign): number {
  const r = row as Record<string, unknown>
  const lists = r.ringless_list ?? r.ringlessList
  if (Array.isArray(lists)) {
    return lists.reduce((sum: number, l: Record<string, unknown>) => {
      return sum + Number(l.ringless_list_data_count ?? l.ringlessListData_count ?? l.ringlessListDataCount ?? l.total_leads ?? 0)
    }, 0)
  }
  return 0
}

function formatTime(t?: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

// ─────────────────────────────────────────────
//  View helpers (matching Campaign detail modal)
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
//  Campaign Detail Modal (matches Campaign page)
// ─────────────────────────────────────────────
function CampaignDetailModal({ campaign, onClose }: { campaign: RinglessCampaign; onClose: () => void }) {
  const cid = getCId(campaign)
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['ringless-campaign-view', cid],
    queryFn: () => ringlessService.getById(cid),
    staleTime: 0,
    enabled: cid > 0,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outer = (detailData as any)?.data
  const nested = outer?.data ?? outer ?? {}
  const raw = Array.isArray(nested) ? nested[0] ?? {} : nested
  const d = { ...campaign, ...raw } as RinglessCampaign

  const callerIdLabel: Record<string, string> = {
    area_code: 'Area Code',
    area_code_random: 'Area Code & Randomizer',
    custom: 'Custom',
  }

  const active = isActive(d.status)
  const campaignName = getCName(d)
  const timeBased = Number(d.time_based_calling) === 1
  const callTimeDisplay = timeBased && d.call_time_start
    ? `${formatTime(d.call_time_start)} – ${formatTime(d.call_time_end)}`
    : 'All Day'

  const listsCount = getListsCount(d)
  const queued = getLeadsQueued(d)
  const delivered = getLeadsDelivered(d)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 text-white flex items-center justify-center flex-shrink-0">
                    <Voicemail size={18} />
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
                        <Voicemail size={9} />
                        Ringless VM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact stats strip */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15 flex-wrap">
                  {[
                    { icon: LayoutList, val: String(listsCount), lbl: 'Lists' },
                    { icon: Users, val: queued.toLocaleString(), lbl: 'Queued' },
                    { icon: Radio, val: delivered.toLocaleString(), lbl: 'Delivered' },
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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${55 + (i % 4) * 12}%` }} />
              ))}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Schedule & Caller ID */}
              <CampaignSectionCard icon={Clock} title="Schedule & Caller ID" iconColor="text-sky-500">
                <CampaignDetailRow label="Call Times" value={callTimeDisplay} />
                <CampaignOnOff val={d.time_based_calling} label="Time-Based Calling" />
                <CampaignDetailRow label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
                {d.caller_id === 'custom' && d.custom_caller_id && (
                  <CampaignDetailRow label="Custom DID" value={String(d.custom_caller_id)} />
                )}
                <CampaignDetailRow label="Country Code" value={d.country_code ? `+${d.country_code}` : '—'} />
              </CampaignSectionCard>

              {/* Configuration */}
              <CampaignSectionCard icon={Mail} title="Configuration" iconColor="text-violet-500">
                <CampaignDetailRow label="Voice Template" value={d.voice_template_name ?? (d.voice_template_id ? `#${d.voice_template_id}` : '—')} />
                <CampaignDetailRow label="SIP Gateway" value={d.sip_gateway_id ? `#${d.sip_gateway_id}` : 'Auto'} />
                {d.description && (
                  <CampaignDetailRow label="Description" value={d.description} />
                )}
              </CampaignSectionCard>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────
export function RinglessVoicemail() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [viewCampaign, setViewCampaign] = useState<RinglessCampaign | null>(null)
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
          <button onClick={() => navigate('/ringless/create')} className="lt-b lt-p">
            <Plus size={13} /> Add Campaign
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number | string }) =>
      ringlessService.toggle(id, isActive(status) ? 0 : 1),
    onSuccess: () => {
      toast.success('Campaign status updated')
      qc.invalidateQueries({ queryKey: ['ringless-campaigns'] })
      qc.invalidateQueries({ queryKey: ['ringless-campaign-view'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ringlessService.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); qc.invalidateQueries({ queryKey: ['ringless-campaigns'] }) },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const columns: Column<RinglessCampaign>[] = [
    {
      key: 'name', header: 'Campaign', sortable: true,
      sortValue: (row) => String(row.title || row.campaign_name || row.name || '').toLowerCase(),
      render: (row) => {
        const name = getCName(row)
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Voicemail size={14} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 leading-tight truncate">{name}</p>
              {row.description && (
                <p className="text-[11px] text-indigo-500 font-medium mt-0.5 truncate max-w-[180px]">{row.description}</p>
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
          <span className="text-sm font-semibold text-slate-700">{getListsCount(row)}</span>
        </div>
      ),
    },
    {
      key: 'leads', header: 'Leads',
      render: (row) => {
        const queued = getLeadsQueued(row)
        const delivered = getLeadsDelivered(row)
        const fromLists = getTotalLeadsFromLists(row)
        const total = queued + delivered > 0 ? queued + delivered : fromLists
        const pct = total > 0 ? Math.min(100, (delivered / total) * 100) : 0
        if (total === 0) return <span className="text-sm text-slate-400">—</span>
        return (
          <div className="min-w-[80px]">
            <p className="text-sm font-semibold text-slate-800">
              {delivered.toLocaleString()}{' '}
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
        const count = getLeadsQueued(row) || getTotalLeadsFromLists(row)
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{count.toLocaleString()}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 whitespace-nowrap">
              Queued
            </span>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: getCId(row), status: row.status ?? 0 }) }}
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
            onClick: () => navigate(`/ringless/${getCId(row)}/edit`),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => { if (await confirmDelete()) deleteMutation.mutate(getCId(row)) },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      <div className="space-y-5">
        <ServerDataTable<RinglessCampaign>
          queryKey={['ringless-campaigns']}
          queryFn={(params) =>
            ringlessService.list({
              start: (params.page - 1) * params.limit,
              limit: params.limit,
              ...(params.search ? { title: params.search } : {}),
            })
          }
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: RinglessCampaign[]; total_rows?: number } | RinglessCampaign[] }
            const arr = Array.isArray(r?.data)
              ? r.data as RinglessCampaign[]
              : (r?.data as { data?: RinglessCampaign[] })?.data ?? []
            // Normalize: ensure every row has `id` from campaign_id
            return arr.map(row => ({ ...row, id: Number(row.id ?? row.campaign_id ?? 0) }))
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total_rows?: number } }
            return r?.data?.total_rows ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search campaigns…"
          emptyText="No ringless voicemail campaigns found"
          emptyIcon={<Voicemail size={40} />}
          search={table.search} onSearchChange={table.setSearch}
          activeFilters={table.filters} onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
          page={table.page} limit={table.limit} onPageChange={table.setPage}
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
