import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Clock, Loader2, ExternalLink, type LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { LeadApproval, ApprovalStatus } from '../../types/crm.types'

const STATUS_CONFIG: Record<ApprovalStatus, { icon: LucideIcon; className: string; label: string }> = {
  pending:   { icon: Clock,        className: 'text-amber-500',   label: 'Pending' },
  approved:  { icon: CheckCircle2, className: 'text-emerald-500', label: 'Approved' },
  declined:  { icon: XCircle,      className: 'text-red-500',     label: 'Declined' },
  withdrawn: { icon: Clock,        className: 'text-slate-500',   label: 'Withdrawn' },
  expired:   { icon: Clock,        className: 'text-slate-400',   label: 'Expired' },
}

interface ReviewForm {
  status: 'approved' | 'declined'
  review_note: string
  approved_amount: string
}

export function CrmApprovals() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setDescription } = useCrmHeader()
  const [reviewing, setReviewing] = useState<LeadApproval | null>(null)
  const reviewForm = useForm<ReviewForm>({ defaultValues: { status: 'approved', review_note: '', approved_amount: '' } })

  const [page, setPage] = useState(1)

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['crm-all-approvals', page],
    queryFn: async () => {
      const res = await crmService.getAllApprovals({ page, per_page: 25 })
      return res.data?.data ?? res.data
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ approval, form }: { approval: LeadApproval; form: ReviewForm }) =>
      crmService.reviewApproval(approval.lead_id, approval.id, {
        status: form.status,
        review_note: form.review_note || undefined,
        approved_amount: form.approved_amount ? parseFloat(form.approved_amount) : undefined,
      }),
    onSuccess: () => {
      toast.success('Review submitted')
      reviewForm.reset()
      setReviewing(null)
      qc.invalidateQueries({ queryKey: ['crm-all-approvals'] })
    },
    onError: () => toast.error('Failed to submit review'),
  })

  const approvals: LeadApproval[] = rawData?.data ?? (Array.isArray(rawData) ? rawData : [])
  const totalPages: number = rawData?.last_page ?? 1
  const pending = approvals.filter(a => a.status === 'pending')
  const others  = approvals.filter(a => a.status !== 'pending')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDescription(`${pending.length} pending review${pending.length !== 1 ? 's' : ''}`) }, [pending.length])

  return (
    <div className="space-y-5">

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-indigo-500" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="table-wrapper py-16 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">All caught up!</p>
          <p className="text-sm mt-1 text-slate-400">No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="section-label">Pending ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map(a => <ApprovalRow key={a.id} approval={a} onReview={() => { reviewForm.reset(); setReviewing(a) }} navigate={navigate} />)}
              </div>
            </div>
          )}

          {/* History */}
          {others.length > 0 && (
            <div>
              <h2 className="section-label">History</h2>
              <div className="space-y-3">
                {others.map(a => <ApprovalRow key={a.id} approval={a} navigate={navigate} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bar rounded-xl border border-slate-200">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="pagination-btn">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="pagination-btn">Next</button>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="modal-backdrop">
          <form
            onSubmit={reviewForm.handleSubmit(d => reviewMutation.mutate({ approval: reviewing, form: d }))}
            className="modal-card max-w-md p-6"
          >
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Review Approval — {reviewing.approval_type.replace(/_/g, ' ')}
            </h3>
            {reviewing.request_note && (
              <div className="rounded-lg p-3 mb-4 bg-slate-50 border border-slate-200">
                <p className="text-xs font-medium mb-1 text-slate-500">Request note</p>
                <p className="text-sm text-slate-700">{reviewing.request_note}</p>
              </div>
            )}
            <div className="mb-3">
              <label className="label-xs">Decision</label>
              <div className="flex gap-3">
                {(['approved', 'declined'] as const).map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...reviewForm.register('status')} value={s} className="accent-indigo-600" />
                    <span className="text-sm capitalize text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            {reviewForm.watch('status') === 'approved' && (
              <div className="mb-3">
                <label className="label-xs">Approved Amount</label>
                <input type="number" {...reviewForm.register('approved_amount')} className="input w-full" placeholder="0.00" step="0.01" />
              </div>
            )}
            <div className="mb-4">
              <label className="label-xs">Note</label>
              <textarea {...reviewForm.register('review_note')} className="input w-full resize-none" rows={3} placeholder="Add a review note..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={reviewMutation.isPending} className="btn-primary text-sm disabled:opacity-50">
                {reviewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
              </button>
              <button type="button" onClick={() => setReviewing(null)} className="btn-outline text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function ApprovalRow({
  approval,
  onReview,
  navigate,
}: {
  approval: LeadApproval
  onReview?: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const cfg = STATUS_CONFIG[approval.status]
  const Icon = cfg.icon
  return (
    <div className="crm-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={14} className={cfg.className} />
            <span className={`text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs capitalize text-slate-500">
              {approval.approval_type.replace(/_/g, ' ')}
            </span>
          </div>
          {approval.requested_amount && (
            <p className="text-sm font-medium text-slate-900">
              ${Number(approval.requested_amount).toLocaleString()}
            </p>
          )}
          {approval.request_note && (
            <p className="text-xs mt-1 text-slate-500">{approval.request_note}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-slate-400">
              Lead #{approval.lead_id} · {new Date(approval.created_at).toLocaleDateString()}
            </span>
            {approval.requester && (
              <span className="text-[11px] text-slate-400">by {approval.requester.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/crm/leads/${approval.lead_id}`)}
            className="action-btn"
            title="View lead"
          >
            <ExternalLink size={13} />
          </button>
          {onReview && (
            <button
              onClick={onReview}
              className="badge badge-indigo hover:opacity-80 transition-opacity"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
