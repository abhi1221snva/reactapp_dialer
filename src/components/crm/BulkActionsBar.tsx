import { useState, useRef, useEffect } from 'react'
import { X, UserCheck, ArrowRightLeft, Trash2, Download, Loader2, ChevronDown, Check } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { showConfirm } from '../../utils/confirmDelete'
import type { LeadStatus } from '../../types/crm.types'

interface Props {
  selectedIds: number[]
  statuses: LeadStatus[]
  agents: { id: number; name: string }[]
  onClear: () => void
  onRefresh: () => void
}

// ── Dropdown (replaces native <select> to avoid white-overlay issue) ─────────

function BarDropdown({
  label,
  icon,
  accent,
  value,
  onChange,
  options,
}: {
  label: string
  icon: React.ReactNode
  accent: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; color?: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: selected ? '#fff' : 'rgba(255,255,255,0.6)',
        }}
      >
        {icon}
        <span className="max-w-[120px] truncate">{selected?.label || label}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 w-52 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {/* Reset option */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              — {label} —
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/10"
                style={{ color: value === opt.value ? accent : 'rgba(255,255,255,0.8)' }}
              >
                {opt.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                )}
                <span className="flex-1 truncate">{opt.label}</span>
                {value === opt.value && <Check size={12} style={{ color: accent }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── BulkActionsBar ──────────────────────────────────────────────────────────

export function BulkActionsBar({ selectedIds, statuses, agents, onClear, onRefresh }: Props) {
  const [assignTo, setAssignTo] = useState('')
  const [changeStatus, setChangeStatus] = useState('')

  const assignMutation = useMutation({
    mutationFn: () => crmService.bulkAssign({ lead_ids: selectedIds, assigned_to: Number(assignTo) }),
    onSuccess: () => {
      toast.success(`Assigned ${selectedIds.length} lead(s)`)
      setAssignTo('')
      onClear(); onRefresh()
    },
    onError: () => toast.error('Bulk assign failed'),
  })

  const statusMutation = useMutation({
    mutationFn: () => crmService.bulkStatusChange({ lead_ids: selectedIds, lead_status: changeStatus }),
    onSuccess: () => {
      toast.success(`Updated ${selectedIds.length} lead(s)`)
      setChangeStatus('')
      onClear(); onRefresh()
    },
    onError: () => toast.error('Bulk status change failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => crmService.bulkDelete({ lead_ids: selectedIds, confirm: true }),
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

  const statusOptions = statuses.map(s => ({
    value: s.lead_title_url,
    label: s.lead_title,
    color: (s.color_code ?? s.color ?? '#6366f1') as string,
  }))

  const agentOptions = agents.map(a => ({
    value: String(a.id),
    label: a.name,
  }))

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Count badge */}
      <span
        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}
      >
        {selectedIds.length} selected
      </span>

      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Assign dropdown */}
      <div className="flex items-center gap-1.5">
        <BarDropdown
          label="Assign to…"
          icon={<UserCheck size={12} className="text-sky-400 flex-shrink-0" />}
          accent="#38bdf8"
          value={assignTo}
          onChange={setAssignTo}
          options={agentOptions}
        />
        {assignTo && (
          <button
            onClick={() => assignMutation.mutate()}
            disabled={isPending}
            className="text-[11px] px-2 py-1.5 rounded-lg font-semibold bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {assignMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Go'}
          </button>
        )}
      </div>

      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Status dropdown */}
      <div className="flex items-center gap-1.5">
        <BarDropdown
          label="Set status…"
          icon={<ArrowRightLeft size={12} className="text-indigo-400 flex-shrink-0" />}
          accent="#818cf8"
          value={changeStatus}
          onChange={setChangeStatus}
          options={statusOptions}
        />
        {changeStatus && (
          <button
            onClick={() => statusMutation.mutate()}
            disabled={isPending}
            className="text-[11px] px-2 py-1.5 rounded-lg font-semibold bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {statusMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Go'}
          </button>
        )}
      </div>

      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Export */}
      <button
        onClick={() => exportMutation.mutate()}
        disabled={isPending}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors flex-shrink-0"
        title="Export CSV"
      >
        {exportMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
        Export
      </button>

      {/* Delete */}
      <button
        onClick={async () => {
          if (await showConfirm({
            title:       `Delete ${selectedIds.length} Lead${selectedIds.length > 1 ? 's' : ''}?`,
            message:     `${selectedIds.length} lead${selectedIds.length > 1 ? 's' : ''} will be permanently deleted. This cannot be undone.`,
            confirmText: 'Yes, delete',
          })) {
            deleteMutation.mutate()
          }
        }}
        disabled={isPending}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors flex-shrink-0"
        title="Delete selected"
      >
        {deleteMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        Delete
      </button>

      <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Close */}
      <button onClick={onClear} className="p-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0" title="Clear selection">
        <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
      </button>
    </div>
  )
}
