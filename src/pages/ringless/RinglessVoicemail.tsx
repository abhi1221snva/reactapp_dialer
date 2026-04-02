import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Play, Pause, Copy, Trash2, Pencil, Voicemail, Eye,
  LayoutList, Users, Radio,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { RowActions } from '../../components/ui/RowActions'
import { ringlessService } from '../../services/ringless.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'

interface RinglessCampaign {
  id?: number
  title?: string
  description?: string
  status?: number | string
  caller_id?: string
  time_based_calling?: number | string
  call_time_start?: string | null
  call_time_end?: string | null
  voice_template_id?: number | string
  voice_template_name?: string
  sip_gateway_id?: number | string
  country_code?: number | string
  rowcount_lead_report?: number
  ringless_lead_temps_count?: number
  ringless_lead_report_count?: number
  [key: string]: unknown
}

interface VoiceTemplate {
  id: number
  title?: string
  name?: string
  ivr_desc?: string
}

interface VoipConfig {
  id: number
  name?: string
  title?: string
  host?: string
}

const CALLER_ID_OPTIONS = [
  { value: 'area_code', label: 'Area Code' },
  { value: 'area_code_random', label: 'Area Code (Random)' },
  { value: 'custom', label: 'Custom' },
]

const EMPTY_FORM = {
  title: '',
  description: '',
  status: '1',
  caller_id: 'area_code',
  custom_caller_id: '',
  time_based_calling: '0',
  call_time_start: '09:00',
  call_time_end: '17:00',
  voice_template_id: '',
  sip_gateway_id: '',
  country_code: '1',
  call_ratio: '1',
}

function isActive(status: string | number | undefined): boolean {
  return status === 1 || status === '1' || status === 'active'
}

// ──────────── Campaign Form Modal ────────────
function CampaignFormModal({
  isOpen, onClose, editing,
}: { isOpen: boolean; onClose: () => void; editing: RinglessCampaign | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: templatesData } = useQuery({
    queryKey: ['voice-templates'],
    queryFn: () => ringlessService.getVoiceTemplates(),
    enabled: isOpen,
  })
  const { data: voipData } = useQuery({
    queryKey: ['voip-configs'],
    queryFn: () => ringlessService.getVoipConfigs(),
    enabled: isOpen,
  })

  const templates: VoiceTemplate[] = (
    (templatesData as { data?: { data?: VoiceTemplate[] } })?.data?.data ??
    (templatesData as { data?: VoiceTemplate[] })?.data ?? []
  )
  const voipConfigs: VoipConfig[] = (
    (voipData as { data?: { data?: VoipConfig[] } })?.data?.data ??
    (voipData as { data?: VoipConfig[] })?.data ?? []
  )

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setForm({
          title: editing.title ?? '',
          description: editing.description ?? '',
          status: String(editing.status ?? '1'),
          caller_id: editing.caller_id ?? 'area_code',
          custom_caller_id: String(editing.custom_caller_id ?? ''),
          time_based_calling: String(editing.time_based_calling ?? '0'),
          call_time_start: editing.call_time_start ?? '09:00',
          call_time_end: editing.call_time_end ?? '17:00',
          voice_template_id: String(editing.voice_template_id ?? ''),
          sip_gateway_id: String(editing.sip_gateway_id ?? ''),
          country_code: String(editing.country_code ?? '1'),
          call_ratio: '1',
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [isOpen, editing])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing ? ringlessService.update(data) : ringlessService.create(data),
    onSuccess: () => {
      toast.success(editing ? 'Campaign updated' : 'Campaign created')
      qc.invalidateQueries({ queryKey: ['ringless-campaigns'] })
      onClose()
    },
    onError: () => toast.error('Failed to save campaign'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Campaign title is required'); return }
    if (!form.voice_template_id) { toast.error('Please select a voice template'); return }
    const payload: Record<string, unknown> = {
      ...form,
      status: Number(form.status),
      time_based_calling: Number(form.time_based_calling),
      voice_template_id: Number(form.voice_template_id),
      sip_gateway_id: form.sip_gateway_id ? Number(form.sip_gateway_id) : undefined,
      country_code: Number(form.country_code),
    }
    if (editing?.id) payload.campaign_id = editing.id
    if (form.caller_id !== 'custom') delete payload.custom_caller_id
    mutation.mutate(payload)
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const timeBased = form.time_based_calling === '1'

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={editing ? 'Edit RVM Campaign' : 'New Ringless Voicemail Campaign'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Title & Description */}
        <div>
          <label className="label">Campaign Title <span className="text-red-500">*</span></label>
          <input className="input" value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. April Promo Blast" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[60px]" value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Optional description…" />
        </div>

        {/* Voice Template */}
        <div>
          <label className="label">Voice Template / Audio Message <span className="text-red-500">*</span></label>
          <select className="input" value={form.voice_template_id}
            onChange={e => set('voice_template_id', e.target.value)}>
            <option value="">Select a voice template…</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.title ?? t.name ?? t.ivr_desc ?? `Template #${t.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Caller ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Caller ID Type</label>
            <select className="input" value={form.caller_id}
              onChange={e => set('caller_id', e.target.value)}>
              {CALLER_ID_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {form.caller_id === 'custom' && (
            <div>
              <label className="label">Custom Caller ID</label>
              <input className="input font-mono" value={form.custom_caller_id}
                onChange={e => set('custom_caller_id', e.target.value)}
                placeholder="10-digit number" />
            </div>
          )}
          {form.caller_id !== 'custom' && (
            <div>
              <label className="label">Country Code</label>
              <input className="input font-mono" value={form.country_code}
                onChange={e => set('country_code', e.target.value)}
                placeholder="1" />
            </div>
          )}
        </div>

        {/* Time-based calling */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timeBased}
              onChange={e => set('time_based_calling', e.target.checked ? '1' : '0')}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600"
            />
            <span className="text-sm font-medium text-slate-700">Restrict call hours</span>
          </label>
        </div>
        {timeBased && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.call_time_start}
                onChange={e => set('call_time_start', e.target.value)} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.call_time_end}
                onChange={e => set('call_time_end', e.target.value)} />
            </div>
          </div>
        )}

        {/* SIP Gateway */}
        {voipConfigs.length > 0 && (
          <div>
            <label className="label">SIP Gateway</label>
            <select className="input" value={form.sip_gateway_id}
              onChange={e => set('sip_gateway_id', e.target.value)}>
              <option value="">Auto-select</option>
              {voipConfigs.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name ?? v.title ?? v.host ?? `Gateway #${v.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status}
            onChange={e => set('status', e.target.value)}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : editing ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ──────────── Campaign Detail Preview Modal ────────────
function CampaignPreviewModal({
  campaign, onClose,
}: { campaign: RinglessCampaign; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Campaign Details" size="md">
      <div className="space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Voicemail size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{campaign.title}</p>
            <Badge variant={isActive(campaign.status) ? 'green' : 'gray'}>
              {isActive(campaign.status) ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {campaign.description && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{campaign.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <LayoutList size={14} className="text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{campaign.rowcount_lead_report ?? 0}</p>
            <p className="text-[10px] text-slate-400">Lists</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <Users size={14} className="text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{campaign.ringless_lead_temps_count ?? 0}</p>
            <p className="text-[10px] text-slate-400">In Queue</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <Radio size={14} className="text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800">{campaign.ringless_lead_report_count ?? 0}</p>
            <p className="text-[10px] text-slate-400">Delivered</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {campaign.caller_id && (
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Caller ID</span>
              <span className="font-medium text-slate-800 capitalize">
                {campaign.caller_id.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          {campaign.time_based_calling ? (
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Call Hours</span>
              <span className="font-medium text-slate-800">
                {campaign.call_time_start} – {campaign.call_time_end}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────── Main Page ────────────
export function RinglessVoicemail() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<RinglessCampaign | null>(null)
  const [preview, setPreview] = useState<RinglessCampaign | null>(null)

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number | string }) =>
      ringlessService.toggle(id, isActive(status) ? 0 : 1),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['ringless-campaigns'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const copyMutation = useMutation({
    mutationFn: (id: number) => ringlessService.copy(id),
    onSuccess: () => {
      toast.success('Campaign duplicated')
      qc.invalidateQueries({ queryKey: ['ringless-campaigns'] })
    },
    onError: () => toast.error('Failed to duplicate'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ringlessService.delete(id),
    onSuccess: () => {
      toast.success('Campaign deleted')
      qc.invalidateQueries({ queryKey: ['ringless-campaigns'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const columns: Column<RinglessCampaign>[] = [
    {
      key: 'title', header: 'Campaign',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-50">
            <Voicemail size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{row.title || '—'}</p>
            {row.description && (
              <p className="text-xs text-slate-400 truncate max-w-[180px]">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'lists', header: 'Lists / Queue',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <LayoutList size={12} className="text-slate-400" />
            <span className="text-sm text-slate-700 font-medium">{row.rowcount_lead_report ?? 0}</span>
            <span className="text-xs text-slate-400">lists</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-indigo-400" />
            <span className="text-sm text-slate-700 font-medium">{row.ringless_lead_temps_count ?? 0}</span>
            <span className="text-xs text-slate-400">queued</span>
          </div>
        </div>
      ),
    },
    {
      key: 'delivered', header: 'Delivered',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Radio size={12} className="text-emerald-400" />
          <span className="text-sm font-medium text-slate-700">
            {Number(row.ringless_lead_report_count ?? 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'caller_id', header: 'Caller ID',
      render: (row) => (
        <span className="text-xs text-slate-600 capitalize">
          {row.caller_id ? String(row.caller_id).replace(/_/g, ' ') : '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <Badge variant={isActive(row.status) ? 'green' : 'gray'}>
          {isActive(row.status) ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'View Details',
            icon: <Eye size={13} />,
            variant: 'view',
            onClick: () => setPreview(row),
          },
          {
            label: isActive(row.status) ? 'Pause' : 'Activate',
            icon: isActive(row.status) ? <Pause size={13} /> : <Play size={13} />,
            variant: isActive(row.status) ? 'warning' : 'success',
            onClick: () => toggleMutation.mutate({ id: row.id!, status: row.status ?? 0 }),
            disabled: toggleMutation.isPending,
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditing(row); setModal(true) },
          },
          {
            label: 'Duplicate',
            icon: <Copy size={13} />,
            variant: 'default',
            onClick: () => copyMutation.mutate(row.id!),
            disabled: copyMutation.isPending,
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.title)) deleteMutation.mutate(row.id!)
            },
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
            <h1 className="page-title">Ringless Voicemail</h1>
            <p className="page-subtitle">Send pre-recorded voicemails directly to voiceboxes without ringing</p>
          </div>
        </div>

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
            if (Array.isArray(r?.data)) return r.data as RinglessCampaign[]
            return (r?.data as { data?: RinglessCampaign[] })?.data ?? []
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
          headerActions={
            <button onClick={() => { setEditing(null); setModal(true) }} className="btn-primary">
              <Plus size={15} /> Add Campaign
            </button>
          }
        />
      </div>

      <CampaignFormModal
        isOpen={modal}
        onClose={() => { setModal(false); setEditing(null) }}
        editing={editing}
      />

      {preview && (
        <CampaignPreviewModal
          campaign={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}
