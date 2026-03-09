import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Clock, AlertCircle, Plus, Loader2, type LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useAuth } from '../../hooks/useAuth'
import { LEVELS } from '../../utils/permissions'
import type { LeadApproval, ApprovalStatus, ApprovalType } from '../../types/crm.types'

const STATUS_CONFIG: Record<ApprovalStatus, { icon: LucideIcon; color: string; label: string }> = {
  pending:   { icon: Clock,         color: '#F59E0B', label: 'Pending' },
  approved:  { icon: CheckCircle2,  color: '#10B981', label: 'Approved' },
  declined:  { icon: XCircle,       color: '#EF4444', label: 'Declined' },
  withdrawn: { icon: AlertCircle,   color: '#6B7280', label: 'Withdrawn' },
  expired:   { icon: AlertCircle,   color: '#9CA3AF', label: 'Expired' },
}

const APPROVAL_TYPES: { value: ApprovalType; label: string }[] = [
  { value: 'funding',           label: 'Funding' },
  { value: 'lender_submission', label: 'Lender Submission' },
  { value: 'document_review',   label: 'Document Review' },
  { value: 'status_override',   label: 'Status Override' },
  { value: 'custom',            label: 'Custom' },
]

interface RequestForm {
  approval_type: ApprovalType
  request_note: string
  requested_amount: string
}

interface ReviewForm {
  status: 'approved' | 'declined'
  review_note: string
  approved_amount: string
}

interface Props {
  leadId: number
}

export function ApprovalsSection({ leadId }: Props) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isManager = (user?.level ?? 1) >= LEVELS.MANAGER
  const [showRequest, setShowRequest] = useState(false)
  const [reviewing, setReviewing] = useState<LeadApproval | null>(null)
  const requestForm = useForm<RequestForm>({ defaultValues: { approval_type: 'custom', request_note: '', requested_amount: '' } })
  const reviewForm = useForm<ReviewForm>({ defaultValues: { status: 'approved', review_note: '', approved_amount: '' } })

  const { data, isLoading } = useQuery({
    queryKey: ['crm-approvals', leadId],
    queryFn: async () => {
      const res = await crmService.getApprovals(leadId)
      return (res.data?.data ?? res.data ?? []) as LeadApproval[]
    },
  })

  const requestMutation = useMutation({
    mutationFn: (form: RequestForm) =>
      crmService.requestApproval(leadId, {
        approval_type: form.approval_type,
        request_note: form.request_note || undefined,
        requested_amount: form.requested_amount ? parseFloat(form.requested_amount) : undefined,
      }),
    onSuccess: () => {
      toast.success('Approval requested')
      requestForm.reset()
      setShowRequest(false)
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => toast.error('Failed to request approval'),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ approval, form }: { approval: LeadApproval; form: ReviewForm }) =>
      crmService.reviewApproval(leadId, approval.id, {
        status: form.status,
        review_note: form.review_note || undefined,
        approved_amount: form.approved_amount ? parseFloat(form.approved_amount) : undefined,
      }),
    onSuccess: () => {
      toast.success('Review submitted')
      reviewForm.reset()
      setReviewing(null)
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => toast.error('Failed to submit review'),
  })

  const withdrawMutation = useMutation({
    mutationFn: (approvalId: number) => crmService.withdrawApproval(leadId, approvalId),
    onSuccess: () => {
      toast.success('Approval withdrawn')
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => toast.error('Failed to withdraw'),
  })

  const approvals = data ?? []
  const hasPending = approvals.some(a => a.status === 'pending')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Approvals</h3>
        {!isManager && !hasPending && (
          <button
            onClick={() => setShowRequest(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: '#EEF2FF', color: '#4F46E5' }}
          >
            <Plus size={13} /> Request Approval
          </button>
        )}
      </div>

      {/* Request form */}
      {showRequest && (
        <form
          onSubmit={requestForm.handleSubmit(d => requestMutation.mutate(d))}
          className="rounded-xl border p-4 mb-4"
          style={{ borderColor: '#E0E7FF', background: '#FAFBFF' }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: '#374151' }}>New Approval Request</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Type</label>
              <select {...requestForm.register('approval_type')} className="input w-full">
                {APPROVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Amount (optional)</label>
              <input type="number" {...requestForm.register('requested_amount')} className="input w-full" placeholder="0.00" step="0.01" />
            </div>
          </div>
          <textarea
            {...requestForm.register('request_note')}
            className="input w-full resize-none mb-3"
            rows={2}
            placeholder="Add a note..."
          />
          <div className="flex gap-2">
            <button type="submit" disabled={requestMutation.isPending} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
              {requestMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Submit Request'}
            </button>
            <button type="button" onClick={() => setShowRequest(false)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: '#6366F1' }} /></div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>No approvals yet.</div>
      ) : (
        <div className="space-y-3">
          {approvals.map(approval => {
            const cfg = STATUS_CONFIG[approval.status]
            const Icon = cfg.icon
            return (
              <div
                key={approval.id}
                className="rounded-xl border p-4"
                style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} style={{ color: cfg.color }} />
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>·</span>
                      <span className="text-xs capitalize" style={{ color: '#6B7280' }}>
                        {approval.approval_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {approval.requested_amount && (
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>
                        Requested: ${Number(approval.requested_amount).toLocaleString()}
                        {approval.approved_amount && ` → Approved: $${Number(approval.approved_amount).toLocaleString()}`}
                      </p>
                    )}
                    {approval.request_note && (
                      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{approval.request_note}</p>
                    )}
                    {approval.review_note && (
                      <p className="text-xs mt-1 italic" style={{ color: '#374151' }}>"{approval.review_note}"</p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                      Requested by {approval.requested_by_name ?? approval.requester?.name ?? `User #${approval.requested_by}`} · {new Date(approval.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {isManager && approval.status === 'pending' && (
                      <button
                        onClick={() => { reviewForm.reset(); setReviewing(approval) }}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: '#EEF2FF', color: '#4F46E5' }}
                      >
                        Review
                      </button>
                    )}
                    {!isManager && approval.status === 'pending' && (
                      <button
                        onClick={() => withdrawMutation.mutate(approval.id)}
                        disabled={withdrawMutation.isPending}
                        className="text-xs px-2.5 py-1 rounded-lg border"
                        style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <form
            onSubmit={reviewForm.handleSubmit(d => reviewMutation.mutate({ approval: reviewing, form: d }))}
            className="rounded-2xl shadow-2xl p-6 w-full max-w-md"
            style={{ background: '#FFFFFF' }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: '#111827' }}>Review Approval</h3>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>Decision</label>
              <div className="flex gap-3">
                {(['approved', 'declined'] as const).map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...reviewForm.register('status')} value={s} className="accent-indigo-600" />
                    <span className="text-sm capitalize" style={{ color: '#374151' }}>{s}</span>
                  </label>
                ))}
              </div>
            </div>
            {reviewForm.watch('status') === 'approved' && (
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Approved Amount</label>
                <input type="number" {...reviewForm.register('approved_amount')} className="input w-full" placeholder="0.00" step="0.01" />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Note</label>
              <textarea {...reviewForm.register('review_note')} className="input w-full resize-none" rows={3} placeholder="Add review note..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={reviewMutation.isPending} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {reviewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Submit Review'}
              </button>
              <button type="button" onClick={() => setReviewing(null)} className="text-sm px-4 py-2 rounded-lg border" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
