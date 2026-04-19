import { useState } from 'react'
import {
  MessageSquare, Phone, Mail, ArrowRightLeft, FileText, Pencil,
  CheckSquare, Send, AlertCircle, Pin, User, Globe, Zap,
  ArrowRight, Code2, CheckCircle2, XCircle, Wrench, ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import type { LeadActivity, ActivityType, FixSuggestion, FieldUpdateMeta } from '../../types/crm.types'
import { LenderErrorList, describeApiError } from './LenderApiFixModal'
import { FieldChangesDiff } from './FieldChangesDiff'

// ─── Type config ──────────────────────────────────────────────────────────────

interface TypeConfig {
  icon: LucideIcon
  label: string
  color: string      // main brand color
  bg: string          // light bg
  bgHover: string     // card hover bg
  dot: string         // dot color class
}

const TYPE_CONFIG: Record<ActivityType, TypeConfig> = {
  note_added:         { icon: MessageSquare, label: 'Note',            color: '#059669', bg: '#ecfdf5', bgHover: 'hover:bg-emerald-50/40', dot: 'bg-emerald-500' },
  call_made:          { icon: Phone,         label: 'Call',            color: '#3B82F6', bg: '#eff6ff', bgHover: 'hover:bg-blue-50/40',    dot: 'bg-blue-500'    },
  email_sent:         { icon: Mail,          label: 'Email Sent',      color: '#0EA5E9', bg: '#f0f9ff', bgHover: 'hover:bg-sky-50/40',     dot: 'bg-sky-500'     },
  email_failed:       { icon: Mail,          label: 'Email Failed',    color: '#EF4444', bg: '#fef2f2', bgHover: 'hover:bg-red-50/40',     dot: 'bg-red-500'     },
  sms_sent:           { icon: MessageSquare, label: 'SMS',             color: '#8B5CF6', bg: '#f5f3ff', bgHover: 'hover:bg-violet-50/40',  dot: 'bg-violet-500'  },
  status_change:      { icon: ArrowRightLeft,label: 'Status',          color: '#F59E0B', bg: '#fffbeb', bgHover: 'hover:bg-amber-50/40',   dot: 'bg-amber-500'   },
  field_update:       { icon: Pencil,        label: 'Updated',         color: '#6366F1', bg: '#eef2ff', bgHover: 'hover:bg-indigo-50/40',  dot: 'bg-indigo-500'  },
  document_uploaded:  { icon: FileText,      label: 'Document',        color: '#0EA5E9', bg: '#f0f9ff', bgHover: 'hover:bg-sky-50/40',     dot: 'bg-sky-500'     },
  task_created:       { icon: CheckSquare,   label: 'Task',            color: '#8B5CF6', bg: '#f5f3ff', bgHover: 'hover:bg-violet-50/40',  dot: 'bg-violet-500'  },
  task_completed:     { icon: CheckSquare,   label: 'Done',            color: '#10B981', bg: '#ecfdf5', bgHover: 'hover:bg-emerald-50/40', dot: 'bg-emerald-500' },
  lender_submitted:   { icon: Send,          label: 'Submitted',       color: '#F97316', bg: '#fff7ed', bgHover: 'hover:bg-orange-50/40',  dot: 'bg-orange-500'  },
  lender_api_result:  { icon: CheckCircle2,  label: 'API Result',      color: '#10B981', bg: '#ecfdf5', bgHover: 'hover:bg-emerald-50/40', dot: 'bg-emerald-500' },
  lender_response:    { icon: AlertCircle,   label: 'Response',        color: '#EF4444', bg: '#fef2f2', bgHover: 'hover:bg-red-50/40',     dot: 'bg-red-500'     },
  approval_requested: { icon: AlertCircle,   label: 'Approval Req.',   color: '#F59E0B', bg: '#fffbeb', bgHover: 'hover:bg-amber-50/40',   dot: 'bg-amber-500'   },
  approval_granted:   { icon: CheckSquare,   label: 'Approved',        color: '#10B981', bg: '#ecfdf5', bgHover: 'hover:bg-emerald-50/40', dot: 'bg-emerald-500' },
  approval_declined:  { icon: AlertCircle,   label: 'Declined',        color: '#EF4444', bg: '#fef2f2', bgHover: 'hover:bg-red-50/40',     dot: 'bg-red-500'     },
  affiliate_created:  { icon: Globe,         label: 'Affiliate',       color: '#6366F1', bg: '#eef2ff', bgHover: 'hover:bg-indigo-50/40',  dot: 'bg-indigo-500'  },
  merchant_accessed:  { icon: User,          label: 'Merchant',        color: '#0EA5E9', bg: '#f0f9ff', bgHover: 'hover:bg-sky-50/40',     dot: 'bg-sky-500'     },
  lead_created:       { icon: User,          label: 'Created',         color: '#10B981', bg: '#ecfdf5', bgHover: 'hover:bg-emerald-50/40', dot: 'bg-emerald-500' },
  lead_imported:      { icon: FileText,      label: 'Imported',        color: '#64748B', bg: '#f8fafc', bgHover: 'hover:bg-slate-50/40',   dot: 'bg-slate-400'   },
  lead_assigned:      { icon: User,          label: 'Assigned',        color: '#6366F1', bg: '#eef2ff', bgHover: 'hover:bg-indigo-50/40',  dot: 'bg-indigo-500'  },
  webhook_triggered:  { icon: Zap,           label: 'Webhook',         color: '#F59E0B', bg: '#fffbeb', bgHover: 'hover:bg-amber-50/40',   dot: 'bg-amber-500'   },
  system:             { icon: Zap,           label: 'System',          color: '#9CA3AF', bg: '#f9fafb', bgHover: 'hover:bg-gray-50/40',    dot: 'bg-gray-400'    },
}

const LENDER_API_FAIL: Partial<TypeConfig> = {
  icon: XCircle, label: 'API Failed', color: '#EF4444', bg: '#fef2f2', bgHover: 'hover:bg-red-50/40', dot: 'bg-red-500',
}
const LENDER_API_VALIDATION: Partial<TypeConfig> = {
  icon: AlertCircle, label: 'Validation', color: '#F59E0B', bg: '#fffbeb', bgHover: 'hover:bg-amber-50/40', dot: 'bg-amber-500',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dt: string): string {
  const diffMs = Date.now() - new Date(dt).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  if (d < 30) return `${Math.floor(d / 7)}w`
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_PALETTES = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
]

function avatarPalette(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}

// ─── Rich content ─────────────────────────────────────────────────────────────

interface RichContentProps {
  activity: LeadActivity
  onViewDetails?: () => void
  onFix?: (error: FixSuggestion) => void
}

function RichContent({ activity, onViewDetails, onFix }: RichContentProps) {
  const meta = activity.meta as Record<string, unknown> | null | undefined

  if (activity.activity_type === 'lender_api_result' && meta) {
    const isSuccess      = meta.success as boolean | undefined
    const responseCode   = meta.response_code as number | null | undefined
    const durationMs     = meta.duration_ms as number | null | undefined
    const attempts       = meta.attempts as number | undefined
    const validErrors    = meta.validation_errors as string[] | undefined
    const hasResponse    = !!meta.response_body
    const docFilename    = meta.doc_filename as string | undefined
    const isFixable      = meta.is_fixable as boolean | undefined
    const fixSuggestions = (meta.fix_suggestions ?? []) as FixSuggestion[]
    const apiStatus      = meta.api_status as string | undefined

    let parsedResponse: Record<string, unknown> | null = null
    try { if (meta.response_body) parsedResponse = JSON.parse(meta.response_body as string) } catch { /* ignore */ }
    const businessId = (parsedResponse as { businessID?: string } | null)?.businessID
    const appNumber  = (parsedResponse as { applicationNumber?: string } | null)?.applicationNumber

    const hasFixes = !isSuccess && fixSuggestions.length > 0
    const errInfo  = !isSuccess && !hasFixes
      ? describeApiError({
          status:        apiStatus ?? ((!responseCode && isSuccess === false) ? 'timeout' : 'error'),
          response_code: responseCode ?? null,
          response_body: meta.response_body as string | null,
        })
      : null

    const hasChips = responseCode != null || durationMs != null || (attempts != null && attempts > 1)

    return (
      <div className="mt-1.5 space-y-1.5">
        {isFixable && !isSuccess && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Wrench size={8} /> Fixable
          </span>
        )}
        {docFilename && (
          <div className="flex items-center gap-1.5">
            <FileText size={9} className="text-sky-500 flex-shrink-0" />
            <span className="text-[10px] text-sky-700 font-medium truncate">{docFilename}</span>
          </div>
        )}
        {hasChips && (
          <div className="flex flex-wrap items-center gap-1">
            {responseCode != null && (
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                HTTP {responseCode}
              </span>
            )}
            {durationMs != null && (
              <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">{durationMs}ms</span>
            )}
            {attempts != null && attempts > 1 && (
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">{attempts} attempts</span>
            )}
          </div>
        )}
        {isSuccess && (appNumber || businessId) && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 space-y-0.5">
            {appNumber  && <p className="text-[10px] text-emerald-800"><span className="font-medium">App #:</span> <span className="font-mono">{appNumber}</span></p>}
            {businessId && <p className="text-[10px] text-emerald-800"><span className="font-medium">Biz ID:</span> <span className="font-mono">{businessId}</span></p>}
          </div>
        )}
        {hasFixes && onFix && <LenderErrorList suggestions={fixSuggestions} onFix={onFix} />}
        {!hasFixes && validErrors && validErrors.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 space-y-0.5">
            {validErrors.map((e, i) => (
              <p key={i} className="text-[10px] text-amber-800 flex items-start gap-1">
                <AlertCircle size={9} className="text-amber-500 flex-shrink-0 mt-0.5" />{e}
              </p>
            ))}
          </div>
        )}
        {errInfo && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2 space-y-0.5">
            <p className="text-[9px] font-bold text-red-700 uppercase tracking-wide">{errInfo.title}</p>
            {errInfo.details.map((d, i) => (
              <p key={i} className="text-[10px] text-red-800 whitespace-pre-wrap">{d}</p>
            ))}
          </div>
        )}
        {hasResponse && onViewDetails && (
          <button onClick={onViewDetails} className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            <Code2 size={9} /> View API Response
          </button>
        )}
      </div>
    )
  }

  if (activity.activity_type === 'document_uploaded' && meta?.files) {
    const files = meta.files as string[]
    if (!files.length) return null
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {files.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 text-[9px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded font-medium">
            <FileText size={8} /> {f}
          </span>
        ))}
      </div>
    )
  }

  if (activity.activity_type === 'status_change' && meta) {
    const from = meta.from_status as string | undefined
    const to   = meta.to_status   as string | undefined
    if (from && to) {
      return (
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{from}</span>
          <ArrowRight size={10} className="text-amber-400 flex-shrink-0" />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">{to}</span>
        </div>
      )
    }
  }

  if (activity.activity_type === 'field_update' && meta) {
    const typedMeta = meta as FieldUpdateMeta
    let changes: Record<string, { old: string | null; new: string | null; label?: string }> = {}

    if (typedMeta.changed_fields && Object.keys(typedMeta.changed_fields).length > 0) {
      changes = typedMeta.changed_fields
    } else if (typedMeta.field) {
      changes = {
        [typedMeta.field]: {
          old: typedMeta.old_value ?? null,
          new: typedMeta.new_value ?? null,
        },
      }
    }

    if (Object.keys(changes).length > 0) {
      return <FieldChangesDiff changes={changes} source={typedMeta.source} />
    }
  }

  if (activity.activity_type === 'lender_submitted' && meta?.lender_name) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <Send size={9} className="text-orange-400" />
        <span className="text-[10px] text-orange-700 font-semibold">{meta.lender_name as string}</span>
      </div>
    )
  }

  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  activity: LeadActivity
  onPin?: (id: number) => void
  onViewDetails?: (activity: LeadActivity) => void
  onFix?: (activity: LeadActivity, error: FixSuggestion) => void
  isLast?: boolean
}

export function ActivityItem({ activity, onPin, onViewDetails, onFix }: Props) {
  const meta = activity.meta as Record<string, unknown> | null | undefined
  const [expanded, setExpanded] = useState(false)

  let config = TYPE_CONFIG[activity.activity_type] ?? TYPE_CONFIG.system
  if (activity.activity_type === 'lender_api_result' && meta) {
    const validErrors = meta.validation_errors as string[] | undefined
    if (validErrors && validErrors.length > 0) {
      config = { ...config, ...LENDER_API_VALIDATION } as TypeConfig
    } else if (meta.success === false) {
      config = { ...config, ...LENDER_API_FAIL } as TypeConfig
    }
  }

  const Icon     = config.icon
  const isPinned = activity.is_pinned === 1
  const isNote   = activity.activity_type === 'note_added'
  const userName = activity.user?.name ?? activity.user_name ?? ''
  const palette  = userName ? avatarPalette(userName) : null

  const hasBody = !!activity.body
  const hasRichContent = !!(
    (activity.activity_type === 'lender_api_result' && meta &&
      ((meta as Record<string, unknown>)?.response_code != null ||
        (meta as Record<string, unknown>)?.doc_filename ||
        ((meta as Record<string, unknown>)?.validation_errors as string[] | undefined)?.length ||
        ((meta as Record<string, unknown>)?.fix_suggestions as unknown[] | undefined)?.length ||
        (meta as Record<string, unknown>)?.is_fixable)
    ) ||
    (activity.activity_type === 'document_uploaded' && (meta as Record<string, unknown>)?.files && ((meta as Record<string, unknown>).files as string[]).length > 0) ||
    (activity.activity_type === 'status_change' && (meta as Record<string, unknown>)?.from_status) ||
    (activity.activity_type === 'field_update' && meta && ((meta as FieldUpdateMeta)?.changed_fields || (meta as FieldUpdateMeta)?.field)) ||
    (activity.activity_type === 'lender_submitted' && (meta as Record<string, unknown>)?.lender_name)
  )

  const isExpandable = hasBody && !isNote && hasRichContent

  return (
    <div
      className={cn(
        'group rounded-lg border transition-all duration-150 mb-1.5',
        isPinned
          ? 'bg-amber-50/60 border-amber-200/80 shadow-sm'
          : `bg-white border-slate-100 ${config.bgHover} hover:border-slate-200`,
      )}
    >
      <div className="px-2.5 py-2">

        {/* Row 1: Icon dot + type + subject + time + pin */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Color dot + icon */}
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: config.bg }}
          >
            <Icon size={10} style={{ color: config.color }} />
          </div>

          {/* Type label */}
          <span className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: config.color }}>
            {config.label}
          </span>

          {/* Pinned indicator */}
          {isPinned && (
            <Pin size={9} className="text-amber-500 fill-amber-400 flex-shrink-0" />
          )}

          {/* Subject */}
          <span className="text-[11px] font-semibold text-slate-700 truncate flex-1 min-w-0 leading-tight">
            {activity.subject}
          </span>

          {/* Time */}
          <span className="text-[9px] font-medium text-slate-400 tabular-nums flex-shrink-0 ml-auto">
            {formatRelativeTime(activity.created_at)}
          </span>

          {/* Pin toggle */}
          {onPin && (
            <button
              onClick={() => onPin(activity.id)}
              title={isPinned ? 'Unpin' : 'Pin'}
              className={cn(
                'flex-shrink-0 p-0.5 rounded transition-all',
                isPinned
                  ? 'opacity-100 text-amber-500 hover:bg-amber-100'
                  : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-500 hover:bg-amber-50',
              )}
            >
              <Pin size={10} className={cn(isPinned && 'fill-current')} />
            </button>
          )}
        </div>

        {/* Row 2: Body text (notes always show, others may be expandable) */}
        {hasBody && (!hasRichContent || isNote) ? (
          <p className={cn(
            'text-[11px] text-slate-500 mt-1 leading-relaxed',
            !expanded && !isNote && 'line-clamp-1',
          )} style={{ paddingLeft: 26 }}>
            {String(activity.body)}
          </p>
        ) : null}

        {/* Row 3: Rich content */}
        {hasRichContent ? (
          <div style={{ paddingLeft: 26 }}>
            <RichContent
              activity={activity}
              onViewDetails={onViewDetails ? () => onViewDetails(activity) : undefined}
              onFix={onFix ? (err) => onFix(activity, err) : undefined}
            />
          </div>
        ) : null}

        {/* Expand toggle for items with both body and rich content */}
        {isExpandable && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-slate-600 mt-1 transition-colors"
            style={{ paddingLeft: 26 }}
          >
            <ChevronDown size={9} className={cn('transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Less' : 'More'}
          </button>
        )}

        {/* Row 4: User */}
        {userName && palette && (
          <div className="flex items-center gap-1 mt-1" style={{ paddingLeft: 26 }}>
            <span className={cn('inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-bold', palette.bg, palette.text)}>
              {getInitials(userName)}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">{userName}</span>
          </div>
        )}

      </div>
    </div>
  )
}
