import { useState } from 'react'
import { X, UserCheck, ArrowRightLeft, Trash2, Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { LeadStatus } from '../../types/crm.types'

interface Props {
  selectedIds: number[]
  statuses: LeadStatus[]
  agents: { id: number; name: string }[]
  onClear: () => void
  onRefresh: () => void
}

export function BulkActionsBar({ selectedIds, statuses, agents, onClear, onRefresh }: Props) {
  const [assignTo, setAssignTo] = useState('')
  const [changeStatus, setChangeStatus] = useState('')

  const assignMutation = useMutation({
    mutationFn: () => crmService.bulkAssign({ lead_ids: selectedIds, assigned_to: Number(assignTo) }),
    onSuccess: () => {
      toast.success(`Assigned ${selectedIds.length} lead(s)`)
      onClear(); onRefresh()
    },
    onError: () => toast.error('Bulk assign failed'),
  })

  const statusMutation = useMutation({
    mutationFn: () => crmService.bulkStatusChange({ lead_ids: selectedIds, lead_status: changeStatus }),
    onSuccess: () => {
      toast.success(`Updated ${selectedIds.length} lead(s)`)
      onClear(); onRefresh()
    },
    onError: () => toast.error('Bulk status change failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => crmService.bulkDelete({ lead_ids: selectedIds }),
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.length} lead(s)`)
      onClear(); onRefresh()
    },
    onError: () => toast.error('Bulk delete failed'),
  })

  const exportMutation = useMutation({
    mutationFn: () => crmService.bulkExport({ lead_ids: selectedIds }),
    onSuccess: (res) => {
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    },
    onError: () => toast.error('Export failed'),
  })

  const isPending = assignMutation.isPending || statusMutation.isPending || deleteMutation.isPending || exportMutation.isPending

  if (selectedIds.length === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
      style={{
        background: '#1E293B',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: '520px',
      }}
    >
      <span className="text-sm font-semibold text-white mr-1">
        {selectedIds.length} selected
      </span>

      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

      {/* Assign */}
      <div className="flex items-center gap-1.5">
        <UserCheck size={14} className="text-sky-400 flex-shrink-0" />
        <select
          value={assignTo}
          onChange={e => setAssignTo(e.target.value)}
          className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/10 outline-none"
        >
          <option value="">Assign to...</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {assignTo && (
          <button
            onClick={() => assignMutation.mutate()}
            disabled={isPending}
            className="text-xs px-2.5 py-1 rounded-lg font-medium bg-sky-500 text-white disabled:opacity-50"
          >
            Apply
          </button>
        )}
      </div>

      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

      {/* Status change */}
      <div className="flex items-center gap-1.5">
        <ArrowRightLeft size={14} className="text-indigo-400 flex-shrink-0" />
        <select
          value={changeStatus}
          onChange={e => setChangeStatus(e.target.value)}
          className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/10 outline-none"
        >
          <option value="">Set status...</option>
          {statuses.map(s => <option key={s.id} value={s.lead_title_url}>{s.lead_title}</option>)}
        </select>
        {changeStatus && (
          <button
            onClick={() => statusMutation.mutate()}
            disabled={isPending}
            className="text-xs px-2.5 py-1 rounded-lg font-medium bg-indigo-500 text-white disabled:opacity-50"
          >
            Apply
          </button>
        )}
      </div>

      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

      {/* Export */}
      <button
        onClick={() => exportMutation.mutate()}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium bg-emerald-600 text-white disabled:opacity-50"
        title="Export CSV"
      >
        {exportMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        Export
      </button>

      {/* Delete */}
      <button
        onClick={() => {
          if (window.confirm(`Delete ${selectedIds.length} lead(s)? This cannot be undone.`)) {
            deleteMutation.mutate()
          }
        }}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium bg-red-600 text-white disabled:opacity-50"
        title="Delete selected"
      >
        {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        Delete
      </button>

      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

      <button onClick={onClear} className="text-white/60 hover:text-white" title="Clear selection">
        <X size={16} />
      </button>
    </div>
  )
}
