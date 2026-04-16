import { useState, useRef, useEffect } from 'react'
import type { ReactNode, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, X, FileText, Download, AlertCircle, Eye,
  Send, Building2, Mail, Zap, Check, DollarSign,
  ChevronDown, ChevronUp, MessageSquare, Pencil,
  RefreshCw, AlertTriangle, CheckCircle, Clock,
  ArrowDownLeft, ArrowUpRight, Paperclip, Search,
  SlidersHorizontal, ArrowUpDown, Wrench, Upload, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leadService } from '../../services/lead.service'
import { crmService } from '../../services/crm.service'
import { emailParserService } from '../../services/emailParser.service'
import type { LenderConversation } from '../../services/emailParser.service'
import { LenderErrorList, ErrorFixModal, describeApiError } from './LenderApiFixModal'
import { LenderValidationPanel } from './LenderValidationPanel'
import { SubmissionResultSummary } from './SubmissionResultSummary'
import { ApiLogDrawer } from './ApiLogDrawer'
import type { ApiLog as DrawerApiLog } from './ApiLogDrawer'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import type {
  CrmLead, CrmDocument, Lender, LenderSubmission, LenderResponseStatus,
  LenderSubmissionStatus, MappedApiError, EmailTemplate,
  FixSuggestion, ApplyLenderFixPayload, GroupedValidationState,
  LenderValidationResult, LenderSubmissionOutcome, SubmissionStatusRow,
  LenderOffer, StipType,
} from '../../types/crm.types'
import { COMPUTED_FIELDS, autoLabel as sharedAutoLabel } from '../../constants/crmFieldLabels'

// ── TabId type (mirrored from CrmLeadDetail) ───────────────────────────────────
type TabId = 'details' | 'activity' | 'documents' | 'lenders' | 'ondeck' | 'merchant' | 'offers' | 'deal' | 'compliance' | 'approvals' | 'bank-statements' | 'drip'


// ── Lender status helpers ───────────────────────────────────────────────────────
const SUBMISSION_STATUS_MAP: Record<LenderSubmissionStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: 'Pending',     bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  submitted:   { label: 'Submitted',   bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
  viewed:      { label: 'Viewed',      bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500'  },
  approved:    { label: 'Approved',    bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  declined:    { label: 'Declined',    bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'     },
  no_response: { label: 'No Response', bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400'   },
  failed:      { label: 'Failed',      bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'     },
}
const RESPONSE_STATUS_MAP: Record<LenderResponseStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  pending:         { label: 'Awaiting',    bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400',   border: 'border-l-slate-300'   },
  approved:        { label: 'Approved',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-l-emerald-400'  },
  declined:        { label: 'Declined',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-l-red-400'      },
  needs_documents: { label: 'Needs Docs', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   border: 'border-l-amber-400'    },
  no_response:     { label: 'No Reply',    bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-300',   border: 'border-l-slate-200'    },
}

function StatusDot({ status, map }: { status: string; map: Record<string, { label: string; bg: string; text: string; dot: string }> }) {
  const cfg = map[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

const LENDER_COLORS = [
  ['bg-blue-100', 'text-blue-700'], ['bg-violet-100', 'text-violet-700'],
  ['bg-amber-100', 'text-amber-700'], ['bg-pink-100', 'text-pink-700'],
  ['bg-cyan-100', 'text-cyan-700'], ['bg-orange-100', 'text-orange-700'],
  ['bg-teal-100', 'text-teal-700'], ['bg-indigo-100', 'text-indigo-700'],
]

function LenderAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
  const [bg, text] = LENDER_COLORS[name.charCodeAt(0) % LENDER_COLORS.length]
  return (
    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold ${bg} ${text}`}>
      {initials}
    </div>
  )
}

// ── Inline Submission Row ────────────────────────────────────────────────────
const INLINE_STATUS_OPTIONS = [
  { value: 'pending',          label: 'Pending' },
  { value: 'approved',         label: 'Approved' },
  { value: 'declined',         label: 'Declined' },
  { value: 'needs_documents',  label: 'Missing Docs' },
] as const

// Parse backend auto-submission notes: "[YYYY-MM-DD HH:mm] message" separated by "\n\n"
function parseSubmissionNotes(raw: string): { ts: string; text: string }[] {
  try {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return []
    return raw.split(/\n\n+/).map(entry => {
      entry = entry.trim()
      const m = entry.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s*(.+)$/s)
      if (m) return { ts: m[1], text: m[2].trim() }
      return { ts: '', text: entry }
    }).filter(e => e.text)
  } catch (err) {
    console.error('[parseSubmissionNotes] Failed to parse:', err)
    return []
  }
}

// Parse stored note log: entries separated by "\n---\n"
function parseNoteLog(raw: string): { ts: string; text: string }[] {
  try {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return []
    return raw.split('\n---\n').map(entry => {
      const nl = entry.indexOf('\n')
      if (nl === -1) return { ts: '', text: entry.trim() }
      const firstLine = entry.slice(0, nl).trim()
      const rest      = entry.slice(nl + 1).trim()
      // first line is timestamp if it matches [Mar 23, 2026 8:14 PM]
      if (/^\[.+\]$/.test(firstLine)) return { ts: firstLine.slice(1, -1), text: rest }
      return { ts: '', text: entry.trim() }
    }).filter(e => e.text)
  } catch (err) {
    console.error('[parseNoteLog] Failed to parse:', err)
    return []
  }
}

function buildAppendedNote(existing: string, newText: string): string {
  const ts      = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const entry   = `[${ts}]\n${newText.trim()}`
  return existing.trim() ? `${existing.trim()}\n---\n${entry}` : entry
}

/** Parse error_messages from submission (handles JSON string or array).
 *  Always returns a valid MappedApiError[] — never throws. */
function parseErrorMessages(raw: LenderSubmission['error_messages']): MappedApiError[] {
  try {
    if (!raw) return []
    let parsed: unknown = raw
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw) } catch { return [] }
    }
    // Must be an array
    if (!Array.isArray(parsed)) {
      console.warn('[parseErrorMessages] Expected array, got:', typeof parsed, parsed)
      return []
    }
    // Validate each entry has at minimum a field or message string
    return parsed.filter((item): item is MappedApiError =>
      item != null && typeof item === 'object' && (typeof item.field === 'string' || typeof item.message === 'string')
    ).map(item => ({
      label: typeof item.label === 'string' ? item.label : '',
      field: typeof item.field === 'string' ? item.field : '',
      message: typeof item.message === 'string' ? item.message : 'Unknown error',
      fix_type: typeof item.fix_type === 'string' ? item.fix_type : 'unknown',
      expected: typeof item.expected === 'string' ? item.expected : '',
    }))
  } catch (err) {
    console.error('[parseErrorMessages] Unexpected error parsing error_messages:', err, raw)
    return []
  }
}

// ── Quick Fix Modal — edit error fields in a popup ─────────────────────────────
function QuickFixModal({
  leadId,
  lenderId,
  lenderName,
  errors,
  leadData,
  onClose,
}: {
  leadId: number
  lenderId: number
  lenderName: string
  errors: MappedApiError[]
  leadData: Record<string, unknown>
  onClose: () => void
}) {
  const qc = useQueryClient()
  // Only include errors that have a field key AND exist in lead data (skip computed/synthetic lender fields)
  // Deduplicate by field key (multiple API errors can map to the same CRM field)
  const fixable = (() => {
    const seen = new Set<string>()
    return errors.filter(e => {
      if (!e.field || e.field === '') return false
      if (seen.has(e.field)) return false
      // Field must exist as a key in leadData (even if value is empty/null)
      if (!(e.field in leadData)) return false
      seen.add(e.field)
      return true
    })
  })()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const err of fixable) {
      init[err.field] = String(leadData[err.field] ?? '')
    }
    return init
  })

  const LABELS: Record<string, string> = {
    first_name: 'First Name', last_name: 'Last Name', email: 'Email',
    phone: 'Phone', phone_number: 'Phone Number', cell_phone: 'Cell Phone',
    dob: 'Date of Birth', date_of_birth: 'Date of Birth',
    ssn: 'SSN', home_state: 'Home State', home_address: 'Home Address',
    home_city: 'Home City', home_zip: 'Home ZIP', zip_code: 'ZIP Code',
    address: 'Address', city: 'City', state: 'State',
    company_name: 'Company Name', business_phone: 'Business Phone',
    business_address: 'Business Address', business_city: 'Business City',
    business_state: 'Business State', business_zip: 'Business ZIP',
    ein: 'EIN / Tax ID', tax_id: 'Tax ID', fein: 'Federal EIN',
    amount_requested: 'Amount Requested', monthly_revenue: 'Monthly Revenue',
    annual_revenue: 'Annual Revenue', credit_score: 'Credit Score',
    business_start_date: 'Business Start Date', industry: 'Industry',
    ownership_percentage: 'Ownership %', full_name: 'Full Name',
    option_34: 'Home State', option_37: 'Home Address', option_38: 'Business Phone',
    option_39: 'Amount Requested', option_44: 'SSN', option_45: 'Business ZIP',
    option_46: 'Home ZIP', option_724: 'Business Address', option_730: 'EIN / Tax ID',
    option_731: 'Business Start Date', option_733: 'Ownership %',
    option_749: 'Monthly Revenue', option_750: 'Avg Bank Balance',
  }
  const label = (key: string) => LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Simple inline validation based on fix_type
  const validate = (val: string, fixType: string): string | null => {
    if (!val.trim()) return 'This field is required'
    const v = val.trim()
    if (fixType === 'zip' && !/^\d{5}$/.test(v)) return 'Must be exactly 5 digits'
    if ((fixType === 'ein' || fixType === 'ssn') && !/^\d{9}$/.test(v.replace(/[-\s]/g, ''))) return 'Must be exactly 9 digits'
    if (fixType === 'phone' && !/^\d{10,11}$/.test(v.replace(/[-\s().+]/g, ''))) return 'Must be 10-11 digits'
    return null
  }

  const getChangedFields = (): Record<string, string> => {
    const changed: Record<string, string> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v !== String(leadData[k] ?? '')) changed[k] = v
    }
    return changed
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changed = getChangedFields()
      if (Object.keys(changed).length === 0) throw new Error('No changes')
      return leadService.update(leadId, changed)
    },
    onSuccess: () => {
      toast.success('Lead updated — you can now resubmit')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-detail', leadId] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as Error)?.message === 'No changes'
        ? 'No fields were changed'
        : 'Failed to save'
      toast.error(msg)
    },
  })

  const resubmitMutation = useMutation({
    mutationFn: async () => {
      const changed = getChangedFields()
      if (Object.keys(changed).length === 0) throw new Error('No changes')
      return crmService.fixAndResubmit(leadId, {
        lender_id: lenderId,
        field_updates: changed,
      })
    },
    onSuccess: () => {
      toast.success('Lead updated & resubmission dispatched')
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-detail', leadId] })
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as Error)?.message === 'No changes'
        ? 'No fields were changed'
        : 'Failed to save & resubmit'
      toast.error(msg)
    },
  })

  if (fixable.length === 0) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wrench size={14} className="text-indigo-500" />
              Fix Fields — {lenderName}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Update the values below and save to fix the API errors
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {fixable.length === 0 && errors.length > 0 && (
            <p className="text-xs text-slate-500 italic">
              The API errors reference fields that cannot be edited here (computed by the lender).
              Please update the lead data directly and resubmit.
            </p>
          )}
          {fixable.map(err => {
            const val = values[err.field] ?? ''
            const vErr = validate(val, err.fix_type)
            const changed = val !== String(leadData[err.field] ?? '')
            return (
              <div key={err.field}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {err.label || label(err.field)}
                  {err.expected && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-600">
                      ({err.expected})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={e => setValues(prev => ({ ...prev, [err.field]: e.target.value }))}
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                    vErr
                      ? 'border-red-300 bg-red-50'
                      : changed
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200'
                  }`}
                  placeholder={err.expected || label(err.field)}
                />
                <div className="flex items-center justify-between mt-0.5">
                  {vErr ? (
                    <p className="text-[10px] text-red-500 font-medium">{vErr}</p>
                  ) : changed ? (
                    <p className="text-[10px] text-emerald-600 font-medium">Changed</p>
                  ) : (
                    <p className="text-[10px] text-amber-500">Needs correction</p>
                  )}
                  {String(leadData[err.field] ?? '') !== '' && (
                    <p className="text-[10px] text-slate-400">
                      Current: <span className="font-medium text-slate-500">{String(leadData[err.field])}</span>
                    </p>
                  )}
                </div>
                {err.message && (
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">{err.message}</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center gap-2.5 flex-shrink-0 bg-slate-50/80 rounded-b-2xl">
          <button
            onClick={() => resubmitMutation.mutate()}
            disabled={resubmitMutation.isPending || saveMutation.isPending}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {resubmitMutation.isPending
              ? <><Loader2 size={12} className="animate-spin" /> Resubmitting…</>
              : <><RefreshCw size={12} /> Save & Resubmit</>
            }
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || resubmitMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {saveMutation.isPending
              ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
              : <><Check size={12} /> Save Only</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmissionRow({ sub, leadId, onViewLog, onResubmit, isResubmitting, onApproval }: {
  sub: LenderSubmission; leadId: number
  onViewLog: (lenderId: number, lenderName: string) => void
  onResubmit?: (lenderId: number) => void
  isResubmitting?: boolean
  onApproval?: (sub: LenderSubmission, note: string) => void
}) {
  const qc = useQueryClient()
  const [editing,  setEditing]  = useState(false)
  const [errorsExpanded, setErrorsExpanded] = useState(sub.submission_status === 'failed')
  const [fixModalOpen, setFixModalOpen] = useState(false)
  const [status,   setStatus]   = useState<LenderResponseStatus>(sub.response_status ?? 'pending')
  const [newNote,  setNewNote]  = useState('')
  const existingNotes = sub.response_note ?? ''
  const noteLog       = parseNoteLog(existingNotes)
  const errorMessages = parseErrorMessages(sub.error_messages)
  const isFailed      = sub.submission_status === 'failed'

  // Fetch lead data for the fix modal
  const { data: leadDataForFix } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => {
      try {
        const r = await leadService.getById(leadId)
        return (r.data?.data ?? r.data) as CrmLead
      } catch (err) {
        console.error('[SubmissionRow] Failed to fetch lead data for fix modal:', err)
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: fixModalOpen,
  })

  const statusColors: Record<string, string> = {
    approved:        'text-white bg-emerald-500 border-emerald-500',
    declined:        'text-white bg-red-500 border-red-500',
    needs_documents: 'text-white bg-orange-400 border-orange-400',
    pending:         'text-slate-600 bg-slate-100 border-slate-300',
  }
  const statusLabel: Record<string, string> = {
    approved: 'Approved', declined: 'Declined', needs_documents: 'Missing Docs', pending: 'Pending',
  }

  // Submission status badges (separate from response status)
  const submissionBadge: Record<string, { color: string; label: string }> = {
    failed:    { color: 'text-white bg-red-500 border-red-500',       label: 'Failed' },
    submitted: { color: 'text-white bg-emerald-500 border-emerald-500', label: 'Sent' },
    pending:   { color: 'text-amber-700 bg-amber-100 border-amber-300', label: 'Processing' },
    partial:   { color: 'text-orange-700 bg-orange-100 border-orange-300', label: 'Partial' },
  }

  const mutation = useMutation({
    mutationFn: () => {
      const combined = newNote.trim() ? buildAppendedNote(existingNotes, newNote) : existingNotes
      return crmService.updateSubmissionResponse(leadId, sub.id, {
        response_status:   status,
        submission_status: sub.submission_status ?? 'submitted',
        response_note:     combined || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Saved')
      setNewNote('')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to save'),
  })

  return (
    <div className={`border rounded-lg bg-white overflow-hidden ${isFailed ? 'border-red-300' : 'border-slate-200'}`}>
      {/* Summary row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {sub.lender_name ?? `Lender #${sub.lender_id}`}
            </p>
            {sub.submission_type === 'api' ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex-shrink-0">
                <Zap size={8} /> API
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200 flex-shrink-0">
                <Mail size={8} /> Email
              </span>
            )}
            {/* Submission status badge — clickable for API submissions */}
            {sub.submission_type === 'api' && submissionBadge[sub.submission_status] && (
              <button
                onClick={() => onViewLog(sub.lender_id, sub.lender_name ?? `Lender #${sub.lender_id}`)}
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 cursor-pointer hover:brightness-110 hover:scale-105 transition-all ${submissionBadge[sub.submission_status].color}`}
                title="Click to view API response"
              >
                {sub.submission_status === 'failed' && <AlertCircle size={8} />}
                {sub.submission_status === 'submitted' && <CheckCircle size={8} />}
                {submissionBadge[sub.submission_status].label}
              </button>
            )}
            {/* Email delivery status badge — for email submissions only */}
            {sub.submission_type !== 'api' && sub.email_status && (() => {
              const emailBadge: Record<string, { color: string; label: string; icon: ReactNode }> = {
                sent:      { color: 'text-blue-700 bg-blue-50 border-blue-200',       label: 'Sent',      icon: <Send size={8} /> },
                delivered: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Delivered', icon: <CheckCircle size={8} /> },
                opened:    { color: 'text-purple-700 bg-purple-50 border-purple-200',   label: 'Opened',    icon: <Eye size={8} /> },
                failed:    { color: 'text-red-700 bg-red-50 border-red-200',            label: 'Failed',    icon: <AlertCircle size={8} /> },
              }
              const badge = emailBadge[sub.email_status]
              if (!badge) return null
              return (
                <span
                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badge.color}`}
                  title={`Email ${badge.label}${sub.email_status_at ? ` at ${new Date(sub.email_status_at).toLocaleString()}` : ''}`}
                >
                  {badge.icon} {badge.label}
                </span>
              )
            })()}
            {/* Doc upload status indicator */}
            {sub.doc_upload_status && sub.doc_upload_status !== 'none' && (
              <span
                className={`inline-flex items-center text-[9px] font-bold px-1 py-0.5 rounded-full flex-shrink-0 ${
                  sub.doc_upload_status === 'success' ? 'text-emerald-600' :
                  sub.doc_upload_status === 'partial' ? 'text-orange-500' : 'text-red-500'
                }`}
                title={`Docs: ${sub.doc_upload_status}${sub.doc_upload_notes ? ` — ${sub.doc_upload_notes}` : ''}`}
              >
                {sub.doc_upload_status === 'success' ? <CheckCircle size={9} /> :
                 sub.doc_upload_status === 'partial' ? <AlertTriangle size={9} /> :
                 <AlertCircle size={9} />}
              </span>
            )}
          </div>
          {sub.submitted_at && (
            <p className="text-[10px] text-slate-400 tabular-nums">
              {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[status] ?? statusColors.pending}`}>
          {statusLabel[status] ?? status}
        </span>
        {isFailed && errorMessages.length > 0 && (
          <button
            onClick={() => setErrorsExpanded(v => !v)}
            className="p-1 rounded flex-shrink-0 text-red-500 hover:bg-red-50 transition-colors"
            title={errorsExpanded ? 'Hide errors' : 'Show errors'}
          >
            {errorsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {sub.submission_type === 'api' && (
          <button
            onClick={() => onViewLog(sub.lender_id, sub.lender_name ?? `Lender #${sub.lender_id}`)}
            className="p-1 rounded flex-shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View API log"
          >
            <Eye size={12} />
          </button>
        )}
        {onResubmit && (
          <button
            onClick={e => { e.stopPropagation(); onResubmit(sub.lender_id) }}
            disabled={isResubmitting}
            className="p-1 rounded flex-shrink-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors"
            title="Resubmit to this lender"
          >
            {isResubmitting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        )}
        <button
          onClick={() => setEditing(v => !v)}
          className={`p-1 rounded flex-shrink-0 transition-colors ${editing ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
          title="Edit"
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* ── Error Messages Box (failed API submissions) ── */}
      {isFailed && errorsExpanded && errorMessages.length > 0 && (
        <div className="border-t border-red-200 bg-red-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
            <p className="text-[11px] font-bold text-red-700">Submission Failed — Fix Required Fields</p>
          </div>
          <ul className="space-y-1">
            {errorMessages.map((err, i) => (
              <li
                key={i}
                data-field={err.field}
                className="flex items-start gap-2 text-[11px] text-red-700 cursor-pointer hover:text-red-900 hover:bg-red-100 rounded px-1.5 py-1 transition-colors"
                onClick={() => {
                  if (!err.field) return
                  // Try direct input first (DynamicFieldForm), then data-attr (PropertyRow), then id
                  const el = document.querySelector<HTMLElement>(
                    `[name="${err.field}"], [data-field-key="${err.field}"], #field-${err.field}`
                  )
                  if (!el) return
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  // If it's an input/select/textarea, focus directly
                  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.focus()
                    el.classList.add('field-error')
                    setTimeout(() => el.classList.remove('field-error'), 3000)
                  } else {
                    // PropertyRow: click the edit button inside to open inline edit
                    const btn = el.querySelector<HTMLElement>('button[data-field-key]') || el.querySelector<HTMLElement>('button')
                    if (btn) btn.click()
                    el.classList.add('field-error')
                    setTimeout(() => {
                      el.classList.remove('field-error')
                      // After edit mode opens, try to focus the input
                      const input = el.querySelector<HTMLElement>('input, select, textarea')
                      if (input) input.focus()
                    }, 150)
                  }
                }}
                title={err.message}
              >
                <span className="flex-shrink-0 w-1 h-1 rounded-full bg-red-400 mt-1.5" />
                <span>
                  <strong className="font-semibold">{err.label}</strong>
                  {err.expected && <span className="text-red-500 ml-1">— {err.expected}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={() => setFixModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Wrench size={10} /> Fix Fields & Resubmit
            </button>
            {sub.api_error && (
              <p className="text-[10px] text-red-400 italic truncate flex-1" title={sub.api_error}>
                {sub.api_error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Fix Modal */}
      {fixModalOpen && leadDataForFix && (
        <ErrorBoundary fallbackTitle="Error loading fix modal">
          <QuickFixModal
            leadId={leadId}
            lenderId={sub.lender_id}
            lenderName={sub.lender_name ?? `Lender #${sub.lender_id}`}
            errors={errorMessages}
            leadData={leadDataForFix as unknown as Record<string, unknown>}
            onClose={() => setFixModalOpen(false)}
          />
        </ErrorBoundary>
      )}

      {/* Inline api_error banner for failed subs without structured errors */}
      {isFailed && !errorMessages.length && sub.api_error && (
        <div className="border-t border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
          <AlertCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700">{sub.api_error}</p>
        </div>
      )}

      {/* Note log — always visible if notes exist */}
      {noteLog.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {[...noteLog].reverse().map((e, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-1.5 bg-slate-50">
              <span className="text-slate-300 mt-0.5 flex-shrink-0 text-[10px]">•</span>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-slate-700 font-medium">{e.text}</span>
                {e.ts && <span className="text-[10px] text-slate-500 ml-1.5">{e.ts}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit form — toggled by pencil */}
      {editing && (
        <div className="border-t border-slate-100 p-3 space-y-2 bg-white">
          <select
            className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white text-slate-700"
            value={status}
            onChange={e => setStatus(e.target.value as LenderResponseStatus)}
          >
            {INLINE_STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <textarea
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-400"
            rows={2}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note…"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (status === 'approved' && onApproval) {
                  onApproval(sub, newNote)
                  setEditing(false)
                } else {
                  mutation.mutate()
                }
              }}
              disabled={mutation.isPending}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {mutation.isPending ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 text-xs text-slate-500 border border-slate-200 rounded-lg hover:border-slate-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submission log — one entry per send event */}
      {sub.notes && (() => {
        const entries = parseSubmissionNotes(sub.notes)
        if (!entries.length) return null
        return (
          <div className="border-t border-slate-100">
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Send Log ({entries.length})
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {entries.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-700">{e.text}</span>
                      {e.ts && <span className="text-slate-400 ml-1.5 tabular-nums">{e.ts}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Approval Offer Modal ────────────────────────────────────────────────────────
type TermType = 'daily' | 'weekly' | 'monthly'

const STIP_OPTIONS: { type: StipType; name: string; description: string }[] = [
  { type: 'bank_statement',            name: 'Bank Statements',            description: '3 Months Bank Statements' },
  { type: 'voided_check',              name: 'Voided Check',               description: 'Voided Check' },
  { type: 'drivers_license',           name: 'Driver License',             description: 'Driver License (Front & Back)' },
  { type: 'tax_return',                name: 'Tax Returns',                description: '2024 & 2025 Tax Returns' },
  { type: 'lease_agreement',           name: 'Lease Agreement',            description: 'Business Lease Agreement' },
  { type: 'articles_of_incorporation', name: 'Articles of Incorporation',  description: 'Articles of Incorporation' },
]

interface ApprovalOfferModalProps {
  leadId: number
  sub: LenderSubmission
  note: string
  onClose: () => void
  onDone: () => void
}

function ApprovalOfferModal({ leadId, sub, note, onClose, onDone }: ApprovalOfferModalProps) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [factorRate, setFactorRate] = useState('')
  const [termType, setTermType] = useState<TermType>('daily')
  const [termLength, setTermLength] = useState('')
  const [selectedStips, setSelectedStips] = useState<Set<StipType>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggleStip = (type: StipType) => {
    setSelectedStips(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const amt = parseFloat(amount) || 0
  const fr = parseFloat(factorRate) || 0
  const tl = parseInt(termLength) || 0
  const totalPayback = amt * fr
  const termDays = termType === 'daily' ? tl : termType === 'weekly' ? tl * 7 : tl * 30
  const displayPayment = tl > 0 ? totalPayback / tl : 0
  const dailyPayment = termDays > 0 ? totalPayback / termDays : 0
  const termLabel = termType === 'daily' ? 'Daily' : termType === 'weekly' ? 'Weekly' : 'Monthly'

  const canSave = amt > 0 && fr > 0 && tl > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      // 1. Update submission response to approved
      const existingNotes = sub.response_note ?? ''
      const combined = note.trim() ? buildAppendedNote(existingNotes, note) : existingNotes
      await crmService.updateSubmissionResponse(leadId, sub.id, {
        response_status: 'approved',
        submission_status: sub.submission_status ?? 'submitted',
        response_note: combined || undefined,
      })
      // 2. Create the offer
      await crmService.createOffer(leadId, {
        lender_id: sub.lender_id,
        lender_name: sub.lender_name ?? `Lender #${sub.lender_id}`,
        offered_amount: amt,
        factor_rate: fr,
        term_days: termDays,
        daily_payment: dailyPayment,
        total_payback: totalPayback,
        status: 'received',
      } as Partial<LenderOffer>)
      // 3. Create stips if any selected
      if (selectedStips.size > 0) {
        const stipNames = STIP_OPTIONS
          .filter(s => selectedStips.has(s.type))
          .map(s => s.name)
        await crmService.bulkCreateStips(leadId, {
          lender_id: sub.lender_id,
          stip_names: stipNames,
          stip_type: 'custom',
        })
      }
      toast.success('Offer created' + (selectedStips.size > 0 ? ` with ${selectedStips.size} stip${selectedStips.size > 1 ? 's' : ''}` : ''))
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-offers', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-stips', leadId] })
      onDone()
    } catch {
      toast.error('Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Create Offer</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{sub.lender_name ?? `Lender #${sub.lender_id}`} — Approved</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {/* Amount */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <input
                type="number"
                className="w-full text-xs border border-slate-200 rounded-lg pl-6 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="50000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={0}
                step="any"
              />
            </div>
          </div>

          {/* Factor Rate */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Factor Rate</label>
            <input
              type="number"
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder="1.35"
              value={factorRate}
              onChange={e => setFactorRate(e.target.value)}
              min={0}
              step="0.01"
            />
          </div>

          {/* Term Type + Length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Term Type</label>
              <select
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                value={termType}
                onChange={e => setTermType(e.target.value as TermType)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Term Length</label>
              <input
                type="number"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder={termType === 'daily' ? '60 days' : termType === 'weekly' ? '12 weeks' : '6 months'}
                value={termLength}
                onChange={e => setTermLength(e.target.value)}
                min={1}
              />
            </div>
          </div>

          {/* Calculated fields */}
          {amt > 0 && fr > 0 && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Payback</span>
                <span className="font-semibold text-slate-800">${totalPayback.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {tl > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{termLabel} Payment</span>
                  <span className="font-bold text-emerald-600">${displayPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}

          {/* Stipulations */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-2">Required Stipulations</label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {STIP_OPTIONS.map(stip => (
                <label
                  key={stip.type}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    selectedStips.has(stip.type)
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-150 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStips.has(stip.type)}
                    onChange={() => toggleStip(stip.type)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{stip.name}</p>
                    <p className="text-[10px] text-slate-400">{stip.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <><DollarSign size={12} /> Save Offer</>}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lenders Panel ──────────────────────────────────────────────────────────────
/** Replace [[field_key]] placeholders with actual lead values. */
function fillPlaceholders(html: string, lead: Record<string, unknown>): string {
  const resolve = (match: string, key: string) => {
    const val = lead[key]
    return val !== null && val !== undefined && val !== '' ? String(val) : match
  }
  return html
    .replace(/\[\[(\w+)\]\]/g, resolve)
    .replace(/\{\{(\w+)\}\}/g, resolve)
}

interface LenderApiCfg { id: number; lender_name?: string; api_name: string; api_status: string | number; required_fields?: string[] | null; payload_mapping?: Record<string, string | string[]> | string | null }

// ── Extended ApiLog type (includes structured error analysis) ──────────────────
interface ApiLog {
  id: number; crm_lender_api_id: number; lender_id: number; lead_id: number
  request_url: string; request_method: string; response_code: number | null
  response_body: string | null; status: string; error_message: string | null
  duration_ms: number; attempt: number; created_at: string
  api_name?: string; lender_name?: string
  // Structured error analysis (populated by backend after enrichLog)
  error_json:      FixSuggestion[] | null
  fix_suggestions: FixSuggestion[] | null
  is_fixable:      boolean
}

// ErrorFixModal, LenderErrorList, describeApiError imported from LenderApiFixModal.tsx

// ── Lender Email History (inside LendersPanel) ────────────────────────────────
function LenderEmailHistory({ leadId }: { leadId: number }) {
  const [expanded, setExpanded] = useState(false)
  const [openEmailId, setOpenEmailId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lead-lender-emails', leadId],
    queryFn: async () => {
      try {
        const res = await emailParserService.getLeadLenderConversations(leadId)
        const d = res.data?.data?.conversations ?? res.data?.data ?? []
        return Array.isArray(d) ? d as LenderConversation[] : []
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })

  const conversations = data ?? []
  if (conversations.length === 0 && !isLoading) return null

  // Group by lender_id
  const grouped: Record<number, LenderConversation[]> = {}
  for (const c of conversations) {
    if (!grouped[c.lender_id]) grouped[c.lender_id] = []
    grouped[c.lender_id].push(c)
  }

  const lenderIds = Object.keys(grouped).map(Number)

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Mail size={13} className="text-indigo-500" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          Email History
        </span>
        <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
          {conversations.length}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-slate-400" /></div>
          ) : lenderIds.map(lid => {
            const items = grouped[lid]
            const lenderName = items[0]?.from_email?.split('<')[0]?.trim() || `Lender #${lid}`
            return (
              <div key={lid} className="rounded-lg border border-slate-100 bg-slate-50/50 overflow-hidden">
                <div className="px-3 py-2 bg-slate-100/50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">{lenderName}</span>
                  <span className="ml-2 text-[10px] text-slate-400">{items.length} email{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(c => (
                    <div key={c.id}>
                      <div
                        className={`px-3 py-2.5 flex items-start gap-2 cursor-pointer hover:bg-slate-100/50 transition-colors ${openEmailId === c.id ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => setOpenEmailId(openEmailId === c.id ? null : c.id)}
                      >
                        {c.direction === 'inbound' ? (
                          <ArrowDownLeft size={12} className="text-blue-500 mt-0.5 shrink-0" />
                        ) : (
                          <ArrowUpRight size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-700">{c.subject || '(no subject)'}</span>
                            {c.offer_detected && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 text-green-700">
                                <DollarSign size={8} /> Offer
                              </span>
                            )}
                            {c.has_attachments && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                <Paperclip size={9} /> {c.attachment_count}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>{c.from_email}</span>
                            <span>-</span>
                            <span>{c.conversation_date ? new Date(c.conversation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                          </div>
                        </div>
                        <ChevronDown size={12} className={`text-slate-400 transition-transform shrink-0 mt-1 ${openEmailId === c.id ? 'rotate-180' : ''}`} />
                      </div>
                      {/* Expanded full email content */}
                      {openEmailId === c.id && (
                        <div className="px-3 pb-3">
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            {/* Email header */}
                            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 space-y-1">
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">From:</span> {c.from_email}</div>
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">To:</span> {c.to_email || '—'}</div>
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Subject:</span> {c.subject || '(no subject)'}</div>
                              <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Date:</span> {c.conversation_date ? new Date(c.conversation_date).toLocaleString() : '—'}</div>
                              {c.detected_merchant_name && (
                                <div className="text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Matched Merchant:</span> {c.detected_merchant_name} <span className="text-slate-400">({c.detection_source})</span></div>
                              )}
                            </div>
                            {/* Offer details */}
                            {c.offer_detected && c.offer_details && (
                              <div className="px-4 py-2 bg-green-50 border-b border-green-200">
                                <span className="text-[10px] font-semibold text-green-700">Offer Detected: </span>
                                {!!c.offer_details.amount && <span className="text-[11px] text-green-800 mr-3">Amount: <strong>${Number(c.offer_details.amount).toLocaleString()}</strong></span>}
                                {!!c.offer_details.factor_rate && <span className="text-[11px] text-green-800 mr-3">Rate: <strong>{String(c.offer_details.factor_rate)}</strong></span>}
                                {!!c.offer_details.term && <span className="text-[11px] text-green-800 mr-3">Term: <strong>{String(c.offer_details.term)}</strong></span>}
                                {!!c.offer_details.daily_payment && <span className="text-[11px] text-green-800">Daily: <strong>${Number(c.offer_details.daily_payment).toLocaleString()}</strong></span>}
                              </div>
                            )}
                            {/* Attachments */}
                            {c.has_attachments && c.attachment_filenames && c.attachment_filenames.length > 0 && (
                              <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
                                <Paperclip size={10} className="text-slate-400" />
                                {c.attachment_filenames.map((f, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">{f}</span>
                                ))}
                              </div>
                            )}
                            {/* Full email body */}
                            <div className="px-4 py-3 max-h-[400px] overflow-y-auto">
                              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{c.body_preview || '(no content)'}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LendersPanel({ leadId, onTabChange }: { leadId: number; onTabChange?: (tab: TabId) => void }) {
  const qc = useQueryClient()

  const [approvalModal, setApprovalModal] = useState<{ sub: LenderSubmission; note: string } | null>(null)
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())
  const [notes, setNotes]                   = useState('')
  const [templateId, setTemplateId]         = useState<number | ''>('')
  const [uploadingDocs, setUploadingDocs]   = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [focusedLenderId, setFocusedLenderId] = useState<number | null>(null)
  const [lenderSearch, setLenderSearch]       = useState('')
  const [lenderStatusFilter, setLenderStatusFilter] = useState<string>('all')
  const [lenderSort, setLenderSort]           = useState<'latest' | 'az' | 'za'>('latest')
  const lenderSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Re-use cached lead data (already fetched by parent — no extra request)
  const { data: leadData } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => (r => (r.data?.data ?? r.data) as CrmLead)(await leadService.getById(leadId)),
    staleTime: 5 * 60 * 1000,
  })

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ['lender-submissions', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getLenderSubmissions(leadId)
        const data = res.data?.data ?? res.data ?? []
        return Array.isArray(data) ? data as LenderSubmission[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch lender submissions:', err)
        return []
      }
    },
  })

  const { data: lendersData } = useQuery({
    queryKey: ['lenders-all'],
    queryFn: async () => {
      try {
        const res = await crmService.getLenders({ per_page: 200 })
        const data = res.data?.data?.data ?? res.data?.data ?? res.data?.records ?? res.data ?? []
        return Array.isArray(data) ? data as Lender[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch lenders:', err)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      try {
        const res = await crmService.getEmailTemplates()
        const data = res.data?.data ?? res.data ?? []
        return Array.isArray(data) ? data as EmailTemplate[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch email templates:', err)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: leadDocs } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getLeadDocuments(leadId)
        const data = res.data?.data ?? res.data ?? []
        return Array.isArray(data) ? data as CrmDocument[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch lead documents:', err)
        return []
      }
    },
  })

  const { data: apiConfigs } = useQuery({
    queryKey: ['lender-api-configs'],
    queryFn: async () => {
      try {
        const res = await crmService.getLenderApiConfigs()
        const data = res.data?.data ?? []
        return Array.isArray(data) ? data as LenderApiCfg[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch API configs:', err)
        return []
      }
    },
    staleTime: 60_000,
  })

  // Fix modal state
  const [fixModal, setFixModal] = useState<{ log: ApiLog; error: FixSuggestion } | null>(null)

  // Per-lender validation & submission result state
  const [validationState, setValidationState] = useState<GroupedValidationState | null>(null)
  const [submissionOutcomes, setSubmissionOutcomes] = useState<LenderSubmissionOutcome[] | null>(null)
  const [retryingLenderId, setRetryingLenderId] = useState<number | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // ── Submission Status Polling ─────────────────────────────────────────────────
  // After submitMutation succeeds, poll every 2s to update in-flight API submissions.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Only poll when we have outcomes with at least one API submission in 'submitted' status
    const hasInFlight = submissionOutcomes?.some(
      o => o.submissionType === 'api' && o.success && !o.error
    )
    if (!hasInFlight || !submissionOutcomes) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      return
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await crmService.getSubmissionStatus(leadId)
        const rows: SubmissionStatusRow[] = res.data?.data ?? []
        if (!rows.length) return

        setSubmissionOutcomes(prev => {
          if (!prev) return prev
          return prev.map(o => {
            const row = rows.find(r => r.lender_id === o.lenderId)
            if (!row) return o
            const isTerminal = ['approved', 'declined', 'failed'].includes(row.submission_status)
            const isFailed = row.submission_status === 'failed' || row.submission_status === 'declined'
            return {
              ...o,
              success: !isFailed,
              error: isFailed ? (row.api_error ?? 'Submission failed') : undefined,
              submissionType: row.submission_type === 'api' ? 'api' : o.submissionType,
              _terminal: isTerminal,
            } as LenderSubmissionOutcome
          })
        })

        // Stop polling once all API submissions reached a terminal state
        const allTerminal = rows.every(r =>
          ['approved', 'declined', 'failed'].includes(r.submission_status) || r.submission_type !== 'api'
        )
        if (allTerminal && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          // Refresh submission history + logs
          qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
          qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
        }
      } catch {
        // Silently ignore polling errors — not critical
      }
    }, 2000)

    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    }
  }, [submissionOutcomes, leadId, qc])

  // API logs query — only used when fix modal needs log context.
  // Disabled refetchInterval to prevent unnecessary re-renders of the entire panel.
  const { data: apiLogs } = useQuery({
    queryKey: ['lead-api-logs', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getLenderApiLogs({ lead_id: leadId, per_page: 50 })
        const data = res.data?.data?.data ?? res.data?.data ?? []
        return Array.isArray(data) ? data as ApiLog[] : []
      } catch (err) {
        console.error('[LendersPanel] Failed to fetch API logs:', err)
        return []
      }
    },
    staleTime: 30_000,
  })

  // ── API Log Drawer state ──────────────────────────────────────────────────
  const [logDrawer, setLogDrawer] = useState<{ open: boolean; lenderId: number | null; lenderName: string }>({
    open: false, lenderId: null, lenderName: '',
  })
  const handleViewLog = (lenderId: number, lenderName: string) => {
    setLogDrawer({ open: true, lenderId, lenderName })
  }
  const drawerLog: DrawerApiLog | null = logDrawer.lenderId && apiLogs
    ? (apiLogs as DrawerApiLog[])
        .filter(l => l.lender_id === logDrawer.lenderId)
        .sort((a, b) => b.id - a.id)[0] ?? null
    : null

  const activeLenders = (lendersData ?? []).filter(l => Number(l.status) === 1)
  // Deduplicate by lender_id — keep the latest submission per lender
  const subList = Object.values(
    (submissions ?? []).reduce<Record<number, LenderSubmission>>((acc, s) => {
      if (!acc[s.lender_id] || s.id > acc[s.lender_id].id) acc[s.lender_id] = s
      return acc
    }, {})
  )
  // Map of lender_id → latest submission (for "already sent" indicators)
  const submittedLenderMap = subList.reduce<Record<number, LenderSubmission>>((acc, s) => {
    acc[s.lender_id] = s
    return acc
  }, {})
  const docs          = leadDocs ?? []

  // ── Debounced search for lender list ─────────────────────────────────────────
  useEffect(() => {
    if (lenderSearchTimer.current) clearTimeout(lenderSearchTimer.current)
    lenderSearchTimer.current = setTimeout(() => setDebouncedSearch(lenderSearch), 300)
    return () => { if (lenderSearchTimer.current) clearTimeout(lenderSearchTimer.current) }
  }, [lenderSearch])

  // ── Helper: compute combined status key for a lender ─────────────────────────
  function getLenderStatusKey(lenderId: number): string {
    const sub = submittedLenderMap[lenderId]
    if (!sub) return 'none'
    const ss = sub.submission_status
    const rs = sub.response_status
    if (ss === 'failed') return 'failed'
    if (rs === 'declined' || ss === 'declined') return 'declined'
    if (rs === 'needs_documents') return 'missing_docs'
    if (rs === 'approved' || ss === 'approved') return 'approved'
    if (ss === 'pending') return 'processing'
    if (ss === 'submitted' || ss === 'viewed') return 'sent'
    if (ss === 'no_response') return 'no_response'
    return 'sent'
  }

  // ── Filtered + sorted lender list ────────────────────────────────────────────
  const displayLenders = (() => {
    let list = [...activeLenders]
    // Search filter (name + type)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(l => {
        const isApi = !!(l.api_status && l.api_status !== '0' && Number(l.api_status) !== 0)
        const typeLbl = isApi ? 'api' : 'email'
        return l.lender_name.toLowerCase().includes(q) || typeLbl.includes(q)
      })
    }
    // Status filter
    if (lenderStatusFilter !== 'all') {
      list = list.filter(l => getLenderStatusKey(l.id) === lenderStatusFilter)
    }
    // Sort
    if (lenderSort === 'az') {
      list.sort((a, b) => a.lender_name.localeCompare(b.lender_name))
    } else if (lenderSort === 'za') {
      list.sort((a, b) => b.lender_name.localeCompare(a.lender_name))
    } else {
      // latest activity — lenders with recent submissions first, then alphabetical
      list.sort((a, b) => {
        const aSub = submittedLenderMap[a.id]
        const bSub = submittedLenderMap[b.id]
        const aTime = aSub?.submitted_at ? new Date(aSub.submitted_at).getTime() : 0
        const bTime = bSub?.submitted_at ? new Date(bSub.submitted_at).getTime() : 0
        if (bTime !== aTime) return bTime - aTime
        return a.lender_name.localeCompare(b.lender_name)
      })
    }
    return list
  })()

  // Full submission list sorted newest first (for grouped "all" view)
  const allSubmissions = [...(submissions ?? [])].sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : new Date(a.created_at).getTime()
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : new Date(b.created_at).getTime()
    return bTime - aTime
  })

  // Filtered submission list for right panel — uses ALL submissions (not deduplicated)
  const filteredSubList = focusedLenderId !== null
    ? allSubmissions.filter(s => s.lender_id === focusedLenderId)
    : allSubmissions
  const focusedLenderName = focusedLenderId !== null
    ? (activeLenders.find(l => l.id === focusedLenderId)?.lender_name
       ?? allSubmissions.find(s => s.lender_id === focusedLenderId)?.lender_name
       ?? `Lender #${focusedLenderId}`)
    : ''

  // Group submissions by lender for "all" view
  const groupedSubmissions = focusedLenderId === null
    ? (() => {
        const groups: { lenderId: number; lenderName: string; submissions: LenderSubmission[] }[] = []
        const map = new Map<number, LenderSubmission[]>()
        const nameMap = new Map<number, string>()
        for (const s of allSubmissions) {
          if (!map.has(s.lender_id)) {
            map.set(s.lender_id, [])
            nameMap.set(s.lender_id, s.lender_name ?? `Lender #${s.lender_id}`)
          }
          map.get(s.lender_id)!.push(s)
        }
        // Order groups by most recent submission first
        for (const [lenderId, subs] of map) {
          groups.push({ lenderId, lenderName: nameMap.get(lenderId)!, submissions: subs })
        }
        return groups
      })()
    : null

  // No auto-focus — show all submissions by default on page load

  // Scroll to focused lender's submission row
  useEffect(() => {
    if (focusedLenderId !== null) {
      setTimeout(() => {
        document.getElementById(`sub-row-${focusedLenderId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [focusedLenderId])

  // Compute preview template object (used for subject/name display)
  const previewTemplate = templateId !== ''
    ? (emailTemplates ?? []).find(t => t.id === templateId) ?? null
    : null

  // Server-side resolved HTML + subject (all [[field_key]] replaced with actual EAV values)
  const { data: resolvedTemplate } = useQuery({
    queryKey: ['resolve-email-template', leadId, templateId],
    queryFn: async () => {
      const res = await crmService.resolveEmailTemplate(leadId, templateId as number)
      const d = res.data?.data ?? res.data ?? {}
      return { body: (d.body ?? '') as string, subject: (d.subject ?? '') as string }
    },
    enabled: templateId !== '',
    staleTime: 30_000,
  })

  const previewHtml    = resolvedTemplate?.body    ?? previewTemplate?.template_html ?? ''
  const resolvedSubject = resolvedTemplate?.subject || previewTemplate?.subject || ''

  function toggleLender(id: number) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) } else { n.add(id) }
      return n
    })
    // Clear validation state when selection changes
    if (validationState) setValidationState(null)
  }
  function toggleDoc(id: number) {
    setSelectedDocIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Auto-select attachable docs on initial load
  useEffect(() => {
    if (leadDocs?.length && selectedDocIds.size === 0) {
      setSelectedDocIds(new Set(leadDocs.filter(d => d.attachable !== false && d.file_path).map(d => d.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadDocs])

  const resetForm = () => {
    setSelectedIds(new Set()); setNotes('')
    setTemplateId(''); setSelectedDocIds(new Set()); setPreviewExpanded(false)
    setValidationState(null); setSubmissionOutcomes(null)
  }

  /** Safely normalize required_fields — handles string, JSON string, array, null */
  const normalizeRequiredFields = (raw: unknown): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(f => typeof f === 'string')
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.filter((f: unknown) => typeof f === 'string')
      } catch { /* not JSON, ignore */ }
      return []
    }
    return []
  }

  /** Extract CRM field keys from a payload_mapping config */
  const extractMappingKeys = (cfg: LenderApiCfg): string[] => {
    try {
      if (!cfg.payload_mapping) return []
      let mapping: Record<string, unknown> = {}
      if (typeof cfg.payload_mapping === 'string') {
        try {
          const parsed = JSON.parse(cfg.payload_mapping)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) mapping = parsed
          else return []
        } catch { return [] }
      } else if (cfg.payload_mapping && typeof cfg.payload_mapping === 'object') {
        mapping = cfg.payload_mapping as Record<string, unknown>
      } else {
        return []
      }
      return Object.keys(mapping).filter(k => typeof k === 'string' && !k.startsWith('=') && !COMPUTED_FIELDS.has(k))
    } catch {
      return []
    }
  }

  /**
   * Per-lender validation: checks required fields for each selected lender independently.
   * First tries server-side validation, falls back to local validation.
   * Returns GroupedValidationState.
   */
  const validateBeforeSubmit = async (): Promise<GroupedValidationState> => {
    setIsValidating(true)
    try {
      // Try server-side validation first
      try {
        const res = await crmService.validateSubmission(leadId, Array.from(selectedIds))
        const data = res.data?.data ?? res.data ?? {}
        const serverResults = data.results ?? {}
        const results: LenderValidationResult[] = []
        for (const lenderId of selectedIds) {
          const sr = serverResults[lenderId]
          if (!sr) continue
          results.push({
            lenderId: sr.lender_id,
            lenderName: sr.lender_name,
            isApiLender: sr.is_api_lender,
            isValid: sr.valid,
            missingFields: sr.missing_fields ?? [],
            fieldLabels: sr.field_labels ?? {},
          })
        }
        const state: GroupedValidationState = {
          results,
          validLenderIds: results.filter(r => r.isValid || !r.isApiLender).map(r => r.lenderId),
          invalidLenderIds: results.filter(r => !r.isValid && r.isApiLender).map(r => r.lenderId),
          emailOnlyIds: results.filter(r => !r.isApiLender).map(r => r.lenderId),
          hasAnyErrors: results.some(r => !r.isValid && r.isApiLender),
        }
        setValidationState(state)
        return state
      } catch {
        // Server validation failed — fall back to local validation
      }

      // Local validation fallback
      const configs = apiConfigs ?? []
      const lead = leadData as Record<string, unknown> | undefined
      const results: LenderValidationResult[] = []

      for (const lenderId of selectedIds) {
        const lender = activeLenders.find(l => l.id === lenderId)
        if (!lender) continue

        const isApi = !!(lender.api_status && lender.api_status !== '0')
        const cfg = isApi ? configs.find(c => c.id === lenderId && (c.api_status === '1' || c.api_status === 1)) : null

        if (!isApi || !cfg) {
          results.push({ lenderId, lenderName: lender.lender_name, isApiLender: false, isValid: true, missingFields: [], fieldLabels: {} })
          continue
        }

        const requiredFields = normalizeRequiredFields(cfg.required_fields)
        const fieldsToCheck = requiredFields.length > 0 ? requiredFields : extractMappingKeys(cfg)
        const missing: string[] = []
        const labels: Record<string, string> = {}

        for (const key of fieldsToCheck) {
          if (typeof key !== 'string' || !key || COMPUTED_FIELDS.has(key)) continue
          labels[key] = sharedAutoLabel(key)
          const val = lead?.[key]
          if (val === undefined || val === null || String(val).trim() === '') {
            missing.push(key)
          }
        }

        results.push({ lenderId, lenderName: lender.lender_name, isApiLender: true, isValid: missing.length === 0, missingFields: missing, fieldLabels: labels })
      }

      const state: GroupedValidationState = {
        results,
        validLenderIds: results.filter(r => r.isValid || !r.isApiLender).map(r => r.lenderId),
        invalidLenderIds: results.filter(r => !r.isValid && r.isApiLender).map(r => r.lenderId),
        emailOnlyIds: results.filter(r => !r.isApiLender).map(r => r.lenderId),
        hasAnyErrors: results.some(r => !r.isValid && r.isApiLender),
      }
      setValidationState(state)
      return state
    } catch (err) {
      console.error('[validateBeforeSubmit] Unexpected error:', err)
      toast.error('Validation error — submitting anyway')
      const empty: GroupedValidationState = { results: [], validLenderIds: Array.from(selectedIds), invalidLenderIds: [], emailOnlyIds: [], hasAnyErrors: false }
      setValidationState(null)
      return empty
    } finally {
      setIsValidating(false)
    }
  }

  const handleDocUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files[]', f))
    fd.append('document_type', 'Lender Submission')
    setUploadingDocs(true)
    try {
      const res = await crmService.uploadLeadDocuments(leadId, fd)
      const uploaded = (res.data?.data?.uploaded ?? res.data?.uploaded ?? []) as CrmDocument[]
      uploaded.forEach(d => setSelectedDocIds(prev => new Set([...prev, d.id])))
      qc.invalidateQueries({ queryKey: ['lead-documents', leadId] })
      toast.success(`${uploaded.length} file(s) uploaded`)
    } catch {
      toast.error('Upload failed')
    }
    setUploadingDocs(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Only include doc IDs where the file actually exists on the server
  const attachableDocIds = Array.from(selectedDocIds).filter(id => {
    const doc = docs.find(d => d.id === id)
    return doc && doc.attachable !== false && !!doc.file_path
  })

  /** Build outcomes from the API response for the result summary */
  const buildOutcomes = (data: Record<string, unknown>): LenderSubmissionOutcome[] => {
    const outcomes: LenderSubmissionOutcome[] = []
    const records = (data.records ?? {}) as Record<string, Record<string, unknown>>
    for (const id of (Array.isArray(data.submitted) ? data.submitted : [])) {
      const rec = records[id] ?? {}
      outcomes.push({
        lenderId: Number(id),
        lenderName: String(rec.lender_name ?? `Lender #${id}`),
        success: true,
        submissionType: (rec.submission_type as 'api' | 'normal') ?? 'normal',
        submissionId: Number(rec.id ?? 0) || undefined,
      })
    }
    for (const id of (Array.isArray(data.failed) ? data.failed : [])) {
      const rec = records[id] ?? {}
      outcomes.push({
        lenderId: Number(id),
        lenderName: String(rec.lender_name ?? `Lender #${id}`),
        success: false,
        submissionType: (rec.submission_type as 'api' | 'normal') ?? 'normal',
        error: rec.error ? String(rec.error) : undefined,
      })
    }
    for (const id of (Array.isArray(data.skipped) ? data.skipped : [])) {
      const rec = records[id] ?? {}
      outcomes.push({
        lenderId: Number(id),
        lenderName: String(rec.lender_name ?? `Lender #${id}`),
        success: false,
        submissionType: 'api',
        error: rec.error ? String(rec.error) : 'Skipped due to validation',
        validationErrors: Array.isArray(rec.validation_errors) ? rec.validation_errors as string[] : undefined,
      })
    }
    return outcomes
  }

  const submitMutation = useMutation({
    mutationFn: (overrideLenderIds?: number[]) => crmService.submitApplication(leadId, {
      lender_ids:    overrideLenderIds ?? Array.from(selectedIds),
      notes:         notes || undefined,
      document_ids:  attachableDocIds.length ? attachableDocIds : undefined,
      email_html:    previewHtml || undefined,
      email_subject: resolvedSubject || undefined,
      skip_invalid:  true,
    }),
    onSuccess: (res) => {
      try {
        const data = (res?.data?.data ?? res?.data ?? {}) as Record<string, unknown>
        const outcomes = buildOutcomes(data)
        setSubmissionOutcomes(outcomes)
        setValidationState(null)

        const successCount = outcomes.filter(o => o.success).length
        const failCount = outcomes.filter(o => !o.success && !o.validationErrors?.length).length
        if (successCount) toast.success(`Sent to ${successCount} lender${successCount !== 1 ? 's' : ''}`)
        if (failCount) toast.error(`${failCount} failed`)
      } catch (parseErr) {
        console.error('[LendersPanel] Error parsing submit response:', parseErr, res)
        toast.success('Submission sent')
      }
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed'
      toast.error(msg)
    },
  })

  const retryMutation = useMutation({
    mutationFn: (lenderId: number) => {
      setRetryingLenderId(lenderId)
      return crmService.retryLenderSubmission(leadId, lenderId, {
        document_ids: attachableDocIds.length ? attachableDocIds : undefined,
        email_html: previewHtml || undefined,
        email_subject: resolvedSubject || undefined,
      })
    },
    onSuccess: (res, lenderId) => {
      setRetryingLenderId(null)
      const data = (res?.data?.data ?? res?.data ?? {}) as Record<string, unknown>
      const success = Array.isArray(data.submitted) && data.submitted.includes(lenderId)
      setSubmissionOutcomes(prev => prev?.map(o =>
        o.lenderId === lenderId ? { ...o, success, error: success ? undefined : o.error } : o
      ) ?? null)
      if (success) toast.success('Retry successful')
      else toast.error('Retry failed')
      qc.invalidateQueries({ queryKey: ['lender-submissions', leadId] })
    },
    onError: () => {
      setRetryingLenderId(null)
      toast.error('Retry failed')
    },
  })

  const [isRetryingAll, setIsRetryingAll] = useState(false)
  const retryAllFailed = async () => {
    if (!submissionOutcomes) return
    const failedIds = submissionOutcomes
      .filter(o => !o.success && !o.validationErrors?.length)
      .map(o => o.lenderId)
    if (!failedIds.length) return
    setIsRetryingAll(true)
    try {
      await submitMutation.mutateAsync(failedIds)
    } catch {
      // Error handling is in submitMutation.onError
    } finally {
      setIsRetryingAll(false)
    }
  }

  // Quick resubmit from history row — reuses submitMutation with single lender
  const [quickResubmitId, setQuickResubmitId] = useState<number | null>(null)
  const handleQuickResubmit = async (lenderId: number) => {
    setQuickResubmitId(lenderId)
    try {
      await submitMutation.mutateAsync([lenderId])
    } catch {
      // Error already handled by submitMutation.onError
    } finally {
      setQuickResubmitId(null)
    }
  }

  const showPreview = previewExpanded && !!previewTemplate

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start" style={{ transition: 'all 0.3s ease' }}>

      {/* ═══ Col 1 — Submit Application (4/12) ═════════════════════════════ */}
      <div
        className="w-full lg:w-auto min-w-0 order-1"
        style={{ flex: '4 4 0%', transition: 'flex 0.3s ease' }}
      >
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden sticky top-4">

              {/* Gradient accent bar */}
              <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />

              {/* Header */}
              <div className="px-5 pt-4 pb-3.5 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}>
                  <Send size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Submit Application</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Choose lenders, attach documents and send</p>
                </div>
              </div>

              {/* Scrollable form body */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <div className="py-4 px-5 space-y-4">

                  {/* ── Select Lenders ── */}
                  <div>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Building2 size={11} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Select Lenders</span>
                        {selectedIds.size > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white leading-none">
                            {selectedIds.size}
                          </span>
                        )}
                      </div>
                      {activeLenders.length > 0 && (
                        <button
                          onClick={() => setSelectedIds(prev => prev.size === displayLenders.length ? new Set() : new Set(displayLenders.map(l => l.id)))}
                          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          {selectedIds.size === displayLenders.length && displayLenders.length > 0 ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                    </div>

                    {/* Search + Filter + Sort — compact single-row toolbar */}
                    {activeLenders.length > 0 && (
                      <div className="sticky top-0 z-10 bg-white pb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Search */}
                          <div className="relative flex-1 min-w-[110px]">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              value={lenderSearch}
                              onChange={e => setLenderSearch(e.target.value)}
                              placeholder="Search..."
                              className="w-full pl-6 pr-6 py-[5px] text-[11px] rounded-md border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-400"
                            />
                            {lenderSearch && (
                              <button
                                onClick={() => { setLenderSearch(''); setDebouncedSearch('') }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                          {/* Status filter */}
                          <div className="relative flex-shrink-0">
                            <SlidersHorizontal size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                              value={lenderStatusFilter}
                              onChange={e => setLenderStatusFilter(e.target.value)}
                              className={`pl-5 pr-4 py-[5px] text-[11px] font-medium rounded-md border bg-slate-50/80 outline-none appearance-none cursor-pointer transition-colors ${
                                lenderStatusFilter !== 'all'
                                  ? 'border-indigo-300 text-indigo-700 bg-indigo-50/60'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              <option value="all">All</option>
                              <option value="sent">Submitted</option>
                              <option value="processing">Processing</option>
                              <option value="approved">Approved</option>
                              <option value="missing_docs">Docs</option>
                              <option value="declined">Declined</option>
                              <option value="failed">Failed</option>
                              <option value="no_response">No Reply</option>
                              <option value="none">New</option>
                            </select>
                          </div>
                          {/* Sort */}
                          <div className="relative flex-shrink-0">
                            <ArrowUpDown size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                              value={lenderSort}
                              onChange={e => setLenderSort(e.target.value as 'latest' | 'az' | 'za')}
                              className="pl-5 pr-4 py-[5px] text-[11px] font-medium rounded-md border border-slate-200 bg-slate-50/80 text-slate-600 outline-none appearance-none cursor-pointer"
                            >
                              <option value="latest">Recent</option>
                              <option value="az">A–Z</option>
                              <option value="za">Z–A</option>
                            </select>
                          </div>
                          {/* Clear all — only when filters active */}
                          {(debouncedSearch || lenderStatusFilter !== 'all') && (
                            <button
                              onClick={() => { setLenderSearch(''); setDebouncedSearch(''); setLenderStatusFilter('all'); setLenderSort('latest') }}
                              className="flex-shrink-0 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                              title={`${displayLenders.length} of ${activeLenders.length} shown — click to reset`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {activeLenders.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Building2 size={20} className="text-slate-300 mb-1.5" />
                        <p className="text-xs font-medium text-slate-500">No active lenders configured</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Add lenders from the Lenders menu first</p>
                      </div>
                    ) : displayLenders.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Search size={18} className="text-slate-300 mb-1.5" />
                        <p className="text-xs font-medium text-slate-500">No lenders found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search or filter</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                        {displayLenders.map(l => {
                          const on = selectedIds.has(l.id)
                          const prevSub = submittedLenderMap[l.id]
                          const alreadySent = !!prevSub
                          const isApiLender = !!(l.api_status && l.api_status !== '0' && Number(l.api_status) !== 0)
                          const vResult = validationState?.results.find(r => r.lenderId === l.id)
                          const hasErrors = vResult && !vResult.isValid && vResult.isApiLender

                          // Combined status badge — considers both submission_status AND response_status
                          const subStatusBadge = prevSub ? (() => {
                            const ss = prevSub.submission_status
                            const rs = prevSub.response_status
                            if (ss === 'failed')
                              return { icon: <AlertCircle size={8} />, label: 'Failed', cls: 'bg-red-100 text-red-600 border-red-200' }
                            if (rs === 'declined' || ss === 'declined')
                              return { icon: <AlertCircle size={8} />, label: 'Declined', cls: 'bg-red-100 text-red-600 border-red-200' }
                            if (rs === 'needs_documents')
                              return { icon: <FileText size={8} />, label: 'Missing Docs', cls: 'bg-orange-100 text-orange-700 border-orange-200' }
                            if (rs === 'approved' || ss === 'approved')
                              return { icon: <CheckCircle size={8} />, label: 'Approved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                            if (ss === 'pending')
                              return { icon: <Clock size={8} />, label: 'Processing', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
                            if (ss === 'submitted' || ss === 'viewed')
                              return { icon: <CheckCircle size={8} />, label: 'Submitted', cls: 'bg-blue-100 text-blue-700 border-blue-200' }
                            if (ss === 'no_response')
                              return { icon: <Clock size={8} />, label: 'No Response', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
                            return { icon: <CheckCircle size={8} />, label: 'Sent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                          })() : null

                          const isFocused = focusedLenderId === l.id

                          return (
                            <div
                              key={l.id}
                              tabIndex={0}
                              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleLender(l.id) } }}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                hasErrors
                                  ? 'border-red-300 bg-red-50'
                                  : isFocused
                                    ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                                    : on
                                      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {/* Checkbox zone — toggles selection */}
                              <div
                                role="checkbox"
                                aria-checked={on}
                                onClick={e => { e.stopPropagation(); toggleLender(l.id) }}
                                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                                  on ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white hover:border-emerald-400'
                                }`}
                              >
                                {on && <Check size={10} className="text-white" strokeWidth={3} />}
                              </div>
                              {/* Clickable body — sets focus for right panel */}
                              <div
                                className="flex items-center gap-3 flex-1 min-w-0"
                                onClick={() => setFocusedLenderId(isFocused ? null : l.id)}
                              >
                                {/* API / Email type indicator */}
                                {isApiLender ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 flex-shrink-0" title="API submission">
                                    <Zap size={10} className="text-indigo-500" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-sky-50 border border-sky-200 flex-shrink-0" title="Email submission">
                                    <Mail size={10} className="text-sky-500" />
                                  </span>
                                )}
                                <span className={`text-sm font-medium truncate flex-1 ${isFocused ? 'text-indigo-700' : 'text-slate-700'}`}>{l.lender_name}</span>
                                {hasErrors && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex-shrink-0">
                                    {vResult.missingFields.length} missing
                                  </span>
                                )}
                                {alreadySent && !hasErrors && subStatusBadge && (
                                  <span
                                    title={`${subStatusBadge.label} — ${prevSub.submitted_at ? new Date(prevSub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'unknown date'}`}
                                    className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${subStatusBadge.cls}`}
                                  >
                                    {subStatusBadge.icon} {subStatusBadge.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {(() => {
                      const alreadySentSelected = Array.from(selectedIds).filter(id => !!submittedLenderMap[id])
                      if (!alreadySentSelected.length) return null
                      const names = alreadySentSelected.map(id => submittedLenderMap[id].lender_name ?? `Lender #${id}`).join(', ')
                      return (
                        <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            <strong className="font-semibold">{names}</strong>{' '}
                            {alreadySentSelected.length === 1 ? 'was' : 'were'} already submitted. This will resend the application.
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── Email Template ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center">
                        <Mail size={11} className="text-sky-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Email Template</span>
                    </div>
                    <select
                      className="input w-full text-sm"
                      value={templateId}
                      onChange={e => {
                        const val: number | '' = e.target.value === '' ? '' : Number(e.target.value)
                        setTemplateId(val)
                        setPreviewExpanded(val !== '')
                      }}
                    >
                      <option value="">— Default template —</option>
                      {(emailTemplates ?? []).map(t => (
                        <option key={t.id} value={t.id}>{t.template_name}</option>
                      ))}
                    </select>
                    {previewTemplate && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1.5">
                        <Eye size={10} /> Preview visible in center column
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── Documents ── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                          <FileText size={11} className="text-violet-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Documents</span>
                        {selectedDocIds.size > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500 text-white leading-none">
                            {selectedDocIds.size}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {docs.length > 0 && (() => {
                          const attachable = docs.filter(d => d.attachable !== false && !!d.file_path)
                          if (!attachable.length) return null
                          const allSelected = attachable.every(d => selectedDocIds.has(d.id))
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedDocIds(allSelected ? new Set() : new Set(attachable.map(d => d.id)))}
                              className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 hover:underline"
                            >
                              {allSelected ? 'Deselect all' : 'Select all'}
                            </button>
                          )
                        })()}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingDocs}
                          className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          {uploadingDocs ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                          Upload
                        </button>
                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
                      </div>
                    </div>

                    {docs.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Upload size={12} className="text-slate-300" />
                        <p className="text-xs text-slate-400">No documents yet \u2014 click Upload to add files</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                        {docs.map(d => {
                          const on = selectedDocIds.has(d.id)
                          const canAttach = d.attachable !== false && !!d.file_path
                          const docLabel = d.document_type || d.document_name || d.file_path?.split('/').pop() || `Doc #${d.id}`
                          return (
                            <div
                              key={d.id}
                              title={!canAttach ? 'File not on server \u2014 re-upload to attach' : undefined}
                              onClick={() => canAttach && toggleDoc(d.id)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs select-none transition-all ${
                                canAttach
                                  ? on
                                    ? 'cursor-pointer border-violet-200 bg-violet-50'
                                    : 'cursor-pointer border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50'
                                  : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                                on && canAttach ? 'bg-violet-500 border-violet-500' : 'border-slate-300 bg-white'
                              }`}>
                                {on && canAttach && <Check size={9} className="text-white" strokeWidth={3} />}
                              </div>
                              <FileText size={11} className={`flex-shrink-0 ${on && canAttach ? 'text-violet-500' : 'text-slate-400'}`} />
                              <span className={`truncate flex-1 ${on && canAttach ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>{docLabel}</span>
                              {!canAttach && (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                                  className="ml-auto text-[10px] text-amber-500 hover:text-amber-700 flex-shrink-0 underline"
                                >
                                  re-upload
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {selectedDocIds.size > 0 && attachableDocIds.length < selectedDocIds.size && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                        <AlertTriangle size={11} className="flex-shrink-0" />
                        {selectedDocIds.size - attachableDocIds.length} file(s) need re-upload and will be skipped.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── Notes ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                        <MessageSquare size={11} className="text-slate-500" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Note</span>
                      <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                    </div>
                    <textarea
                      className="input w-full resize-none text-sm"
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Additional notes for the lender\u2026"
                    />
                  </div>

                </div>
              </div>

              {/* ── Per-Lender Validation Panel ── */}
              {validationState?.hasAnyErrors && !submissionOutcomes && (
                <div className="mx-5 mt-1">
                  <LenderValidationPanel
                    validationState={validationState}
                    leadId={leadId}
                    onDismiss={() => setValidationState(null)}
                    onSubmitValid={() => submitMutation.mutate(validationState.validLenderIds)}
                    onRetryValidation={() => { validateBeforeSubmit() }}
                    isSubmitting={submitMutation.isPending}
                    isValidating={isValidating}
                  />
                </div>
              )}

              {/* ── Submission Result Summary ── */}
              {submissionOutcomes && (
                <div className="mx-5 mt-1">
                  <SubmissionResultSummary
                    outcomes={submissionOutcomes}
                    onClose={() => { setSubmissionOutcomes(null); resetForm() }}
                    onRetry={(id) => retryMutation.mutate(id)}
                    onRetryAllFailed={retryAllFailed}
                    onViewLog={handleViewLog}
                    isRetrying={retryingLenderId}
                    isRetryingAll={isRetryingAll}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2.5 flex-shrink-0">
                <button
                  onClick={async () => {
                    try {
                      const state = await validateBeforeSubmit()
                      if (!state.hasAnyErrors) {
                        submitMutation.mutate(undefined)
                      }
                      // If has errors, the validation panel is shown automatically
                    } catch (err) {
                      console.error('[LendersPanel] Submit click handler error:', err)
                      toast.error('An error occurred. Please try again.')
                    }
                  }}
                  disabled={selectedIds.size === 0 || submitMutation.isPending || isValidating}
                  className="btn-success flex items-center gap-2 px-5 disabled:opacity-50 flex-1 justify-center"
                >
                  {submitMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  ) : isValidating ? (
                    <><Loader2 size={14} className="animate-spin" /> Validating…</>
                  ) : (() => {
                    const allResend = selectedIds.size > 0 && Array.from(selectedIds).every(id => !!submittedLenderMap[id])
                    const count = selectedIds.size || '…'
                    return <><Send size={14} /> {allResend ? 'Resend' : 'Send'} to {count} Lender{selectedIds.size !== 1 ? 's' : ''}</>
                  })()}
                </button>
                <button onClick={resetForm} className="btn-outline px-4 flex-shrink-0">Reset</button>
              </div>


            </div>
      </div>

      {/* ═══ Col 2 — Email Preview (4/12, visible when template selected) ══ */}
      {showPreview && previewTemplate && (
        <div
          className="w-full lg:w-auto min-w-0 order-2"
          style={{ flex: '4 4 0%', transition: 'flex 0.3s ease', animation: 'fadeIn 0.25s ease' }}
        >
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden sticky top-4">

            {/* macOS-style chrome bar */}
            <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#1e293b' }}>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-slate-400 text-[11px]" style={{ background: '#334155' }}>
                  <Mail size={10} />
                  <span>Email Preview</span>
                </div>
              </div>
              <button
                onClick={() => { setTemplateId(''); setPreviewExpanded(false) }}
                className="text-slate-500 hover:text-slate-200 transition-colors text-[11px] flex-shrink-0"
                title="Close preview"
              >
                {'\u2715'}
              </button>
            </div>

            {/* Email meta */}
            <div className="px-4 pt-3 pb-2.5 border-b border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 truncate">
                {resolvedSubject || previewTemplate.template_name}
              </h3>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  <Mail size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">Submission Email</span>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">Just now</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-500">to</span>
                    {selectedIds.size > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Building2 size={9} className="text-slate-500" />
                        {selectedIds.size} lender{selectedIds.size !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">no lenders selected</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{ color: '#059669', borderColor: '#a7f3d0', background: '#f0fdf4' }}>
                  <Check size={9} /> {previewTemplate.template_name}
                </span>
                {selectedDocIds.size > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-slate-500 border-slate-200 bg-slate-50">
                    <FileText size={9} /> {selectedDocIds.size} attachment{selectedDocIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Email iframe — scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="p-3">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ minHeight: 420 }}>
                  <iframe
                    key={previewTemplate.id}
                    srcDoc={previewHtml}
                    className="w-full border-0 block"
                    style={{ minHeight: 420, height: '100%' }}
                    sandbox="allow-same-origin"
                    title="Email body preview"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═══ Col 3 — Submission History & Logs (8/12 default, 4/12 with preview) */}
      <div
        className={`w-full lg:w-auto space-y-5 min-w-0 ${showPreview ? 'order-3' : 'order-2'}`}
        style={{ flex: showPreview ? '4 4 0%' : '8 8 0%', transition: 'flex 0.3s ease' }}
      >

        {/* ── Submission History ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Submission History {filteredSubList.length > 0 && <span className="font-normal">({filteredSubList.length}{focusedLenderId !== null ? ` of ${allSubmissions.length}` : ''})</span>}
            </p>
            <div className="flex items-center gap-1.5">
              {focusedLenderId !== null && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  <Building2 size={10} />
                  <span className="truncate max-w-[120px]">{focusedLenderName}</span>
                  <button
                    onClick={() => setFocusedLenderId(null)}
                    className="ml-0.5 hover:text-indigo-900 transition-colors"
                    title="Show all submissions"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              <button
                onClick={() => setFocusedLenderId(null)}
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                  focusedLenderId === null
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                Show All
              </button>
            </div>
          </div>

          {/* Stats bar */}
          {filteredSubList.length > 0 && (() => {
            const total = filteredSubList.length
            const success = filteredSubList.filter(s => s.submission_status === 'submitted' || s.submission_status === 'approved' || s.submission_status === 'viewed').length
            const failed = filteredSubList.filter(s => s.submission_status === 'failed' || s.submission_status === 'declined').length
            const processing = filteredSubList.filter(s => s.submission_status === 'pending').length
            const lenderCount = groupedSubmissions?.length ?? 0
            return (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 mb-3">
                <span className="text-[11px] font-semibold text-slate-500">
                  {total} Total
                </span>
                <span className="w-px h-3.5 bg-slate-200" />
                {focusedLenderId === null && lenderCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                    <Building2 size={10} />
                    {lenderCount} Lender{lenderCount !== 1 ? 's' : ''}
                  </span>
                )}
                {success > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {success} Sent
                  </span>
                )}
                {failed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {failed} Failed
                  </span>
                )}
                {processing > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {processing} Processing
                  </span>
                )}
              </div>
            )
          })()}

          {subsLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
          ) : filteredSubList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {focusedLenderId !== null ? 'No submissions for this lender yet.' : 'No submissions yet.'}
            </p>
          ) : groupedSubmissions && focusedLenderId === null ? (
            /* ── Grouped "All" view ── */
            <div className="space-y-4" style={{ transition: 'all 0.3s ease' }}>
              {groupedSubmissions.map(group => (
                <div key={group.lenderId} id={`sub-row-${group.lenderId}`}>
                  {/* Lender group header */}
                  <button
                    onClick={() => setFocusedLenderId(group.lenderId)}
                    className="flex items-center gap-2 mb-2 group cursor-pointer w-full text-left"
                  >
                    <Building2 size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors truncate">
                      {group.lenderName}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">
                      ({group.submissions.length})
                    </span>
                    <span className="flex-1 border-b border-dashed border-slate-200 min-w-[20px]" />
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0">
                      Focus &rarr;
                    </span>
                  </button>
                  <div className="space-y-2 pl-0">
                    {group.submissions.map(s => (
                      <div key={s.id}>
                        <ErrorBoundary fallbackTitle={`Error rendering submission for ${s.lender_name ?? 'lender'}`} compact>
                          <SubmissionRow sub={s} leadId={leadId} onViewLog={handleViewLog} onResubmit={handleQuickResubmit} isResubmitting={quickResubmitId === s.lender_id} onApproval={(sub, note) => setApprovalModal({ sub, note })} />
                        </ErrorBoundary>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Single-lender view ── */
            <div className="space-y-2" style={{ transition: 'all 0.3s ease' }}>
              {filteredSubList.map(s => (
                <div key={s.id} id={`sub-row-${s.lender_id}`}>
                  <ErrorBoundary fallbackTitle={`Error rendering submission for ${s.lender_name ?? 'lender'}`} compact>
                    <SubmissionRow sub={s} leadId={leadId} onViewLog={handleViewLog} onResubmit={handleQuickResubmit} isResubmitting={quickResubmitId === s.lender_id} onApproval={(sub, note) => setApprovalModal({ sub, note })} />
                  </ErrorBoundary>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Error Fix Modal ── */}
        {fixModal && (
          <ErrorBoundary fallbackTitle="Error loading fix modal">
            <ErrorFixModal
              leadId={leadId}
              lenderId={fixModal.log.lender_id}
              error={fixModal.error}
              onClose={() => setFixModal(null)}
              onFixed={() => {
                setFixModal(null)
                qc.invalidateQueries({ queryKey: ['lead-api-logs', leadId] })
              }}
            />
          </ErrorBoundary>
        )}

        {/* ── Lender Email History ── */}
        <LenderEmailHistory leadId={leadId} />

      </div>

      {/* ── API Log Drawer ── */}
      <ApiLogDrawer
        open={logDrawer.open}
        onClose={() => setLogDrawer({ open: false, lenderId: null, lenderName: '' })}
        log={drawerLog}
        lenderName={logDrawer.lenderName}
        onFixError={(error) => {
          setLogDrawer(prev => ({ ...prev, open: false }))
          if (drawerLog) setFixModal({ log: drawerLog as unknown as ApiLog, error })
        }}
      />

      {/* ── Approval Offer Modal ── */}
      {approvalModal && (
        <ApprovalOfferModal
          leadId={leadId}
          sub={approvalModal.sub}
          note={approvalModal.note}
          onClose={() => setApprovalModal(null)}
          onDone={() => {
            setApprovalModal(null)
            onTabChange?.('offers')
          }}
        />
      )}

    </div>
  )
}
