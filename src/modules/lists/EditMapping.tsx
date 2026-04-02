import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Phone, Save, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { labelService } from '../../services/label.service'
import { campaignService } from '../../services/campaign.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import type { ListHeaderRow } from './types'

interface EditRow {
  id: number
  header: string
  column_name: string
  labelId: string
  isDial: boolean
}

export function EditMapping() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const listId = Number(id)

  // List details state
  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState(0)
  const [newCampaignId, setNewCampaignId] = useState(0)

  // Column mapping state
  const [rows, setRows] = useState<EditRow[]>([])
  const [dirty, setDirty] = useState(false)

  // Fetch list info (for title + campaign)
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['list-detail', String(listId)],
    queryFn: () => listService.getById(listId),
    enabled: !!listId,
  })

  // Fetch existing column mapping
  const { data: mappingData, isLoading: mappingLoading } = useQuery({
    queryKey: ['list-mapping', listId],
    queryFn: () => listService.getMapping(listId),
    enabled: !!listId,
  })

  // Fetch all labels
  const { data: labelsData, isLoading: labelsLoading } = useQuery({
    queryKey: ['labels-all'],
    queryFn: () => labelService.listAll(),
  })

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
  })

  const labels: Array<{ id: number; title: string }> =
    (labelsData as { data?: { data?: unknown } })?.data?.data as Array<{ id: number; title: string }> ?? []

  const campaigns: Array<{ id: number; title?: string; campaign_name?: string }> =
    (campaignsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title?: string; campaign_name?: string }> ?? []

  // Populate list details
  useEffect(() => {
    const raw = (listData as { data?: { data?: unknown } })?.data?.data
    const list = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : null
    if (list) {
      setTitle((list.l_title ?? list.title ?? '') as string)
      const cid = Number(list.campaign_id ?? 0)
      setCampaignId(cid)
      setNewCampaignId(cid)
    }
  }, [listData])

  // Populate column rows
  useEffect(() => {
    const raw = (mappingData as { data?: { data?: ListHeaderRow[] } })?.data?.data ?? []
    if (raw.length > 0) {
      setRows(raw.map(r => ({
        id:          r.id,
        header:      r.header,
        column_name: r.column_name,
        labelId:     r.label_id ? String(r.label_id) : '',
        isDial:      r.is_dialing === 1,
      })))
    }
  }, [mappingData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('List name is required.')
      if (rows.length > 0 && !rows.some(r => r.isDial)) {
        throw new Error('Select a dialing column before saving.')
      }

      // Save list details
      const payload: Record<string, unknown> = {
        list_id:     listId,
        campaign_id: campaignId || 0,
        title:       title.trim(),
      }
      if (newCampaignId && newCampaignId !== campaignId) {
        payload.new_campaign_id = newCampaignId
      }
      await listService.update(payload)

      // Save column mapping (only if headers exist)
      if (rows.length > 0) {
        await listService.updateMapping({
          list_id: listId,
          columns: rows.map(r => ({
            id:         r.id,
            label_id:   r.labelId ? parseInt(r.labelId, 10) : null,
            is_dialing: r.isDial ? 1 : 0,
          })),
        })
      }
    },
    onSuccess: () => {
      toast.success('List updated successfully.')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['lists'] })
      qc.invalidateQueries({ queryKey: ['list-mapping', listId] })
      qc.invalidateQueries({ queryKey: ['list-detail', String(listId)] })
      navigate(`/lists/${listId}`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save changes.')
    },
  })

  const setLabel = (rowId: number, labelId: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, labelId } : r))
    setDirty(true)
  }

  const setDial = (rowId: number) => {
    setRows(prev => prev.map(r => ({ ...r, isDial: r.id === rowId ? !r.isDial : false })))
    setDirty(true)
  }

  const dialRow = rows.find(r => r.isDial)
  const isLoading = listLoading || mappingLoading || labelsLoading

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/lists/${listId}`)} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Edit List</h1>
          <p className="page-subtitle">List #{listId} — update details and column mapping</p>
        </div>
        {dirty && (
          <span className="badge-yellow text-xs px-2 py-1">Unsaved changes</span>
        )}
      </div>

      {/* ── List Details ──────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">List Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">List Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true) }}
              placeholder="List name"
            />
          </div>

          {campaigns.length > 0 && (
            <div className="form-group">
              <label className="label">Campaign</label>
              <select
                className="input"
                value={newCampaignId}
                onChange={e => { setNewCampaignId(Number(e.target.value)); setDirty(true) }}
              >
                <option value={0}>— Select Campaign —</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.campaign_name}
                  </option>
                ))}
              </select>
              {newCampaignId !== campaignId && campaignId > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  This will move the list to the selected campaign.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Column Mapping ────────────────────────────────────────── */}
      {rows.length > 0 && (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Column Mapping</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set the dialing column and assign labels to fields
                </p>
              </div>
              {dialRow ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 font-medium">
                  <Phone size={12} />
                  Dial: {dialRow.header}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                  <AlertCircle size={12} />
                  No dial column
                </span>
              )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr_6rem_1fr] gap-3 items-center px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>#</span>
              <span>Excel Column</span>
              <span className="text-center">Dialing</span>
              <span>Label</span>
            </div>

            <div className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[2rem_1fr_6rem_1fr] gap-3 items-center px-4 py-3 transition-colors ${
                    row.isDial ? 'bg-indigo-50/60' : 'hover:bg-slate-50/40'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    row.isDial ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>

                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${row.isDial ? 'text-indigo-800' : 'text-slate-800'}`}>
                      {row.header}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setDial(row.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        row.isDial
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      <Phone size={11} />
                      {row.isDial ? 'Dial' : 'Set'}
                    </button>
                  </div>

                  <select
                    value={row.labelId}
                    onChange={e => setLabel(row.id, e.target.value)}
                    className={`input text-sm py-1.5 ${
                      row.labelId
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                        : 'text-slate-500'
                    }`}
                  >
                    <option value="">— No label —</option>
                    {labels.map(l => (
                      <option key={l.id} value={String(l.id)}>{l.title}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/lists/${listId}`)}
          disabled={saveMutation.isPending}
          className="btn-outline"
        >
          Cancel
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title.trim()}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {saveMutation.isPending ? (
            <><RefreshCw size={15} className="animate-spin" /> Saving…</>
          ) : (
            <><Save size={15} /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  )
}
