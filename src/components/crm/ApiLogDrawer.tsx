import { useState, useEffect } from 'react'
import {
  X, CheckCircle2, AlertCircle, WifiOff, ChevronDown, ChevronUp,
  Clock, Wrench, FileText,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import type { FixSuggestion } from '../../types/crm.types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApiLog {
  id: number
  crm_lender_api_id: number | null
  lead_id: number
  lender_id: number
  user_id: number | null
  request_url: string
  request_method: string
  request_headers?: Record<string, string> | null
  request_payload?: string | null
  response_code: number | null
  response_body: string | null
  status: 'success' | 'http_error' | 'timeout' | 'error'
  error_message: string | null
  duration_ms: number | null
  attempt: number
  created_at: string
  lender_name?: string
  api_name?: string
  error_json?: FixSuggestion[] | null
  fix_suggestions?: FixSuggestion[] | null
  is_fixable?: boolean
}

interface ApiLogDrawerProps {
  open: boolean
  onClose: () => void
  log: ApiLog | null
  lenderName: string
  onFixError?: (error: FixSuggestion) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const prettyJson = (s: string | null | undefined) => {
  if (!s) return '—'
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApiLog['status'] }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    success:    { icon: <CheckCircle2 size={11} />, label: 'Success',    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    http_error: { icon: <AlertCircle  size={11} />, label: 'HTTP Error', cls: 'text-red-700 bg-red-50 border-red-200' },
    timeout:    { icon: <WifiOff      size={11} />, label: 'Timeout',    cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    error:      { icon: <AlertCircle  size={11} />, label: 'Error',      cls: 'text-red-700 bg-red-50 border-red-200' },
  }
  const cfg = map[status] ?? map.error
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ── MethodPill ─────────────────────────────────────────────────────────────────

function MethodPill({ method }: { method: string }) {
  const colors: Record<string, string> = {
    POST:   'bg-blue-50 text-blue-700 border-blue-200',
    GET:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    PUT:    'bg-amber-50 text-amber-700 border-amber-200',
    PATCH:  'bg-violet-50 text-violet-700 border-violet-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={cn('inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border', colors[method] ?? 'bg-slate-50 text-slate-500 border-slate-200')}>
      {method}
    </span>
  )
}

// ── Accent bar color ───────────────────────────────────────────────────────────

function accentGradient(status: ApiLog['status']) {
  if (status === 'success') return 'from-emerald-400 to-emerald-600'
  if (status === 'timeout') return 'from-amber-400 to-amber-600'
  return 'from-red-400 to-red-600'
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ApiLogDrawer({ open, onClose, log, lenderName, onFixError }: ApiLogDrawerProps) {
  const [requestExpanded, setRequestExpanded] = useState(false)

  // Reset collapsed state when log changes
  useEffect(() => { setRequestExpanded(false) }, [log?.id])

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const suggestions = log?.fix_suggestions ?? log?.error_json ?? []

  return (
    <div className={cn('fixed inset-0 z-[55]', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      {/* Backdrop */}
      <div
        className={cn('absolute inset-0 bg-slate-900/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 right-0 bottom-0 w-full max-w-[480px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!log ? (
          <>
            <div className="h-1 bg-gradient-to-r from-slate-300 to-slate-400" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <p className="text-sm font-bold text-slate-800">{lenderName}</p>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 px-6">
              <FileText size={32} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">No API log available</p>
              <p className="text-xs mt-1">This submission has no recorded API request/response.</p>
            </div>
          </>
        ) : (
          <>
            {/* ── Accent bar ──────────────────────────────────────────────── */}
            <div className={cn('h-1 bg-gradient-to-r', accentGradient(log.status))} />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-bold text-slate-900">API Log #{log.id}</h2>
                  <StatusBadge status={log.status} />
                </div>
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-600">{lenderName}</span>
                  {log.api_name && <> &middot; {log.api_name}</>}
                  {' '}&middot; Lead <span className="font-mono text-indigo-600">#{log.lead_id}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0 ml-4">
                <X size={16} />
              </button>
            </div>

            {/* ── Scrollable body ─────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Meta grid */}
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { label: 'HTTP Code', value: log.response_code ?? '—', color: log.response_code != null && log.response_code < 300 ? 'text-emerald-600' : 'text-red-600' },
                  { label: 'Duration',  value: log.duration_ms != null ? `${log.duration_ms}ms` : '—', color: log.duration_ms != null && log.duration_ms > 5000 ? 'text-red-600' : log.duration_ms != null && log.duration_ms > 2000 ? 'text-amber-600' : 'text-slate-700' },
                  { label: 'Attempt',   value: `#${log.attempt}`, color: log.attempt > 1 ? 'text-amber-600' : 'text-slate-700' },
                  { label: 'Method',    value: <MethodPill method={log.request_method} />, color: '' },
                ].map(m => (
                  <div key={m.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-1">{m.label}</p>
                    <div className={cn('text-sm font-bold', m.color)}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Error section */}
              {log.status !== 'success' && (
                <div className="space-y-2">
                  {log.error_message && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
                      <p className="text-xs text-red-600 font-mono leading-relaxed break-words">{log.error_message}</p>
                    </div>
                  )}

                  {/* Structured errors with fix suggestions */}
                  {suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field Errors</p>
                      {suggestions.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-700 font-mono">{err.field || err.crm_key || '—'}</span>
                              {err.can_auto_fix && (
                                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">AUTO-FIX</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{err.message || err.raw_message}</p>
                            {err.suggestion && (
                              <p className="text-[10px] text-indigo-500 mt-0.5 italic">{err.suggestion}</p>
                            )}
                            {err.current_value != null && err.auto_fix_value != null && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                <span className="line-through text-red-400">{err.current_value}</span>
                                {' → '}
                                <span className="font-medium text-emerald-600">{err.auto_fix_value}</span>
                              </p>
                            )}
                          </div>
                          {onFixError && (
                            <button
                              onClick={() => onFixError(err)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex-shrink-0"
                            >
                              <Wrench size={9} /> Fix
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Response body */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Response</p>
                <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                  {prettyJson(log.response_body)}
                </pre>
              </div>

              {/* Request section (collapsible) */}
              <div>
                <button
                  onClick={() => setRequestExpanded(!requestExpanded)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors mb-2"
                >
                  {requestExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Request {requestExpanded ? '(collapse)' : '(expand)'}
                </button>

                {requestExpanded && (
                  <div className="space-y-3">
                    {/* URL */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">URL</p>
                      <div className="flex items-start gap-2 font-mono bg-slate-900 px-3 py-2.5 rounded-lg">
                        <MethodPill method={log.request_method} />
                        <span className="text-xs text-green-400 break-all leading-relaxed">{log.request_url}</span>
                      </div>
                    </div>

                    {/* Headers */}
                    {log.request_headers && Object.keys(log.request_headers).length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Headers</p>
                        <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {JSON.stringify(log.request_headers, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Payload */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Payload</p>
                      <pre className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                        {prettyJson(log.request_payload)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 pt-1">
                <Clock size={10} />
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
