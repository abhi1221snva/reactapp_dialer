import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, FileText, Trash2, Eye, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { bankStatementService, type BankStatementSession } from '../../services/bankStatement.service'
import { confirmDelete } from '../../utils/confirmDelete'
import { DocumentUploadButton, type StagedFile } from './DocumentUploadButton'

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
  const [tier, setTier] = useState('lsc_pro')

  const { data, isLoading } = useQuery({
    queryKey: ['lead-bank-statements', leadId],
    queryFn: async () => {
      const res = await bankStatementService.getLeadSessions(leadId)
      return (res.data?.data ?? []) as BankStatementSession[]
    },
    refetchInterval: 10_000,
  })

  const sessions = data ?? []

  async function uploadBankStatements(items: StagedFile[], onProgress: (pct: number) => void) {
    const fd = new FormData()
    items.forEach(it => fd.append('files[]', it.file))
    fd.append('model_tier', tier)
    const res = await bankStatementService.upload(leadId, fd, (evt: { loaded: number; total?: number }) => {
      if (evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100))
    })
    qc.invalidateQueries({ queryKey: ['lead-bank-statements', leadId] })
    return res
  }

  const deleteMut = useMutation({
    mutationFn: (sessionId: string) => bankStatementService.destroy(leadId, sessionId),
    onSuccess: () => {
      toast.success('Session deleted')
      qc.invalidateQueries({ queryKey: ['lead-bank-statements', leadId] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }

  const tierSelector = (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1 block">Model Tier</label>
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
      >
        {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <p className="text-[11px] text-slate-400 mt-1">Applied to all files in this batch</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Upload */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Bank Statement Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">Upload PDF bank statements to run AI analysis</p>
        </div>
        <DocumentUploadButton
          onUpload={uploadBankStatements}
          buttonLabel="Upload Statements"
          modalTitle="Upload Bank Statements"
          modalSubtitle="Only PDF bank statements are accepted. All files use the selected model tier."
          showDocumentType={false}
          allowedExt=".pdf"
          allowedExts={new Set(['pdf'])}
          allowedMimes={new Set(['application/pdf'])}
          headerExtra={tierSelector}
          successMessage={(c) => `${c} file${c !== 1 ? 's' : ''} uploaded — analysis started`}
        />
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
              className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors">
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
                  <div className="flex items-center gap-1">
                    {s.status === 'completed' && (
                      <button onClick={() => window.open(`/crm/bank-statements/${s.session_id}`, '_blank')}
                        className="text-emerald-500 hover:text-emerald-700 p-1 rounded transition-colors" title="View Analysis Details">
                        <Eye size={14} />
                      </button>
                    )}
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
