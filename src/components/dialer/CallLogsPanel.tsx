import { PhoneCall, PhoneMissed, PhoneOff, Clock, Inbox, RotateCcw } from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { CallLog } from '../../types'

interface Props {
  /** When provided (agent is in 'ready' state), show redial button per log entry */
  onRedial?: (phoneNumber: string, leadName: string, leadId?: number, campaignId?: number) => void
}

function statusConfig(status: CallLog['status']) {
  switch (status) {
    case 'connected':
      return { label: 'Connected', classes: 'bg-emerald-100 text-emerald-700', icon: PhoneCall }
    case 'missed':
      return { label: 'Missed', classes: 'bg-amber-100 text-amber-700', icon: PhoneMissed }
    case 'no_answer':
      return { label: 'No Answer', classes: 'bg-slate-100 text-slate-500', icon: PhoneMissed }
    case 'busy':
      return { label: 'Busy', classes: 'bg-orange-100 text-orange-700', icon: PhoneOff }
    case 'failed':
      return { label: 'Failed', classes: 'bg-red-100 text-red-700', icon: PhoneOff }
    default:
      return { label: status, classes: 'bg-slate-100 text-slate-500', icon: PhoneOff }
  }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function CallLogsPanel({ onRedial }: Props) {
  const callLogs = useDialerStore((s) => s.callLogs)

  if (callLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Inbox size={20} className="text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">No calls yet</p>
          <p className="text-xs text-slate-400 mt-0.5">Your session history appears here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {callLogs.map((log) => {
        const cfg = statusConfig(log.status)
        const Icon = cfg.icon
        const canRedial = onRedial && log.phone_number && log.status !== 'connected'
        return (
          <div
            key={log.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
          >
            {/* Status icon */}
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', cfg.classes)}>
              <Icon size={13} />
            </div>

            {/* Lead + number */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-none">
                {log.lead_name || 'Unknown'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{log.phone_number}</p>
            </div>

            {/* Duration + time */}
            <div className="text-right flex-shrink-0">
              {log.duration > 0 && (
                <p className="text-xs font-mono font-medium text-slate-700 flex items-center gap-1 justify-end">
                  <Clock size={10} className="text-slate-400" />
                  {formatDuration(log.duration)}
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(log.started_at)}</p>
            </div>

            {/* Redial button */}
            {canRedial && (
              <button
                onClick={() => onRedial(log.phone_number, log.lead_name, log.lead_id, log.campaign_id)}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                title={`Redial ${log.lead_name}`}
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
