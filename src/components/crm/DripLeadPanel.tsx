import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, MessageSquare, Clock, CheckCircle, XCircle, Loader2,
  UserMinus, Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dripService } from '../../services/drip.service'
import type { DripEnrollment, DripSendLog } from '../../types/drip.types'

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-sky-100 text-sky-700',
  stopped:   'bg-amber-100 text-amber-700',
  failed:    'bg-red-100 text-red-700',
}

const SEND_STATUS_BADGE: Record<string, string> = {
  queued:    'bg-slate-100 text-slate-500',
  sent:      'bg-sky-100 text-sky-600',
  delivered: 'bg-emerald-100 text-emerald-600',
  opened:    'bg-indigo-100 text-indigo-600',
  clicked:   'bg-violet-100 text-violet-600',
  bounced:   'bg-red-100 text-red-600',
  failed:    'bg-red-100 text-red-600',
}

export function DripLeadPanel({ leadId }: { leadId: number }) {
  const qc = useQueryClient()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['drip-lead-enrollments', leadId],
    queryFn: () => dripService.getLeadEnrollments(leadId).then(r => r.data.data),
    enabled: !!leadId,
  })

  const unenrollMut = useMutation({
    mutationFn: (enrollmentId: number) => dripService.unenrollLead(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drip-lead-enrollments', leadId] })
      toast.success('Unenrolled from campaign')
    },
    onError: () => toast.error('Failed to unenroll'),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-indigo-400" size={20} /></div>
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Zap size={32} className="text-slate-300 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Not enrolled in any drip campaigns</p>
        <p className="text-xs text-slate-400 mt-0.5">Enroll this lead from a campaign detail page</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {enrollments.map((enrollment: DripEnrollment) => {
        const isExpanded = expandedId === enrollment.id
        return (
          <div key={enrollment.id} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Enrollment header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : enrollment.id)}>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[enrollment.status]}`}>
                {enrollment.status}
              </span>
              <span className="text-xs font-semibold text-slate-700 truncate">
                {enrollment.campaign?.name || `Campaign #${enrollment.campaign_id}`}
              </span>
              <span className="text-[11px] text-slate-400 capitalize">{enrollment.enrolled_via}</span>
              {enrollment.next_send_at && (
                <span className="text-[11px] text-slate-400 flex items-center gap-0.5 ml-auto mr-2">
                  <Clock size={11} /> Next: {new Date(enrollment.next_send_at).toLocaleDateString()}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {enrollment.status === 'active' && (
                  <button onClick={e => { e.stopPropagation(); unenrollMut.mutate(enrollment.id) }}
                    className="p-1 text-red-400 hover:bg-red-50 rounded" title="Unenroll">
                    <UserMinus size={13} />
                  </button>
                )}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Send history */}
            {isExpanded && enrollment.send_logs && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {enrollment.send_logs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 px-3">No messages sent yet</p>
                ) : (
                  enrollment.send_logs.map((log: DripSendLog) => (
                    <div key={log.id} className="flex items-center gap-2 px-3 py-2">
                      {log.channel === 'email' ? <Mail size={12} className="text-sky-500" /> : <MessageSquare size={12} className="text-violet-500" />}
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">{log.subject || log.body_preview || 'SMS'}</span>
                      <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${SEND_STATUS_BADGE[log.status] || ''}`}>
                        {log.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{log.sent_at ? new Date(log.sent_at).toLocaleDateString() : '-'}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
