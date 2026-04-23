import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Phone, Save, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { labelService } from '../../services/label.service'
import { campaignService } from '../../services/campaign.service'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
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
  const { setToolbar, headerKey } = useDialerHeader()
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
  const { data: labelsData, isLoading: labelsLoading, isError: labelsError } = useQuery({
    queryKey: ['labels-all'],
    queryFn: () => labelService.listAll(),
  })

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
  })

  const labels: Array<{ id: number; title: string; display_order?: number }> =
    ((labelsData as { data?: { data?: unknown } })?.data?.data as Array<{ id: number; title: string; display_order?: number }> ?? [])
      .slice()
      .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))

  const labelOptions = labels.map(l => ({ value: String(l.id), label: l.title }))

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

      // Confirm campaign move
      if (newCampaignId && newCampaignId !== campaignId && campaignId > 0) {
        const targetName = campaigns.find(c => c.id === newCampaignId)?.title
          || campaigns.find(c => c.id === newCampaignId)?.campaign_name
          || `Campaign #${newCampaignId}`
        if (!window.confirm(`Move this list to "${targetName}"? This cannot be undone.`)) {
          throw new Error('') // silently cancel
        }
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
      if (err.message) toast.error(err.message)
      // Empty message = user cancelled confirmation dialog — no toast needed
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

  // Inject toolbar
  useEffect(() => {
    setToolbar(
      <>
        <button className="lt-b" onClick={() => navigate(`/lists/${listId}`)}>
          <ArrowLeft size={13} />
          Back
        </button>

        {title && (
          <span className="lt-desc">
            <strong style={{ color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>List:</strong>
            {title}
          </span>
        )}

        {dialRow && (
          <span className="lt-desc" style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
            <Phone size={11} style={{ marginRight: 4 }} />
            Dial: {dialRow.header}
          </span>
        )}

        {dirty && (
          <span className="lt-desc" style={{ background: '#fef9c3', borderColor: '#fde68a', color: '#92400e' }}>
            Unsaved
          </span>
        )}

        <div className="lt-right">
          <button
            className="lt-b"
            onClick={() => {
              if (dirty && !window.confirm('You have unsaved changes. Discard and leave?')) return
              navigate(`/lists/${listId}`)
            }}
            disabled={saveMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="lt-b lt-p"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
          >
            {saveMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </>
    )
  }, [headerKey, title, dirty, dialRow?.header, saveMutation.isPending])

  if (isLoading) return <PageLoader />

  if (labelsError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load labels. Please refresh the page and try again.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* ── List Details Card ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileSpreadsheet size={14} className="text-indigo-500" />
            <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">List Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 tracking-wide mb-1">
                List Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={title}
                onChange={e => { setTitle(e.target.value); setDirty(true) }}
                placeholder="List name"
              />
            </div>

            {campaigns.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 tracking-wide mb-1">
                  Campaign
                </label>
                <SearchableSelect
                  options={campaigns.map(c => ({ value: String(c.id), label: c.title || c.campaign_name || `Campaign #${c.id}` }))}
                  value={String(newCampaignId)}
                  onChange={v => { setNewCampaignId(Number(v)); setDirty(true) }}
                  placeholder="Search campaigns…"
                  emptyLabel="-- Select Campaign --"
                  className="input"
                />
                {newCampaignId !== campaignId && campaignId > 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    This will move the list to the selected campaign.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Column Mapping Card ────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Info banner */}
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex gap-2.5">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
            <p className="text-[11px] text-blue-700">
              Set the <strong>Dialing</strong> column (required), then optionally assign labels to columns for search & display.
            </p>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[2rem_1fr_5.5rem_1fr] gap-3 items-center px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Excel Column</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Dial</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Label</span>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <div
                key={row.id}
                className={`grid grid-cols-[2rem_1fr_5.5rem_1fr] gap-3 items-center px-4 py-2.5 transition-colors ${
                  row.isDial ? 'bg-indigo-50/60' : row.labelId ? 'bg-slate-50/40' : 'hover:bg-slate-50/30'
                }`}
              >
                <span className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                  row.isDial ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>

                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${row.isDial ? 'text-indigo-800' : 'text-slate-800'}`}>
                    {row.header}
                  </p>
                  {(row.isDial || row.labelId) && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {row.isDial && <span className="text-indigo-500 font-semibold">Dialing Number</span>}
                      {row.labelId && !row.isDial && (
                        <span className="text-emerald-600 font-semibold">
                          {labels.find(l => String(l.id) === row.labelId)?.title ?? 'Mapped'}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDial(row.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                      row.isDial
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    <Phone size={10} />
                    {row.isDial ? 'Dial' : 'Set'}
                  </button>
                </div>

                <SearchableSelect
                  options={labelOptions}
                  value={row.labelId}
                  onChange={v => setLabel(row.id, v)}
                  placeholder="Search or select label"
                  emptyLabel="-- Skip --"
                  className={`input text-xs py-1.5 ${
                    row.labelId
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'text-slate-500'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Footer legend */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
              Dialing (required)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
              Mapped
            </span>
          </div>
        </div>
      )}

      {/* No dial column warning */}
      {rows.length > 0 && !dialRow && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={13} className="flex-shrink-0 text-red-500" />
          <span>Please select a <strong>Dialing</strong> column to save.</span>
        </div>
      )}
    </div>
  )
}
