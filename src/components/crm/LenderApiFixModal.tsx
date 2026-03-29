import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Wrench, X, AlertTriangle, Check, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { FixSuggestion, ApplyLenderFixPayload } from '../../types/crm.types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApiErrorDescInput {
  status?:         string
  response_code?:  number | null
  response_body?:  string | null
  error_message?:  string | null
}

// ── describeApiError ───────────────────────────────────────────────────────────

export function describeApiError(input: ApiErrorDescInput): { title: string; details: string[] } {
  const { status, response_code: code, response_body: body, error_message } = input

  if (status === 'timeout' || (!code && !body && status !== 'success')) return {
    title: 'Connection timed out',
    details: [
      'The lender server did not respond within the timeout window.',
      'Possible causes: server is temporarily down, rate-limited, or blocking this IP.',
    ],
  }

  let parsed: Record<string, unknown> | null = null
  try { if (body) parsed = JSON.parse(body) } catch { /* ignore */ }
  const errorMsgs = (parsed as { errorMessages?: string[] } | null)?.errorMessages

  if (code === 400) {
    if (!body) return {
      title: 'Request rejected — no details returned (HTTP 400)',
      details: [
        'The lender server returned an empty error response.',
        'Most likely causes:',
        "  • This server's IP (54.81.130.120) is not whitelisted by the lender",
        '  • API credentials are expired or invalid',
        '  • Required configuration is missing (base_url, endpoint_path)',
      ],
    }
    if (errorMsgs?.length) return {
      title: 'Validation errors from lender (HTTP 400)',
      details: errorMsgs.map(m => `• ${m}`),
    }
    return { title: 'Bad request (HTTP 400)', details: [(body ?? '').slice(0, 300)] }
  }
  if (code === 401) return {
    title: 'Authentication failed (HTTP 401)',
    details: ['API credentials are invalid or expired. Update the API key / token in Lender API Configs.'],
  }
  if (code === 403) return {
    title: 'Access forbidden (HTTP 403)',
    details: ["This server's IP may not be whitelisted by the lender. Contact your lender account manager."],
  }
  if (code === 404) return {
    title: 'Endpoint not found (HTTP 404)',
    details: ['The API URL is incorrect. Check base_url and endpoint_path in Lender API Configs.'],
  }
  if (code && code >= 500) return {
    title: `Lender server error (HTTP ${code})`,
    details: ["The lender's server encountered an internal error. Try again later."],
  }
  if (error_message) return { title: 'Request failed', details: [error_message] }
  return { title: `HTTP ${code ?? 'unknown'}`, details: [(body ?? '').slice(0, 300)] }
}

// ── LenderErrorList ────────────────────────────────────────────────────────────

interface LenderErrorListProps {
  suggestions:       FixSuggestion[]
  fallbackMessages?: string[]
  onFix:             (err: FixSuggestion) => void
}

export function LenderErrorList({ suggestions, fallbackMessages, onFix }: LenderErrorListProps) {
  if (suggestions.length === 0) {
    const msgs = fallbackMessages ?? []
    return msgs.length ? (
      <div className="mt-2 space-y-0.5">
        {msgs.map((m, i) => (
          <p key={i} className="text-xs text-red-700 opacity-90 whitespace-pre-wrap">• {m}</p>
        ))}
      </div>
    ) : null
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
        <AlertTriangle size={11} className="flex-shrink-0" />
        {suggestions.length} issue{suggestions.length !== 1 ? 's' : ''} found
      </p>

      {suggestions.map((err, i) => (
        <div key={i} className="flex items-start gap-2.5 bg-white border border-red-200 rounded-lg px-3 py-2.5">
          <div className="flex-1 min-w-0">
            {err.field && (
              <span className="inline-flex items-center text-[10px] font-mono font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mb-1">
                {err.field}
              </span>
            )}
            <p className="text-xs text-slate-700 leading-relaxed">{err.message}</p>
            {err.can_auto_fix && err.suggestion && (
              <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
                <Check size={9} className="flex-shrink-0" /> {err.suggestion}
              </p>
            )}
            {!err.can_auto_fix && err.expected && (
              <p className="text-[11px] text-slate-400 mt-0.5">{err.expected}</p>
            )}
          </div>
          {err.fix_type !== 'unknown' && (
            <button
              onClick={() => onFix(err)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                err.can_auto_fix
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Wrench size={10} />
              {err.can_auto_fix ? 'Auto-Fix' : 'Fix Now'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── ErrorFixModal ──────────────────────────────────────────────────────────────

interface ErrorFixModalProps {
  leadId:   number
  lenderId: number
  error:    FixSuggestion
  onClose:  () => void
  onFixed:  () => void
}

export function ErrorFixModal({ leadId, lenderId, error, onClose, onFixed }: ErrorFixModalProps) {
  const [editValue, setEditValue] = useState(error.current_value ?? '')
  const [mode, setMode] = useState<'auto' | 'manual'>(error.can_auto_fix ? 'auto' : 'manual')

  const applyMutation = useMutation({
    mutationFn: (payload: ApplyLenderFixPayload) => crmService.applyLenderFix(leadId, payload),
    onSuccess: (_data, payload) => {
      toast.success(payload.resubmit ? 'Fix saved — resubmitting to lender…' : 'Fix saved successfully')
      onFixed()
      onClose()
    },
    onError: () => toast.error('Failed to save fix'),
  })

  const valueToSave = mode === 'auto' ? (error.auto_fix_value ?? editValue) : editValue
  const canSave = valueToSave.trim() !== ''

  const fieldLabel = error.field
    ? error.field.split('.').filter(p => !/^\d+$/.test(p)).map(p =>
        p.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim()
      ).join(' › ')
    : error.crm_key || 'Field'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Wrench size={15} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">Fix Field</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[260px]">{error.field || error.crm_key}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Error message */}
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 leading-relaxed">{error.message}</p>
          </div>

          {/* Expected format */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Expected Format</p>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">{error.expected}</p>
          </div>

          {/* Auto-fix block */}
          {error.can_auto_fix && error.auto_fix_value && (
            <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-3.5">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Check size={11} /> Auto-Fix Available
              </p>
              <p className="text-xs text-emerald-800 mb-3">{error.suggestion}</p>
              {mode === 'auto' ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">
                      {error.current_value || <span className="italic text-slate-400">empty</span>}
                    </span>
                    <span className="text-slate-300 mx-2">→</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">{error.auto_fix_value}</span>
                  </div>
                  <button onClick={() => setMode('manual')} className="text-[11px] text-slate-400 hover:text-slate-600 underline flex-shrink-0">
                    Edit manually
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditValue(error.auto_fix_value!); setMode('auto') }}
                  className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Check size={10} /> Use auto-fix value ({error.auto_fix_value})
                </button>
              )}
            </div>
          )}

          {/* Manual edit */}
          {(!error.can_auto_fix || mode === 'manual') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {fieldLabel}
              </label>
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder={error.expected}
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
              />
              {error.current_value && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Current: <span className="font-mono">{error.current_value}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          <button
            disabled={!canSave || applyMutation.isPending}
            onClick={() => applyMutation.mutate({
              field_key:    error.crm_key || error.field,
              new_value:    valueToSave,
              lender_field: error.field,
              lender_id:    lenderId,
              resubmit:     true,
            })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {applyMutation.isPending
              ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
              : <><RefreshCw size={12} /> Save &amp; Resubmit</>
            }
          </button>
          <button
            disabled={!canSave || applyMutation.isPending}
            onClick={() => applyMutation.mutate({
              field_key:    error.crm_key || error.field,
              new_value:    valueToSave,
              lender_field: error.field,
            })}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50 transition-colors"
          >
            Save Only
          </button>
          <button onClick={onClose} className="px-3 py-2.5 text-xs text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
