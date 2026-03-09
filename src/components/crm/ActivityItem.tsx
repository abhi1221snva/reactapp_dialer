import {
  MessageSquare, Phone, Mail, ArrowRightLeft, FileText,
  CheckSquare, Send, AlertCircle, Pin, User, Globe, Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import type { LeadActivity, ActivityType } from '../../types/crm.types'

const TYPE_CONFIG: Record<ActivityType, { icon: LucideIcon; color: string; label: string }> = {
  note_added:         { icon: MessageSquare,   color: '#6366F1', label: 'Note' },
  call_made:          { icon: Phone,           color: '#10B981', label: 'Call' },
  email_sent:         { icon: Mail,            color: '#3B82F6', label: 'Email' },
  sms_sent:           { icon: MessageSquare,   color: '#8B5CF6', label: 'SMS' },
  status_change:      { icon: ArrowRightLeft,  color: '#F59E0B', label: 'Status Change' },
  field_update:       { icon: FileText,        color: '#6B7280', label: 'Field Update' },
  document_uploaded:  { icon: FileText,        color: '#0EA5E9', label: 'Document' },
  task_created:       { icon: CheckSquare,     color: '#8B5CF6', label: 'Task Created' },
  task_completed:     { icon: CheckSquare,     color: '#10B981', label: 'Task Done' },
  lender_submitted:   { icon: Send,            color: '#F97316', label: 'Lender Submit' },
  lender_response:    { icon: AlertCircle,     color: '#EF4444', label: 'Lender Response' },
  approval_requested: { icon: AlertCircle,     color: '#F59E0B', label: 'Approval Requested' },
  approval_granted:   { icon: CheckSquare,     color: '#10B981', label: 'Approved' },
  approval_declined:  { icon: AlertCircle,     color: '#EF4444', label: 'Declined' },
  affiliate_created:  { icon: Globe,           color: '#6366F1', label: 'Affiliate Link' },
  merchant_accessed:  { icon: User,            color: '#0EA5E9', label: 'Merchant Access' },
  lead_created:       { icon: User,            color: '#10B981', label: 'Lead Created' },
  lead_imported:      { icon: FileText,        color: '#6B7280', label: 'Imported' },
  lead_assigned:      { icon: User,            color: '#6366F1', label: 'Assigned' },
  webhook_triggered:  { icon: Zap,             color: '#F59E0B', label: 'Webhook' },
  system:             { icon: Zap,             color: '#9CA3AF', label: 'System' },
}

interface Props {
  activity: LeadActivity
  onPin?: (id: number) => void
  isLast?: boolean
}

export function ActivityItem({ activity, onPin, isLast }: Props) {
  const config = TYPE_CONFIG[activity.activity_type] ?? TYPE_CONFIG.system
  const Icon = config.icon

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex gap-3">
      {/* Timeline stem */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${config.color}18`, border: `1.5px solid ${config.color}40` }}
        >
          <Icon size={15} style={{ color: config.color }} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-1 min-h-[24px]" style={{ background: '#E5E7EB' }} />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 rounded-xl p-3 border mb-3',
          activity.is_pinned ? 'ring-1' : ''
        )}
        style={{
          background: activity.is_pinned ? '#FEFCE8' : '#FAFAFA',
          borderColor: activity.is_pinned ? '#FDE68A' : '#E5E7EB',
          borderLeft: `3px solid ${config.color}`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: config.color }}>
                {config.label}
              </span>
              {activity.is_pinned === 1 && (
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#92400E' }}>
                  <Pin size={10} /> Pinned
                </span>
              )}
            </div>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#111827' }}>
              {activity.subject}
            </p>
            {activity.body && (
              <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#6B7280' }}>
                {activity.body}
              </p>
            )}
          </div>
          {onPin && (
            <button
              onClick={() => onPin(activity.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
              title={activity.is_pinned ? 'Unpin' : 'Pin'}
            >
              <Pin
                size={13}
                style={{ color: activity.is_pinned ? '#F59E0B' : '#9CA3AF' }}
                className={activity.is_pinned ? 'fill-current' : ''}
              />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
            {formatDate(activity.created_at)}
          </span>
          {activity.user && (
            <>
              <span style={{ color: '#D1D5DB' }}>·</span>
              <span className="text-[11px]" style={{ color: '#6B7280' }}>
                {activity.user.name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
