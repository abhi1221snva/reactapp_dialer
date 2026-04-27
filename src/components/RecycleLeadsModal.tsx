import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { RefreshCw, X, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../services/campaign.service'
import { campaignDialerService } from '../services/campaignDialer.service'
import { showConfirm } from '../utils/confirmDelete'

// ── Types ────────────────────────────────────────────────────────────────────

interface DispositionStat {
  id: number
  name: string
  record_count: number
}

interface RecycleRow {
  dispositionId: number
  dispositionName: string
  recordCount: number
  selected: boolean
  callCount: number
}

export interface RecycleLeadsModalProps {
  isOpen: boolean
  campaignId: number
  listId: number
  listName: string
  onClose: () => void
  onSuccess?: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function RecycleLeadsModal({
  isOpen,
  campaignId,
  listId,
  listName,
  onClose,
  onSuccess,
}: RecycleLeadsModalProps) {
  const [rows, setRows] = useState<RecycleRow[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch disposition data when modal opens
  useEffect(() => {
    if (!isOpen || !campaignId || !listId) return
    let cancelled = false

    const fetchData = async () => {
      setRows([])
      setLoading(true)
      try {
        const [legacyRes, queueRes] = await Promise.allSettled([
          campaignService.getListDispositions(campaignId, listId),
          campaignDialerService.getQueueSummary(campaignId),
        ])

        const dispoMap = new Map<number, { name: string; count: number }>()

        // Legacy lead_report dispositions
        if (legacyRes.status === 'fulfilled') {
          const items: DispositionStat[] =
            (legacyRes.value as { data?: { data?: DispositionStat[] } })?.data?.data ?? []
          for (const item of items) {
            if (item.id > 0) {
              dispoMap.set(item.id, { name: item.name, count: item.record_count })
            }
          }
        }

        // New queue dispositions
        if (queueRes.status === 'fulfilled') {
          const qRows =
            (
              queueRes.value as {
                data?: {
                  data?: Array<{
                    disposition_id: number | null
                    disposition_title: string | null
                    status: string
                    count: number
                  }>
                }
              }
            )?.data?.data ?? []
          for (const r of qRows) {
            if (r.disposition_id && r.disposition_id > 0 && (r.status === 'completed' || r.status === 'failed')) {
              const existing = dispoMap.get(r.disposition_id)
              if (existing) {
                existing.count += Number(r.count)
              } else {
                dispoMap.set(r.disposition_id, {
                  name: r.disposition_title || `Disposition #${r.disposition_id}`,
                  count: Number(r.count),
                })
              }
            }
          }
        }

        if (cancelled) return
        setRows(
          Array.from(dispoMap.entries())
            .map(([dispId, { name, count }]) => ({
              dispositionId: dispId,
              dispositionName: name,
              recordCount: count,
              selected: false,
              callCount: 1,
            }))
            .sort((a, b) => b.recordCount - a.recordCount),
        )
      } catch {
        if (!cancelled) toast.error('Failed to load disposition data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [isOpen, campaignId, listId])

  // ── Selection handlers ───────────────────────────────────────────────────

  const toggleSelectAll = () => {
    const allSelected = rows.every(r => r.selected)
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  const toggleRow = (idx: number) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)))
  }

  const updateCallCount = (idx: number, value: number) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, callCount: Math.max(1, value) } : r)))
  }

  // ── Computed values ──────────────────────────────────────────────────────

  const selectedCount = rows.filter(r => r.selected).length
  const selectedRecords = rows.filter(r => r.selected).reduce((sum, r) => sum + r.recordCount, 0)

  // ── Mutation ─────────────────────────────────────────────────────────────

  const recycleMutation = useMutation({
    mutationFn: async (payload: { campaign_id: number; list_id: number; disposition: number[]; select_id: number[] }) => {
      const [legacyRes, queueRes] = await Promise.allSettled([
        campaignService.recycleLists(payload),
        campaignDialerService.requeueLeads(payload.campaign_id, payload.disposition, ['completed', 'failed']),
      ])
      const deleted =
        legacyRes.status === 'fulfilled'
          ? (legacyRes.value as { data?: { deleted?: number } })?.data?.deleted ?? 0
          : 0
      const requeued =
        queueRes.status === 'fulfilled'
          ? (queueRes.value as { data?: { requeued?: number } })?.data?.requeued ?? 0
          : 0
      return { deleted, requeued }
    },
    onSuccess: ({ deleted, requeued }) => {
      const total = deleted + requeued
      if (total > 0) {
        toast.success(`${total} lead${total !== 1 ? 's' : ''} recycled successfully`)
      } else {
        toast.success('Recycle complete — no matching leads found')
      }
      onClose()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to recycle leads'),
  })

  const handleSubmit = async () => {
    const selected = rows.filter(r => r.selected)
    if (selected.length === 0) {
      toast.error('Select at least one disposition to recycle')
      return
    }

    const totalRecords = selected.reduce((sum, r) => sum + r.recordCount, 0)
    const confirmed = await showConfirm({
      title: 'Recycle Leads?',
      message: `This will recycle ${totalRecords.toLocaleString()} lead${totalRecords !== 1 ? 's' : ''} across ${selected.length} disposition${selected.length !== 1 ? 's' : ''} back into the dialer queue.`,
      confirmText: 'Yes, Recycle',
      icon: 'question',
      danger: false,
    })
    if (!confirmed) return

    recycleMutation.mutate({
      campaign_id: campaignId,
      list_id: listId,
      disposition: selected.map(r => r.dispositionId),
      select_id: selected.map(r => r.callCount),
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[580px] mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        {/* ─── Header (fixed) ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <RefreshCw size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-slate-900">Recycle Leads</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[320px]">{listName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Body (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Loading disposition data...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Tag size={20} className="text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-600">No dispositions found</p>
              <p className="text-[11px] text-slate-400">No leads with dispositions exist for this list yet.</p>
            </div>
          ) : (
            <div className="px-6 py-4">
              <p className="text-[11px] text-slate-500 mb-4">
                These are the dispositions used in this campaign/list. Select which ones to recycle back into the dialer
                queue.
              </p>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2.5rem_1fr_5rem_5.5rem] items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every(r => r.selected)}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disposition</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    Records
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    Max Calls
                  </span>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <div
                      key={row.dispositionId}
                      className={`grid grid-cols-[2.5rem_1fr_5rem_5.5rem] items-center px-4 py-3 transition-colors cursor-pointer ${
                        row.selected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => toggleRow(idx)}
                    >
                      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(idx)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${row.selected ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                        <span
                          className={`text-xs font-medium truncate ${row.selected ? 'text-slate-900' : 'text-slate-700'}`}
                        >
                          {row.dispositionName}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.selected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.recordCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={row.callCount}
                          onChange={e => updateCallCount(idx, Number(e.target.value))}
                          className={`w-14 text-xs text-center border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${
                            row.selected
                              ? 'border-emerald-200 bg-white'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer (fixed) ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            {selectedCount > 0 ? (
              <span>
                <span className="font-bold text-emerald-700">{selectedCount}</span> disposition
                {selectedCount !== 1 ? 's' : ''} selected
                <span className="mx-1.5 text-slate-300">|</span>
                <span className="font-bold text-slate-700">{selectedRecords.toLocaleString()}</span> record
                {selectedRecords !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-slate-400">No dispositions selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={recycleMutation.isPending || selectedCount === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              {recycleMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recycling...
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  Recycle Leads
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
