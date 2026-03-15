import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, ShieldX, AlertTriangle, Search,
  Loader2, X, Plus, CheckCircle2, Clock, XCircle, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { ComplianceCheck, ComplianceCheckType, ComplianceResult, StackingWarning, AdvanceRegistryEntry } from '../../types/crm.types'

interface Props { leadId: number }

const CHECK_TYPE_LABELS: Record<ComplianceCheckType, string> = {
  ofac:             'OFAC Screen',
  kyc:              'KYC Verification',
  fraud_flag:       'Fraud Flag Check',
  credit_pull:      'Credit Pull',
  background:       'Background Check',
  sos_verification: 'SOS Verification',
  custom:           'Custom Check',
}

const RESULT_CFG: Record<ComplianceResult, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  pass:    { label: 'Pass',    bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  fail:    { label: 'Fail',    bg: 'bg-red-50',     text: 'text-red-700',     icon: XCircle      },
  pending: { label: 'Pending', bg: 'bg-amber-50',   text: 'text-amber-700',  icon: Clock        },
  skipped: { label: 'Skipped', bg: 'bg-slate-100',  text: 'text-slate-500',  icon: AlertCircle  },
}

function fmtDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtDec = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function StackingAlert({ warning }: { warning: StackingWarning }) {
  if (!warning.position_count || warning.position_count === 0) return null
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Stacking Warning</p>
        <p className="text-xs text-amber-700 mt-0.5">
          This merchant has <strong>{warning.position_count}</strong> existing advance
          {warning.position_count !== 1 ? 's' : ''} with a total daily burden of{' '}
          <strong>{fmtDec(warning.total_daily_burden ?? 0)}</strong>.
        </p>
      </div>
    </div>
  )
}

function RunCheckModal({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [checkType, setCheckType] = useState<ComplianceCheckType>('ofac')
  const [result, setResult]       = useState<ComplianceResult>('pending')
  const [notes, setNotes]         = useState('')

  const mutation = useMutation({
    mutationFn: () => crmService.runComplianceCheck(leadId, { check_type: checkType, result, notes: notes || undefined }),
    onSuccess: () => {
      toast.success('Compliance check recorded')
      qc.invalidateQueries({ queryKey: ['compliance', leadId] })
      onClose()
    },
    onError: () => toast.error('Failed to record check'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Run Compliance Check</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Check Type</label>
            <select value={checkType} onChange={e => setCheckType(e.target.value as ComplianceCheckType)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {(Object.keys(CHECK_TYPE_LABELS) as ComplianceCheckType[]).map(t => (
                <option key={t} value={t}>{CHECK_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Result</label>
            <select value={result} onChange={e => setResult(e.target.value as ComplianceResult)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="pending">Pending</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Add any relevant notes..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
              {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Save Check
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ComplianceChecksTable({ leadId }: { leadId: number }) {
  const [showModal, setShowModal] = useState(false)
  const { data: checks = [], isLoading } = useQuery<ComplianceCheck[]>({
    queryKey: ['compliance', leadId],
    queryFn: async () => { const r = await crmService.getComplianceChecks(leadId); return r.data?.data ?? r.data ?? [] },
  })

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-800">Compliance Checks</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{checks.length}</span>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> Run Check
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
      ) : checks.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">No compliance checks run yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Check</th>
              <th className="text-center py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Result</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
              <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {checks.map(check => {
              const cfg = RESULT_CFG[check.result]
              const Icon = cfg.icon
              return (
                <tr key={check.id} className="hover:bg-slate-50">
                  <td className="py-2 text-slate-700 font-medium">{CHECK_TYPE_LABELS[check.check_type] ?? check.check_type}</td>
                  <td className="py-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
                      <Icon size={9} />{cfg.label}
                    </span>
                  </td>
                  <td className="py-2 text-right text-xs text-slate-400">{fmtDate(check.created_at)}</td>
                  <td className="py-2 text-right text-xs text-slate-500 max-w-[150px] truncate">{check.notes ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {showModal && <RunCheckModal leadId={leadId} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function AdvanceRegistrySearch() {
  const [ein, setEin]     = useState('')
  const [ssn, setSsn]     = useState('')
  const [results, setResults] = useState<AdvanceRegistryEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!ein && !ssn) { toast.error('Enter EIN or SSN to search'); return }
    setLoading(true)
    try {
      const r = await crmService.searchAdvanceRegistry({ ein: ein || undefined, ssn: ssn || undefined })
      setResults(r.data?.data ?? r.data ?? [])
    } catch {
      toast.error('Registry search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Search size={16} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-800">Advance Registry Search</h3>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">EIN</label>
          <input value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">SSN (Last 4)</label>
          <input value={ssn} onChange={e => setSsn(e.target.value)} placeholder="XXXX" maxLength={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex items-end">
          <button onClick={handleSearch} disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Search
          </button>
        </div>
      </div>
      {results !== null && (
        results.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            No matches found in the advance registry.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600 flex items-center gap-1"><ShieldX size={12} /> {results.length} match{results.length !== 1 ? "es" : ""} found</p>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Business</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-semibold">Daily Burden</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-semibold">Positions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{r.business_name ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-red-600 font-semibold">{r.total_daily_burden != null ? fmtDec(r.total_daily_burden) : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{r.position_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

export function ComplianceTab({ leadId }: Props) {
  const { data: warning } = useQuery<StackingWarning>({
    queryKey: ['stacking-warning', leadId],
    queryFn: async () => {
      const r = await crmService.getPositions(leadId)
      const positions: { daily_payment?: number; remaining_balance?: number }[] = r.data?.data ?? r.data ?? []
      const totalDaily = positions.reduce((s, p) => s + (p.daily_payment ?? 0), 0)
      const balances = positions.map(p => p.remaining_balance ?? 0).filter(b => b > 0)
      return {
        position_count: positions.length,
        total_daily_burden: totalDaily,
        highest_balance: balances.length > 0 ? Math.max(...balances) : null,
      } as unknown as StackingWarning
    },
    staleTime: 30000,
  })

  return (
    <div className="space-y-5">
      {warning && <StackingAlert warning={warning} />}
      <ComplianceChecksTable leadId={leadId} />
      <AdvanceRegistrySearch />
    </div>
  )
}
