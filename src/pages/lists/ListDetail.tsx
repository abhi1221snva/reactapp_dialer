import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, Pencil, Save, X, List, Users, Activity, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { listService } from '../../services/list.service'
import { formatDateTime } from '../../utils/format'

export function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['list-detail', id],
    queryFn: () => listService.getById(Number(id)),
  })

  // /raw-list with list_id returns { data: singleObject } — handle both single and array
  const rawData = (data as { data?: { data?: unknown } })?.data?.data
  const list = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
    ? rawData as Record<string, unknown>
    : Array.isArray(rawData) && rawData.length > 0
      ? rawData[0] as Record<string, unknown>
      : null

  const toggleMutation = useMutation({
    mutationFn: () =>
      listService.toggleStatus(Number(id), Number(list?.campaign_id ?? 0), list?.is_active === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['list-detail', id] }) },
    onError: () => toast.error('Failed to update status'),
  })

  const renameMutation = useMutation({
    mutationFn: () =>
      listService.update({ list_id: Number(id), campaign_id: list?.campaign_id ?? 0, title: newTitle }),
    onSuccess: () => {
      toast.success('List renamed')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['list-detail', id] })
    },
    onError: () => toast.error('Failed to rename'),
  })

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

  const name = (list.l_title ?? list.title ?? 'Unnamed List') as string
  const leadCount = Number(list.lead_count ?? list.rowListData ?? 0)
  const headers = (list.list_header as Array<{ id: number; column_name: string; label_id: number }>) ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/lists')} className="btn-ghost p-2 rounded-lg mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                className="input text-lg font-semibold h-9 max-w-xs"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
              />
              <button
                onClick={() => renameMutation.mutate()}
                disabled={!newTitle.trim() || renameMutation.isPending}
                className="btn-primary btn-sm"
              >
                <Save size={13} /> Save
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost btn-sm p-1.5">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="page-title">{name}</h1>
              <button
                onClick={() => { setNewTitle(name); setEditing(true) }}
                className="btn-ghost btn-sm p-1.5 text-slate-400 hover:text-slate-700"
                title="Rename"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          <p className="page-subtitle">List #{id}</p>
        </div>
        <button
          onClick={() => navigate(`/lists/${id}/leads`)}
          className="btn-primary"
        >
          <Eye size={15} /> View Leads
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{leadCount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total Leads</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 capitalize">
              {list.is_active === 1 ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-slate-500">Status</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <List size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{headers.length} columns</p>
            <p className="text-xs text-slate-500">Data Headers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List info */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">List Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-900">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <div className="flex items-center gap-2">
                <Badge variant={list.is_active === 1 ? 'green' : 'gray'}>
                  {list.is_active === 1 ? 'Active' : 'Inactive'}
                </Badge>
                <button
                  onClick={() => toggleMutation.mutate()}
                  disabled={toggleMutation.isPending}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Toggle Status"
                >
                  {list.is_active === 1
                    ? <ToggleRight size={18} className="text-emerald-500" />
                    : <ToggleLeft size={18} />}
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dialing</span>
              <Badge variant={list.is_dialing === 1 ? 'blue' : 'gray'}>
                {list.is_dialing === 1 ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            {!!list.campaign && (
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign</span>
                <span className="font-medium text-slate-900">{list.campaign as string}</span>
              </div>
            )}
            {!!list.updated_at && (
              <div className="flex justify-between">
                <span className="text-slate-500">Updated</span>
                <span className="text-slate-700">{formatDateTime(list.updated_at as string)}</span>
              </div>
            )}
            {!!list.created_at && (
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700">{formatDateTime(list.created_at as string)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Data Columns ({headers.length})
          </h3>
          {headers.length === 0 ? (
            <p className="text-sm text-slate-400">No column headers defined</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {headers.map((h: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm px-2.5 py-1.5 bg-slate-50 rounded-lg">
                  <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 truncate">
                    {(h.title as string) || (h.column_name as string) || `Column ${i + 1}`}
                  </span>
                  {h.is_search === 1 && (
                    <span className="ml-auto text-[10px] text-indigo-500 font-medium">Searchable</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate(`/lists/${id}/leads`)}
            className="btn-outline w-full mt-2"
          >
            <Eye size={14} /> Browse {leadCount.toLocaleString()} Leads
          </button>
        </div>
      </div>
    </div>
  )
}
