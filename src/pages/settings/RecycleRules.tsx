import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, RefreshCw, Save, X, Pencil,
  Search, ChevronDown, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { recycleRuleService } from '../../services/recycleRule.service'
import { campaignService } from '../../services/campaign.service'
import { listService } from '../../services/list.service'
import { dispositionService } from '../../services/disposition.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { cn, capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

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

// ─── Disposition Multi-Select Dropdown ────────────────────────────────────────
function DispositionDropdown({
  dispositions, selected, onChange, singleOnly,
}: {
  dispositions: OptionItem[]; selected: string[]; onChange: (ids: string[]) => void; singleOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = dispositions.filter(d =>
    (d.title ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const toggle = (id: string) => {
    if (singleOnly) { onChange([id]); setOpen(false); return }
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  const clearAll = (e: React.MouseEvent) => { e.stopPropagation(); onChange([]) }
  const selectedDisps = dispositions.filter(d => selected.includes(String(d.id)))

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 h-[38px] rounded-lg border text-sm transition-all text-left bg-white',
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300',
        )}>
        {selected.length === 0 ? (
          <span className="flex-1 text-slate-400 text-sm truncate">Select disposition{singleOnly ? '' : 's'}…</span>
        ) : (
          <div className="flex-1 flex items-center gap-1 overflow-hidden min-w-0">
            {selectedDisps.slice(0, 2).map(d => (
              <span key={d.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded border border-indigo-100 flex-shrink-0 max-w-[100px]">
                <span className="truncate">{d.title}</span>
                <span role="button" onClick={e => { e.stopPropagation(); onChange(selected.filter(x => x !== String(d.id))) }}
                  className="text-indigo-400 hover:text-red-500 cursor-pointer flex-shrink-0 leading-none">
                  <X size={9} />
                </span>
              </span>
            ))}
            {selected.length > 2 && (
              <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">+{selected.length - 2} more</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {selected.length > 0 && (
            <span onClick={clearAll} className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer p-0.5 leading-none">
              <X size={12} />
            </span>
          )}
          <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
            <Search size={12} className="text-slate-400 flex-shrink-0" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search dispositions…"
              className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400" />
            {search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600"><X size={11} /></button>}
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No dispositions found</p>
            ) : filtered.map(d => {
              const isChecked = selected.includes(String(d.id))
              return (
                <button key={d.id} type="button" onClick={() => toggle(String(d.id))}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors',
                    isChecked ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50')}>
                  <span className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300')}>
                    {isChecked && <CheckCircle2 size={9} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{d.title}</span>
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{selected.length} selected</span>
              <button type="button" onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-700 font-semibold">Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
    mutationFn: async () => {
      if (isEdit) {
        await recycleRuleService.softDelete(editRule!.id)
        return recycleRuleService.create({
          campaign_id: Number(campaignId),
          list_id: Number(listId),
          disposition: selectedDispositions.map(Number),
          day: selectedDays.map(d => d.toLowerCase()),
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

  const isValid = campaignId && listId && selectedDispositions.length > 0 && selectedDays.length > 0

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <RefreshCw size={18} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">{isEdit ? 'Edit Recycle Rule' : 'New Recycle Rule'}</h3>
                <p className="text-xs text-slate-500">Configure lead recycling schedule</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Campaign <span className="text-red-500">*</span></label>
              <select className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                <option value="">Select campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.title || c.campaign_name || `#${c.id}`}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">List <span className="text-red-500">*</span></label>
              <select className="input" value={listId} onChange={e => setListId(e.target.value)}>
                <option value="">Select list</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.title || l.l_title || `#${l.id}`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Disposition{isEdit ? '' : 's'} <span className="text-red-500">*</span>{isEdit ? ' (single)' : ''}</label>
            <DispositionDropdown
              dispositions={dispositions}
              selected={selectedDispositions}
              onChange={setSelectedDispositions}
              singleOnly={isEdit}
            />
          </div>

          <div className="form-group">
            <label className="label">Days <span className="text-red-500">*</span></label>
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

          <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
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
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<RecycleRuleItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search recycle rules" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => setShowCreate(true)} className="lt-b lt-p">
            <Plus size={13} /> Add Rule
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['recycle-rules'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => recycleRuleService.delete(id),
    onSuccess: () => { toast.success('Rule deleted'); invalidate() },
    onError: () => toast.error('Failed to delete rule'),
  })

  const columns: Column<RecycleRuleItem>[] = [
    {
      key: 'campaign',
      header: 'Campaign', sortable: true,
      sortValue: (row) => String(row.campaign || '').toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{capFirst(row.campaign || `#${row.campaign_id}`)}</span>
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

      <div className="space-y-4">
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
          searchPlaceholder="Search recycle rules"
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
          hideToolbar
        />
      </div>
    </>
  )
}
