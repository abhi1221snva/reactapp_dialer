import { CheckCircle, XCircle, SkipForward, RefreshCw, Loader2, X } from 'lucide-react'
import type { LenderSubmissionOutcome } from '../../types/crm.types'

interface SubmissionResultSummaryProps {
  outcomes: LenderSubmissionOutcome[]
  onClose: () => void
  onRetry: (lenderId: number) => void
  isRetrying: number | null
}

export function SubmissionResultSummary({ outcomes, onClose, onRetry, isRetrying }: SubmissionResultSummaryProps) {
  const succeeded = outcomes.filter(o => o.success && !o.validationErrors?.length)
  const failed    = outcomes.filter(o => !o.success && !o.validationErrors?.length)
  const skipped   = outcomes.filter(o => o.validationErrors?.length)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <p className="text-xs font-bold text-slate-800">Submission Results</p>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400">
          <X size={12} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        {/* Succeeded */}
        {succeeded.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle size={10} /> Submitted ({succeeded.length})
            </p>
            {succeeded.map(o => (
              <div key={o.lenderId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-700 flex-1">{o.lenderName}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  o.submissionType === 'api' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {o.submissionType === 'api' ? 'API' : 'Email'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Failed */}
        {failed.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide flex items-center gap-1">
              <XCircle size={10} /> Failed ({failed.length})
            </p>
            {failed.map(o => (
              <div key={o.lenderId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <XCircle size={12} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-700">{o.lenderName}</span>
                  {o.error && <p className="text-[10px] text-red-500 truncate mt-0.5">{o.error}</p>}
                </div>
                <button
                  onClick={() => onRetry(o.lenderId)}
                  disabled={isRetrying === o.lenderId}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {isRetrying === o.lenderId ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
                  Retry
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Skipped (validation failures) */}
        {skipped.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <SkipForward size={10} /> Skipped ({skipped.length})
            </p>
            {skipped.map(o => (
              <div key={o.lenderId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <SkipForward size={12} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-700">{o.lenderName}</span>
                  {o.validationErrors && (
                    <p className="text-[10px] text-amber-600 truncate mt-0.5">
                      Missing: {o.validationErrors.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
