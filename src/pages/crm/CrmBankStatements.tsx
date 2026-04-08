import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Upload, FileText, RefreshCw, Trash2, AlertCircle,
  BarChart3, Eye, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCrmHeader } from '../../layouts/CrmLayout'
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

// ── Main Page ────────────────────────────────────────────────────────────────────

export function CrmBankStatements() {
  useCrmHeader()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [tier, setTier] = useState('lsc_pro')
  const [dragging, setDragging] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['bank-statements', page],
    queryFn: async () => {
      const res = await bankStatementService.getAll({ page, per_page: 25 })
      const payload = res.data?.data ?? res.data ?? {}
      return {
        sessions: (payload.sessions ?? payload.data ?? []) as BankStatementSession[],
        meta: payload.meta as { total: number; per_page: number; current_page: number; page: number; last_page: number } | undefined,
      }
    },
    refetchInterval: 10_000,
  })

  const sessions = data?.sessions ?? []

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData()
      files.forEach(f => fd.append('files[]', f))
      fd.append('model_tier', tier)
      return bankStatementService.uploadStandalone(fd)
    },
    onSuccess: () => {
      toast.success('Files uploaded — analysis started')
      qc.invalidateQueries({ queryKey: ['bank-statements'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Upload failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (s: BankStatementSession) => bankStatementService.destroy(s.lead_id ?? 0, s.session_id),
    onSuccess: () => {
      toast.success('Session deleted')
      qc.invalidateQueries({ queryKey: ['bank-statements'] })
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

  return (
    <div className="space-y-5">

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Model Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
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
              <Loader2 size={20} className="animate-spin" /> Uploading…
            </div>
          ) : (
            <>
              <Upload size={28} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-600">Drop PDF bank statements here or <span className="text-emerald-600 font-semibold underline">browse</span></p>
              <p className="text-xs text-slate-400 mt-1">Up to 20 MB per file</p>
            </>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">Analysis Sessions</span>
            {sessions.length > 0 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{sessions.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/crm/bank-statements/logs')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 transition">
              <FileText size={12} /> API Logs
            </button>
            <button onClick={() => qc.invalidateQueries({ queryKey: ['bank-statements'] })}
              className="text-slate-400 hover:text-emerald-600 transition p-1" title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : !sessions.length ? (
          <div className="text-center py-16">
            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">No bank statement sessions yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload PDFs above to get started</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-2 text-slate-500 font-semibold">File</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Lead</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Status</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Tier</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">Revenue</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">Deposits</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">NSFs</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Uploaded</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.session_id} className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/crm/bank-statements/${s.session_id}`)}>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={13} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{s.file_name ?? 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {s.lead_id ? (
                      <span className="text-xs text-emerald-600 font-semibold">#{s.lead_id}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><StatusPill status={s.status} /></td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {(s.model_tier ?? '').replace('lsc_', '').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{fmt(s.total_revenue)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{fmt(s.total_deposits)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={s.nsf_count && s.nsf_count > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}>{s.nsf_count ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(s.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/crm/bank-statements/${s.session_id}`)}
                        className="text-slate-400 hover:text-emerald-600 p-1 rounded transition-colors" title="View Details">
                        <Eye size={14} />
                      </button>
                      <button onClick={async () => {
                        if (await confirmDelete('Delete this analysis session?')) deleteMut.mutate(s)
                      }}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
