import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronDown, ChevronRight, Send, RefreshCw, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { autoLabel } from '../../constants/crmFieldLabels'
import type { GroupedValidationState, LenderValidationResult } from '../../types/crm.types'

interface LenderValidationPanelProps {
  validationState: GroupedValidationState
  leadId: number
  onDismiss: () => void
  onSubmitValid: () => void
  onRetryValidation: () => void
  isSubmitting?: boolean
  isValidating?: boolean
}

export function LenderValidationPanel({
  validationState,
  leadId,
  onDismiss,
  onSubmitValid,
  onRetryValidation,
  isSubmitting,
  isValidating,
}: LenderValidationPanelProps) {
  const qc = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    // Auto-expand invalid lenders
    return new Set(validationState.invalidLenderIds)
  })

  const invalidResults = validationState.results.filter(r => !r.isValid && r.isApiLender)
  const validCount = validationState.validLenderIds.length

  // Auto-scroll to the panel on mount
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const toggle = (id: number) => {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div ref={scrollRef} className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-800">
            {invalidResults.length} lender{invalidResults.length !== 1 ? 's' : ''} missing required fields
          </span>
        </div>
        <button onClick={onDismiss} className="text-[11px] text-amber-600 hover:text-amber-800 underline">
          Dismiss
        </button>
      </div>

      {/* Per-lender error groups */}
      <div className="divide-y divide-amber-100">
        {invalidResults.map(result => (
          <LenderErrorGroup
            key={result.lenderId}
            result={result}
            leadId={leadId}
            isExpanded={expanded.has(result.lenderId)}
            onToggle={() => toggle(result.lenderId)}
            onFieldSaved={() => qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/60 border-t border-amber-200">
        <button
          onClick={onRetryValidation}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          {isValidating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Re-validate
        </button>
        {validCount > 0 && (
          <button
            onClick={onSubmitValid}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Submit {validCount} Valid Lender{validCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Per-Lender Error Group ──────────────────────────────────────────────────

interface LenderErrorGroupProps {
  result: LenderValidationResult
  leadId: number
  isExpanded: boolean
  onToggle: () => void
  onFieldSaved: () => void
}

function LenderErrorGroup({ result, leadId, isExpanded, onToggle, onFieldSaved }: LenderErrorGroupProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-amber-50/80 transition-colors"
      >
        {isExpanded ? <ChevronDown size={12} className="text-amber-600" /> : <ChevronRight size={12} className="text-amber-600" />}
        <span className="text-xs font-semibold text-slate-800 flex-1 text-left">{result.lenderName}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
          {result.missingFields.length} missing
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {result.missingFields.map(fieldKey => (
            <InlineFieldEditor
              key={fieldKey}
              fieldKey={fieldKey}
              label={result.fieldLabels[fieldKey] || autoLabel(fieldKey)}
              leadId={leadId}
              lenderId={result.lenderId}
              onSaved={onFieldSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline Field Editor ─────────────────────────────────────────────────────

interface InlineFieldEditorProps {
  fieldKey: string
  label: string
  leadId: number
  lenderId: number
  onSaved: () => void
}

function InlineFieldEditor({ fieldKey, label, leadId, lenderId, onSaved }: InlineFieldEditorProps) {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: () => crmService.applyLenderFix(leadId, {
      field_key: fieldKey,
      new_value: value.trim(),
      lender_id: lenderId,
    }),
    onSuccess: () => {
      setSaved(true)
      toast.success(`${label} updated`)
      onSaved()
    },
    onError: () => toast.error(`Failed to save ${label}`),
  })

  const canSave = value.trim() !== '' && !saved

  return (
    <div data-validation-error className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
      saved ? 'border-emerald-300 bg-emerald-50' : 'border-red-200 bg-white'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {saved ? (
          <p className="text-xs text-emerald-700 flex items-center gap-1 mt-0.5">
            <Check size={10} /> Saved: {value}
          </p>
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="w-full text-xs text-slate-700 bg-transparent border-none outline-none py-0.5 placeholder:text-slate-300"
            onKeyDown={e => { if (e.key === 'Enter' && canSave) saveMutation.mutate() }}
          />
        )}
      </div>
      {!saved && (
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {saveMutation.isPending ? <Loader2 size={9} className="animate-spin" /> : <Save size={9} />}
          Save
        </button>
      )}
    </div>
  )
}
