import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Radio, Save, X, Copy, Eye, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { smsAiService } from '../../services/smsAi.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

interface CampaignItem {
  id: number
  title: string
  description?: string
  status?: string | number
  dialing_mode?: string
  call_ratio?: number
  call_duration?: number
  sms_ai_template_id?: number
  caller_id?: string
  custom_caller_id?: string
  country_code?: string
  time_based_calling?: number | string
  call_time_start?: string
  call_time_end?: string
  sms_ai_lead_temps_count?: number
  sms_ai_lead_report_count?: number
  created_at?: string
  [key: string]: unknown
}

interface TemplateOption {
  id: number
  template_name: string
  [key: string]: unknown
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function CampaignModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: CampaignItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(campaign?.title ?? '')
  const [description, setDescription] = useState(campaign?.description ?? '')
  const [templateId, setTemplateId] = useState(String(campaign?.sms_ai_template_id ?? ''))
  const [callerId, setCallerId] = useState(campaign?.caller_id ?? '')
  const [countryCode, setCountryCode] = useState(campaign?.country_code ?? '+1')
  const [callRatio, setCallRatio] = useState(String(campaign?.call_ratio ?? '1'))
  const [callDuration, setCallDuration] = useState(String(campaign?.call_duration ?? ''))
  const [timeBased, setTimeBased] = useState(String(campaign?.time_based_calling ?? '0') === '1')
  const [timeStart, setTimeStart] = useState(campaign?.call_time_start ?? '09:00')
  const [timeEnd, setTimeEnd] = useState(campaign?.call_time_end ?? '17:00')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const { data: templatesData } = useQuery({
    queryKey: ['smsai-templates-all'],
    queryFn: () => smsAiService.listAllTemplates(),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates: TemplateOption[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = templatesData as any
    return r?.data?.data ?? r?.data ?? []
  })()

  const saveMutation = useMutation({
    mutationFn: () => {
      const t = title.trim()
      const payload: Record<string, unknown> = {
        title: t.charAt(0).toUpperCase() + t.slice(1),
        description: description.trim(),
        sms_ai_template_id: templateId ? Number(templateId) : undefined,
        caller_id: callerId.trim(),
        country_code: countryCode.trim(),
        call_ratio: Number(callRatio) || 1,
        call_duration: Number(callDuration) || undefined,
        time_based_calling: timeBased ? 1 : 0,
        call_time_start: timeBased ? timeStart : undefined,
        call_time_end: timeBased ? timeEnd : undefined,
      }
      return campaign
        ? smsAiService.update(campaign.id, payload)
        : smsAiService.create(payload)
    },
    onSuccess: () => {
      toast.success(campaign ? 'Campaign updated' : 'Campaign created')
      onSaved()
    },
    onError: () => toast.error(campaign ? 'Failed to update' : 'Failed to create'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {campaign ? 'Edit Campaign' : 'New SMS AI Campaign'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Campaign Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Summer Outreach"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            placeholder="Campaign description…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">SMS AI Template</label>
            <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
              <option value="">Select template</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Caller ID</label>
            <input
              className="input"
              placeholder="+15551234567"
              value={callerId}
              onChange={e => setCallerId(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Country Code</label>
            <input
              className="input"
              placeholder="+1"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Call Ratio</label>
            <input
              type="number"
              className="input"
              min="1"
              value={callRatio}
              onChange={e => setCallRatio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Duration (s)</label>
            <input
              type="number"
              className="input"
              placeholder="30"
              value={callDuration}
              onChange={e => setCallDuration(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label flex items-center gap-2">
            <input
              type="checkbox"
              checked={timeBased}
              onChange={e => setTimeBased(e.target.checked)}
              className="rounded border-slate-300"
            />
            Time-Based Calling
          </label>
          {timeBased && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="form-group">
                <label className="label text-xs">Start Time</label>
                <input type="time" className="input" value={timeStart} onChange={e => setTimeStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label text-xs">End Time</label>
                <input type="time" className="input" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function CampaignViewModal({
  campaign,
  onClose,
}: {
  campaign: CampaignItem
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['smsai-campaign', campaign.id],
    queryFn: () => smsAiService.show(campaign.id),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detail: CampaignItem | null = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data as any
    return r?.data?.data ?? r?.data ?? null
  })()

  const d = detail ?? campaign

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">{d.title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {d.description && (
              <div>
                <span className="text-xs font-medium text-slate-500">Description</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-medium text-slate-500">Caller ID</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.caller_id || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Country Code</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.country_code || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Call Ratio</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.call_ratio ?? '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Duration</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.call_duration ? `${d.call_duration}s` : '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Leads</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.sms_ai_lead_temps_count ?? '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Reports</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.sms_ai_lead_report_count ?? '—'}</p>
              </div>
            </div>
            {String(d.time_based_calling) === '1' && (
              <div>
                <span className="text-xs font-medium text-slate-500">Call Window</span>
                <p className="text-sm text-slate-700 mt-0.5">{d.call_time_start} — {d.call_time_end}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-outline text-sm px-5">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SmsAiCampaigns() {

  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editCampaign, setEditCampaign] = useState<CampaignItem | null>(null)
  const [viewCampaign, setViewCampaign] = useState<CampaignItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search campaigns\u2026" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => { setEditCampaign(null); setShowCreate(true) }} className="lt-b lt-p">
            <Plus size={13} /> Add Campaign
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['smsai-campaigns'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => smsAiService.delete(id),
    onSuccess: () => { toast.success('Campaign deleted'); invalidate() },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const copyMutation = useMutation({
    mutationFn: (id: number) => smsAiService.copy(id),
    onSuccess: () => { toast.success('Campaign copied'); invalidate() },
    onError: () => toast.error('Failed to copy campaign'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      smsAiService.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); invalidate(); qc.invalidateQueries({ queryKey: ['smsai-campaign'] }) },
    onError: () => toast.error('Failed to update status'),
  })

  const columns: Column<CampaignItem>[] = [
    {
      key: 'title',
      header: 'Campaign', sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Radio size={13} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-slate-900 block truncate">{capFirst(row.title)}</span>
            {row.description && (
              <span className="text-xs text-slate-400 block truncate max-w-[200px]">{row.description}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'leads',
      header: 'Leads',
      render: (row) => (
        <span className="text-sm font-semibold text-slate-700">{row.sms_ai_lead_temps_count ?? 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const isActive = String(row.status) === '1' || String(row.status) === 'active'
        return (
          <button
            onClick={() => statusMutation.mutate({
              id: row.id,
              status: isActive ? '0' : '1',
            })}
            disabled={statusMutation.isPending}
            className="cursor-pointer hover:opacity-75 transition-opacity"
          >
            <Badge variant={isActive ? 'green' : 'gray'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </button>
        )
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? formatDateTime(row.created_at as string) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
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
            onClick: () => setEditCampaign(row),
          },
          {
            label: 'Copy',
            icon: <Copy size={13} />,
            variant: 'view',
            onClick: () => copyMutation.mutate(row.id),
            disabled: copyMutation.isPending,
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.title)) deleteMutation.mutate(row.id)
            },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {(showCreate || editCampaign) && (
        <CampaignModal
          campaign={editCampaign}
          onClose={() => { setShowCreate(false); setEditCampaign(null) }}
          onSaved={() => { setShowCreate(false); setEditCampaign(null); invalidate() }}
        />
      )}
      {viewCampaign && (
        <CampaignViewModal
          campaign={viewCampaign}
          onClose={() => setViewCampaign(null)}
        />
      )}

      <div className="space-y-5">
        <ServerDataTable<CampaignItem>
          queryKey={['smsai-campaigns']}
          queryFn={(params) => smsAiService.list(params)}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data ?? r?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.total ?? r?.data?.data?.length ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search campaigns…"
          emptyText="No SMS AI campaigns found"
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
    </>
  )
}
