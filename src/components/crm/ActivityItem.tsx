import {
  MessageSquare, Phone, Mail, ArrowRightLeft, FileText,
  CheckSquare, Send, AlertCircle, Pin, User, Globe, Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import type { LeadActivity, ActivityType } from '../../types/crm.types'

// ─── Type config ──────────────────────────────────────────────────────────────

interface TypeConfig {
  icon: LucideIcon
  label: string
  badgeBg: string        // Tailwind bg class
  badgeText: string      // Tailwind text class
  borderColor: string    // inline hex for left border
  iconBg: string         // inline hex for icon circle bg
  iconColor: string      // inline hex for icon color
}

const TYPE_CONFIG: Record<ActivityType, TypeConfig> = {
  note_added:         { icon: MessageSquare, label: 'Note',             badgeBg: 'bg-emerald-50',  badgeText: 'text-emerald-700',  borderColor: '#059669', iconBg: '#d1fae5', iconColor: '#059669' },
  call_made:          { icon: Phone,         label: 'Call',             badgeBg: 'bg-blue-50',     badgeText: 'text-blue-700',     borderColor: '#3B82F6', iconBg: '#dbeafe', iconColor: '#3B82F6' },
  email_sent:         { icon: Mail,          label: 'Email',            badgeBg: 'bg-sky-50',      badgeText: 'text-sky-700',      borderColor: '#0EA5E9', iconBg: '#e0f2fe', iconColor: '#0EA5E9' },
  sms_sent:           { icon: MessageSquare, label: 'SMS',              badgeBg: 'bg-violet-50',   badgeText: 'text-violet-700',   borderColor: '#8B5CF6', iconBg: '#ede9fe', iconColor: '#8B5CF6' },
  status_change:      { icon: ArrowRightLeft,label: 'Status Change',    badgeBg: 'bg-amber-50',    badgeText: 'text-amber-700',    borderColor: '#F59E0B', iconBg: '#fef3c7', iconColor: '#F59E0B' },
  field_update:       { icon: FileText,      label: 'Field Update',     badgeBg: 'bg-slate-50',    badgeText: 'text-slate-600',    borderColor: '#94A3B8', iconBg: '#f1f5f9', iconColor: '#64748B' },
  document_uploaded:  { icon: FileText,      label: 'Document',         badgeBg: 'bg-sky-50',      badgeText: 'text-sky-700',      borderColor: '#0EA5E9', iconBg: '#e0f2fe', iconColor: '#0EA5E9' },
  task_created:       { icon: CheckSquare,   label: 'Task Created',     badgeBg: 'bg-violet-50',   badgeText: 'text-violet-700',   borderColor: '#8B5CF6', iconBg: '#ede9fe', iconColor: '#8B5CF6' },
  task_completed:     { icon: CheckSquare,   label: 'Task Done',        badgeBg: 'bg-emerald-50',  badgeText: 'text-emerald-700',  borderColor: '#10B981', iconBg: '#d1fae5', iconColor: '#10B981' },
  lender_submitted:   { icon: Send,          label: 'Lender Submit',    badgeBg: 'bg-orange-50',   badgeText: 'text-orange-700',   borderColor: '#F97316', iconBg: '#ffedd5', iconColor: '#F97316' },
  lender_response:    { icon: AlertCircle,   label: 'Lender Response',  badgeBg: 'bg-red-50',      badgeText: 'text-red-700',      borderColor: '#EF4444', iconBg: '#fee2e2', iconColor: '#EF4444' },
  approval_requested: { icon: AlertCircle,   label: 'Approval Req.',    badgeBg: 'bg-amber-50',    badgeText: 'text-amber-700',    borderColor: '#F59E0B', iconBg: '#fef3c7', iconColor: '#F59E0B' },
  approval_granted:   { icon: CheckSquare,   label: 'Approved',         badgeBg: 'bg-emerald-50',  badgeText: 'text-emerald-700',  borderColor: '#10B981', iconBg: '#d1fae5', iconColor: '#10B981' },
  approval_declined:  { icon: AlertCircle,   label: 'Declined',         badgeBg: 'bg-red-50',      badgeText: 'text-red-700',      borderColor: '#EF4444', iconBg: '#fee2e2', iconColor: '#EF4444' },
  affiliate_created:  { icon: Globe,         label: 'Affiliate Link',   badgeBg: 'bg-indigo-50',   badgeText: 'text-indigo-700',   borderColor: '#6366F1', iconBg: '#e0e7ff', iconColor: '#6366F1' },
  merchant_accessed:  { icon: User,          label: 'Merchant Access',  badgeBg: 'bg-sky-50',      badgeText: 'text-sky-700',      borderColor: '#0EA5E9', iconBg: '#e0f2fe', iconColor: '#0EA5E9' },
  lead_created:       { icon: User,          label: 'Lead Created',     badgeBg: 'bg-emerald-50',  badgeText: 'text-emerald-700',  borderColor: '#10B981', iconBg: '#d1fae5', iconColor: '#10B981' },
  lead_imported:      { icon: FileText,      label: 'Imported',         badgeBg: 'bg-slate-50',    badgeText: 'text-slate-600',    borderColor: '#94A3B8', iconBg: '#f1f5f9', iconColor: '#64748B' },
  lead_assigned:      { icon: User,          label: 'Assigned',         badgeBg: 'bg-indigo-50',   badgeText: 'text-indigo-700',   borderColor: '#6366F1', iconBg: '#e0e7ff', iconColor: '#6366F1' },
  webhook_triggered:  { icon: Zap,           label: 'Webhook',          badgeBg: 'bg-amber-50',    badgeText: 'text-amber-700',    borderColor: '#F59E0B', iconBg: '#fef3c7', iconColor: '#F59E0B' },
  system:             { icon: Zap,           label: 'System',           badgeBg: 'bg-slate-50',    badgeText: 'text-slate-500',    borderColor: '#9CA3AF', iconBg: '#f1f5f9', iconColor: '#9CA3AF' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAbsoluteDate(dt: string): string {
  const d = new Date(dt)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

function formatRelativeTime(dt: string): string {
  const now = Date.now()
  const then = new Date(dt).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60)  return 'just now'
  if (diffMin < 60)  return diffMin === 1 ? '1 min ago' : `${diffMin} mins ago`
  if (diffHr  < 24)  return diffHr  === 1 ? '1 hour ago' : `${diffHr} hours ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7)   return `${diffDay} days ago`
  if (diffDay < 30)  return `${Math.floor(diffDay / 7)} weeks ago`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} months ago`
  return `${Math.floor(diffDay / 365)} years ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Avatar colours (deterministic per name) ─────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  activity: LeadActivity
  onPin?: (id: number) => void
  isLast?: boolean
}

export function ActivityItem({ activity, onPin, isLast }: Props) {
  const config = TYPE_CONFIG[activity.activity_type] ?? TYPE_CONFIG.system
  const Icon = config.icon
  const isPinned = activity.is_pinned === 1
  const isNote = activity.activity_type === 'note_added'
  const userName = activity.user?.name ?? activity.user_name ?? ''
  const palette = userName ? avatarPalette(userName) : null

  return (
    <div className="flex gap-2.5 group">

      {/* ── Timeline spine ── */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ background: config.iconBg, border: `1.5px solid ${config.iconColor}40` }}
        >
          <Icon size={12} style={{ color: config.iconColor }} />
        </div>
        {!isLast && (
          <div
            className="w-px flex-1 mt-1 min-h-[16px]"
            style={{ background: 'linear-gradient(to bottom, #E2E8F0, #F1F5F9)' }}
          />
        )}
      </div>

      {/* ── Card ── */}
      <div
        className={cn(
          'flex-1 rounded-lg border mb-1.5 transition-shadow duration-150',
          'hover:shadow-sm cursor-default',
          isPinned
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-slate-200 hover:border-slate-300',
          isNote && !isPinned && 'bg-slate-50/60',
        )}
        style={{
          borderLeft: `3px solid ${config.borderColor}`,
          boxShadow: isPinned ? '0 1px 6px rgba(245,158,11,0.10)' : undefined,
        }}
      >
        <div className="px-3 pt-2 pb-1.5">

          {/* ── Header row: badge + pin ── */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Type badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide',
                  config.badgeBg,
                  config.badgeText,
                )}
              >
                <Icon size={9} />
                {config.label}
              </span>

              {/* Pinned badge */}
              {isPinned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                  <Pin size={9} className="fill-amber-500 text-amber-500" />
                  Pinned
                </span>
              )}
            </div>

            {/* Pin toggle button — always visible for pinned, visible on hover otherwise */}
            {onPin && (
              <button
                onClick={() => onPin(activity.id)}
                title={isPinned ? 'Unpin' : 'Pin this item'}
                className={cn(
                  'flex-shrink-0 p-1 rounded-md transition-all duration-150',
                  isPinned
                    ? 'opacity-100 text-amber-500 hover:bg-amber-100'
                    : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50',
                )}
              >
                <Pin
                  size={12}
                  className={cn(isPinned && 'fill-current')}
                />
              </button>
            )}
          </div>

          {/* ── Subject ── */}
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {activity.subject}
          </p>

          {/* ── Body ── */}
          {activity.body && (
            <p
              className={cn(
                'text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap',
                isNote && 'italic',
              )}
            >
              {activity.body}
            </p>
          )}

          {/* ── Meta row: time + user avatar ── */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Relative time (primary) */}
            <span className="text-[11px] font-medium text-slate-400">
              {formatRelativeTime(activity.created_at)}
            </span>

            {/* Absolute time (secondary) */}
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              · {formatAbsoluteDate(activity.created_at)}
            </span>

            {/* User avatar + name */}
            {userName && palette && (
              <>
                <span className="text-slate-200 text-[11px]">·</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold flex-shrink-0',
                      palette.bg,
                      palette.text,
                    )}
                  >
                    {getInitials(userName)}
                  </span>
                  <span className="text-[11px] text-slate-500">{userName}</span>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
