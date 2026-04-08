import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Upload, FileText, RefreshCw, Trash2, Eye, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { bankStatementService, type BankStatementSession } from '../../services/bankStatement.service'
import { confirmDelete } from '../../utils/confirmDelete'

// ── Helpers ──────────────────────────────────────────────────────────────────────

const TIER_OPTIONS = [
  { value: 'lsc_basic', label: 'LSC Basic (Fastest)' },
  { value: 'lsc_pro',   label: 'LSC Pro (Balanced)' },
  { value: 'lsc_max',   label: 'LSC Max (Most Accurate)' },
]

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending:    { label: 'Pending',    bg: 'bg-amber-50',    text: 'text-amber-700'    },
  processing: { label: 'Processing', bg: 'bg-sky-50',      text: 'text-sky-700'      },
  completed:  { label: 'Completed',  bg: 'bg-emerald-50',  text: 'text-emerald-700'  },
  failed:     { label: 'Failed',     bg: 'bg-red-50',      text: 'text-red-700'      },
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Main Tab ─────────────────────────────────────────────────────────────────────

interface Props { leadId: number }

export function BankStatementTab({ leadId }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tier, setTier] = useState('lsc_pro')
  const [dragging, setDragging] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['lead-bank-statements', leadId],
    queryFn: async () => {
      const res = await bankStatementService.getLeadSessions(leadId)
      return (res.data?.data ?? []) as BankStatementSession[]
    },
    refetchInterval: 10_000,
  })

  const sessions = data ?? []

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData()
      files.forEach(f => fd.append('files[]', f))
      fd.append('model_tier', tier)
      return bankStatementService.upload(leadId, fd)
    },
    onSuccess: () => {
      toast.success('Files uploaded — analysis started')
      qc.invalidateQueries({ queryKey: ['lead-bank-statements', leadId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Upload failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (sessionId: string) => bankStatementService.destroy(leadId, sessionId),
    onSuccess: () => {
      toast.success('Session deleted')
      qc.invalidateQueries({ queryKey: ['lead-bank-statements', leadId] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleFiles = useCallback((files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (!pdfs.length) { toast.error('Only PDF files are accepted'); return }
    uploadMut.mutate(pdfs)
  }, [uploadMut])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }

  return (
    <div className="space-y-5">

      {/* Upload */}
      <div className="flex flex-wrap items-end gap-3 mb-1">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Model Tier</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${dragging ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
        onClick={() => {
          const inp = document.createElement('input')
          inp.type = 'file'; inp.accept = '.pdf'; inp.multiple = true
          inp.onchange = () => inp.files && handleFiles(inp.files)
          inp.click()
        }}
      >
        {uploadMut.isPending ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <Loader2 size={18} className="animate-spin" /> Uploading…
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto mb-1.5 text-slate-400" />
            <p className="text-sm text-slate-600">Drop PDF bank statements here or <span className="text-emerald-600 font-semibold underline">browse</span></p>
            <p className="text-xs text-slate-400 mt-1">Up to 20 MB per file</p>
          </>
        )}
      </div>

      {/* Sessions */}
      {!sessions.length ? (
        <div className="text-center py-10">
          <FileText size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">No bank statement analysis yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.session_id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors cursor-pointer"
              onClick={() => navigate(`/crm/bank-statements/${s.session_id}`)}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.file_name ?? 'Unnamed'}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar size={9} /> {fmtDate(s.created_at)}
                    </p>
                  </div>
                  <StatusPill status={s.status} />
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-3">
                  {s.status === 'completed' && s.total_revenue != null && (
                    <span className="text-sm font-bold text-emerald-700">{fmt(s.total_revenue)}</span>
                  )}
                  {s.status === 'completed' && s.total_deposits != null && (
                    <span className="text-xs text-slate-500">{fmt(s.total_deposits)} deposits</span>
                  )}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => navigate(`/crm/bank-statements/${s.session_id}`)}
                      className="text-slate-400 hover:text-emerald-600 p-1 rounded transition-colors" title="View Details">
                      <Eye size={14} />
                    </button>
                    <button onClick={async () => {
                      if (await confirmDelete('Delete this analysis session?')) deleteMut.mutate(s.session_id)
                    }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
