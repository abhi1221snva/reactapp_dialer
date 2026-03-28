import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Copy, Trash2, Pencil, Radio, Eye, Clock,
  LayoutList, X, Phone, Globe, Tag, Settings2, Users, ToggleRight, ToggleLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { campaignService } from '../../services/campaign.service'
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
  total_leads?: number; called_leads?: number; lists_associated?: number
  hopper_count?: number
}

/** Normalize backend status */
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

// ─────────────────────────────────────────────
//  Detail Field Helper
// ─────────────────────────────────────────────
function DetailRow({ label, value, muted = false }: { label: string; value?: string | number | null; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className={`text-xs text-right font-semibold ${muted ? 'text-slate-400 font-normal' : 'text-slate-800'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Campaign Detail Modal
// ─────────────────────────────────────────────
function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['campaign', campaign.id],
    queryFn: () => campaignService.getById(campaign.id),
  })

  const raw = (detailData as { data?: { data?: CampaignDetail } })?.data?.data ?? {}
  const d = raw as CampaignDetail

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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
              <Radio size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {d.title || campaign.title || campaign.campaign_name || '—'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isActive(d.status ?? campaign.status) ? 'green' : 'gray'}>
                  {isActive(d.status ?? campaign.status) ? 'Active' : 'Inactive'}
                </Badge>
                {d.dial_mode && (
                  <span className="text-xs text-slate-500 capitalize">{dialModeDisplay}</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading campaign details…</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">

            {/* Description */}
            {d.description && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                {d.description}
              </p>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users size={13} className="text-indigo-500" />
                  <span className="text-xs text-slate-500 font-medium">Leads</span>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {Number(d.total_leads ?? campaign.total_leads ?? 0).toLocaleString()}
                </p>
                {(d.called_leads ?? 0) > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {Number(d.called_leads).toLocaleString()} dialed
                  </p>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <LayoutList size={13} className="text-emerald-500" />
                  <span className="text-xs text-slate-500 font-medium">Lists</span>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {d.lists_associated ?? campaign.lists_associated ?? 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">attached</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Settings2 size={13} className="text-amber-500" />
                  <span className="text-xs text-slate-500 font-medium">Hopper</span>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {Number(d.hopper_count ?? campaign.hopper_count ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{hopperModeLabel}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Dialing Configuration */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                  <Phone size={13} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dialing</span>
                </div>
                <div className="px-4 py-1">
                  <DetailRow label="Mode" value={dialModeDisplay} />
                  <DetailRow label="Hopper Mode" value={hopperModeLabel} />
                  {d.call_ratio && <DetailRow label="Call Ratio" value={d.call_ratio} />}
                  {d.duration && <DetailRow label="Duration" value={d.duration} />}
                  <DetailRow label="Max Lead Temp" value={d.max_lead_temp} />
                  <DetailRow label="Min Lead Temp" value={d.min_lead_temp} />
                </div>
              </div>

              {/* Call Schedule */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                  <Clock size={13} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Schedule</span>
                </div>
                <div className="px-4 py-1">
                  <DetailRow label="Call Times" value={callTimeDisplay} />
                  {Number(d.time_based_calling) === 1 && (
                    <DetailRow label="Timezone" value={d.timezone || 'America/New_York'} />
                  )}
                  <DetailRow label="Caller ID" value={callerIdLabel[d.caller_id ?? ''] ?? d.caller_id ?? '—'} />
                  <DetailRow label="Call Transfer" value={Number(d.call_transfer) === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="AMD" value={String(d.amd) === '1' ? 'Enabled' : 'Disabled'} />
                </div>
              </div>

              {/* Communication */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                  <Globe size={13} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Communication</span>
                </div>
                <div className="px-4 py-1">
                  <DetailRow label="Email" value={emailLabel[String(d.email ?? '0')] ?? '—'} />
                  <DetailRow label="SMS" value={Number(d.sms) === 1 ? 'With User Phone' : 'No'} />
                  <DetailRow label="Send to CRM" value={Number(d.send_crm) === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="Send Report" value={Number(d.send_report) === 1 ? 'Yes' : 'No'} />
                  <DetailRow label="Call Metrics" value={String(d.call_metric) === '1' ? 'Enabled' : 'Disabled'} />
                </div>
              </div>

              {/* Dispositions */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                  <Tag size={13} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dispositions</span>
                </div>
                <div className="px-4 py-3">
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
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isActive(d.status ?? campaign.status)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {isActive(d.status ?? campaign.status) ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                {isActive(d.status ?? campaign.status) ? 'Campaign Active' : 'Campaign Inactive'}
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
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline text-sm px-5 py-2"
          >
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string | number }) =>
      campaignService.toggle(id, isActive(status) ? 'inactive' : 'active'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: () => toast.error('Failed to update status'),
  })

  const copyMutation = useMutation({
    mutationFn: (id: number) => campaignService.copy(id),
    onSuccess: () => { toast.success('Campaign copied'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Failed to copy campaign'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const columns: Column<Campaign>[] = [
    {
      key: 'name', header: 'Name',
      render: (row) => {
        const name = row.title || row.campaign_name || '—'
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Radio size={15} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{name}</p>
              {row.dial_mode && (
                <p className="text-xs text-slate-400 capitalize mt-0.5">
                  {String(row.dial_mode).replace(/_/g, ' ')}
                </p>
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
        if (!timeBased || (!row.call_time_start && !row.call_time_end)) {
          return (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-slate-300" />
              <span className="text-xs text-slate-400 italic">All Day</span>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-indigo-400" />
            <span className="text-xs font-medium text-slate-700">
              {formatTime(row.call_time_start)} – {formatTime(row.call_time_end)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'lists_associated', header: 'List',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <LayoutList size={13} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{row.lists_associated ?? 0}</span>
          <span className="text-xs text-slate-400">{(row.lists_associated ?? 0) === 1 ? 'list' : 'lists'}</span>
        </div>
      ),
    },
    {
      key: 'leads', header: 'Dialed Leads / Total',
      render: (row) => {
        const total = row.total_leads ?? 0
        const dialed = (row.called_leads as number) ?? 0
        const pct = total > 0 ? Math.min(100, (dialed / total) * 100) : 0
        if (total === 0) return <span className="text-sm text-slate-400">—</span>
        return (
          <div className="min-w-[90px]">
            <p className="text-sm font-semibold text-slate-800">
              {dialed.toLocaleString()} <span className="text-slate-400 font-normal">/ {total.toLocaleString()}</span>
            </p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'hopper', header: 'Hopper Count',
      render: (row) => {
        const count = (row.hopper_count as number) ?? 0
        const mode = row.hopper_mode === 2 ? 'Random' : 'Linear'
        return (
          <div>
            <p className="text-sm font-medium text-slate-700">{count.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{mode}</p>
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
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'View Campaign',
            icon: <Eye size={13} />,
            variant: 'view',
            onClick: () => navigate(`/campaigns/${row.id}`),
          },
          {
            label: 'Edit Campaign',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => navigate(`/campaigns/${row.id}/edit`),
          },
          {
            label: 'Duplicate',
            icon: <Copy size={13} />,
            variant: 'default',
            onClick: () => copyMutation.mutate(row.id),
            disabled: copyMutation.isPending,
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
    </>
  )
}
