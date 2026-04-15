import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Eye, Pencil, Save, X, List, Users, Phone,
  ToggleLeft, ToggleRight, Columns3, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { listService } from '../../services/list.service'
import { formatDateTime } from '../../utils/format'
import type { ListHeaderRow } from '../../modules/lists/types'

export function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setToolbar, headerKey } = useDialerHeader()
  const listId = Number(id)

  const [editing, setEditing] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['list-detail', id],
    queryFn: () => listService.getById(listId),
  })

  // Fetch column mapping for label info
  const { data: mappingData } = useQuery({
    queryKey: ['list-mapping', listId],
    queryFn: () => listService.getMapping(listId),
    enabled: !!listId,
  })

  const rawData = (data as { data?: { data?: unknown } })?.data?.data
  const list = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
    ? rawData as Record<string, unknown>
    : Array.isArray(rawData) && rawData.length > 0
      ? rawData[0] as Record<string, unknown>
      : null

  const mappingRows: ListHeaderRow[] =
    (mappingData as { data?: { data?: ListHeaderRow[] } })?.data?.data ?? []

  const toggleMutation = useMutation({
    mutationFn: () =>
      listService.toggleStatus(listId, Number(list?.campaign_id ?? 0), list?.is_active === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['list-detail', id] }) },
    onError: () => toast.error('Failed to update status'),
  })

  const renameMutation = useMutation({
    mutationFn: () =>
      listService.update({ list_id: listId, campaign_id: list?.campaign_id ?? 0, title: newTitle }),
    onSuccess: () => {
      toast.success('List renamed')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['list-detail', id] })
    },
    onError: () => toast.error('Failed to rename'),
  })

  const name = (list?.l_title ?? list?.title ?? 'Unnamed List') as string
  const leadCount = Number(list?.lead_count ?? list?.rowListData ?? 0)
  const campaignName = (list?.campaign ?? '') as string

  // Inject toolbar
  useEffect(() => {
    setToolbar(
      <>
        <button className="lt-b" onClick={() => navigate('/lists')}>
          <ArrowLeft size={13} />
          Back
        </button>

        {list && (
          <span className="lt-desc">
            <strong style={{ color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>List:</strong>
            {name}
          </span>
        )}

        {campaignName && (
          <span className="lt-desc" style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
            <strong style={{ color: '#818cf8', fontWeight: 600, marginRight: 4 }}>Campaign:</strong>
            {campaignName}
          </span>
        )}

        {list && (
          <span className="lt-desc">
            {leadCount.toLocaleString()} leads
          </span>
        )}

        <div className="lt-right">
          <button className="lt-b" onClick={() => navigate(`/lists/${id}/mapping`)}>
            <Pencil size={13} />
            Edit Mapping
          </button>
          <button className="lt-b lt-p" onClick={() => navigate(`/lists/${id}/leads`)}>
            <Eye size={13} />
            View Leads
          </button>
        </div>
      </>
    )
  }, [headerKey, list, name, campaignName, leadCount])

  if (isLoading) return <PageLoader />

  if (!list) {
    return (
      <div className="card text-center py-16 text-slate-400">
        <List size={40} className="mx-auto mb-3 opacity-40" />
        <p>List not found</p>
        <button onClick={() => navigate('/lists')} className="btn-outline mt-3 mx-auto">Back to Lists</button>
      </div>
    )
  }

  const dialColumn = mappingRows.find(r => r.is_dialing === 1)
  const mappedColumns = mappingRows.filter(r => r.label_id)

  return (
    <div className="space-y-4">

      {/* ── List Info Card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">

          {/* List name (editable) */}
          <div className="flex items-center justify-between">
            {editing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  className="input text-sm font-semibold h-8 max-w-xs"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => renameMutation.mutate()}
                  disabled={!newTitle.trim() || renameMutation.isPending}
                  className="lt-b lt-p" style={{ height: 32 }}
                >
                  <Save size={12} /> Save
                </button>
                <button onClick={() => setEditing(false)} className="lt-b" style={{ height: 32 }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{name}</h2>
                <button
                  onClick={() => { setNewTitle(name); setEditing(true) }}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  title="Rename"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}

            {/* Status toggle */}
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className="flex items-center gap-1.5 transition-colors"
              title="Toggle Status"
            >
              <Badge variant={list.is_active === 1 ? 'green' : 'gray'}>
                {list.is_active === 1 ? 'Active' : 'Inactive'}
              </Badge>
              {list.is_active === 1
                ? <ToggleRight size={20} className="text-indigo-500" />
                : <ToggleLeft size={20} className="text-slate-400" />}
            </button>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{leadCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Leads</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Columns3 size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{mappingRows.length}</p>
                <p className="text-[10px] text-slate-500">Columns</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 truncate max-w-[100px]">
                  {dialColumn ? dialColumn.header : '—'}
                </p>
                <p className="text-[10px] text-slate-500">Dial Column</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Tag size={14} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{mappedColumns.length}</p>
                <p className="text-[10px] text-slate-500">Mapped</p>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            {campaignName && (
              <span>Campaign: <strong className="text-slate-600">{campaignName}</strong></span>
            )}
            <span>Dialing: <strong className="text-slate-600">{list.is_dialing === 1 ? 'Enabled' : 'Disabled'}</strong></span>
            {!!list.updated_at && (
              <span>Updated: <strong className="text-slate-600">{formatDateTime(list.updated_at as string)}</strong></span>
            )}
            {!!list.created_at && (
              <span>Created: <strong className="text-slate-600">{formatDateTime(list.created_at as string)}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* ── Column Mapping Card ────────────────────────────────────── */}
      {mappingRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Table Header */}
          <div className="grid grid-cols-[2rem_1fr_5.5rem_1fr] gap-3 items-center px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Column Name</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Dial</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mapped Label</span>
          </div>

          <div className="divide-y divide-slate-100">
            {mappingRows.map((row, i) => (
              <div
                key={row.id}
                className={`grid grid-cols-[2rem_1fr_5.5rem_1fr] gap-3 items-center px-4 py-2 transition-colors ${
                  row.is_dialing === 1 ? 'bg-indigo-50/60' : row.label_id ? 'bg-slate-50/40' : ''
                }`}
              >
                <span className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                  row.is_dialing === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>

                <p className={`text-xs font-semibold truncate ${row.is_dialing === 1 ? 'text-indigo-800' : 'text-slate-800'}`}>
                  {row.header || row.column_name}
                </p>

                <div className="flex justify-center">
                  {row.is_dialing === 1 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-600 text-white">
                      <Phone size={9} /> Dial
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </div>

                <div>
                  {row.label_title ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Tag size={9} /> {row.label_title}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300">Not mapped</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
                Dialing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block" />
                Mapped to label
              </span>
            </div>
            <button
              className="lt-b" style={{ height: 28, fontSize: 11 }}
              onClick={() => navigate(`/lists/${id}/mapping`)}
            >
              <Pencil size={11} /> Edit Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
