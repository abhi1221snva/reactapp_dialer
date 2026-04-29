import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  X, Wrench, AlertTriangle, RefreshCw, Loader2, Save,
  ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { leadService } from '../../services/lead.service'
import { cn } from '../../utils/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LenderPayloadFixModalProps {
  leadId: number
  lenderId: number
  lenderName: string
  errorMessage?: string | null
  requestPayload?: string | null
  onClose: () => void
  onFixed: () => void
}

interface FieldRow {
  crmKey: string
  lenderPath: string
  currentValue: string
  editedValue: string
  isHighlighted: boolean
  isStatic: boolean       // static literal values (=value) — not editable
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Pretty-print a lender path like "owners.0.homeAddress.state" → "Owners › Home Address › State" */
function humanizePath(path: string): string {
  return path
    .split('.')
    .filter(p => !/^\d+$/.test(p))
    .map(p => p.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim())
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' › ')
}

/** Check if an error message mentions a field (case-insensitive, fuzzy) */
function errorMentionsField(error: string, lenderPath: string, crmKey: string): boolean {
  const lower = error.toLowerCase()
  // Check full path
  if (lower.includes(lenderPath.toLowerCase())) return true
  // Check last segment of lender path
  const parts = lenderPath.split('.')
  const last = parts[parts.length - 1]
  if (last && lower.includes(last.toLowerCase())) return true
  // Check CRM key
  if (lower.includes(crmKey.toLowerCase().replace(/_/g, ' '))) return true
  if (lower.includes(crmKey.toLowerCase())) return true
  return false
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LenderPayloadFixModal({
  leadId,
  lenderId,
  lenderName,
  errorMessage,
  requestPayload,
  onClose,
  onFixed,
}: LenderPayloadFixModalProps) {
  const [fieldRows, setFieldRows] = useState<FieldRow[]>([])
  const [initialized, setInitialized] = useState(false)
  const [showPayload, setShowPayload] = useState(false)
  const [filterText, setFilterText] = useState('')

  // ── Fetch lender config (for payload_mapping) ──────────────────────────────
  const { data: lenderConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['lender-config-for-fix', lenderId],
    queryFn: async () => {
      const r = await crmService.getLenderApiConfig(lenderId)
      return (r.data?.data ?? r.data) as Record<string, unknown>
    },
    staleTime: 5 * 60 * 1000,
  })

  // ── Fetch lead data (all EAV + system fields) ─────────────────────────────
  const { data: leadData, isLoading: loadingLead } = useQuery({
    queryKey: ['lead-data-for-fix', leadId],
    queryFn: async () => {
      const r = await leadService.getById(leadId)
      return (r.data?.data ?? r.data) as Record<string, unknown>
    },
    staleTime: 60_000,
  })

  // ── Build field rows from payload_mapping + lead data ─────────────────────
  const isLoading = loadingConfig || loadingLead

  useMemo(() => {
    if (initialized || !lenderConfig || !leadData) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapping = lenderConfig.payload_mapping as Record<string, any> | null
    if (!mapping || typeof mapping !== 'object') return

    const errStr = errorMessage ?? ''
    const rows: FieldRow[] = []

    for (const [crmKey, lenderPath] of Object.entries(mapping)) {
      const isStatic = crmKey.startsWith('=')
      const paths = Array.isArray(lenderPath) ? lenderPath : [lenderPath]
      const displayPath = String(paths[0] ?? crmKey)
      const currentValue = isStatic
        ? crmKey.slice(1) // static value after "="
        : String(leadData[crmKey] ?? '')
      const isHighlighted = !isStatic && errStr.length > 0 && errorMentionsField(errStr, displayPath, crmKey)

      rows.push({
        crmKey,
        lenderPath: displayPath,
        currentValue,
        editedValue: currentValue,
        isHighlighted,
        isStatic,
      })
    }

    // Sort: highlighted first, then by lender path
    rows.sort((a, b) => {
      if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1
      return a.lenderPath.localeCompare(b.lenderPath)
    })

    setFieldRows(rows)
    setInitialized(true)
  }, [lenderConfig, leadData, initialized, errorMessage])

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!filterText) return fieldRows
    const lower = filterText.toLowerCase()
    return fieldRows.filter(r =>
      r.lenderPath.toLowerCase().includes(lower) ||
      r.crmKey.toLowerCase().includes(lower) ||
      r.currentValue.toLowerCase().includes(lower)
    )
  }, [fieldRows, filterText])

  // ── Track changes ─────────────────────────────────────────────────────────
  const changedFields = useMemo(() => {
    const updates: Record<string, string> = {}
    for (const r of fieldRows) {
      if (!r.isStatic && r.editedValue !== r.currentValue) {
        updates[r.crmKey] = r.editedValue
      }
    }
    return updates
  }, [fieldRows])

  const hasChanges = Object.keys(changedFields).length > 0

  // ── Save & Resubmit mutation ──────────────────────────────────────────────
  const fixMutation = useMutation({
    mutationFn: () =>
      crmService.fixAndResubmit(leadId, {
        lender_id: lenderId,
        field_updates: changedFields,
      }),
    onSuccess: () => {
      toast.success('Fields updated — resubmission queued')
      onFixed()
      onClose()
    },
    onError: (err: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message || 'Failed to save and resubmit'
      toast.error(msg)
    },
  })

  // ── Update a single field row ─────────────────────────────────────────────
  const updateField = (idx: number, value: string) => {
    setFieldRows(prev => prev.map((r, i) => i === idx ? { ...r, editedValue: value } : r))
  }

  // ── Pretty payload ────────────────────────────────────────────────────────
  const prettyPayload = useMemo(() => {
    if (!requestPayload) return null
    try { return JSON.stringify(JSON.parse(requestPayload), null, 2) } catch { return requestPayload }
  }, [requestPayload])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Wrench size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Edit Fields & Resubmit</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lenderName} &middot; Lead <span className="font-mono text-indigo-600">#{leadId}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={15} />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-5 mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3 flex-shrink-0">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700 mb-0.5">API Error</p>
              <p className="text-xs text-red-600 font-mono leading-relaxed break-words">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin text-indigo-400 mb-3" />
              <p className="text-sm">Loading lender fields&hellip;</p>
            </div>
          ) : fieldRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Wrench size={24} className="opacity-40 mb-3" />
              <p className="text-sm font-medium text-slate-500">No payload mapping configured</p>
              <p className="text-xs mt-1">This lender has no field mappings. Configure them in Lender API Configs.</p>
            </div>
          ) : (
            <>
              {/* Search/filter */}
              {fieldRows.length > 6 && (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    className="input pl-8 h-8 text-sm w-full"
                    placeholder="Filter fields…"
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                  />
                </div>
              )}

              {/* Field rows */}
              <div className="space-y-2">
                {filteredRows.map((row, idx) => {
                  // Find the real index in fieldRows for updates
                  const realIdx = fieldRows.indexOf(row)
                  const isChanged = row.editedValue !== row.currentValue

                  return (
                    <div
                      key={row.crmKey}
                      className={cn(
                        'rounded-xl border p-3 transition-colors',
                        row.isHighlighted
                          ? 'border-red-300 bg-red-50/50'
                          : isChanged
                            ? 'border-indigo-200 bg-indigo-50/30'
                            : 'border-slate-200 bg-white',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {humanizePath(row.lenderPath)}
                        </span>
                        {row.isHighlighted && (
                          <span className="text-[8px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                            ERROR
                          </span>
                        )}
                        {isChanged && (
                          <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            CHANGED
                          </span>
                        )}
                        {row.isStatic && (
                          <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                            STATIC
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono w-28 flex-shrink-0 truncate" title={row.crmKey}>
                          {row.crmKey}
                        </span>
                        {row.isStatic ? (
                          <span className="text-xs text-slate-500 font-mono flex-1">{row.currentValue}</span>
                        ) : (
                          <input
                            type="text"
                            value={row.editedValue}
                            onChange={e => updateField(realIdx, e.target.value)}
                            className={cn(
                              'flex-1 px-2.5 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400',
                              row.isHighlighted ? 'border-red-300' : 'border-slate-200',
                            )}
                            placeholder="Enter value…"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Changes summary */}
              {hasChanges && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-indigo-700">
                    {Object.keys(changedFields).length} field{Object.keys(changedFields).length !== 1 ? 's' : ''} changed
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {Object.entries(changedFields).map(([key, val]) => {
                      const row = fieldRows.find(r => r.crmKey === key)
                      return (
                        <p key={key} className="text-[10px] text-indigo-600 font-mono">
                          {key}: <span className="line-through text-red-400">{row?.currentValue || '(empty)'}</span>{' '}
                          → <span className="font-semibold text-emerald-600">{val || '(empty)'}</span>
                        </p>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sent payload (collapsible) */}
              {prettyPayload && (
                <div>
                  <button
                    onClick={() => setShowPayload(!showPayload)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
                  >
                    {showPayload ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Sent Payload {showPayload ? '(collapse)' : '(expand)'}
                  </button>
                  {showPayload && (
                    <pre className="mt-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg overflow-x-auto text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                      {prettyPayload}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-shrink-0">
          <button
            disabled={!hasChanges || fixMutation.isPending}
            onClick={() => fixMutation.mutate()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {fixMutation.isPending
              ? <><Loader2 size={12} className="animate-spin" /> Saving&hellip;</>
              : <><RefreshCw size={12} /> Save &amp; Resubmit</>
            }
          </button>
          <button
            disabled={!hasChanges || fixMutation.isPending}
            onClick={() => {
              // Save only — use fixAndResubmit but the backend always resubmits,
              // so we use applyLenderFix per-field without resubmit flag
              const promises = Object.entries(changedFields).map(([key, val]) =>
                crmService.applyLenderFix(leadId, { field_key: key, new_value: val })
              )
              Promise.all(promises)
                .then(() => { toast.success('Fields saved'); onFixed(); onClose() })
                .catch(() => toast.error('Failed to save some fields'))
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50 transition-colors"
          >
            <Save size={12} className="inline mr-1" />
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
