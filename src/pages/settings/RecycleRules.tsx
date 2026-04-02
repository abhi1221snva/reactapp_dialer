import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, RefreshCw, Save, X, ArrowLeft, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { recycleRuleService } from '../../services/recycleRule.service'
import { campaignService } from '../../services/campaign.service'
import { listService } from '../../services/list.service'
import { dispositionService } from '../../services/disposition.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'

interface RecycleRuleItem {
  id: number
  campaign_id?: number
  list_id?: number
  disposition_id?: number
  campaign?: string
  list?: string
  disposition?: string
  days?: string[]
  day?: string
  time?: string
  call_time?: number
  is_deleted?: number
  created_at?: string
  [key: string]: unknown
}

interface OptionItem {
  id: number
  title?: string
  campaign_name?: string
  l_title?: string
  [key: string]: unknown
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ─── Modal ────────────────────────────────────────────────────────────────────
function RecycleRuleModal({
  onClose,
  onSaved,
  editRule,
}: {
  onClose: () => void
  onSaved: () => void
  editRule?: RecycleRuleItem | null
}) {
  const isEdit = !!editRule

  const [campaignId, setCampaignId] = useState(editRule?.campaign_id ? String(editRule.campaign_id) : '')
  const [listId, setListId] = useState(editRule?.list_id ? String(editRule.list_id) : '')
  const [selectedDispositions, setSelectedDispositions] = useState<string[]>(
    editRule?.disposition_id ? [String(editRule.disposition_id)] : []
  )
  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    if (editRule) {
      const days = editRule.days ?? (editRule.day ? [editRule.day] : [])
      return days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase())
    }
    return []
  })
  const [time, setTime] = useState(editRule?.time ?? '09:00')
  const [callTime, setCallTime] = useState(editRule?.call_time ? String(editRule.call_time) : '1')

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
  })
  const { data: listsData } = useQuery({
    queryKey: ['lists-all'],
    queryFn: () => listService.getAll(),
  })
  const { data: dispositionsData } = useQuery({
    queryKey: ['dispositions-all'],
    queryFn: () => dispositionService.list({ page: 1, limit: 500, search: '', filters: {} }),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: OptionItem[] = ((campaignsData as any)?.data?.data ?? (campaignsData as any)?.data ?? []) as OptionItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lists: OptionItem[] = ((listsData as any)?.data?.data ?? []) as OptionItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispositions: OptionItem[] = ((dispositionsData as any)?.data?.data ?? []) as OptionItem[]

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return recycleRuleService.update({
          recycle_rule_id: editRule!.id,
          campaign_id: Number(campaignId),
          list_id: Number(listId),
          disposition_id: Number(selectedDispositions[0]),
          day: selectedDays[0]?.toLowerCase(),
          time,
          call_time: Number(callTime),
        })
      }
      return recycleRuleService.create({
        campaign_id: Number(campaignId),
        list_id: Number(listId),
        disposition: selectedDispositions.map(Number),
        day: selectedDays.map(d => d.toLowerCase()),
        time,
        call_time: Number(callTime),
      })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Recycle rule updated' : 'Recycle rule created')
      onSaved()
    },
    onError: () => toast.error(isEdit ? 'Failed to update recycle rule' : 'Failed to create recycle rule'),
  })

  const isValid = isEdit
    ? campaignId && listId && selectedDispositions.length === 1 && selectedDays.length === 1
    : campaignId && listId && selectedDispositions.length > 0 && selectedDays.length > 0

  const toggleDay = (day: string) => {
    if (isEdit) {
      setSelectedDays([day])
    } else {
      setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
    }
  }

  const toggleDisp = (id: string) => {
    if (isEdit) {
      setSelectedDispositions([id])
    } else {
      setSelectedDispositions(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">{isEdit ? 'Edit Recycle Rule' : 'New Recycle Rule'}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Campaign *</label>
            <select className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
              <option value="">Select campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.title || c.campaign_name || `#${c.id}`}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">List *</label>
            <select className="input" value={listId} onChange={e => setListId(e.target.value)}>
              <option value="">Select list</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.title || l.l_title || `#${l.id}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Disposition{isEdit ? '' : 's'} *{isEdit ? ' (single)' : ''}</label>
          <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
            {dispositions.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDisp(String(d.id))}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDispositions.includes(String(d.id))
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {d.title}
              </button>
            ))}
            {dispositions.length === 0 && (
              <span className="text-xs text-slate-400 italic">Loading dispositions…</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="label">Day{isEdit ? '' : 's'} *{isEdit ? ' (single)' : ''}</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDays.includes(day)
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Time</label>
            <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Call Count</label>
            <input
              type="number"
              className="input"
              min="1"
              placeholder="1"
              value={callTime}
              onChange={e => setCallTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function RecycleRules() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<RecycleRuleItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['recycle-rules'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => recycleRuleService.delete(id),
    onSuccess: () => { toast.success('Rule deleted'); invalidate() },
    onError: () => toast.error('Failed to delete rule'),
  })

  const columns: Column<RecycleRuleItem>[] = [
    {
      key: 'campaign',
      header: 'Campaign',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{row.campaign || `#${row.campaign_id}`}</span>
        </div>
      ),
    },
    {
      key: 'list',
      header: 'List',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.list || `#${row.list_id}`}</span>
      ),
    },
    {
      key: 'disposition',
      header: 'Disposition',
      render: (row) => (
        <Badge variant="blue">{row.disposition || `#${row.disposition_id}`}</Badge>
      ),
    },
    {
      key: 'days',
      header: 'Days',
      render: (row) => {
        const days = row.days ?? (row.day ? [row.day] : [])
        return (
          <div className="flex flex-wrap gap-1">
            {days.map((d: string) => (
              <span key={d} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">
                {d.slice(0, 3)}
              </span>
            ))}
            {days.length === 0 && <span className="text-xs text-slate-400">—</span>}
          </div>
        )
      },
    },
    {
      key: 'call_time',
      header: 'Call Count',
      render: (row) => (
        <span className="text-sm font-semibold text-slate-700">{row.call_time ?? '—'}</span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.time || '—'}</span>
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
            label: 'Edit',
            icon: <Pencil size={13} />,
            onClick: () => setEditingRule(row),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete('this recycle rule')) deleteMutation.mutate(row.id)
            },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {(showCreate || editingRule) && (
        <RecycleRuleModal
          editRule={editingRule}
          onClose={() => { setShowCreate(false); setEditingRule(null) }}
          onSaved={() => { setShowCreate(false); setEditingRule(null); invalidate() }}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/')} className="btn-ghost p-1.5 rounded-lg">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title">Recycle Rules</h1>
              <p className="page-subtitle">Configure lead recycling by disposition and schedule</p>
            </div>
          </div>
        </div>

        <ServerDataTable<RecycleRuleItem>
          queryKey={['recycle-rules']}
          queryFn={(params) => recycleRuleService.list(params)}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.total ?? r?.data?.data?.length ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search rules…"
          emptyText="No recycle rules found"
          emptyIcon={<RefreshCw size={40} />}
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
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={15} /> Add Rule
            </button>
          }
        />
      </div>
    </>
  )
}
